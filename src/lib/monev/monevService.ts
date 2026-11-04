import { 
  MonevMasterAgenda, 
  MonevPeriod, 
  MonevPeriodAgendaSnapshot, 
  MonevSubmission, 
  MonevMonitoringItem, 
  MonevFollowUp,
  MonevEvidence,
  MonevAuditLog, 
  MonevPeriodStatus, 
  MonevSubmissionStatus,
  MonevAgendaCompletionStatus,
  MonevFollowUpStatus,
  DesaSubmissionSummary,
  WilayahProgressSummary,
  AgendaBermasalahSummary,
  MonevCommandCenterData,
  QuickFillItemInput,
  AgendaAnalyticsItem,
  VillagePerformanceItem,
  HeatmapCell,
  PeriodTrendItem,
  MonevAnalyticsData,
  MonevExecutiveReport,
  AuthScopeContext,
  INITIAL_18_MASTER_AGENDA, 
  MASTER_WILAYAH_CONFIG,
  normalizeDesaName,
  formatDesaShort,
  formatKelompokShort,
  getCanonicalReportId
} from "./types";
import { loadData, saveData } from "../mockDataHelper";
import { getUserDetails } from "../mockData";

const BASELINE_AUTO_EPOCH = "2026-01-01T00:00:00.000Z";

// Storage Keys
const KEY_MASTER_AGENDA = "sim_tpq_monev_master_agenda";
const KEY_PERIODS = "sim_tpq_monev_periods";
const KEY_SNAPSHOTS = "sim_tpq_monev_snapshots";
const KEY_SUBMISSIONS = "sim_tpq_monev_submissions";
const KEY_ITEMS = "sim_tpq_monev_items";
const KEY_FOLLOW_UPS = "sim_tpq_monev_follow_ups";
const KEY_EVIDENCE = "sim_tpq_monev_evidence";
const KEY_AUDITS = "sim_tpq_monev_audits";

// Default Initial Period
const DEFAULT_INITIAL_PERIOD: MonevPeriod = {
  id: "period-2026-10",
  namaPeriode: "Monev PPG Periode Oktober 2026",
  tahun: 2026,
  bulan: 10,
  periodeKode: "2026-10",
  status: "OPEN",
  tanggalMulai: "2026-10-01",
  tanggalSelesai: "2026-10-31",
  cakupanWilayah: ["Desa Selatan", "Desa Tengah", "Desa Utara", "Desa Timur"],
  totalDesa: 30,
  totalAgenda: 18,
  catatanPeriode: "Monitoring agenda bulanan PPG Daerah Magetan Timur bulan berjalan (Oktober 2026).",
  createdBy: "Biro Kurikulum & Monev Daerah",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-13T07:00:00Z"
};

// ==========================================
// 1. MASTER AGENDA OPERATIONS
// ==========================================

export function getMasterAgendas(): MonevMasterAgenda[] {
  const existing = loadData<MonevMasterAgenda[]>(KEY_MASTER_AGENDA, []);
  if (!existing || existing.length === 0) {
    const seeded: MonevMasterAgenda[] = INITIAL_18_MASTER_AGENDA.map((item) => ({
      ...item,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z"
    }));
    saveData(KEY_MASTER_AGENDA, seeded);
    return seeded;
  }
  return existing.slice().sort((a, b) => a.nomorUrut - b.nomorUrut);
}

export function saveMasterAgendas(agendas: MonevMasterAgenda[]): void {
  saveData(KEY_MASTER_AGENDA, agendas);
}

