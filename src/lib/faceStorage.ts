import { FaceEnrollment, FaceTemplate, FaceScanEvent, AttendanceCorrection } from "@/components/FaceAttendance/types";
import { loadData, saveData } from "@/lib/mockDataHelper";

const ENROLLMENTS_KEY = "sim_tpq_face_enrollments";
const TEMPLATES_KEY = "sim_tpq_face_templates";
const SCAN_EVENTS_KEY = "sim_tpq_face_scan_events";
const CORRECTIONS_KEY = "sim_tpq_face_corrections";

// Default seed jika belum ada data
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

export function recordFaceScanEvent(event: Omit<FaceScanEvent, "id" | "createdAt">): FaceScanEvent {
  const events = getFaceScanEvents();
  const newEvent: FaceScanEvent = {
    ...event,
    id: "fse-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
  };
  events.unshift(newEvent);
  // Keep max 200 events for storage performance
  saveData(SCAN_EVENTS_KEY, events.slice(0, 200));
  return newEvent;
}

export function getAttendanceCorrections(): AttendanceCorrection[] {
  return loadData<AttendanceCorrection[]>(CORRECTIONS_KEY, []);
}

export function recordAttendanceCorrection(correction: Omit<AttendanceCorrection, "id" | "createdAt">): AttendanceCorrection {
  const corrections = getAttendanceCorrections();
  const newCorrection: AttendanceCorrection = {
    ...correction,
    id: "cor-" + Date.now(),
    createdAt: new Date().toISOString(),
  };
  corrections.unshift(newCorrection);
  saveData(CORRECTIONS_KEY, corrections);
  return newCorrection;
}

export function deleteFaceEnrollment(generusId: string): boolean {
  const enrollments = getFaceEnrollments().filter(e => e.generusId !== generusId);
  const templates = getFaceTemplates().filter(t => t.generusId !== generusId);
  saveFaceEnrollments(enrollments);
  saveFaceTemplates(templates);
  return true;
}

export function enrollGenerusFace(
  generusId: string,
  embedding: number[],
  enrolledBy: string,
  qualityScore = 0.9
): { enrollment: FaceEnrollment; template: FaceTemplate } {
  const enrollments = getFaceEnrollments().filter(e => e.generusId !== generusId);
  const templates = getFaceTemplates().filter(t => t.generusId !== generusId);

  const enrollmentId = "fe-" + Date.now();
  const now = new Date().toISOString();

  const enrollment: FaceEnrollment = {
    id: enrollmentId,
    generusId,
    status: "active",
    modelVersion: "magtim-cv-v1",
    enrolledBy,
    consentAcknowledged: true,
    createdAt: now,
    updatedAt: now,
  };

  const template: FaceTemplate = {
    id: "ft-" + Date.now(),
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

  return { enrollment, template };
}
