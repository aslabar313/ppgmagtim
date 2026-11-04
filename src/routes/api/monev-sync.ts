import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { getUserDetails } from "@/lib/mockData";
import {
  canReadVillageScope,
  validateVillageAccess,
  canManagePeriods,
  canVerify,
  canApproveReport,
  getWilayahForDesa
} from "@/lib/monev/monevService";
import {
  MonevPeriod,
  MonevPeriodAgendaSnapshot,
  MonevSubmission,
  MonevMonitoringItem,
  MonevFollowUp,
  MonevEvidence,
  MonevAuditLog,
  normalizeDesaName,
  formatDesaShort,
  formatKelompokShort,
  getCanonicalReportId
} from "@/lib/monev/types";

// Primary PostgreSQL Database (PintarYuk / PPG Magtim Supabase with monev_* tables)
const MONEV_DB_URL =
  process.env.MONEV_SUPABASE_URL ||
  "https://wyttnumehjuvkxyosdjc.supabase.co";

const MONEV_DB_SERVICE_KEY =
  process.env.MONEV_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dHRudW1laGp1dmt4eW9zZGpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI0MjEwOSwiZXhwIjoyMDk1ODE4MTA5fQ.fek-Grlkuxb_oIFO3n4fvTe74Lr5XkNVEowX0gHoOuU";