export function updateMasterAgenda(
  id: string, 
  data: Partial<MonevMasterAgenda>, 
  actor: string, 
  actorRole: string
): MonevMasterAgenda {
  if (!canManageMasterAgenda(actorRole)) {
    throw new Error("Akses ditolak: Hanya PPG Admin yang berwenang mengubah Master Agenda.");
  }

  const current = getMasterAgendas();
  let oldItem: MonevMasterAgenda | null = null;
  let updatedItem: MonevMasterAgenda | null = null;
  const now = new Date().toISOString();

  const next = current.map(item => {
    if (item.id === id) {
      oldItem = { ...item };
      updatedItem = { ...item, ...data, id: item.id, updatedAt: now };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) throw new Error(`Master agenda dengan ID ${id} tidak ditemukan.`);
  saveMasterAgendas(next);

  recordMonevAudit({
    entityType: "MASTER_AGENDA",
    entityId: id,
    action: "UPDATE",
    actorUsername: actor,
    actorRole,
    oldValue: oldItem ? { judulAgenda: (oldItem as MonevMasterAgenda).judulAgenda, isActive: (oldItem as MonevMasterAgenda).isActive, isMandatory: (oldItem as MonevMasterAgenda).isMandatory } : undefined,
    newValue: data,
    details: data
  });

  return updatedItem;
}

export function addMasterAgenda(
  data: Omit<MonevMasterAgenda, "id" | "createdAt" | "updatedAt">,
  actor: string,
  actorRole: string
): MonevMasterAgenda {
  if (!canManageMasterAgenda(actorRole)) {
    throw new Error("Akses ditolak: Hanya PPG Admin yang berwenang menambah Master Agenda.");
  }

  const current = getMasterAgendas();
  const now = new Date().toISOString();
  const newId = "mag-" + String(Date.now()).slice(-6);

  const newItem: MonevMasterAgenda = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now
  };

  const next = [...current, newItem];
  saveMasterAgendas(next);

  recordMonevAudit({
    entityType: "MASTER_AGENDA",
    entityId: newId,
    action: "CREATE",
    actorUsername: actor,
    actorRole,
    newValue: newItem,
    details: newItem
  });

  return newItem;
}

// ==========================================
// 2. PERIOD LIFECYCLE MANAGEMENT
// ==========================================

export function getPeriods(): MonevPeriod[] {
  const existing = loadData<MonevPeriod[]>(KEY_PERIODS, []);
  if (!existing || existing.length === 0) {
    saveData(KEY_PERIODS, [DEFAULT_INITIAL_PERIOD]);
    return [DEFAULT_INITIAL_PERIOD];
  }
  return existing;
}

export function getPeriodById(id: string): MonevPeriod | null {
  const periods = getPeriods();
  return periods.find(p => p.id === id) || null;
}

export function getActivePeriod(): MonevPeriod {
  const periods = getPeriods();
  const open = periods.find(p => p.status === "OPEN");
  if (open) return open;
  const verification = periods.find(p => p.status === "VERIFICATION");
  if (verification) return verification;
  return periods[0] || DEFAULT_INITIAL_PERIOD;
}

export function createPeriod(
  periodData: {
    namaPeriode: string;
    tahun: number;
    bulan: number;
    tanggalMulai: string;
    tanggalSelesai: string;
    cakupanWilayah?: string[];
    selectedAgendaIds?: string[];
    selectedDesas?: string[];
    catatanPeriode?: string;
  },
  actor: string,
  actorRole: string
): MonevPeriod {
  if (!canManagePeriods(actorRole)) {
    throw new Error("Akses ditolak: Hanya PPG Admin yang berwenang membuat periode baru.");
  }

  if (!periodData.namaPeriode || !periodData.namaPeriode.trim()) {
    throw new Error("Nama periode wajib diisi.");
  }

  if (periodData.bulan < 1 || periodData.bulan > 12) {
    throw new Error("Bulan periode harus antara 1 sampai 12.");
  }

  const periods = getPeriods();
  const padMonth = String(periodData.bulan).padStart(2, "0");
  const periodeKode = `${periodData.tahun}-${padMonth}`;

  const exists = periods.some(p => p.periodeKode === periodeKode);
  if (exists) {
    throw new Error(`Periode dengan kode ${periodeKode} sudah ada di sistem.`);
  }

  const cakupanWilayah = periodData.cakupanWilayah && periodData.cakupanWilayah.length > 0
    ? periodData.cakupanWilayah
    : ["Desa Selatan", "Desa Tengah", "Desa Utara", "Desa Timur"];

  const defaultDesas: string[] = [];
  MASTER_WILAYAH_CONFIG.filter(w => cakupanWilayah.includes(w.wilayah)).forEach(w => {
    w.desas.forEach(d => defaultDesas.push(normalizeDesaName(d)));
  });

  const selectedDesas = periodData.selectedDesas && periodData.selectedDesas.length > 0
    ? periodData.selectedDesas.map(normalizeDesaName)
    : defaultDesas;

  const activeAgendas = getMasterAgendas().filter(a => a.isActive);
  const selectedAgendaIds = periodData.selectedAgendaIds && periodData.selectedAgendaIds.length > 0
    ? periodData.selectedAgendaIds
    : activeAgendas.map(a => a.id);

  const now = new Date().toISOString();
  const newPeriod: MonevPeriod = {
    id: `period-${periodeKode}`,
    namaPeriode: periodData.namaPeriode.trim(),
    tahun: periodData.tahun,
    bulan: periodData.bulan,
    periodeKode,
    status: "DRAFT",
    tanggalMulai: periodData.tanggalMulai,
    tanggalSelesai: periodData.tanggalSelesai,
    cakupanWilayah,
    selectedAgendaIds,
    selectedDesas,
    totalDesa: selectedDesas.length || 30,
    totalAgenda: selectedAgendaIds.length || 18,
    catatanPeriode: periodData.catatanPeriode || "",
    createdBy: actor,
    createdAt: now,
    updatedAt: now
  };

  const nextPeriods = [newPeriod, ...periods];
  saveData(KEY_PERIODS, nextPeriods);

  // Freeze Snapshot for this period
  ensurePeriodSnapshots(newPeriod.id);

  recordMonevAudit({
    entityType: "PERIOD",
    entityId: newPeriod.id,
    action: "CREATE",
    actorUsername: actor,
    actorRole,
    newValue: newPeriod,
    details: newPeriod
  });

  syncMonevToMainDatabase(actor);

  return newPeriod;
}

export function transitionPeriodStatus(
  periodId: string,
  nextStatus: MonevPeriodStatus,
  actor: string,
  actorRole: string
): MonevPeriod {
  if (!canManagePeriods(actorRole)) {
    throw new Error("Akses ditolak: Hanya PPG Admin yang berwenang mengubah status periode.");
  }

  const periods = getPeriods();
  const period = periods.find(p => p.id === periodId);
  if (!period) throw new Error(`Periode ${periodId} tidak ditemukan.`);

  const VALID_TRANSITIONS: Record<MonevPeriodStatus, MonevPeriodStatus[]> = {
    DRAFT: ["OPEN"],
    OPEN: ["VERIFICATION", "LOCKED"],
    VERIFICATION: ["LOCKED", "OPEN"],
    LOCKED: ["ARCHIVED", "OPEN"],
    ARCHIVED: []
  };

  const allowed = VALID_TRANSITIONS[period.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Transisi status dari ${period.status} ke ${nextStatus} tidak valid. Transisi yang diizinkan: ${allowed.join(", ") || "None"}.`);
  }

  // Jika transisi ke OPEN, pastikan snapshot dibekukan
  if (nextStatus === "OPEN") {
    ensurePeriodSnapshots(periodId);
  }

  const now = new Date().toISOString();
  const updatedPeriod: MonevPeriod = {
    ...period,
    status: nextStatus,
    lockedBy: nextStatus === "LOCKED" ? actor : period.lockedBy,
    lockedAt: nextStatus === "LOCKED" ? now : period.lockedAt,
    updatedAt: now
  };

  const nextPeriods = periods.map(p => p.id === periodId ? updatedPeriod : p);
  saveData(KEY_PERIODS, nextPeriods);

  // Jika status periode dikunci (LOCKED), kunci juga semua submission yang belum VERIFIED
  if (nextStatus === "LOCKED") {
    const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
    const updatedSubs = allSubs.map(s => {
      if (s.periodId === periodId && s.status !== "VERIFIED") {
        return { ...s, status: "LOCKED" as MonevSubmissionStatus, updatedAt: now };
      }
      return s;
    });
    saveData(KEY_SUBMISSIONS, updatedSubs);
  } else if (nextStatus === "OPEN" && period.status === "LOCKED") {
    // Jika dibuka kembali dari LOCKED oleh Admin, kembalikan submission yang LOCKED ke DRAFT
    const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
    const updatedSubs = allSubs.map(s => {
      if (s.periodId === periodId && s.status === "LOCKED") {
        return { ...s, status: "DRAFT" as MonevSubmissionStatus, updatedAt: now };
      }
      return s;
    });
    saveData(KEY_SUBMISSIONS, updatedSubs);
  }

  recordMonevAudit({
    entityType: "PERIOD",
    entityId: periodId,
    action: nextStatus === "LOCKED" ? "LOCK" : "STATUS_CHANGE",
    actorUsername: actor,
    actorRole,
    oldValue: { status: period.status },
    newValue: { status: nextStatus, lockedBy: updatedPeriod.lockedBy, lockedAt: updatedPeriod.lockedAt },
    details: { oldStatus: period.status, newStatus: nextStatus }
  });

  return updatedPeriod;
}

export const updatePeriodStatus = transitionPeriodStatus;

// ==========================================
// 3. PERIOD SNAPSHOT & IDEMPOTENT GENERATOR
// ==========================================

export function getPeriodSnapshots(periodId: string): MonevPeriodAgendaSnapshot[] {
  const allSnapshots = loadData<MonevPeriodAgendaSnapshot[]>(KEY_SNAPSHOTS, []);
  return allSnapshots
    .filter(s => s.periodId === periodId)
    .sort((a, b) => a.nomorUrut - b.nomorUrut);
}

export function ensurePeriodSnapshots(periodId: string): MonevPeriodAgendaSnapshot[] {
  const existing = getPeriodSnapshots(periodId);
  if (existing.length > 0) return existing;

  const period = getPeriodById(periodId);
  const allSnapshots = loadData<MonevPeriodAgendaSnapshot[]>(KEY_SNAPSHOTS, []);
  let masterAgendas = getMasterAgendas().filter(a => a.isActive);

  if (period?.selectedAgendaIds && period.selectedAgendaIds.length > 0) {
    const filtered = masterAgendas.filter(a => period.selectedAgendaIds!.includes(a.id));
    if (filtered.length > 0) {
      masterAgendas = filtered;
    }
  }

  const now = new Date().toISOString();
  const bobot = Number((100 / (masterAgendas.length || 1)).toFixed(2));

  const newSnapshots: MonevPeriodAgendaSnapshot[] = masterAgendas.map(mag => ({
    id: `snap-${periodId}-${mag.id}`,
    periodId,
    masterAgendaId: mag.id,
    nomorUrut: mag.nomorUrut,
    judulAgenda: mag.judulAgenda,
    kategori: mag.kategori,
    sasaran: mag.sasaran,
    isMandatory: mag.isMandatory,
    bobotPersen: bobot,
    createdAt: now
  }));

  saveData(KEY_SNAPSHOTS, [...allSnapshots, ...newSnapshots]);
  return newSnapshots;
}

export function generatePeriodMonitoringItems(
  periodId: string,
  actor: string,
  actorRole: string,
  options?: {
    selectedDesas?: string[];
    selectedAgendaIds?: string[];
  }
): { 
  totalVillages: number; 
  totalAgendas: number; 
  totalExpectedItems: number; 
  createdSubmissions: number; 
  createdItems: number; 
} {
  if (!canManagePeriods(actorRole)) {
    throw new Error("Akses ditolak: Hanya PPG Admin yang berwenang men-generate monitoring periode.");
  }

  const period = getPeriodById(periodId);
  if (!period) throw new Error(`Periode ${periodId} tidak ditemukan.`);

  if (period.status === "LOCKED" || period.status === "ARCHIVED") {
    throw new Error(`Periode ${period.namaPeriode} berstatus ${period.status} dan tidak dapat di-generate ulang.`);
  }

  const snapshots = ensurePeriodSnapshots(periodId);
  const activeSnapshots = options?.selectedAgendaIds && options.selectedAgendaIds.length > 0
    ? snapshots.filter(s => options.selectedAgendaIds!.includes(s.masterAgendaId) || options.selectedAgendaIds!.includes(s.id))
    : snapshots;

  const allSubmissions = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);

  const targetWilayahConfigs = MASTER_WILAYAH_CONFIG.filter(cfg => 
    period.cakupanWilayah.includes(cfg.wilayah)
  );

  const allowedDesasSet = new Set<string>(
    (options?.selectedDesas && options.selectedDesas.length > 0)
      ? options.selectedDesas.map(normalizeDesaName)
      : (period.selectedDesas && period.selectedDesas.length > 0)
        ? period.selectedDesas.map(normalizeDesaName)
        : []
  );

  let newSubmissionsCount = 0;
  let newItemsCount = 0;
  let totalVillages = 0;
  const submissionsToAdd: MonevSubmission[] = [];
  const itemsToAdd: MonevMonitoringItem[] = [];

  const now = new Date().toISOString();

  const submissionMap = new Map<string, MonevSubmission>();
  allSubmissions.forEach(s => {
    submissionMap.set(`${s.periodId}:${normalizeDesaName(s.desa)}`, s);
  });

  const itemMap = new Map<string, MonevMonitoringItem>();
  allItems.forEach(i => {
    itemMap.set(`${i.periodId}:${normalizeDesaName(i.desa)}:${i.agendaSnapshotId}`, i);
  });

  targetWilayahConfigs.forEach(cfg => {
    cfg.desas.forEach(desaName => {
      const normalizedDesa = normalizeDesaName(desaName);
      if (allowedDesasSet.size > 0 && !allowedDesasSet.has(normalizedDesa)) {
        return;
      }
      totalVillages++;

      const subKey = `${periodId}:${normalizedDesa}`;
      let sub = submissionMap.get(subKey);
      const canonicalReportId = getCanonicalReportId(periodId, normalizedDesa);
      const desaNama = formatDesaShort(cfg.wilayah);
      const kelompokNama = formatKelompokShort(normalizedDesa);
      if (!sub) {
        sub = {
          id: canonicalReportId,
          reportId: canonicalReportId,
          periodId,
          wilayah: cfg.wilayah,
          desa: normalizedDesa,
          desaNama,
          kelompokNama,
          status: "DRAFT",
          progressPersen: 0,
          agendaSelesai: 0,
          agendaTotal: activeSnapshots.length,
          createdAt: BASELINE_AUTO_EPOCH,
          updatedAt: BASELINE_AUTO_EPOCH
        };
        submissionMap.set(subKey, sub);
        submissionsToAdd.push(sub);
        newSubmissionsCount++;
      }

      activeSnapshots.forEach(snap => {
        const itemKey = `${periodId}:${normalizedDesa}:${snap.id}`;
        if (!itemMap.has(itemKey)) {
          const newItem: MonevMonitoringItem = {
            id: `item-${periodId}-${normalizedDesa.toLowerCase().replace(/[^a-z0-9]/g, "")}-${snap.masterAgendaId}`,
            submissionId: sub!.id,
            reportId: canonicalReportId,
            periodId,
            agendaSnapshotId: snap.id,
            wilayah: cfg.wilayah,
            desa: normalizedDesa,
            desaNama,
            kelompokNama,
            judulAgenda: snap.judulAgenda,
            nomorUrut: snap.nomorUrut,
            kategori: snap.kategori,
            terlaksana: false,
            statusKetercapaian: "NOT_STARTED",
            isMandatory: snap.isMandatory,
            ketercapaianPersen: 0,
            penanggungJawab: "",
            kendala: "",
            tindakLanjut: "",
            catatanEvaluasi: "",
            evidenceUrls: [],
            createdAt: BASELINE_AUTO_EPOCH,
            updatedAt: BASELINE_AUTO_EPOCH
          };
          itemMap.set(itemKey, newItem);
          itemsToAdd.push(newItem);
          newItemsCount++;
        }
      });
    });
  });

  if (submissionsToAdd.length > 0) {
    saveData(KEY_SUBMISSIONS, [...allSubmissions, ...submissionsToAdd]);
  }

  if (itemsToAdd.length > 0) {
    saveData(KEY_ITEMS, [...allItems, ...itemsToAdd]);
  }

  recordMonevAudit({
    entityType: "PERIOD",
    entityId: periodId,
    action: "GENERATE_ITEMS",
    actorUsername: actor,
    actorRole,
    details: {
      newSubmissionsCount,
      newItemsCount,
      totalVillages,
      totalAgendas: activeSnapshots.length,
      totalExpectedItems: totalVillages * activeSnapshots.length
    }
  });

  return {
    totalVillages,
    totalAgendas: activeSnapshots.length,
    totalExpectedItems: totalVillages * activeSnapshots.length,
    createdSubmissions: newSubmissionsCount,
    createdItems: newItemsCount
  };
}

/**
 * Helper: Menemukan Wilayah (Desa Induk) dari nama Kelompok/Desa
 */
export function getWilayahForDesa(desa: string): string {
  const norm = normalizeDesaName(desa);
  for (const cfg of MASTER_WILAYAH_CONFIG) {
    if (cfg.wilayah === desa || cfg.wilayah === norm) return cfg.wilayah;
    if (cfg.desas.some(d => normalizeDesaName(d) === norm)) {
      return cfg.wilayah;
    }
  }
  return "Desa Selatan";
}

export const findWilayahByDesa = getWilayahForDesa;

/**
 * Self-Provisioning Engine (Aturan Utama Section 2, 3, 7, 8):
 * User yang memiliki kewenangan mengisi MONEV TIDAK PERLU menunggu approval atau aksi generate manual Admin.
 * Ketika periode tersedia (OPEN / VERIFICATION / DRAFT) dan user membuka MONEV untuk scope-nya,
 * sistem otomatis memastikan 18 item agenda & record submission DRAFT telah siap diisi secara idempotent.
 */
export function ensureDesaMonitoringItems(periodId: string, targetDesaOrScope?: string): void {
  const period = getPeriodById(periodId);
  if (!period || period.status === "LOCKED" || period.status === "ARCHIVED") {
    return;
  }

  const snapshots = ensurePeriodSnapshots(periodId);
  if (snapshots.length === 0) return;

  const allSubmissions = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);

  const targetDesas: { desa: string; wilayah: string }[] = [];

  if (targetDesaOrScope && targetDesaOrScope !== "Semua" && targetDesaOrScope !== "Daerah Magetan Timur") {
    if (targetDesaOrScope.startsWith("Desa ")) {
      const cfg = MASTER_WILAYAH_CONFIG.find(w => w.wilayah === targetDesaOrScope);
      if (cfg) {
        cfg.desas.forEach(d => targetDesas.push({ desa: normalizeDesaName(d), wilayah: cfg.wilayah }));
      } else {
        const norm = normalizeDesaName(targetDesaOrScope);
        targetDesas.push({ desa: norm, wilayah: getWilayahForDesa(norm) });
      }
    } else {
      const norm = normalizeDesaName(targetDesaOrScope);
      // Pastikan desa tersebut valid di dalam MASTER_WILAYAH_CONFIG
      const foundCfg = MASTER_WILAYAH_CONFIG.find(w => w.desas.some(d => normalizeDesaName(d) === norm));
      if (foundCfg) {
        targetDesas.push({ desa: norm, wilayah: foundCfg.wilayah });
      }
    }
  } else {
    MASTER_WILAYAH_CONFIG.filter(cfg => period.cakupanWilayah.includes(cfg.wilayah)).forEach(cfg => {
      cfg.desas.forEach(d => {
        const norm = normalizeDesaName(d);
        if (!period.selectedDesas || period.selectedDesas.length === 0 || period.selectedDesas.map(normalizeDesaName).includes(norm)) {
          targetDesas.push({ desa: norm, wilayah: cfg.wilayah });
        }
      });
    });
  }

  if (targetDesas.length === 0) return;

  const submissionMap = new Map<string, MonevSubmission>();
  allSubmissions.forEach(s => {
    submissionMap.set(`${s.periodId}:${normalizeDesaName(s.desa)}`, s);
  });

  const itemMap = new Map<string, MonevMonitoringItem>();
  allItems.forEach(i => {
    itemMap.set(`${i.periodId}:${normalizeDesaName(i.desa)}:${i.agendaSnapshotId}`, i);
  });

  const submissionsToAdd: MonevSubmission[] = [];
  const itemsToAdd: MonevMonitoringItem[] = [];
  const now = new Date().toISOString();

  targetDesas.forEach(({ desa: normalizedDesa, wilayah }) => {
    const subKey = `${periodId}:${normalizedDesa}`;
    let sub = submissionMap.get(subKey);
    const canonicalReportId = getCanonicalReportId(periodId, normalizedDesa);
    const desaNama = formatDesaShort(wilayah);
    const kelompokNama = formatKelompokShort(normalizedDesa);
    if (!sub) {
      sub = {
        id: canonicalReportId,
        reportId: canonicalReportId,
        periodId,
        wilayah,
        desa: normalizedDesa,
        desaNama,
        kelompokNama,
        status: "DRAFT",
        progressPersen: 0,
        agendaSelesai: 0,
        agendaTotal: snapshots.length,
        createdAt: BASELINE_AUTO_EPOCH,
        updatedAt: BASELINE_AUTO_EPOCH
      };
      submissionMap.set(subKey, sub);
      submissionsToAdd.push(sub);
    }

    snapshots.forEach(snap => {
      const itemKey = `${periodId}:${normalizedDesa}:${snap.id}`;
      if (!itemMap.has(itemKey)) {
        const newItem: MonevMonitoringItem = {
          id: `item-${periodId}-${normalizedDesa.toLowerCase().replace(/[^a-z0-9]/g, "")}-${snap.masterAgendaId}`,
          submissionId: sub!.id,
          reportId: canonicalReportId,
          periodId,
          agendaSnapshotId: snap.id,
          wilayah,
          desa: normalizedDesa,
          desaNama,
          kelompokNama,
          judulAgenda: snap.judulAgenda,
          nomorUrut: snap.nomorUrut,
          kategori: snap.kategori,
          terlaksana: false,
          statusKetercapaian: "NOT_STARTED",
          isMandatory: snap.isMandatory,
          ketercapaianPersen: 0,
          penanggungJawab: "",
          kendala: "",
          tindakLanjut: "",
          catatanEvaluasi: "",
          laporanPelaksanaan: "",
          evidenceUrls: [],
          createdAt: BASELINE_AUTO_EPOCH,
          updatedAt: BASELINE_AUTO_EPOCH
        };
        itemMap.set(itemKey, newItem);
        itemsToAdd.push(newItem);
      }
    });
  });

  if (submissionsToAdd.length > 0) {
    saveData(KEY_SUBMISSIONS, [...allSubmissions, ...submissionsToAdd]);
  }
  if (itemsToAdd.length > 0) {
    saveData(KEY_ITEMS, [...allItems, ...itemsToAdd]);
  }
}

// ==========================================
// 4. COMPLETION CALCULATION ENGINE
// ==========================================

/**
 * Rumus Standar Resmi (Section 20 & 38):
 * Completion = (Completed Required Items / Total Required Items) × 100
 * Rules:
 * - COMPLETED = selesai
 * - PARTIAL ≠ COMPLETED
 * - NOT_COMPLETED ≠ COMPLETED
 * - NOT_STARTED ≠ COMPLETED
 */
export function calculateCompletionRate(
  items: MonevMonitoringItem[],
  snapshots?: MonevPeriodAgendaSnapshot[]
): {
  totalMandatory: number;
  completedMandatory: number;
  completionRate: number;
  totalItems: number;
  completedTotal: number;
  partialTotal: number;
  notCompletedTotal: number;
  notStartedTotal: number;
} {
  const snapMap = new Map<string, boolean>();
  if (snapshots) {
    snapshots.forEach(s => snapMap.set(s.id, s.isMandatory));
  }

  const mandatoryItems = items.filter(item => {
    if (typeof item.isMandatory === "boolean") return item.isMandatory;
    if (snapMap.has(item.agendaSnapshotId)) return snapMap.get(item.agendaSnapshotId)!;
    return true;
  });

  const totalMandatory = mandatoryItems.length;

  const isItemCompleted = (item: MonevMonitoringItem): boolean => {
    if (item.statusKetercapaian) return item.statusKetercapaian === "COMPLETED";
    return item.terlaksana && item.ketercapaianPersen === 100;
  };

  const isItemPartial = (item: MonevMonitoringItem): boolean => {
    if (item.statusKetercapaian) return item.statusKetercapaian === "PARTIAL";
    return item.terlaksana && item.ketercapaianPersen > 0 && item.ketercapaianPersen < 100;
  };

  const isItemNotCompleted = (item: MonevMonitoringItem): boolean => {
    if (item.statusKetercapaian === "NOT_COMPLETED") return true;
    if (item.statusKetercapaian === "NOT_STARTED") return false;
    return !item.terlaksana && Boolean(item.updatedBy || (item.kendala && item.kendala.trim().length > 0));
  };

  const completedMandatory = mandatoryItems.filter(isItemCompleted).length;

  const completionRate = totalMandatory === 0 
    ? 0 
    : Number(((completedMandatory / totalMandatory) * 100).toFixed(1));

  const completedTotal = items.filter(isItemCompleted).length;
  const partialTotal = items.filter(isItemPartial).length;
  const notCompletedTotal = items.filter(isItemNotCompleted).length;
  const notStartedTotal = Math.max(0, items.length - completedTotal - partialTotal - notCompletedTotal);

  return {
    totalMandatory,
    completedMandatory,
    completionRate,
    totalItems: items.length,
    completedTotal,
    partialTotal,
    notCompletedTotal,
    notStartedTotal
  };
}

// ==========================================
// 5. SUBMISSIONS & MONITORING DATA
// ==========================================

export function getSubmissions(
  periodId: string,
  scope?: string,
  auth?: AuthScopeContext
): MonevSubmission[] {
  if (auth) {
    if (scope && scope !== "Semua" && scope !== "Daerah Magetan Timur") {
      if (scope.startsWith("Desa ")) {
        if (auth.role === "Admin Desa" && auth.scope !== scope) {
          throw new Error(`Akses ditolak (Cross-Village Forbidden): Admin Desa (${auth.scope}) tidak dapat mengakses ${scope}.`);
        }
        if (auth.role === "Admin Kelompok" || auth.role === "Pengajar") {
          const ownWilayah = getWilayahForDesa(auth.scope);
          if (ownWilayah !== scope) {
            throw new Error(`Akses ditolak (Cross-Village Forbidden): Admin Kelompok (${auth.scope}) tidak dapat mengakses ${scope}.`);
          }
        }
      } else {
        const readCheck = canReadVillageScope(auth.role, auth.scope, scope);
        if (!readCheck.allowed) {
          throw new Error(readCheck.reason || `Akses ditolak untuk ${scope}.`);
        }
      }
    }
    ensureDesaMonitoringItems(periodId, auth.scope);
  } else if (scope && scope !== "Semua" && scope !== "Daerah Magetan Timur") {
    ensureDesaMonitoringItems(periodId, scope);
  }

  const all = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  let list = all.filter(s => s.periodId === periodId);

  if (scope && scope !== "Semua" && scope !== "Daerah Magetan Timur") {
    if (scope.startsWith("Desa ")) {
      list = list.filter(s => s.wilayah === scope || normalizeDesaName(s.desa) === normalizeDesaName(scope.replace("Desa ", "")));
    } else {
      const normScope = normalizeDesaName(scope);
      list = list.filter(s => normalizeDesaName(s.desa) === normScope || s.wilayah === scope);
    }
  }

  if (auth) {
    list = list.filter(s => canReadVillageScope(auth.role, auth.scope, s.desa, s.wilayah).allowed);
  }

  return list;
}

export function getMonitoringItems(
  periodId: string, 
  desa?: string, 
  wilayah?: string,
  auth?: AuthScopeContext
): MonevMonitoringItem[] {
  if (auth) {
    if (desa && desa !== "Semua") {
      const readCheck = canReadVillageScope(auth.role, auth.scope, desa, wilayah);
      if (!readCheck.allowed) {
        throw new Error(readCheck.reason || `Akses ditolak untuk Kelompok/Desa ${desa}.`);
      }
    }
    if (wilayah && wilayah !== "Semua") {
      if (auth.role === "Admin Desa" && auth.scope !== wilayah) {
        throw new Error(`Akses ditolak (Cross-Village Forbidden): Admin Desa (${auth.scope}) tidak dapat mengakses wilayah ${wilayah}.`);
      }
      if ((auth.role === "Admin Kelompok" || auth.role === "Pengajar") && getWilayahForDesa(auth.scope) !== wilayah) {
        throw new Error(`Akses ditolak (Cross-Group/Village Forbidden): Admin Kelompok (${auth.scope}) tidak dapat mengakses wilayah ${wilayah}.`);
      }
    }
  }

  if (desa && desa !== "Semua") {
    ensureDesaMonitoringItems(periodId, desa);
  } else if (auth && auth.scope && auth.scope !== "Semua" && auth.scope !== "Daerah Magetan Timur") {
    ensureDesaMonitoringItems(periodId, auth.scope);
  }

  const all = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  let list = all.filter(item => item.periodId === periodId);

  if (desa && desa !== "Semua") {
    const norm = normalizeDesaName(desa);
    list = list.filter(item => normalizeDesaName(item.desa) === norm);
  }

  if (wilayah && wilayah !== "Semua") {
    list = list.filter(item => item.wilayah === wilayah);
  }

  if (auth) {
    list = list.filter(item => canReadVillageScope(auth.role, auth.scope, item.desa, item.wilayah).allowed);
  }

  return list.sort((a, b) => a.nomorUrut - b.nomorUrut);
}

/**
 * IDOR-Protected Direct Object Getters (Section 29)
 */
export function getSubmissionById(submissionId: string, auth: AuthScopeContext): MonevSubmission {
  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const sub = allSubs.find(s => s.id === submissionId);
  if (!sub) throw new Error(`Submission ${submissionId} tidak ditemukan.`);

  const check = canReadVillageScope(auth.role, auth.scope, sub.desa, sub.wilayah);
  if (!check.allowed) {
    throw new Error(check.reason || `Akses ditolak (IDOR Protection): Anda tidak berwenang mengakses submission ${submissionId}.`);
  }
  return sub;
}

export function getMonitoringItemById(itemId: string, auth: AuthScopeContext): MonevMonitoringItem {
  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  const item = allItems.find(i => i.id === itemId);
  if (!item) throw new Error(`Monitoring item ${itemId} tidak ditemukan.`);

  const check = canReadVillageScope(auth.role, auth.scope, item.desa, item.wilayah);
  if (!check.allowed) {
    throw new Error(check.reason || `Akses ditolak (IDOR Protection): Anda tidak berwenang mengakses item ${itemId}.`);
  }
  return item;
}

export function getFollowUpById(followUpId: string, auth: AuthScopeContext): MonevFollowUp {
  const allFollowUps = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
  const fu = allFollowUps.find(f => f.id === followUpId);
  if (!fu) throw new Error(`Follow-up ${followUpId} tidak ditemukan.`);

  const check = canReadVillageScope(auth.role, auth.scope, fu.desa, fu.wilayah);
  if (!check.allowed) {
    throw new Error(check.reason || `Akses ditolak (IDOR Protection): Anda tidak berwenang mengakses follow-up ${followUpId}.`);
  }
  return fu;
}

export function getEvidenceById(evidenceId: string, auth: AuthScopeContext): MonevEvidence {
  const allEvidence = loadData<MonevEvidence[]>(KEY_EVIDENCE, []);
  const ev = allEvidence.find(e => e.id === evidenceId);
  if (!ev) throw new Error(`Evidence ${evidenceId} tidak ditemukan.`);

  const check = canReadVillageScope(auth.role, auth.scope, ev.desa, ev.wilayah);
  if (!check.allowed) {
    throw new Error(check.reason || `Akses ditolak (IDOR Protection): Anda tidak berwenang mengakses evidence ${evidenceId}.`);
  }
  return ev;
}

export function updateMonitoringItem(
  itemId: string,
  updates: Partial<MonevMonitoringItem>,
  actor: string,
  actorRole: string,
  userScope?: string
): MonevMonitoringItem {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer hanya memiliki izin baca (read-only).");
  }

  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  const index = allItems.findIndex(i => i.id === itemId);
  if (index === -1) throw new Error(`Monitoring item ${itemId} tidak ditemukan.`);

  const currentItem = allItems[index];

  // 1. Validasi akses desa (Mencegah manipulasi ID / IDOR lintas kelompok & lintas desa)
  const effectiveScope = userScope || getUserDetails(actor)?.scope;
  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, currentItem.desa, currentItem.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak: Anda tidak memiliki izin untuk Desa ${currentItem.desa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  // 2. Validasi status periode
  const period = getPeriodById(currentItem.periodId);
  if (period && (period.status === "LOCKED" || period.status === "ARCHIVED")) {
    throw new Error(`Periode ${period.namaPeriode} terkunci (${period.status}) dan tidak dapat diedit.`);
  }
  if (period && period.status === "DRAFT" && actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error(`Periode ${period.namaPeriode} masih berstatus DRAFT dan belum dibuka untuk pengisian.`);
  }

  // 3. Validasi status submission desa
  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const sub = allSubs.find(s => s.periodId === currentItem.periodId && normalizeDesaName(s.desa) === normalizeDesaName(currentItem.desa));
  if (sub && (sub.status === "VERIFIED" || sub.status === "SUBMITTED" || sub.status === "LOCKED")) {
    if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
      throw new Error(`Laporan Desa ${currentItem.desa} berstatus ${sub.status} dan terkunci dari perubahan biasa.`);
    }
  }

  // 4. Sinkronisasi status ketercapaian
  let derivedStatus: MonevAgendaCompletionStatus = currentItem.statusKetercapaian || "NOT_STARTED";
  let terlaksana = currentItem.terlaksana;
  let ketercapaianPersen = currentItem.ketercapaianPersen;

  if (updates.statusKetercapaian) {
    derivedStatus = updates.statusKetercapaian;
    if (derivedStatus === "COMPLETED") {
      terlaksana = true;
      ketercapaianPersen = 100;
    } else if (derivedStatus === "PARTIAL") {
      terlaksana = true;
      ketercapaianPersen = (updates.ketercapaianPersen !== undefined && updates.ketercapaianPersen > 0 && updates.ketercapaianPersen < 100)
        ? updates.ketercapaianPersen
        : 50;
    } else if (derivedStatus === "NOT_COMPLETED") {
      terlaksana = false;
      ketercapaianPersen = 0;
    } else if (derivedStatus === "NOT_STARTED") {
      terlaksana = false;
      ketercapaianPersen = 0;
    }
  } else if (updates.terlaksana !== undefined || updates.ketercapaianPersen !== undefined) {
    terlaksana = updates.terlaksana !== undefined ? updates.terlaksana : currentItem.terlaksana;
    ketercapaianPersen = updates.ketercapaianPersen !== undefined ? updates.ketercapaianPersen : currentItem.ketercapaianPersen;
    if (terlaksana && ketercapaianPersen >= 100) {
      derivedStatus = "COMPLETED";
      ketercapaianPersen = 100;
    } else if (terlaksana && ketercapaianPersen > 0) {
      derivedStatus = "PARTIAL";
    } else {
      derivedStatus = "NOT_COMPLETED";
      ketercapaianPersen = 0;
    }
  }

  const now = new Date().toISOString();
  const oldSnapshot = {
    statusKetercapaian: currentItem.statusKetercapaian,
    terlaksana: currentItem.terlaksana,
    ketercapaianPersen: currentItem.ketercapaianPersen,
    kendala: currentItem.kendala,
    laporanPelaksanaan: currentItem.laporanPelaksanaan || currentItem.catatanEvaluasi
  };

  // Sinkronisasi laporanPelaksanaan & catatanEvaluasi agar keduanya selalu konsisten
  const syncedLaporan = updates.laporanPelaksanaan !== undefined
    ? updates.laporanPelaksanaan
    : updates.catatanEvaluasi !== undefined
      ? updates.catatanEvaluasi
      : (currentItem.laporanPelaksanaan || currentItem.catatanEvaluasi || "");

  const updatedItem: MonevMonitoringItem = {
    ...currentItem,
    ...updates,
    catatanEvaluasi: syncedLaporan,
    laporanPelaksanaan: syncedLaporan,
    terlaksana,
    ketercapaianPersen,
    statusKetercapaian: derivedStatus,
    createdBy: currentItem.createdBy || actor,
    updatedBy: actor,
    updatedAt: now
  };

  allItems[index] = updatedItem;
  saveData(KEY_ITEMS, allItems);

  // Recalculate submission progress
  recalculateSubmissionProgress(updatedItem.periodId, updatedItem.desa, actor);

  recordMonevAudit({
    entityType: "MONITORING_ITEM",
    entityId: itemId,
    action: "UPDATE",
    actorUsername: actor,
    actorRole,
    oldValue: oldSnapshot,
    newValue: {
      statusKetercapaian: updatedItem.statusKetercapaian,
      terlaksana: updatedItem.terlaksana,
      ketercapaianPersen: updatedItem.ketercapaianPersen,
      kendala: updatedItem.kendala,
      laporanPelaksanaan: updatedItem.laporanPelaksanaan
    },
    details: { desa: updatedItem.desa, agenda: updatedItem.judulAgenda, updated_by: actor, updated_at: now, ...updates }
  });

  syncMonevToMainDatabase(actor, updatedItem.desa);

  return updatedItem;
}

/**
 * Quick Fill Batch Update untuk Pengisian Efisien (< 3 Menit)
 */
export function batchUpdateMonitoringItems(
  periodId: string,
  desa: string,
  itemsInput: QuickFillItemInput[],
  actor: string,
  actorRole: string,
  userScope?: string
): { updatedCount: number; summary: DesaSubmissionSummary } {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer hanya memiliki izin baca (read-only).");
  }

  const normDesa = normalizeDesaName(desa);

  // Pastikan item desa telah ter-provision jika periode terbuka
  ensureDesaMonitoringItems(periodId, normDesa);

  // 1. Validasi Akses
  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const sub = allSubs.find(s => s.periodId === periodId && normalizeDesaName(s.desa) === normDesa);
  const targetWilayah = sub?.wilayah || getWilayahForDesa(normDesa);

  const effectiveScope = userScope || getUserDetails(actor)?.scope;
  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, normDesa, targetWilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak: Anda tidak memiliki izin untuk Desa ${normDesa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  // 2. Validasi status periode & submission
  const period = getPeriodById(periodId);
  if (period && (period.status === "LOCKED" || period.status === "ARCHIVED")) {
    throw new Error(`Periode terkunci (${period.status}). Tidak dapat menginput data.`);
  }
  if (period && period.status === "DRAFT" && actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error(`Periode masih berstatus DRAFT dan belum dibuka untuk pengisian.`);
  }

  if (sub && (sub.status === "VERIFIED" || sub.status === "SUBMITTED" || sub.status === "LOCKED")) {
    if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
      throw new Error(`Laporan Desa ${normDesa} berstatus ${sub.status} dan terkunci.`);
    }
  }

  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  const now = new Date().toISOString();
  let updatedCount = 0;

  itemsInput.forEach(input => {
    const idx = allItems.findIndex(i => i.id === input.itemId && i.periodId === periodId && normalizeDesaName(i.desa) === normDesa);
    if (idx !== -1) {
      let terlaksana = input.statusKetercapaian === "COMPLETED" || input.statusKetercapaian === "PARTIAL";
      let ketercapaianPersen = input.ketercapaianPersen;
      if (input.statusKetercapaian === "COMPLETED") ketercapaianPersen = 100;
      if (input.statusKetercapaian === "PARTIAL" && (ketercapaianPersen <= 0 || ketercapaianPersen >= 100)) {
        ketercapaianPersen = 50;
      }
      if (input.statusKetercapaian === "NOT_COMPLETED" || input.statusKetercapaian === "NOT_STARTED") {
        terlaksana = false;
        ketercapaianPersen = 0;
      }

      const syncedLaporan = input.laporanPelaksanaan !== undefined
        ? input.laporanPelaksanaan
        : input.catatanEvaluasi !== undefined
          ? input.catatanEvaluasi
          : (allItems[idx].laporanPelaksanaan || allItems[idx].catatanEvaluasi || "");

      allItems[idx] = {
        ...allItems[idx],
        statusKetercapaian: input.statusKetercapaian,
        terlaksana,
        ketercapaianPersen,
        tanggalPelaksanaan: input.tanggalPelaksanaan !== undefined ? input.tanggalPelaksanaan : allItems[idx].tanggalPelaksanaan,
        jumlahPeserta: input.jumlahPeserta !== undefined ? input.jumlahPeserta : allItems[idx].jumlahPeserta,
        penanggungJawab: input.penanggungJawab !== undefined ? input.penanggungJawab : allItems[idx].penanggungJawab,
        kendala: input.kendala !== undefined ? input.kendala : allItems[idx].kendala,
        tindakLanjut: input.rencanaTindakan !== undefined ? input.rencanaTindakan : allItems[idx].tindakLanjut,
        catatanEvaluasi: syncedLaporan,
        laporanPelaksanaan: syncedLaporan,
        evidenceUrls: input.evidenceUrls || allItems[idx].evidenceUrls,
        createdBy: allItems[idx].createdBy || actor,
        updatedBy: actor,
        updatedAt: now
      };
      updatedCount++;
    }
  });

  saveData(KEY_ITEMS, allItems);
  recalculateSubmissionProgress(periodId, normDesa, actor);

  recordMonevAudit({
    entityType: "SUBMISSION",
    entityId: sub?.id || `${periodId}-${normDesa}`,
    action: "BATCH_UPDATE",
    actorUsername: actor,
    actorRole,
    details: { desa: normDesa, updatedCount, updated_by: actor, updated_at: now }
  });

  syncMonevToMainDatabase(actor, normDesa);

  const summary = getDesaSubmissionSummary(periodId, normDesa);
  return { updatedCount, summary };
}

export function recalculateSubmissionProgress(periodId: string, desa: string, actor?: string): void {
  const normDesa = normalizeDesaName(desa);
  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const snapshots = getPeriodSnapshots(periodId);

  const desaItems = allItems.filter(i => i.periodId === periodId && normalizeDesaName(i.desa) === normDesa);
  if (desaItems.length === 0) return;

  const calc = calculateCompletionRate(desaItems, snapshots);

  const subIndex = allSubs.findIndex(s => s.periodId === periodId && normalizeDesaName(s.desa) === normDesa);
  if (subIndex !== -1) {
    const now = new Date().toISOString();
    allSubs[subIndex] = {
      ...allSubs[subIndex],
      progressPersen: calc.completionRate,
      agendaSelesai: calc.completedMandatory,
      agendaTotal: calc.totalMandatory || desaItems.length,
      createdBy: allSubs[subIndex].createdBy || actor || "system",
      updatedBy: actor || allSubs[subIndex].updatedBy || "system",
      updatedAt: now
    };
    saveData(KEY_SUBMISSIONS, allSubs);
  }
}

export function getDesaSubmissionSummary(
  periodId: string,
  desa: string,
  auth?: AuthScopeContext
): DesaSubmissionSummary {
  const normDesa = normalizeDesaName(desa);

  if (auth) {
    const readCheck = canReadVillageScope(auth.role, auth.scope, normDesa);
    if (!readCheck.allowed) {
      throw new Error(readCheck.reason || `Akses ditolak untuk Kelompok/Desa ${normDesa}.`);
    }
  }

  // Pastikan 18 item agenda langsung tersedia tanpa perlu approval admin
  ensureDesaMonitoringItems(periodId, normDesa);

  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const sub = allSubs.find(s => s.periodId === periodId && normalizeDesaName(s.desa) === normDesa) || null;
  const items = getMonitoringItems(periodId, normDesa);
  const snapshots = getPeriodSnapshots(periodId);

  const calc = calculateCompletionRate(items, snapshots);
  const totalAgendas = items.length || 18;

  const isItemFilled = (i: MonevMonitoringItem): boolean => {
    return (
      i.statusKetercapaian === "COMPLETED" ||
      i.statusKetercapaian === "PARTIAL" ||
      i.statusKetercapaian === "NOT_COMPLETED" ||
      i.terlaksana ||
      Boolean(i.kendala && i.kendala.trim().length > 0) ||
      Boolean(i.catatanEvaluasi && i.catatanEvaluasi.trim().length > 0) ||
      Boolean(i.laporanPelaksanaan && i.laporanPelaksanaan.trim().length > 0) ||
      i.ketercapaianPersen > 0
    );
  };

  // Agenda terisi adalah yang statusnya sudah dinyatakan secara aktif oleh pengisi (COMPLETED / PARTIAL / NOT_COMPLETED)
  const agendaTerisi = items.filter(isItemFilled).length;

  const incompleteAgendas = items
    .filter(i => (i.isMandatory !== false) && !isItemFilled(i))
    .map(i => ({ nomorUrut: i.nomorUrut, judulAgenda: i.judulAgenda }));

  const kendalaItems = items.filter(i => 
    i.statusKetercapaian === "PARTIAL" || 
    i.statusKetercapaian === "NOT_COMPLETED" || 
    Boolean(i.kendala && i.kendala.trim().length > 0)
  );

  const unreviewedMandatoryCount = incompleteAgendas.length;

  // Ready to submit jika seluruh agenda wajib (18 agenda) telah memiliki status
  const isReadyToSubmit = items.length > 0 && incompleteAgendas.length === 0;

  const statusLaporan: DesaSubmissionSummary["statusLaporan"] = !sub
    ? (agendaTerisi > 0 ? "DRAFT" : "NOT_STARTED")
    : (sub.status === "DRAFT" && agendaTerisi === 0 ? "NOT_STARTED" : sub.status);

  const statusVerifikasi: DesaSubmissionSummary["statusVerifikasi"] =
    sub?.status === "VERIFIED" ? "VERIFIED" :
    sub?.status === "REJECTED" ? "REJECTED" :
    "PENDING";

  const resolvedWilayah = sub?.wilayah || (items[0]?.wilayah || getWilayahForDesa(normDesa));
  const canonicalReportId = sub?.reportId || sub?.id || getCanonicalReportId(periodId, normDesa);

  return {
    periodId,
    reportId: canonicalReportId,
    desa: normDesa,
    wilayah: resolvedWilayah,
    desaNama: formatDesaShort(resolvedWilayah),
    kelompokNama: formatKelompokShort(normDesa),
    submission: sub ? {
      ...sub,
      reportId: canonicalReportId,
      desaNama: formatDesaShort(resolvedWilayah),
      kelompokNama: formatKelompokShort(normDesa)
    } : null,
    items,
    totalAgendas,
    totalMandatory: calc.totalMandatory,
    agendaTerisi,
    agendaTerlaksana: calc.completedMandatory,
    agendaPartial: calc.partialTotal,
    agendaNotCompleted: calc.notCompletedTotal,
    agendaBelumTerlaksana: calc.notCompletedTotal + calc.partialTotal,
    agendaNotStarted: calc.notStartedTotal,
    completedMandatory: calc.completedMandatory,
    avgKetercapaian: calc.completionRate,
    statusLaporan,
    statusVerifikasi,
    isReadyToSubmit,
    unreviewedMandatoryCount,
    incompleteAgendas,
    kendalaItems
  };
}

export function submitDesaReport(
  periodId: string,
  desa: string,
  submittedBy: string,
  userRole?: string,
  userScope?: string
): MonevSubmission {
  const normDesa = normalizeDesaName(desa);
  const period = getPeriodById(periodId);
  if (!period || period.status !== "OPEN") {
    throw new Error("Laporan desa hanya dapat dikirim saat status periode OPEN.");
  }

  ensureDesaMonitoringItems(periodId, normDesa);

  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const subIndex = allSubs.findIndex(s => s.periodId === periodId && normalizeDesaName(s.desa) === normDesa);
  if (subIndex === -1) throw new Error(`Submission desa ${desa} tidak ditemukan.`);

  const currentSub = allSubs[subIndex];

  // Validasi Otoritas Lintas Desa & Peran
  const userDetails = getUserDetails(submittedBy);
  const effectiveRole = userRole || userDetails?.role || "Admin Desa";
  const effectiveScope = userScope || userDetails?.scope;

  if (effectiveRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer tidak diizinkan mengirim laporan.");
  }

  if (effectiveScope) {
    const access = validateVillageAccess(effectiveRole, effectiveScope, normDesa, currentSub.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak: Anda tidak memiliki wewenang untuk mengirim laporan Kelompok ${desa}.`);
    }
  } else if (effectiveRole !== "Super Admin" && effectiveRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  if (currentSub.status === "VERIFIED") {
    throw new Error(`Laporan Kelompok ${desa} telah disetujui dan tidak dapat dikirim ulang.`);
  }

  if (currentSub.status === "LOCKED") {
    throw new Error(`Laporan Kelompok ${desa} telah terkunci dan tidak dapat dikirim.`);
  }

  if (currentSub.status === "SUBMITTED") {
    throw new Error(`Laporan Kelompok ${desa} sudah disetor dan sedang menunggu persetujuan.`);
  }

  const summary = getDesaSubmissionSummary(periodId, normDesa);
  if (summary.incompleteAgendas.length > 0) {
    const missingList = summary.incompleteAgendas
      .map(a => `Agenda #${String(a.nomorUrut).padStart(2, "0")} (${a.judulAgenda})`)
      .join(", ");
    throw new Error(`Masih ada ${summary.incompleteAgendas.length} agenda yang belum diisi: ${missingList}`);
  }
  if (!summary.isReadyToSubmit) {
    throw new Error(`Laporan Kelompok ${desa} belum dapat disetor: Seluruh 18 agenda wajib harus diisi terlebih dahulu.`);
  }

  const now = new Date().toISOString();
  const oldStatus = currentSub.status;
  const auditAction = oldStatus === "REJECTED" ? "RESUBMIT" : "STATUS_CHANGE";
  const canonicalReportId = currentSub.reportId || currentSub.id || getCanonicalReportId(periodId, normDesa);

  allSubs[subIndex] = {
    ...currentSub,
    id: canonicalReportId,
    reportId: canonicalReportId,
    desaNama: formatDesaShort(currentSub.wilayah),
    kelompokNama: formatKelompokShort(normDesa),
    status: "SUBMITTED",
    progressPersen: summary.avgKetercapaian,
    agendaSelesai: summary.completedMandatory,
    agendaTotal: summary.totalMandatory || summary.totalAgendas,
    createdBy: currentSub.createdBy || submittedBy,
    updatedBy: submittedBy,
    submittedBy,
    submittedAt: now,
    updatedAt: now
  };

  saveData(KEY_SUBMISSIONS, allSubs);

  recordMonevAudit({
    entityType: "SUBMISSION",
    entityId: canonicalReportId,
    action: auditAction,
    actorUsername: submittedBy,
    actorRole: effectiveRole,
    oldValue: { status: oldStatus },
    newValue: {
      report_id: canonicalReportId,
      status: "SUBMITTED",
      progressPersen: summary.avgKetercapaian,
      submittedBy,
      submittedAt: now
    },
    details: { 
      report_id: canonicalReportId,
      desa: normDesa,
      desa_nama: formatDesaShort(currentSub.wilayah),
      kelompok_nama: formatKelompokShort(normDesa),
      status: "SUBMITTED",
      isResubmit: oldStatus === "REJECTED",
      progressPersen: summary.avgKetercapaian,
      completedMandatory: summary.completedMandatory,
      totalMandatory: summary.totalMandatory,
      submitted_by: submittedBy,
      submitted_at: now
    }
  });

  syncMonevToMainDatabase(submittedBy, normDesa);

  return allSubs[subIndex];
}

