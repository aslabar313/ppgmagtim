import { FaceEnrollment, FaceTemplate, FaceScanEvent, AttendanceCorrection } from "@/components/FaceAttendance/types";
import { loadData, saveData } from "@/lib/mockDataHelper";
import { supabase } from "@/integrations/supabase/client";

const ENROLLMENTS_KEY = "sim_tpq_face_enrollments";
const TEMPLATES_KEY = "sim_tpq_face_templates";
const SCAN_EVENTS_KEY = "sim_tpq_face_scan_events";
const CORRECTIONS_KEY = "sim_tpq_face_corrections";

// Cache lokal untuk performa realtime
export function getFaceEnrollments(): FaceEnrollment[] {
  return loadData<FaceEnrollment[]>(ENROLLMENTS_KEY, []);
}

export function saveFaceEnrollments(data: FaceEnrollment[]) {
  saveData(ENROLLMENTS_KEY, data);
}

export function getFaceTemplates(): FaceTemplate[] {
  return loadData<FaceTemplate[]>(TEMPLATES_KEY, []);
}

export function saveFaceTemplates(data: FaceTemplate[]) {
  saveData(TEMPLATES_KEY, data);
}

export function getFaceScanEvents(): FaceScanEvent[] {
  return loadData<FaceScanEvent[]>(SCAN_EVENTS_KEY, []);
}

export function getAttendanceCorrections(): AttendanceCorrection[] {
  return loadData<AttendanceCorrection[]>(CORRECTIONS_KEY, []);
}

/**
 * Sinkronisasi data biometrik dari Supabase Cloud ke Cache Lokal
 * Bekerja non-blocking dan toleran terhadap koneksi offline / tabel belum dibuat
 */