const dbClient = createClient(MONEV_DB_URL, MONEV_DB_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export interface MonevFullStorePayload {
  periods?: MonevPeriod[];
  snapshots?: MonevPeriodAgendaSnapshot[];
  submissions?: MonevSubmission[];
  items?: MonevMonitoringItem[];
  followUps?: MonevFollowUp[];
  evidence?: MonevEvidence[];
  audits?: MonevAuditLog[];
  updatedAt?: string;
}

// Fast in-memory server mirror for low-latency reads & fallback
let serverMemoryStore: MonevFullStorePayload = {
  periods: [],
  snapshots: [],
  submissions: [],
  items: [],
  followUps: [],
  evidence: [],
  audits: [],
  updatedAt: new Date(0).toISOString()
};

async function loadStoreFromMainDatabase(): Promise<MonevFullStorePayload> {
  try {
    const { data, error } = await dbClient
      .from("monev_state_store")
      .select("key, payload, updated_at")
      .eq("key", "monev_main_state")
      .maybeSingle();

    if (!error && data && data.payload && typeof data.payload === "object") {
      const remotePayload = data.payload as MonevFullStorePayload;
      serverMemoryStore = {
        periods: Array.isArray(remotePayload.periods) ? remotePayload.periods : serverMemoryStore.periods,
        snapshots: Array.isArray(remotePayload.snapshots) ? remotePayload.snapshots : serverMemoryStore.snapshots,
        submissions: Array.isArray(remotePayload.submissions) ? remotePayload.submissions : serverMemoryStore.submissions,
        items: Array.isArray(remotePayload.items) ? remotePayload.items : serverMemoryStore.items,
        followUps: Array.isArray(remotePayload.followUps) ? remotePayload.followUps : serverMemoryStore.followUps,
        evidence: Array.isArray(remotePayload.evidence) ? remotePayload.evidence : serverMemoryStore.evidence,
        audits: Array.isArray(remotePayload.audits) ? remotePayload.audits : serverMemoryStore.audits,
        updatedAt: data.updated_at || remotePayload.updatedAt || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error("[MonevSync] Fallback to memory store on read:", err);
  }
  return serverMemoryStore;
}

async function persistStoreToMainDatabase(
  store: MonevFullStorePayload,
  actorUsername: string,
  actorRole: string,
  changedSubmissions?: MonevSubmission[],
  changedItems?: MonevMonitoringItem[],
  changedPeriods?: MonevPeriod[],
  newAudits?: MonevAuditLog[]
): Promise<void> {
  const now = new Date().toISOString();
  store.updatedAt = now;
  serverMemoryStore = store;

  try {
    // 1. Upsert canonical state store
    await dbClient.from("monev_state_store").upsert(
      {
        key: "monev_main_state",
        payload: store,
        updated_by: actorUsername,
        updated_role: actorRole,
        updated_at: now
      },
      { onConflict: "key" }
    );

    // 2. Sync relational monev_periods table
    if (changedPeriods && changedPeriods.length > 0) {
      const periodRows = changedPeriods.map(p => ({
        id: p.id,
        nama_periode: p.namaPeriode,
        tahun: p.tahun,
        bulan: p.bulan,
        periode_kode: p.periodeKode,
        status: p.status,
        tanggal_mulai: p.tanggalMulai,
        tanggal_selesai: p.tanggalSelesai,
        cakupan_wilayah: p.cakupanWilayah,
        total_desa: p.totalDesa,
        total_agenda: p.totalAgenda,
        catatan_periode: p.catatanPeriode || "",
        created_by: p.createdBy || actorUsername,
        locked_by: p.lockedBy || null,
        locked_at: p.lockedAt || null,
        updated_at: p.updatedAt || now
      }));
      await dbClient.from("monev_periods").upsert(periodRows, { onConflict: "id" });
    }

    // 3. Sync relational monev_submissions table
    if (changedSubmissions && changedSubmissions.length > 0) {
      const subRows = changedSubmissions.map(s => {
        const cid = s.reportId || s.id || getCanonicalReportId(s.periodId, s.desa);
        return {
          id: cid,
          report_id: cid,
          period_id: s.periodId,
          wilayah: s.wilayah,
          desa: normalizeDesaName(s.desa),
          desa_nama: s.desaNama || formatDesaShort(s.wilayah),
          kelompok_nama: s.kelompokNama || formatKelompokShort(s.desa),
          status: s.status,
          progress_persen: s.progressPersen || 0,
          agenda_selesai: s.agendaSelesai || 0,
          agenda_total: s.agendaTotal || 18,
          created_by: s.createdBy || s.submittedBy || actorUsername,
          updated_by: s.updatedBy || actorUsername,
          submitted_by: s.submittedBy || null,
          submitted_at: s.submittedAt || null,
          verified_by: s.verifiedBy || null,
          verified_at: s.verifiedAt || null,
          verification_note: s.verificationNote ?? s.catatanVerifikasi ?? null,
          catatan_verifikasi: s.catatanVerifikasi ?? s.verificationNote ?? null,
          rejected_by: s.rejectedBy || null,
          rejected_at: s.rejectedAt || null,
          rejection_reason: s.rejectionReason || null,
          created_at: s.createdAt || now,
          updated_at: s.updatedAt || now
        };
      });
      await dbClient.from("monev_submissions").upsert(subRows, { onConflict: "id" });
    }

    // 4. Sync relational monev_monitoring_items table
    if (changedItems && changedItems.length > 0) {
      // Ensure snapshots exist in relational table before upserting items
      const snapIds = new Set(changedItems.map(i => i.agendaSnapshotId));
      const relevantSnaps = (store.snapshots || []).filter(sn => snapIds.has(sn.id));
      if (relevantSnaps.length > 0) {
        const snapRows = relevantSnaps.map(sn => ({
          id: sn.id,
          period_id: sn.periodId,
          master_agenda_id: sn.masterAgendaId,
          nomor_urut: sn.nomorUrut,
          judul_agenda: sn.judulAgenda,
          kategori: sn.kategori,
          sasaran: sn.sasaran || "Semua",
          is_mandatory: sn.isMandatory !== false,
          bobot_persen: sn.bobotPersen || 5.56
        }));
        await dbClient.from("monev_period_agenda_snapshot").upsert(snapRows, { onConflict: "id" });
      }

      const itemRows = changedItems.map(i => {
        const cid = i.reportId || i.submissionId || getCanonicalReportId(i.periodId, i.desa);
        return {
          id: i.id,
          submission_id: cid,
          report_id: cid,
          period_id: i.periodId,
          agenda_snapshot_id: i.agendaSnapshotId,
          wilayah: i.wilayah,
          desa: normalizeDesaName(i.desa),
          desa_nama: i.desaNama || formatDesaShort(i.wilayah),
          kelompok_nama: i.kelompokNama || formatKelompokShort(i.desa),
          judul_agenda: i.judulAgenda,
          nomor_urut: i.nomorUrut,
          kategori: i.kategori,
          terlaksana: Boolean(i.terlaksana),
          status_ketercapaian: i.statusKetercapaian || "NOT_STARTED",
          is_mandatory: i.isMandatory !== false,
          tanggal_pelaksanaan: i.tanggalPelaksanaan || null,
          ketercapaian_persen: i.ketercapaianPersen || 0,
          jumlah_peserta: i.jumlahPeserta || 0,
          penanggung_jawab: i.penanggungJawab || "",
          kendala: i.kendala || "",
          tindak_lanjut: i.tindakLanjut || "",
          catatan_evaluasi: i.catatanEvaluasi || i.laporanPelaksanaan || "",
          laporan_pelaksanaan: i.laporanPelaksanaan || i.catatanEvaluasi || "",
          evidence_urls: i.evidenceUrls || [],
          created_by: i.createdBy || i.updatedBy || actorUsername,
          updated_by: i.updatedBy || actorUsername,
          created_at: i.createdAt || now,
          updated_at: i.updatedAt || now
        };
      });
      await dbClient.from("monev_monitoring_items").upsert(itemRows, { onConflict: "id" });
    }

    // 5. Sync relational monev_audit_logs table
    if (newAudits && newAudits.length > 0) {
      const auditRows = newAudits.slice(0, 20).map(a => ({
        entity_type: a.entityType,
        entity_id: a.entityId,
        action: a.action,
        actor_username: a.actorUsername,
        actor_role: a.actorRole,
        details: {
          oldValue: a.oldValue,
          newValue: a.newValue,
          ...a.details
        },
        created_at: a.createdAt || now
      }));
      await dbClient.from("monev_audit_logs").insert(auditRows);
    }
  } catch (err) {
    console.error("[MonevSync] Relational sync warning:", err);
  }
}

export const Route = createFileRoute("/api/monev-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const username = url.searchParams.get("username") || "superadminaldi";
          const requestedGroup = url.searchParams.get("group_id") || url.searchParams.get("desa");
          const requestedVillage = url.searchParams.get("village_id") || url.searchParams.get("wilayah");
          const requestedSubmissionId = url.searchParams.get("submission_id");
          const requestedAgendaItemId = url.searchParams.get("agenda_id") || url.searchParams.get("item_id");

          // Resolve canonical role & scope on server (anti-spoofing)
          const userDetails = getUserDetails(username);
          if (!userDetails) {
            return new Response(
              JSON.stringify({ success: false, error: "Akses ditolak: Akun pengguna tidak dikenali." }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const { role, scope } = userDetails;

          // Validate explicit query manipulation attempts (Section 11: group_id, village_id, submission_id, agenda_id)
          if (requestedGroup && requestedGroup !== "Semua") {
            const check = canReadVillageScope(role, scope, requestedGroup, requestedVillage || undefined);
            if (!check.allowed) {
              return new Response(
                JSON.stringify({ success: false, error: check.reason || "DENY: Cross-group/village access forbidden." }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          if (requestedVillage && requestedVillage !== "Semua") {
            if (role === "Admin Desa" && scope !== requestedVillage) {
              return new Response(
                JSON.stringify({ success: false, error: `DENY: Admin Desa (${scope}) tidak dapat mengakses ${requestedVillage}.` }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
            if ((role === "Admin Kelompok" || role === "Pengajar") && getWilayahForDesa(scope) !== requestedVillage) {
              return new Response(
                JSON.stringify({ success: false, error: `DENY: Admin Kelompok (${scope}) tidak dapat mengakses ${requestedVillage}.` }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          const store = await loadStoreFromMainDatabase();

          if (requestedSubmissionId) {
            const sub = (store.submissions || []).find(s => s.id === requestedSubmissionId);
            if (sub) {
              const check = canReadVillageScope(role, scope, sub.desa, sub.wilayah);
              if (!check.allowed) {
                return new Response(
                  JSON.stringify({ success: false, error: check.reason || "DENY: IDOR submission_id forbidden." }),
                  { status: 403, headers: { "Content-Type": "application/json" } }
                );
              }
            }
          }

          if (requestedAgendaItemId) {
            const item = (store.items || []).find(i => i.id === requestedAgendaItemId);
            if (item) {
              const check = canReadVillageScope(role, scope, item.desa, item.wilayah);
              if (!check.allowed) {
                return new Response(
                  JSON.stringify({ success: false, error: check.reason || "DENY: IDOR agenda_id forbidden." }),
                  { status: 403, headers: { "Content-Type": "application/json" } }
                );
              }
            }
          }

          // Filter returned data strictly by user's canonical scope
          const scopedSubmissions = (store.submissions || []).filter(
            s => canReadVillageScope(role, scope, s.desa, s.wilayah).allowed
          );
          const scopedItems = (store.items || []).filter(
            i => canReadVillageScope(role, scope, i.desa, i.wilayah).allowed
          );
          const scopedFollowUps = (store.followUps || []).filter(
            f => canReadVillageScope(role, scope, f.desa, f.wilayah).allowed
          );
          const scopedEvidence = (store.evidence || []).filter(
            e => canReadVillageScope(role, scope, e.desa, e.wilayah).allowed
          );
          const scopedAudits = canManagePeriods(role)
            ? (store.audits || [])
            : (store.audits || []).filter(a => a.actorUsername === username || (a.details?.desa && canReadVillageScope(role, scope, a.details.desa).allowed));

          return new Response(
            JSON.stringify({
              success: true,
              role,
              scope,
              data: {
                periods: store.periods || [],
                snapshots: store.snapshots || [],
                submissions: scopedSubmissions,
                items: scopedItems,
                followUps: scopedFollowUps,
                evidence: scopedEvidence,
                audits: scopedAudits,
                updatedAt: store.updatedAt
              }
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err.message || "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            username: string;
            action?: string;
            targetDesa?: string;
            payload: MonevFullStorePayload;
          };

          const username = body.username || "";
          const userDetails = getUserDetails(username);
          if (!userDetails) {
            return new Response(
              JSON.stringify({ success: false, error: "Akses ditolak: Akun pengguna tidak valid." }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          const { role, scope } = userDetails;
          if (role === "Viewer") {
            return new Response(
              JSON.stringify({ success: false, error: "DENY: Akun Viewer hanya memiliki akses baca (read-only)." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }

          if (body.targetDesa) {
            const access = validateVillageAccess(role, scope, body.targetDesa);
            if (!access.allowed) {
              return new Response(
                JSON.stringify({ success: false, error: access.reason || "DENY: Out-of-scope mutation forbidden." }),
                { status: 403, headers: { "Content-Type": "application/json" } }
              );
            }
            if (body.action === "APPROVE" || body.action === "REJECT") {
              const approveCheck = canApproveReport(role, scope, body.targetDesa);
              if (!approveCheck.allowed) {
                return new Response(
                  JSON.stringify({ success: false, error: approveCheck.reason || "DENY: Approval action forbidden for role/scope." }),
                  { status: 403, headers: { "Content-Type": "application/json" } }
                );
              }
            }
          }

          const currentStore = await loadStoreFromMainDatabase();
          const incoming = body.payload || {};

          // Merge periods & snapshots (Only Super Admin / Admin Daerah can mutate periods, or seed initial period if empty)
          const periodMap = new Map<string, MonevPeriod>();
          (currentStore.periods || []).forEach(p => periodMap.set(p.id, p));
          const changedPeriods: MonevPeriod[] = [];
          if (Array.isArray(incoming.periods)) {
            incoming.periods.forEach(p => {
              if (canManagePeriods(role) || !periodMap.has(p.id)) {
                periodMap.set(p.id, p);
                changedPeriods.push(p);
              }
            });
          }

          const snapMap = new Map<string, MonevPeriodAgendaSnapshot>();
          (currentStore.snapshots || []).forEach(s => snapMap.set(s.id, s));
          if (Array.isArray(incoming.snapshots)) {
            incoming.snapshots.forEach(s => {
              if (canManagePeriods(role) || !snapMap.has(s.id)) {
                snapMap.set(s.id, s);
              }
            });
          }

          // Merge submissions strictly within actor's authorized scope & single canonical report_id
          const subMap = new Map<string, MonevSubmission>();
          (currentStore.submissions || []).forEach(s => {
            const cid = s.reportId || s.id || getCanonicalReportId(s.periodId, s.desa);
            subMap.set(cid, {
              ...s,
              id: cid,
              reportId: cid,
              desaNama: s.desaNama || formatDesaShort(s.wilayah),
              kelompokNama: s.kelompokNama || formatKelompokShort(s.desa)
            });
          });
          const changedSubmissions: MonevSubmission[] = [];

          if (Array.isArray(incoming.submissions)) {
            for (const rawSub of incoming.submissions) {
              const cid = rawSub.reportId || rawSub.id || getCanonicalReportId(rawSub.periodId, rawSub.desa);
              const s: MonevSubmission = {
                ...rawSub,
                id: cid,
                reportId: cid,
                desaNama: rawSub.desaNama || formatDesaShort(rawSub.wilayah),
                kelompokNama: rawSub.kelompokNama || formatKelompokShort(rawSub.desa)
              };
              const access = validateVillageAccess(role, scope, s.desa, s.wilayah);
              if (!access.allowed) {
                continue; // Ignore out-of-scope records from client cache
              }
              const existing = subMap.get(cid);
              // Prevent non-authorized role from setting or overwriting VERIFIED / REJECTED / LOCKED status
              const isApprovalTransition =
                (s.status === "VERIFIED" || s.status === "REJECTED") &&
                (!existing || existing.status !== s.status);
              if (isApprovalTransition && !canApproveReport(role, scope, s.desa, s.wilayah).allowed) {
                continue;
              }
              if (existing && (existing.status === "VERIFIED" || existing.status === "LOCKED") && !canApproveReport(role, scope, s.desa, s.wilayah).allowed) {
                continue;
              }

              const existingTouched = existing && (
                existing.status !== "DRAFT" ||
                (existing.progressPersen || 0) > 0 ||
                (existing.agendaSelesai || 0) > 0 ||
                Boolean(existing.submittedBy || existing.verifiedBy || existing.rejectedBy || existing.updatedBy)
              );
              const incomingTouched =
                s.status !== "DRAFT" ||
                (s.progressPersen || 0) > 0 ||
                (s.agendaSelesai || 0) > 0 ||
                Boolean(s.submittedBy || s.verifiedBy || s.rejectedBy || s.updatedBy);

              // Do not overwrite touched/submitted/verified submission with untouched auto-provisioned DRAFT
              if (existingTouched && !incomingTouched) {
                continue;
              }

              if (
                !existing ||
                (incomingTouched && !existingTouched) ||
                new Date(s.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime() ||
                s.status !== existing.status
              ) {
                subMap.set(cid, s);
                changedSubmissions.push(s);
              }
            }
          }

          // Merge monitoring items strictly within actor's authorized scope
          const itemMap = new Map<string, MonevMonitoringItem>();
          (currentStore.items || []).forEach(i => itemMap.set(i.id, i));
          const changedItems: MonevMonitoringItem[] = [];

          if (Array.isArray(incoming.items)) {
            for (const item of incoming.items) {
              const access = validateVillageAccess(role, scope, item.desa, item.wilayah);
              if (!access.allowed) {
                continue;
              }
              const existing = itemMap.get(item.id);
              const existingHasInput = existing && (existing.statusKetercapaian !== "NOT_STARTED" || Boolean(existing.laporanPelaksanaan));
              const incomingHasInput = item.statusKetercapaian !== "NOT_STARTED" || Boolean(item.laporanPelaksanaan);

              // Do not overwrite filled item with blank auto-provisioned item
              if (existingHasInput && !incomingHasInput) {
                continue;
              }

              if (
                !existing ||
                incomingHasInput ||
                new Date(item.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()
              ) {
                itemMap.set(item.id, item);
                if (incomingHasInput || !existing) {
                  changedItems.push(item);
                }
              }
            }
          }

          // Merge follow-ups within authorized scope
          const fuMap = new Map<string, MonevFollowUp>();
          (currentStore.followUps || []).forEach(f => fuMap.set(f.id, f));
          if (Array.isArray(incoming.followUps)) {
            for (const fu of incoming.followUps) {
              if (validateVillageAccess(role, scope, fu.desa, fu.wilayah).allowed) {
                fuMap.set(fu.id, fu);
              }
            }
          }

          // Merge evidence within authorized scope
          const evMap = new Map<string, MonevEvidence>();
          (currentStore.evidence || []).forEach(ev => evMap.set(ev.id, ev));
          if (Array.isArray(incoming.evidence)) {
            for (const ev of incoming.evidence) {
              if (validateVillageAccess(role, scope, ev.desa, ev.wilayah).allowed) {
                evMap.set(ev.id, ev);
              }
            }
          }

          // Merge audit logs
          const auditMap = new Map<string, MonevAuditLog>();
          (currentStore.audits || []).forEach(a => auditMap.set(a.id, a));
          const newAudits: MonevAuditLog[] = [];
          if (Array.isArray(incoming.audits)) {
            for (const a of incoming.audits) {
              if (!auditMap.has(a.id)) {
                auditMap.set(a.id, a);
                newAudits.push(a);
              }
            }
          }

          const mergedStore: MonevFullStorePayload = {
            periods: Array.from(periodMap.values()),
            snapshots: Array.from(snapMap.values()),
            submissions: Array.from(subMap.values()),
            items: Array.from(itemMap.values()),
            followUps: Array.from(fuMap.values()),
            evidence: Array.from(evMap.values()),
            audits: Array.from(auditMap.values())
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 500)
          };

          await persistStoreToMainDatabase(
            mergedStore,
            username,
            role,
            changedSubmissions,
            changedItems,
            changedPeriods,
            newAudits
          );

          return new Response(
            JSON.stringify({
              success: true,
              updatedAt: mergedStore.updatedAt,
              syncedSubmissions: changedSubmissions.length,
              syncedItems: changedItems.length
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ success: false, error: err.message || "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }
  }
});