export function verifyDesaReport(
  submissionId: string,
  status: "VERIFIED" | "REJECTED",
  catatan: string,
  verifier: string,
  verifierRole: string,
  verifierScope?: string
): MonevSubmission {
  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const subIndex = allSubs.findIndex(s => s.id === submissionId || s.reportId === submissionId);
  if (subIndex === -1) throw new Error(`Submission ${submissionId} tidak ditemukan.`);

  const currentSub = allSubs[subIndex];
  const userDetails = getUserDetails(verifier);
  const effectiveRole = verifierRole || userDetails?.role || "";
  const effectiveScope = verifierScope || userDetails?.scope || "Semua";

  const approveAccess = canApproveReport(effectiveRole, effectiveScope, currentSub.desa, currentSub.wilayah);
  if (!approveAccess.allowed) {
    throw new Error(approveAccess.reason || "Akses ditolak: Anda tidak memiliki wewenang menyetujui/menolak laporan ini.");
  }

  const period = getPeriodById(currentSub.periodId);
  if (period && (period.status === "LOCKED" || period.status === "ARCHIVED")) {
    throw new Error(`Periode ${period.namaPeriode} telah terkunci (${period.status}). Tidak dapat melakukan persetujuan/penolakan.`);
  }

  // Penolakan wajib menyertakan alasan jelas (Section 7)
  if (status === "REJECTED" && (!catatan || catatan.trim().length === 0)) {
    throw new Error("Alasan penolakan wajib disertakan agar Admin Kelompok mengetahui poin evaluasi dan perbaikan.");
  }

  // Hanya laporan berstatus SUBMITTED yang dapat disetujui / ditolak
  if (currentSub.status !== "SUBMITTED") {
    throw new Error(`Hanya laporan berstatus SUBMITTED (Menunggu Persetujuan) yang dapat diproses (Status saat ini: ${currentSub.status}).`);
  }

  const now = new Date().toISOString();
  const oldStatus = currentSub.status;
  const trimmedNote = (catatan || "").trim();
  const canonicalReportId = currentSub.reportId || currentSub.id || getCanonicalReportId(currentSub.periodId, currentSub.desa);

  // PENTING (Section 8): Jangan mengubah data asli laporan (progress, item, laporanPelaksanaan) secara diam-diam saat proses verification
  if (status === "VERIFIED") {
    allSubs[subIndex] = {
      ...currentSub,
      id: canonicalReportId,
      reportId: canonicalReportId,
      desaNama: formatDesaShort(currentSub.wilayah),
      kelompokNama: formatKelompokShort(currentSub.desa),
      status: "VERIFIED",
      verifiedBy: verifier,
      verifiedAt: now,
      verificationNote: trimmedNote,
      catatanVerifikasi: trimmedNote,
      updatedBy: verifier,
      updatedAt: now
    };
  } else {
    allSubs[subIndex] = {
      ...currentSub,
      id: canonicalReportId,
      reportId: canonicalReportId,
      desaNama: formatDesaShort(currentSub.wilayah),
      kelompokNama: formatKelompokShort(currentSub.desa),
      status: "REJECTED",
      rejectedBy: verifier,
      rejectedAt: now,
      rejectionReason: trimmedNote,
      catatanVerifikasi: trimmedNote,
      updatedBy: verifier,
      updatedAt: now
    };
  }

  saveData(KEY_SUBMISSIONS, allSubs);

  recordMonevAudit({
    entityType: "SUBMISSION",
    entityId: canonicalReportId,
    action: status === "VERIFIED" ? "VERIFY" : "REJECT",
    actorUsername: verifier,
    actorRole: effectiveRole,
    oldValue: { status: oldStatus },
    newValue: status === "VERIFIED"
      ? {
          report_id: canonicalReportId,
          status: "VERIFIED",
          verifiedBy: verifier,
          verifiedAt: now,
          verificationNote: trimmedNote,
          catatanVerifikasi: trimmedNote
        }
      : {
          report_id: canonicalReportId,
          status: "REJECTED",
          rejectedBy: verifier,
          rejectedAt: now,
          rejectionReason: trimmedNote,
          catatanVerifikasi: trimmedNote
        },
    details: { 
      report_id: canonicalReportId,
      action: status === "VERIFIED" ? "APPROVED" : "REJECTED",
      performed_by: verifier,
      performed_at: now,
      previous_status: oldStatus,
      new_status: status,
      note: trimmedNote,
      desa: currentSub.desa,
      desa_nama: formatDesaShort(currentSub.wilayah),
      kelompok_nama: formatKelompokShort(currentSub.desa),
      status, 
      catatan: trimmedNote,
      verified_by: status === "VERIFIED" ? verifier : undefined,
      verified_at: status === "VERIFIED" ? now : undefined,
      verification_note: status === "VERIFIED" ? trimmedNote : undefined,
      rejected_by: status === "REJECTED" ? verifier : undefined,
      rejected_at: status === "REJECTED" ? now : undefined,
      rejection_reason: status === "REJECTED" ? trimmedNote : undefined,
      capaianAkhir: currentSub.progressPersen,
      completedMandatory: currentSub.agendaSelesai
    }
  });

  syncMonevToMainDatabase(verifier, currentSub.desa);

  return allSubs[subIndex];
}