export async function syncFaceDataFromCloud(): Promise<{ success: boolean; count: number }> {
  try {
    if (!supabase || typeof window === "undefined") return { success: false, count: 0 };

    const [enrollmentsRes, templatesRes] = await Promise.all([
      (supabase as any).from("face_enrollments").select("*").eq("status", "active"),
      (supabase as any).from("face_templates").select("*").eq("is_active", true),
    ]);

    if (enrollmentsRes.error || templatesRes.error) {
      console.info("[FaceStorage] Cloud sync fallback ke cache lokal (tabel cloud belum aktif/offline).");
      return { success: false, count: getFaceTemplates().length };
    }

    if (enrollmentsRes.data && templatesRes.data && templatesRes.data.length > 0) {
      const cloudEnrollments: FaceEnrollment[] = enrollmentsRes.data.map((e: any) => ({
        id: e.id,
        generusId: e.generus_id,
        status: e.status,
        modelVersion: e.model_version || "facenet-v1",
        enrolledBy: e.enrolled_by || "Petugas",
        consentAcknowledged: e.consent_acknowledged ?? true,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));

      const cloudTemplates: FaceTemplate[] = templatesRes.data.map((t: any) => ({
        id: t.id,
        enrollmentId: t.enrollment_id,
        generusId: t.generus_id,
        embedding: typeof t.embedding === "string" ? JSON.parse(t.embedding) : t.embedding,
        qualityScore: t.quality_score || 0.9,
        isActive: t.is_active ?? true,
        createdAt: t.created_at,
      }));

      saveFaceEnrollments(cloudEnrollments);
      saveFaceTemplates(cloudTemplates);
      console.log(`[FaceStorage] Berhasil sinkronisasi ${cloudTemplates.length} template wajah dari Cloud.`);
      return { success: true, count: cloudTemplates.length };
    }

    return { success: true, count: getFaceTemplates().length };
  } catch (err) {
    console.warn("[FaceStorage] Gagal sinkronisasi data cloud:", err);
    return { success: false, count: getFaceTemplates().length };
  }
}

/**
 * Pendaftaran Wajah Baru / Perbarui Wajah (Simpan Lokal + Sinkron ke Cloud)
 */
export function enrollGenerusFace(
  generusId: string,
  embedding: number[],
  enrolledBy: string,
  qualityScore = 0.9
): { enrollment: FaceEnrollment; template: FaceTemplate } {
  const enrollments = getFaceEnrollments().filter(e => e.generusId !== generusId);
  const templates = getFaceTemplates().filter(t => t.generusId !== generusId);

  const enrollmentId = "fe-" + Date.now();
  const templateId = "ft-" + Date.now();
  const now = new Date().toISOString();

  const enrollment: FaceEnrollment = {
    id: enrollmentId,
    generusId,
    status: "active",
    modelVersion: "facenet-mobile-v1",
    enrolledBy,
    consentAcknowledged: true,
    createdAt: now,
    updatedAt: now,
  };

  const template: FaceTemplate = {
    id: templateId,
    enrollmentId,
    generusId,
    embedding,
    qualityScore,
    isActive: true,
    createdAt: now,
  };

  enrollments.push(enrollment);
  templates.push(template);

  saveFaceEnrollments(enrollments);
  saveFaceTemplates(templates);

  // Sync ke Cloud di background tanpa menghambat respons UI
  (async () => {
    try {
      if (!supabase) return;
      await (supabase as any).from("face_enrollments").upsert({
        generus_id: generusId,
        status: "active",
        model_version: "facenet-mobile-v1",
        enrolled_by: enrolledBy,
        consent_acknowledged: true,
        updated_at: now,
      });

      await (supabase as any).from("face_templates").insert({
        generus_id: generusId,
        embedding: embedding,
        quality_score: qualityScore,
        is_active: true,
      });
    } catch (e) {
      console.info("[FaceStorage] Cloud insert deferred:", e);
    }
  })();

  return { enrollment, template };
}

/**
 * Hapus Data Template Biometrik
 */
export function deleteFaceEnrollment(generusId: string): boolean {
  const enrollments = getFaceEnrollments().filter(e => e.generusId !== generusId);
  const templates = getFaceTemplates().filter(t => t.generusId !== generusId);
  saveFaceEnrollments(enrollments);
  saveFaceTemplates(templates);

  // Sync delete ke Cloud
  (async () => {
    try {
      if (!supabase) return;
      await (supabase as any).from("face_templates").delete().eq("generus_id", generusId);
      await (supabase as any).from("face_enrollments").delete().eq("generus_id", generusId);
    } catch (e) {
      console.info("[FaceStorage] Cloud delete deferred:", e);
    }
  })();

  return true;
}

/**
 * Catat Event Pemindaian Wajah untuk Audit Trail
 */
export function recordFaceScanEvent(event: Omit<FaceScanEvent, "id" | "createdAt">): FaceScanEvent {
  const events = getFaceScanEvents();
  const newEvent: FaceScanEvent = {
    ...event,
    id: "fse-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
  };
  events.unshift(newEvent);
  saveData(SCAN_EVENTS_KEY, events.slice(0, 200));

  // Sync event ke Cloud di background
  (async () => {
    try {
      if (!supabase) return;
      await (supabase as any).from("face_scan_events").insert({
        session_name: event.sessionName,
        kelompok: event.kelompok,
        tanggal: event.tanggal,
        matched_generus_id: event.matchedGenerusId || null,
        confidence_score: event.confidenceScore || null,
        status_result: event.statusResult,
        scanned_by: event.scannedBy || null,
        device_info: event.deviceInfo || (typeof navigator !== "undefined" ? navigator.userAgent : "web"),
      });
    } catch (e) {
      // Non-blocking
    }
  })();

  return newEvent;
}

/**
 * Catat Koreksi Manual Kehadiran untuk Audit Trail
 */
export function recordAttendanceCorrection(correction: Omit<AttendanceCorrection, "id" | "createdAt">): AttendanceCorrection {
  const corrections = getAttendanceCorrections();
  const newCorrection: AttendanceCorrection = {
    ...correction,
    id: "cor-" + Date.now(),
    createdAt: new Date().toISOString(),
  };
  corrections.unshift(newCorrection);
  saveData(CORRECTIONS_KEY, corrections);

  (async () => {
    try {
      if (!supabase) return;
      await (supabase as any).from("attendance_corrections").insert({
        presensi_id: correction.presensiId,
        generus_id: correction.generusId,
        old_status: correction.oldStatus,
        new_status: correction.newStatus,
        reason: correction.reason,
        corrected_by: correction.correctedBy,
      });
    } catch (e) {
      // Non-blocking
    }
  })();

  return newCorrection;
}