// ==========================================
// 6. FOLLOW-UP MANAGEMENT (TINDAK LANJUT)
// ==========================================

export function getFollowUps(
  periodId?: string, 
  desa?: string, 
  statusFilter?: string,
  auth?: AuthScopeContext
): MonevFollowUp[] {
  if (auth && desa && desa !== "Semua") {
    const readCheck = canReadVillageScope(auth.role, auth.scope, desa);
    if (!readCheck.allowed) {
      throw new Error(readCheck.reason || `Akses ditolak untuk tindak lanjut Kelompok/Desa ${desa}.`);
    }
  }

  const all = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
  const today = new Date().toISOString().slice(0, 10);

  let filtered = all.map(fu => {
    const isOverdue = Boolean(
      fu.targetPenyelesaian && 
      fu.targetPenyelesaian < today && 
      fu.status !== "COMPLETED" && 
      fu.status !== "CANCELLED"
    );
    return { ...fu, isOverdue };
  });

  if (periodId && periodId !== "Semua") {
    filtered = filtered.filter(f => f.periodId === periodId);
  }

  if (desa && desa !== "Semua") {
    const norm = normalizeDesaName(desa);
    filtered = filtered.filter(f => normalizeDesaName(f.desa) === norm);
  }

  if (auth) {
    filtered = filtered.filter(f => canReadVillageScope(auth.role, auth.scope, f.desa, f.wilayah).allowed);
  }

  if (statusFilter && statusFilter !== "Semua") {
    if (statusFilter === "OVERDUE") {
      filtered = filtered.filter(f => f.isOverdue);
    } else {
      filtered = filtered.filter(f => f.status === statusFilter);
    }
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createFollowUp(
  data: Omit<MonevFollowUp, "id" | "createdAt" | "updatedAt" | "isOverdue">,
  actor: string,
  actorRole: string,
  userScope?: string
): MonevFollowUp {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer tidak diizinkan membuat tindak lanjut.");
  }

  const period = getPeriodById(data.periodId);
  if (period && (period.status === "LOCKED" || period.status === "ARCHIVED")) {
    throw new Error(`Periode ${period.namaPeriode} terkunci (${period.status}). Tidak dapat menambah tindak lanjut.`);
  }

  const normDesa = normalizeDesaName(data.desa);
  const effectiveScope = userScope || getUserDetails(actor)?.scope;

  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, normDesa, data.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak: Anda tidak memiliki wewenang untuk Desa ${normDesa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  const allFollowUps = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const newId = `fu-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const isOverdue = Boolean(
    data.targetPenyelesaian && 
    data.targetPenyelesaian < today && 
    data.status !== "COMPLETED" && 
    data.status !== "CANCELLED"
  );

  const newFollowUp: MonevFollowUp = {
    ...data,
    id: newId,
    desa: normDesa,
    isOverdue,
    createdAt: now,
    updatedAt: now
  };

  saveData(KEY_FOLLOW_UPS, [newFollowUp, ...allFollowUps]);

  recordMonevAudit({
    entityType: "FOLLOW_UP",
    entityId: newId,
    action: "CREATE",
    actorUsername: actor,
    actorRole,
    newValue: newFollowUp,
    details: { agenda: data.agendaJudul, desa: normDesa, pic: data.pic, status: data.status }
  });

  return newFollowUp;
}

/**
 * Aturan Tegas (Section 26 & 38):
 * Penyelesaian tindak lanjut (Follow-up COMPLETED) TIDAK otomatis mengubah status agenda menjadi COMPLETED
 * guna menjaga akurasi rekam jejak historis evaluasi periode.
 */
export function updateFollowUp(
  id: string,
  updates: Partial<MonevFollowUp>,
  actor: string,
  actorRole: string,
  userScope?: string
): MonevFollowUp {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer tidak diizinkan memperbarui tindak lanjut.");
  }

  const allFollowUps = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
  const index = allFollowUps.findIndex(f => f.id === id);
  if (index === -1) throw new Error(`Follow-up ${id} tidak ditemukan.`);

  const current = allFollowUps[index];

  const effectiveScope = userScope || getUserDetails(actor)?.scope;
  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, current.desa, current.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak: Anda tidak berwenang memperbarui tindak lanjut Desa ${current.desa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const targetDate = updates.targetPenyelesaian || current.targetPenyelesaian;
  const status = updates.status || current.status;
  const isOverdue = Boolean(
    targetDate && 
    targetDate < today && 
    status !== "COMPLETED" && 
    status !== "CANCELLED"
  );

  const oldSnapshot = { status: current.status, catatanProgres: current.catatanProgres };

  const updated: MonevFollowUp = {
    ...current,
    ...updates,
    isOverdue,
    updatedAt: now
  };

  allFollowUps[index] = updated;
  saveData(KEY_FOLLOW_UPS, allFollowUps);

  recordMonevAudit({
    entityType: "FOLLOW_UP",
    entityId: id,
    action: "UPDATE",
    actorUsername: actor,
    actorRole,
    oldValue: oldSnapshot,
    newValue: updates,
    details: { desa: current.desa, agenda: current.agendaJudul, ...updates }
  });

  return updated;
}

export function deleteFollowUp(
  id: string,
  actor: string,
  actorRole: string,
  userScope?: string
): boolean {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer tidak diizinkan menghapus tindak lanjut.");
  }

  const allFollowUps = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
  const target = allFollowUps.find(f => f.id === id);
  if (!target) return false;

  const effectiveScope = userScope || getUserDetails(actor)?.scope;
  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, target.desa, target.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak untuk Desa ${target.desa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  const filtered = allFollowUps.filter(f => f.id !== id);
  saveData(KEY_FOLLOW_UPS, filtered);

  recordMonevAudit({
    entityType: "FOLLOW_UP",
    entityId: id,
    action: "STATUS_CHANGE",
    actorUsername: actor,
    actorRole,
    details: { deleted: true, targetId: id, desa: target.desa }
  });

  return true;
}

// ==========================================
// 6B. EVIDENCE MANAGEMENT
// ==========================================

export function getEvidenceList(
  periodId: string,
  desa?: string,
  monitoringItemId?: string,
  auth?: AuthScopeContext
): MonevEvidence[] {
  if (auth) {
    if (desa && desa !== "Semua") {
      const check = canReadVillageScope(auth.role, auth.scope, desa);
      if (!check.allowed) {
        throw new Error(check.reason || `Akses ditolak untuk evidence Kelompok/Desa ${desa}.`);
      }
    }
    if (monitoringItemId) {
      getMonitoringItemById(monitoringItemId, auth);
    }
  }

  const all = loadData<MonevEvidence[]>(KEY_EVIDENCE, []);
  return all.filter(ev => {
    if (ev.periodId !== periodId) return false;
    if (desa && desa !== "Semua" && normalizeDesaName(ev.desa) !== normalizeDesaName(desa)) return false;
    if (monitoringItemId && ev.monitoringItemId !== monitoringItemId) return false;
    if (auth && !canReadVillageScope(auth.role, auth.scope, ev.desa, ev.wilayah).allowed) return false;
    return true;
  });
}

export function addEvidence(
  data: Omit<MonevEvidence, "id" | "createdAt">,
  actor: string,
  actorRole: string,
  userScope?: string
): MonevEvidence {
  if (actorRole === "Viewer") {
    throw new Error("Akses ditolak: Akun Viewer tidak diizinkan mengunggah bukti dokumentasi.");
  }

  const normDesa = normalizeDesaName(data.desa);
  const effectiveScope = userScope || getUserDetails(actor)?.scope;
  if (effectiveScope) {
    const access = validateVillageAccess(actorRole, effectiveScope, normDesa, data.wilayah);
    if (!access.allowed) {
      throw new Error(access.reason || `Akses ditolak untuk Desa ${normDesa}.`);
    }
  } else if (actorRole !== "Super Admin" && actorRole !== "Admin Daerah") {
    throw new Error("Akses ditolak: Scope organisasi pengguna tidak ditemukan.");
  }

  const all = loadData<MonevEvidence[]>(KEY_EVIDENCE, []);
  const now = new Date().toISOString();
  const newEv: MonevEvidence = {
    ...data,
    id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    desa: normDesa,
    uploadedBy: actor,
    createdAt: now
  };

  saveData(KEY_EVIDENCE, [newEv, ...all]);

  // Attach URL to monitoring item evidenceUrls as well
  const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
  const itemIdx = allItems.findIndex(i => i.id === data.monitoringItemId);
  if (itemIdx !== -1) {
    const existingUrls = allItems[itemIdx].evidenceUrls || [];
    if (!existingUrls.includes(data.fileUrl)) {
      allItems[itemIdx] = {
        ...allItems[itemIdx],
        evidenceUrls: [...existingUrls, data.fileUrl],
        updatedAt: now
      };
      saveData(KEY_ITEMS, allItems);
    }
  }

  recordMonevAudit({
    entityType: "EVIDENCE",
    entityId: newEv.id,
    action: "CREATE",
    actorUsername: actor,
    actorRole,
    newValue: newEv,
    details: { desa: normDesa, judulDokumentasi: data.judulDokumentasi }
  });

  return newEv;
}

// ==========================================
// 7. PPG COMMAND CENTER DATA AGGREGATION
// ==========================================

export function getCommandCenterData(periodId: string, auth?: AuthScopeContext): MonevCommandCenterData {
  const period = getPeriodById(periodId) || getActivePeriod();
  const allSubs = getSubmissions(period.id, undefined, auth);
  const allItems = getMonitoringItems(period.id, undefined, undefined, auth);
  const followUps = getFollowUps(period.id, undefined, undefined, auth);

  // Hitung expected desa dalam scope pengguna
  const scopedConfigs = MASTER_WILAYAH_CONFIG
    .filter(cfg => period.cakupanWilayah.includes(cfg.wilayah))
    .map(cfg => {
      const allowedDesas = cfg.desas.filter(d => {
        const norm = normalizeDesaName(d);
        if (period.selectedDesas && period.selectedDesas.length > 0 && !period.selectedDesas.map(normalizeDesaName).includes(norm)) {
          return false;
        }
        if (auth) {
          return canReadVillageScope(auth.role, auth.scope, norm, cfg.wilayah).allowed;
        }
        return true;
      });
      return { wilayah: cfg.wilayah, desas: allowedDesas };
    })
    .filter(cfg => cfg.desas.length > 0);

  const expectedCountInScope = scopedConfigs.reduce((acc, c) => acc + c.desas.length, 0);
  const totalDesa = expectedCountInScope || allSubs.length || period.totalDesa || 30;
  let belumDimulai = 0;
  let draft = 0;
  let submitted = 0;
  let verified = 0;
  let rejected = 0;

  let totalProgressAcc = 0;

  const itemsByDesa = new Map<string, MonevMonitoringItem[]>();
  allItems.forEach(item => {
    const d = normalizeDesaName(item.desa);
    if (!itemsByDesa.has(d)) itemsByDesa.set(d, []);
    itemsByDesa.get(d)!.push(item);
  });

  allSubs.forEach(sub => {
    const normDesa = normalizeDesaName(sub.desa);
    const desaItems = itemsByDesa.get(normDesa) || [];
    const hasAnyInput = desaItems.some(i =>
      i.statusKetercapaian === "COMPLETED" ||
      i.statusKetercapaian === "PARTIAL" ||
      i.statusKetercapaian === "NOT_COMPLETED" ||
      i.terlaksana ||
      Boolean(i.kendala && i.kendala.trim().length > 0) ||
      Boolean(i.laporanPelaksanaan && i.laporanPelaksanaan.trim().length > 0)
    );

    if (sub.status === "VERIFIED") verified++;
    else if (sub.status === "SUBMITTED") submitted++;
    else if (sub.status === "REJECTED") rejected++;
    else {
      if (!hasAnyInput && sub.progressPersen === 0 && sub.agendaSelesai === 0) {
        belumDimulai++;
      } else {
        draft++;
      }
    }
    totalProgressAcc += (sub.progressPersen || 0);
  });

  // Jika belum di-generate atau sebagian desa di dalam scope belum memiliki submission
  if (allSubs.length < totalDesa) {
    belumDimulai += (totalDesa - allSubs.length);
  }

  const desaBelumMelapor = belumDimulai + draft + rejected;
  const rataRataProgres = totalDesa > 0 ? Number((totalProgressAcc / totalDesa).toFixed(1)) : 0;
  const reportingRate = totalDesa > 0 ? Number((((submitted + verified) / totalDesa) * 100).toFixed(1)) : 0;
  const verificationRate = totalDesa > 0 ? Number(((verified / totalDesa) * 100).toFixed(1)) : 0;

  // Wilayah Progress Summaries (Strictly Scoped)
  const wilayahSummaries: WilayahProgressSummary[] = scopedConfigs.map(cfg => {
    const subsInWilayah = allSubs.filter(s => s.wilayah === cfg.wilayah);
    const count = cfg.desas.length || subsInWilayah.length;
    let vCount = 0;
    let sCount = 0;
    let dCount = 0;
    let rCount = 0;
    let bCount = 0;
    let pAcc = 0;
    let attentionCount = 0;

    if (subsInWilayah.length === 0) {
      bCount = count;
    } else {
      subsInWilayah.forEach(s => {
        const normDesa = normalizeDesaName(s.desa);
        const desaItems = itemsByDesa.get(normDesa) || [];
        const hasAnyInput = desaItems.some(i =>
          i.statusKetercapaian === "COMPLETED" ||
          i.statusKetercapaian === "PARTIAL" ||
          i.statusKetercapaian === "NOT_COMPLETED" ||
          i.terlaksana
        );
        const hasProblem = desaItems.some(i =>
          i.statusKetercapaian === "PARTIAL" ||
          i.statusKetercapaian === "NOT_COMPLETED" ||
          Boolean(i.kendala && i.kendala.trim().length > 0)
        );
        const hasOverdueFu = followUps.some(f => normalizeDesaName(f.desa) === normDesa && f.isOverdue);

        pAcc += (s.progressPersen || 0);
        if (s.status === "VERIFIED") vCount++;
        else if (s.status === "SUBMITTED") sCount++;
        else if (s.status === "REJECTED") rCount++;
        else {
          if (!hasAnyInput && s.progressPersen === 0 && s.agendaSelesai === 0) bCount++;
          else dCount++;
        }

        if (s.status === "REJECTED" || hasProblem || hasOverdueFu) {
          attentionCount++;
        }
      });
      if (subsInWilayah.length < count) {
        bCount += (count - subsInWilayah.length);
      }
    }

    const regionReportingRate = count > 0 ? Number((((sCount + vCount) / count) * 100).toFixed(1)) : 0;

    return {
      wilayah: cfg.wilayah,
      totalDesa: count,
      verifiedCount: vCount,
      submittedCount: sCount,
      draftCount: dCount,
      rejectedCount: rCount,
      belumDimulaiCount: bCount,
      reportingRate: regionReportingRate,
      attentionRequiredCount: attentionCount,
      avgProgress: count > 0 ? Number((pAcc / count).toFixed(1)) : 0
    };
  });

  // Agenda Bermasalah (Strictly Scoped)
  const agendaIssueMap = new Map<string, {
    judul: string;
    kategori: any;
    nomorUrut: number;
    notCompleted: number;
    partial: number;
    affectedDesas: Set<string>;
  }>();

  allItems.forEach(item => {
    const isExplicitNotCompleted = item.statusKetercapaian === "NOT_COMPLETED";
    const isPartial = item.statusKetercapaian === "PARTIAL";
    const hasKendala = Boolean(item.kendala && item.kendala.trim().length > 0);

    if (isExplicitNotCompleted || isPartial || hasKendala) {
      if (!agendaIssueMap.has(item.judulAgenda)) {
        agendaIssueMap.set(item.judulAgenda, {
          judul: item.judulAgenda,
          kategori: item.kategori,
          nomorUrut: item.nomorUrut,
          notCompleted: 0,
          partial: 0,
          affectedDesas: new Set<string>()
        });
      }
      const agg = agendaIssueMap.get(item.judulAgenda)!;
      if (isExplicitNotCompleted || (!isPartial && hasKendala)) agg.notCompleted++;
      if (isPartial) agg.partial++;
      agg.affectedDesas.add(item.desa);
    }
  });

  const agendaBermasalah: AgendaBermasalahSummary[] = Array.from(agendaIssueMap.values())
    .map(val => ({
      judulAgenda: val.judul,
      kategori: val.kategori,
      nomorUrut: val.nomorUrut,
      notCompletedCount: val.notCompleted,
      partialCount: val.partial,
      totalProblematic: val.notCompleted + val.partial,
      affectedDesas: Array.from(val.affectedDesas)
    }))
    .sort((a, b) => b.totalProblematic - a.totalProblematic);

  // Follow-up Statistics
  const openFollowUps = followUps.filter(f => f.status === "OPEN").length;
  const inProgressFollowUps = followUps.filter(f => f.status === "IN_PROGRESS").length;
  const overdueFollowUps = followUps.filter(f => f.isOverdue).length;
  const completedFollowUps = followUps.filter(f => f.status === "COMPLETED").length;

  return {
    periodId: period.id,
    periodName: period.namaPeriode,
    periodStatus: period.status,
    totalDesa,
    belumDimulai,
    draft,
    submitted,
    verified,
    rejected,
    desaBelumMelapor,
    rataRataProgres,
    reportingRate,
    verificationRate,
    wilayahSummaries,
    agendaBermasalah,
    totalFollowUps: followUps.length,
    openFollowUps,
    inProgressFollowUps,
    overdueFollowUps,
    completedFollowUps
  };
}

// ==========================================
// 7B. ANALYTICS, HEATMAP & REPORTING ENGINE
// ==========================================

export function getAnalyticsData(periodId: string, auth?: AuthScopeContext): MonevAnalyticsData {
  const period = getPeriodById(periodId) || getActivePeriod();
  const cmdData = getCommandCenterData(period.id, auth);
  const snapshots = ensurePeriodSnapshots(period.id);
  const allSubs = getSubmissions(period.id, undefined, auth);
  const allItems = getMonitoringItems(period.id, undefined, undefined, auth);
  const allFollowUps = getFollowUps(period.id, undefined, undefined, auth);

  const totalVillages = cmdData.totalDesa || allSubs.length || period.totalDesa || 30;

  // 1. Agenda Performance
  const agendaPerformance: AgendaAnalyticsItem[] = snapshots.map(snap => {
    const snapItems = allItems.filter(i => i.agendaSnapshotId === snap.id || i.nomorUrut === snap.nomorUrut);
    let completedCount = 0;
    let partialCount = 0;
    let notCompletedCount = 0;
    let notStartedCount = 0;

    snapItems.forEach(item => {
      if (item.statusKetercapaian === "COMPLETED" || (item.terlaksana && item.ketercapaianPersen === 100)) {
        completedCount++;
      } else if (item.statusKetercapaian === "PARTIAL" || (item.terlaksana && item.ketercapaianPersen > 0)) {
        partialCount++;
      } else if (item.statusKetercapaian === "NOT_COMPLETED") {
        notCompletedCount++;
      } else {
        notStartedCount++;
      }
    });

    if (snapItems.length < totalVillages) {
      notStartedCount += (totalVillages - snapItems.length);
    }

    const denom = totalVillages || snapItems.length || 1;
    return {
      nomorUrut: snap.nomorUrut,
      judulAgenda: snap.judulAgenda,
      kategori: snap.kategori,
      completedCount,
      partialCount,
      notCompletedCount,
      notStartedCount,
      totalVillages: denom,
      completionRate: Number(((completedCount / denom) * 100).toFixed(1)),
      partialRate: Number(((partialCount / denom) * 100).toFixed(1)),
      notCompletedRate: Number(((notCompletedCount / denom) * 100).toFixed(1))
    };
  });

  const highestCompletionAgendas = [...agendaPerformance].sort((a, b) => b.completionRate - a.completionRate);
  const highestPartialAgendas = [...agendaPerformance].sort((a, b) => b.partialCount - a.partialCount);
  const highestNotCompletedAgendas = [...agendaPerformance].sort((a, b) => (b.notCompletedCount + b.partialCount) - (a.notCompletedCount + a.partialCount));

  // 2. Village Performance & Heatmap Matrix (Strictly Scoped)
  const allExpectedVillages: { desa: string; wilayah: string }[] = [];
  MASTER_WILAYAH_CONFIG.filter(w => period.cakupanWilayah.includes(w.wilayah)).forEach(w => {
    w.desas.forEach(d => {
      const norm = normalizeDesaName(d);
      if (period.selectedDesas && period.selectedDesas.length > 0 && !period.selectedDesas.map(normalizeDesaName).includes(norm)) {
        return;
      }
      if (auth && !canReadVillageScope(auth.role, auth.scope, norm, w.wilayah).allowed) {
        return;
      }
      allExpectedVillages.push({ desa: norm, wilayah: w.wilayah });
    });
  });

  const heatmapMatrix: MonevAnalyticsData["heatmapMatrix"] = [];
  const villagePerformance: VillagePerformanceItem[] = allExpectedVillages.map(({ desa, wilayah }) => {
    const sub = allSubs.find(s => normalizeDesaName(s.desa) === desa);
    const desaItems = allItems.filter(i => normalizeDesaName(i.desa) === desa).sort((a, b) => a.nomorUrut - b.nomorUrut);
    const calc = calculateCompletionRate(desaItems, snapshots);
    const desaFollowUps = allFollowUps.filter(f => normalizeDesaName(f.desa) === desa);
    const openFuCount = desaFollowUps.filter(f => f.status === "OPEN" || f.status === "IN_PROGRESS").length;
    const overdueFuCount = desaFollowUps.filter(f => f.isOverdue).length;

    const hasAnyInput = calc.completedTotal > 0 || calc.partialTotal > 0 || calc.notCompletedTotal > 0;
    const effectiveSubStatus: MonevSubmissionStatus | "NOT_STARTED" = !sub
      ? "NOT_STARTED"
      : (sub.status === "DRAFT" && !hasAnyInput)
        ? "NOT_STARTED"
        : sub.status;

    const attentionReasons: string[] = [];
    if (sub?.status === "REJECTED") attentionReasons.push("Laporan Ditolak (Perlu Revisi)");
    if (overdueFuCount > 0) attentionReasons.push(`${overdueFuCount} Tindak Lanjut Overdue`);
    if (calc.notCompletedTotal > 0) attentionReasons.push(`${calc.notCompletedTotal} Agenda Tidak Terlaksana`);
    if (calc.partialTotal > 0) attentionReasons.push(`${calc.partialTotal} Agenda Terlaksana Sebagian`);

    // Build heatmap cells for this village across all snapshots
    const cells: HeatmapCell[] = snapshots.map(snap => {
      const found = desaItems.find(i => i.agendaSnapshotId === snap.id || i.nomorUrut === snap.nomorUrut);
      let status: MonevAgendaCompletionStatus = "NOT_STARTED";
      if (found) {
        if (found.statusKetercapaian === "COMPLETED" || (found.terlaksana && found.ketercapaianPersen === 100)) {
          status = "COMPLETED";
        } else if (found.statusKetercapaian === "PARTIAL" || (found.terlaksana && found.ketercapaianPersen > 0)) {
          status = "PARTIAL";
        } else if (found.statusKetercapaian === "NOT_COMPLETED") {
          status = "NOT_COMPLETED";
        } else {
          status = "NOT_STARTED";
        }
      }
      return {
        itemId: found?.id || `${period.id}-${desa}-${snap.nomorUrut}`,
        desa,
        wilayah,
        nomorUrut: snap.nomorUrut,
        judulAgenda: snap.judulAgenda,
        status,
        persen: found?.ketercapaianPersen || 0,
        kendala: found?.kendala
      };
    });

    heatmapMatrix.push({
      desa,
      wilayah,
      submissionStatus: effectiveSubStatus,
      completionRate: calc.completionRate,
      cells
    });

    return {
      desa,
      wilayah,
      submissionId: sub?.id,
      submissionStatus: effectiveSubStatus,
      completionRate: calc.completionRate,
      completedCount: calc.completedMandatory,
      partialCount: calc.partialTotal,
      notCompletedCount: calc.notCompletedTotal,
      notStartedCount: calc.notStartedTotal,
      totalMandatory: calc.totalMandatory || snapshots.length,
      openFollowUpsCount: openFuCount,
      overdueFollowUpsCount: overdueFuCount,
      attentionRequired: attentionReasons.length > 0,
      attentionReasons,
      submittedBy: sub?.submittedBy,
      submittedAt: sub?.submittedAt,
      verifiedBy: sub?.verifiedBy,
      verifiedAt: sub?.verifiedAt,
      verificationNote: sub?.verificationNote ?? sub?.catatanVerifikasi,
      catatanVerifikasi: sub?.catatanVerifikasi ?? sub?.verificationNote,
      rejectedBy: sub?.rejectedBy,
      rejectedAt: sub?.rejectedAt,
      rejectionReason: sub?.rejectionReason
    };
  });

  const highestVillages = [...villagePerformance].sort((a, b) => b.completionRate - a.completionRate);
  const lowestVillages = [...villagePerformance].sort((a, b) => a.completionRate - b.completionRate);
  const attentionVillages = villagePerformance.filter(v => v.attentionRequired);

  // 3. Comparable Period Trends
  const allPeriods = getPeriods().slice().sort((a, b) => a.periodeKode.localeCompare(b.periodeKode));
  const periodTrends: PeriodTrendItem[] = allPeriods
    .filter(p => p.totalAgenda === period.totalAgenda) // Hanya bandingkan periode yang comparable
    .map(p => {
      const pCmd = getCommandCenterData(p.id, auth);
      return {
        periodId: p.id,
        periodeKode: p.periodeKode,
        namaPeriode: p.namaPeriode,
        status: p.status,
        avgCompletionRate: pCmd.rataRataProgres,
        reportingRate: pCmd.reportingRate,
        verificationRate: pCmd.verificationRate,
        totalVillages: pCmd.totalDesa
      };
    });

  return {
    periodId: period.id,
    periodName: period.namaPeriode,
    agendaPerformance,
    highestCompletionAgendas,
    highestPartialAgendas,
    highestNotCompletedAgendas,
    villagePerformance,
    highestVillages,
    lowestVillages,
    attentionVillages,
    regionPerformance: cmdData.wilayahSummaries,
    heatmapMatrix,
    periodTrends
  };
}

export function getExecutiveReport(periodId: string, auth?: AuthScopeContext): MonevExecutiveReport {
  const period = getPeriodById(periodId) || getActivePeriod();
  const cmd = getCommandCenterData(period.id, auth);
  const analytics = getAnalyticsData(period.id, auth);
  const followUps = getFollowUps(period.id, undefined, undefined, auth);

  return {
    period,
    totalVillages: cmd.totalDesa,
    reportedVillages: cmd.submitted + cmd.verified,
    verifiedVillages: cmd.verified,
    reportingRate: cmd.reportingRate,
    completionRate: cmd.rataRataProgres,
    verificationRate: cmd.verificationRate,
    regionalReport: cmd.wilayahSummaries,
    villageReport: analytics.villagePerformance,
    agendaReport: analytics.agendaPerformance,
    followUpSummary: {
      total: followUps.length,
      open: cmd.openFollowUps,
      inProgress: cmd.inProgressFollowUps,
      overdue: cmd.overdueFollowUps,
      completed: cmd.completedFollowUps,
      cancelled: followUps.filter(f => f.status === "CANCELLED").length,
      items: followUps
    }
  };
}

// ==========================================
// 8. RBAC, LOCKING, SCOPE & EXPORT GUARDS
// ==========================================

export function canManagePeriods(role: string): boolean {
  return role === "Super Admin" || role === "Admin Daerah";
}

export function canManageMasterAgenda(role: string): boolean {
  return role === "Super Admin" || role === "Admin Daerah";
}

export function canVerify(role: string): boolean {
  return role === "Super Admin" || role === "Admin Daerah" || role === "Admin Desa";
}

/**
 * Validasi Kewenangan Persetujuan Laporan (Section 23 & 26):
 * - Admin Kelompok -> TIDAK BOLEH menyetujui laporannya sendiri atau kelompok lain (DENY)
 * - Admin Desa -> BOLEH menyetujui laporan untuk Kelompok di bawah Desa naungannya (ALLOW), Desa lain (DENY)
 * - Admin Daerah & Super Admin -> BOLEH menyetujui laporan sesuai scope Daerah (ALLOW)
 */
export function canApproveReport(
  role: string,
  userScope: string,
  targetKelompok: string,
  targetDesa?: string
): { allowed: boolean; reason?: string } {
  if (role === "Super Admin" || role === "Admin Daerah") {
    return { allowed: true };
  }

  if (role === "Admin Kelompok" || role === "Pengajar" || role === "Viewer") {
    return {
      allowed: false,
      reason: `Akses ditolak: Peran ${role} tidak memiliki wewenang menyetujui laporan.`
    };
  }

  if (role === "Admin Desa") {
    const normTargetKelompok = normalizeDesaName(targetKelompok);
    const resolvedDesa = targetDesa || getWilayahForDesa(normTargetKelompok);
    if (
      userScope === "Semua" ||
      userScope === resolvedDesa ||
      formatDesaShort(userScope) === formatDesaShort(resolvedDesa) ||
      normalizeDesaName(userScope) === normTargetKelompok
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Akses ditolak (Cross-Village Approval Forbidden): Admin Desa (${userScope}) hanya berwenang menyetujui laporan di ${resolvedDesa}, bukan Kelompok ${normTargetKelompok} (${resolvedDesa}).`
    };
  }

  return {
    allowed: false,
    reason: "Akses ditolak: Anda tidak memiliki wewenang menyetujui laporan."
  };
}

/**
 * Validasi Akses Baca (SELECT / VIEW / EXPORT / DASHBOARD) Berdasarkan Scope Organisasi
 */
export function canReadVillageScope(
  role: string,
  userScope: string,
  targetDesa: string,
  targetWilayah?: string
): { allowed: boolean; reason?: string } {
  if (role === "Super Admin" || role === "Admin Daerah") {
    return { allowed: true };
  }

  const normTarget = normalizeDesaName(targetDesa);
  const resolvedWilayah = targetWilayah || getWilayahForDesa(normTarget);

  if (role === "Viewer") {
    if (!userScope || userScope === "Semua" || userScope === "Daerah Magetan Timur") {
      return { allowed: true };
    }
    if (userScope === resolvedWilayah || normalizeDesaName(userScope) === normTarget) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Akses ditolak: Akun Viewer (${userScope}) tidak memiliki akses ke ${resolvedWilayah} / Kelompok ${normTarget}.`
    };
  }

  if (role === "Admin Desa") {
    if (userScope === "Semua" || userScope === resolvedWilayah || normalizeDesaName(userScope) === normTarget) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Akses ditolak (Cross-Village Forbidden): Admin Desa (${userScope}) hanya berwenang mengakses desa/wilayah ${userScope}, bukan ${resolvedWilayah} (Kelompok ${normTarget}).`
    };
  }

  if (role === "Admin Kelompok" || role === "Pengajar") {
    const normScope = normalizeDesaName(userScope);
    if (normScope === normTarget) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Akses ditolak (Cross-Group Forbidden): Admin Kelompok (${userScope}) hanya berwenang mengakses Kelompok ${normScope}, bukan Kelompok ${normTarget}.`
    };
  }

  return {
    allowed: false,
    reason: "Akses ditolak: Peran Anda tidak memiliki izin akses."
  };
}

export function validateVillageAccess(
  role: string,
  userScope: string,
  targetDesa: string,
  targetWilayah?: string
): { allowed: boolean; reason?: string } {
  if (role === "Super Admin" || role === "Admin Daerah") {
    return { allowed: true };
  }

  if (role === "Viewer") {
    return { 
      allowed: false, 
      reason: "Akses ditolak: Akun Viewer hanya memiliki izin baca (read-only)." 
    };
  }

  const normTarget = normalizeDesaName(targetDesa);
  const resolvedWilayah = targetWilayah || getWilayahForDesa(normTarget);

  if (role === "Admin Desa") {
    if (userScope === "Semua" || userScope === resolvedWilayah || normalizeDesaName(userScope) === normTarget) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Akses ditolak (Cross-Village Forbidden): Anda bertugas di ${userScope}, tidak berwenang mengakses/mengedit wilayah ${resolvedWilayah} (Kelompok ${normTarget}).` 
    };
  }

  if (role === "Admin Kelompok" || role === "Pengajar") {
    const normScope = normalizeDesaName(userScope);
    if (normScope === normTarget) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Akses ditolak (Cross-Group Forbidden): Anda hanya ditugaskan di Kelompok ${normScope}. Tidak dapat mengakses Kelompok ${normTarget}.` 
    };
  }

  return { 
    allowed: false, 
    reason: "Akses ditolak: Peran Anda tidak memiliki izin untuk mengedit monitoring desa." 
  };
}

export function canEditMonitoring(
  role: string,
  periodStatus: MonevPeriodStatus,
  itemWilayah: string,
  itemDesa: string,
  userScope: string,
  submissionStatus?: MonevSubmissionStatus
): boolean {
  if (role === "Viewer") return false;

  if (periodStatus === "LOCKED" || periodStatus === "ARCHIVED") {
    return false;
  }

  if (role === "Super Admin" || role === "Admin Daerah") {
    return true;
  }

  if (periodStatus !== "OPEN") {
    return false;
  }

  if (submissionStatus === "SUBMITTED" || submissionStatus === "VERIFIED" || submissionStatus === "LOCKED") {
    return false;
  }

  const access = validateVillageAccess(role, userScope, itemDesa, itemWilayah);
  return access.allowed;
}

/**
 * Evaluasi Hak Akses Lengkap Pengisian MONEV (Section 3, 8, 12, 38):
 * Jika Period = OPEN dan User memiliki Scope valid (tanpa perlu approval Admin):
 * CAN_VIEW = TRUE, CAN_FILL = TRUE, CAN_SAVE = TRUE, CAN_SUBMIT = TRUE
 */
export function getUserMonevPermissions(
  periodId: string,
  targetDesa: string,
  role: string,
  userScope: string
): {
  canView: boolean;
  canFill: boolean;
  canSave: boolean;
  canSubmit: boolean;
  canVerify: boolean;
  periodStatus: MonevPeriodStatus;
  submissionStatus: MonevSubmissionStatus;
  reason?: string;
} {
  const period = getPeriodById(periodId) || getActivePeriod();
  const normDesa = normalizeDesaName(targetDesa);
  const wilayah = getWilayahForDesa(normDesa);

  const readAccess = canReadVillageScope(role, userScope, normDesa, wilayah);
  if (!readAccess.allowed) {
    return {
      canView: false,
      canFill: false,
      canSave: false,
      canSubmit: false,
      canVerify: false,
      periodStatus: period.status,
      submissionStatus: "DRAFT",
      reason: readAccess.reason
    };
  }

  // Self-provision items jika periode tersedia dan user memiliki akses baca/isi
  if (period.status !== "LOCKED" && period.status !== "ARCHIVED") {
    ensureDesaMonitoringItems(period.id, normDesa);
  }

  const allSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
  const sub = allSubs.find(s => s.periodId === period.id && normalizeDesaName(s.desa) === normDesa);
  const subStatus: MonevSubmissionStatus = sub?.status || "DRAFT";

  const editable = canEditMonitoring(role, period.status, wilayah, normDesa, userScope, subStatus);
  const submittable = editable && period.status === "OPEN" && (subStatus === "DRAFT" || subStatus === "REJECTED");
  const verifiable = canApproveReport(role, userScope, normDesa, wilayah).allowed;

  return {
    canView: true,
    canFill: editable,
    canSave: editable,
    canSubmit: submittable,
    canVerify: verifiable,
    periodStatus: period.status,
    submissionStatus: subStatus
  };
}

/**
 * Export Scope Authorization Guard (Section 34):
 * Mencegah Admin Kelompok mengekspor kelompok lain & Admin Desa mengekspor desa lain.
 */
export function getScopedExportData(
  periodId: string,
  auth: AuthScopeContext,
  requestedDesa?: string,
  requestedWilayah?: string
): {
  period: MonevPeriod;
  villages: VillagePerformanceItem[];
  submissions: MonevSubmission[];
  items: MonevMonitoringItem[];
  followUps: MonevFollowUp[];
  executiveReport: MonevExecutiveReport;
} {
  if (requestedDesa && requestedDesa !== "Semua") {
    const check = canReadVillageScope(auth.role, auth.scope, requestedDesa, requestedWilayah);
    if (!check.allowed) {
      throw new Error(check.reason || `Akses ditolak: Anda tidak berwenang mengekspor data ${requestedDesa}.`);
    }
  }
  if (requestedWilayah && requestedWilayah !== "Semua") {
    if (auth.role === "Admin Desa" && auth.scope !== requestedWilayah) {
      throw new Error(`Akses ditolak (Export Cross-Village Forbidden): Admin Desa (${auth.scope}) tidak dapat mengekspor wilayah ${requestedWilayah}.`);
    }
    if ((auth.role === "Admin Kelompok" || auth.role === "Pengajar") && getWilayahForDesa(auth.scope) !== requestedWilayah) {
      throw new Error(`Akses ditolak (Export Cross-Group Forbidden): Admin Kelompok (${auth.scope}) tidak dapat mengekspor wilayah ${requestedWilayah}.`);
    }
  }

  const period = getPeriodById(periodId) || getActivePeriod();
  const submissions = getSubmissions(period.id, requestedDesa && requestedDesa !== "Semua" ? requestedDesa : requestedWilayah, auth);
  const items = getMonitoringItems(period.id, requestedDesa, requestedWilayah, auth);
  const followUps = getFollowUps(period.id, requestedDesa, undefined, auth);
  const executiveReport = getExecutiveReport(period.id, auth);
  const analytics = getAnalyticsData(period.id, auth);

  let villages = analytics.villagePerformance;
  if (requestedWilayah && requestedWilayah !== "Semua") {
    villages = villages.filter(v => v.wilayah === requestedWilayah);
  }
  if (requestedDesa && requestedDesa !== "Semua") {
    const normD = normalizeDesaName(requestedDesa);
    villages = villages.filter(v => normalizeDesaName(v.desa) === normD);
  }

  return {
    period,
    villages,
    submissions,
    items,
    followUps,
    executiveReport
  };
}

// ==========================================
// 9. AUDIT TRAIL LOGGING (SAFE & SANITIZED)
// ==========================================

const SENSITIVE_KEYS = ["password", "token", "secret", "apikey", "authorization", "credential"];

function sanitizeAuditPayload(obj?: Record<string, any>): Record<string, any> | undefined {
  if (!obj || typeof obj !== "object") return obj;
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk))) {
      continue;
    }
    clean[k] = v;
  }
  return clean;
}

export function recordMonevAudit(log: Omit<MonevAuditLog, "id" | "createdAt">): void {
  const allLogs = loadData<MonevAuditLog[]>(KEY_AUDITS, []);
  const newLog: MonevAuditLog = {
    ...log,
    oldValue: sanitizeAuditPayload(log.oldValue),
    newValue: sanitizeAuditPayload(log.newValue),
    details: sanitizeAuditPayload(log.details),
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString()
  };

  const next = [newLog, ...allLogs.slice(0, 499)];
  saveData(KEY_AUDITS, next);
}

export function getMonevAuditLogs(periodId?: string): MonevAuditLog[] {
  const logs = loadData<MonevAuditLog[]>(KEY_AUDITS, []);
  if (!periodId || periodId === "Semua") return logs;
  return logs.filter(l => l.entityId.includes(periodId) || l.details?.periodId === periodId);
}

// ==========================================
// 10. MAIN DATABASE SYNC (SOURCE OF TRUTH)
// ==========================================

/**
 * Mengirim perubahan dari Admin Kelompok / Superadmin langsung ke Database Utama (/api/monev-sync -> Supabase PostgreSQL)
 * tanpa perlu approval gate terlebih dahulu (Section 9).
 */
export async function syncMonevToMainDatabase(
  actorUsername: string,
  targetDesa?: string
): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return false;
  }

  try {
    const periods = loadData<MonevPeriod[]>(KEY_PERIODS, []);
    const snapshots = loadData<MonevPeriodAgendaSnapshot[]>(KEY_SNAPSHOTS, []);
    const allSubmissions = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
    const allItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
    const allFollowUps = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
    const allEvidence = loadData<MonevEvidence[]>(KEY_EVIDENCE, []);
    const audits = loadData<MonevAuditLog[]>(KEY_AUDITS, []).slice(0, 50);

    const normTarget = targetDesa ? normalizeDesaName(targetDesa) : undefined;
    const submissions = normTarget
      ? allSubmissions.filter(s => normalizeDesaName(s.desa) === normTarget)
      : allSubmissions;
    const items = normTarget
      ? allItems.filter(i => normalizeDesaName(i.desa) === normTarget)
      : allItems;
    const followUps = normTarget
      ? allFollowUps.filter(f => normalizeDesaName(f.desa) === normTarget)
      : allFollowUps;
    const evidence = normTarget
      ? allEvidence.filter(e => normalizeDesaName(e.desa) === normTarget)
      : allEvidence;

    const res = await fetch("/api/monev-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: actorUsername,
        targetDesa: normTarget,
        payload: {
          periods,
          snapshots,
          submissions,
          items,
          followUps,
          evidence,
          audits
        }
      })
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Menarik data terbaru dari Database Utama (/api/monev-sync -> Supabase PostgreSQL)
 * sesuai hak akses (Scope Authorization) pengguna yang sedang login.
 */
export async function pullMonevFromMainDatabase(
  actorUsername: string
): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return false;
  }

  try {
    const res = await fetch(`/api/monev-sync?username=${encodeURIComponent(actorUsername)}`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return false;

    const json = await res.json();
    if (!json?.success || !json?.data) return false;

    const remote = json.data;
    let changed = false;

    // 1. Merge Periods
    if (Array.isArray(remote.periods) && remote.periods.length > 0) {
      const localPeriods = loadData<MonevPeriod[]>(KEY_PERIODS, []);
      const map = new Map<string, MonevPeriod>();
      localPeriods.forEach(p => map.set(p.id, p));
      remote.periods.forEach((rp: MonevPeriod) => {
        const lp = map.get(rp.id);
        if (!lp || new Date(rp.updatedAt || 0).getTime() >= new Date(lp.updatedAt || 0).getTime() || rp.status !== lp.status) {
          map.set(rp.id, rp);
          changed = true;
        }
      });
      if (changed) saveData(KEY_PERIODS, Array.from(map.values()));
    }

    // 2. Merge Snapshots
    if (Array.isArray(remote.snapshots) && remote.snapshots.length > 0) {
      const localSnaps = loadData<MonevPeriodAgendaSnapshot[]>(KEY_SNAPSHOTS, []);
      const map = new Map<string, MonevPeriodAgendaSnapshot>();
      localSnaps.forEach(s => map.set(s.id, s));
      let snapChanged = false;
      remote.snapshots.forEach((rs: MonevPeriodAgendaSnapshot) => {
        if (!map.has(rs.id)) {
          map.set(rs.id, rs);
          snapChanged = true;
          changed = true;
        }
      });
      if (snapChanged) saveData(KEY_SNAPSHOTS, Array.from(map.values()));
    }

    // 3. Merge Submissions (Single Source of Truth & Canonical report_id)
    if (Array.isArray(remote.submissions) && remote.submissions.length > 0) {
      const localSubs = loadData<MonevSubmission[]>(KEY_SUBMISSIONS, []);
      const map = new Map<string, MonevSubmission>();
      localSubs.forEach(s => {
        const cid = s.reportId || s.id || getCanonicalReportId(s.periodId, s.desa);
        map.set(cid, {
          ...s,
          id: cid,
          reportId: cid,
          desaNama: s.desaNama || formatDesaShort(s.wilayah),
          kelompokNama: s.kelompokNama || formatKelompokShort(s.desa)
        });
      });
      let subChanged = false;
      remote.submissions.forEach((rs: MonevSubmission) => {
        const cid = rs.reportId || rs.id || getCanonicalReportId(rs.periodId, rs.desa);
        const normalizedRemote: MonevSubmission = {
          ...rs,
          id: cid,
          reportId: cid,
          desaNama: rs.desaNama || formatDesaShort(rs.wilayah),
          kelompokNama: rs.kelompokNama || formatKelompokShort(rs.desa)
        };
        const ls = map.get(cid);
        const remoteTouched =
          normalizedRemote.status !== "DRAFT" ||
          (normalizedRemote.progressPersen || 0) > 0 ||
          (normalizedRemote.agendaSelesai || 0) > 0 ||
          Boolean(normalizedRemote.submittedBy || normalizedRemote.verifiedBy || normalizedRemote.rejectedBy || normalizedRemote.updatedBy);
        const localTouched = ls && (
          ls.status !== "DRAFT" ||
          (ls.progressPersen || 0) > 0 ||
          (ls.agendaSelesai || 0) > 0 ||
          Boolean(ls.submittedBy || ls.verifiedBy || ls.rejectedBy || ls.updatedBy)
        );

        // Jangan biarkan remote DRAFT kosong menimpa local yang sudah punya input/submit,
        // dan pastikan remote yang punya input/submit/approval selalu menang atas local auto-provisioned DRAFT
        if (localTouched && !remoteTouched) return;
        if (
          !ls ||
          (remoteTouched && !localTouched) ||
          new Date(normalizedRemote.updatedAt || 0).getTime() >= new Date(ls.updatedAt || 0).getTime() ||
          normalizedRemote.status !== ls.status
        ) {
          map.set(cid, normalizedRemote);
          subChanged = true;
          changed = true;
        }
      });
      if (subChanged) saveData(KEY_SUBMISSIONS, Array.from(map.values()));
    }

    // 4. Merge Monitoring Items
    if (Array.isArray(remote.items) && remote.items.length > 0) {
      const localItems = loadData<MonevMonitoringItem[]>(KEY_ITEMS, []);
      const map = new Map<string, MonevMonitoringItem>();
      localItems.forEach(i => map.set(i.id, i));
      let itemChanged = false;
      remote.items.forEach((ri: MonevMonitoringItem) => {
        const li = map.get(ri.id);
        const riHasInput = ri.statusKetercapaian !== "NOT_STARTED" || Boolean(ri.laporanPelaksanaan);
        const liHasInput = li && (li.statusKetercapaian !== "NOT_STARTED" || Boolean(li.laporanPelaksanaan));
        if (liHasInput && !riHasInput) return;
        if (
          !li ||
          (riHasInput && !liHasInput) ||
          new Date(ri.updatedAt || 0).getTime() >= new Date(li.updatedAt || 0).getTime()
        ) {
          map.set(ri.id, {
            ...ri,
            reportId: ri.reportId || ri.submissionId || getCanonicalReportId(ri.periodId, ri.desa),
            desaNama: ri.desaNama || formatDesaShort(ri.wilayah),
            kelompokNama: ri.kelompokNama || formatKelompokShort(ri.desa)
          });
          itemChanged = true;
          changed = true;
        }
      });
      if (itemChanged) saveData(KEY_ITEMS, Array.from(map.values()));
    }

    // 5. Merge Follow-Ups
    if (Array.isArray(remote.followUps) && remote.followUps.length > 0) {
      const localFu = loadData<MonevFollowUp[]>(KEY_FOLLOW_UPS, []);
      const map = new Map<string, MonevFollowUp>();
      localFu.forEach(f => map.set(f.id, f));
      let fuChanged = false;
      remote.followUps.forEach((rf: MonevFollowUp) => {
        const lf = map.get(rf.id);
        if (!lf || new Date(rf.updatedAt || 0).getTime() >= new Date(lf.updatedAt || 0).getTime()) {
          map.set(rf.id, rf);
          fuChanged = true;
          changed = true;
        }
      });
      if (fuChanged) saveData(KEY_FOLLOW_UPS, Array.from(map.values()));
    }

    // 6. Merge Evidence
    if (Array.isArray(remote.evidence) && remote.evidence.length > 0) {
      const localEv = loadData<MonevEvidence[]>(KEY_EVIDENCE, []);
      const map = new Map<string, MonevEvidence>();
      localEv.forEach(e => map.set(e.id, e));
      let evChanged = false;
      remote.evidence.forEach((re: MonevEvidence) => {
        if (!map.has(re.id)) {
          map.set(re.id, re);
          evChanged = true;
          changed = true;
        }
      });
      if (evChanged) saveData(KEY_EVIDENCE, Array.from(map.values()));
    }

    // 7. Merge Audit Logs
    if (Array.isArray(remote.audits) && remote.audits.length > 0) {
      const localAudits = loadData<MonevAuditLog[]>(KEY_AUDITS, []);
      const map = new Map<string, MonevAuditLog>();
      localAudits.forEach(a => map.set(a.id, a));
      let auditChanged = false;
      remote.audits.forEach((ra: MonevAuditLog) => {
        if (!map.has(ra.id)) {
          map.set(ra.id, ra);
          auditChanged = true;
          changed = true;
        }
      });
      if (auditChanged) {
        const sorted = Array.from(map.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 500);
        saveData(KEY_AUDITS, sorted);
      }
    }

    return changed;
  } catch {
    return false;
  }
}

