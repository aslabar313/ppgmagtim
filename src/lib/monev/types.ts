/**
 * Types & Domain Model untuk Modul MONEV PPG:
 * 1. Monev Agenda Bulanan PPG
 */

export type MonevPeriodStatus = "DRAFT" | "OPEN" | "VERIFICATION" | "LOCKED" | "ARCHIVED";

export type MonevSubmissionStatus = "DRAFT" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "LOCKED";

export type MonevAgendaCompletionStatus = "NOT_STARTED" | "COMPLETED" | "PARTIAL" | "NOT_COMPLETED";

export type MonevFollowUpStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type MonevAgendaKategori = 
  | "Kurikulum"
  | "Evaluasi"
  | "Pembinaan Mubaligh"
  | "KBM Caberawit"
  | "Muda-Mudi"
  | "Musyawarah 5 Unsur"
  | "Administrasi & BK"
  | "Lainnya";

export interface WilayahDesaConfig {
  wilayah: "Desa Selatan" | "Desa Tengah" | "Desa Utara" | "Desa Timur";
  desas: string[];
}

// Master Wilayah Referensi Resmi PPG Magetan Timur (4 Wilayah, 30 Desa / Kelompok)
export const MASTER_WILAYAH_CONFIG: WilayahDesaConfig[] = [
  {
    wilayah: "Desa Selatan",
    desas: ["Soco", "Bendo", "Setren", "Malang", "Pandeyan", "Karas", "Patihan"]
  },
  {
    wilayah: "Desa Tengah",
    desas: ["Candi", "Gombel", "Barat", "Sumberejo", "Ngumpul", "Blaran 2"]
  },
  {
    wilayah: "Desa Utara",
    desas: ["Jeruk", "Klampisan", "Guyung", "Dinden", "Waruk", "Karasan", "Singgahan 1", "Singgahan 2", "Tawang", "Blaran 1"]
  },
  {
    wilayah: "Desa Timur",
    desas: ["Panggung", "Klayapan 1", "Klayapan 2", "Pencol", "Dingin", "Teseh", "Klagen Serut"]
  }
];

// Alias lookup untuk menangani ejaan/penamaan alternatif yang ada di sistem
export const DESA_ALIASES: Record<string, string> = {
  "wruk": "Waruk",
  "waruk": "Waruk",
  "panggangung": "Panggung",
  "panggung": "Panggung",
  "blaran2": "Blaran 2",
  "blaran1": "Blaran 1",
  "klayapan1": "Klayapan 1",
  "klayapan2": "Klayapan 2",
  "singgahan1": "Singgahan 1",
  "singgahan2": "Singgahan 2"
};

export const normalizeDesaName = (name: string): string => {
  const clean = name.replace(/^(Kelompok|Desa)\s+/i, "").trim();
  const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  return DESA_ALIASES[lower] || clean;
};

/**
 * Normalisasi Terminologi Resmi (Section 10–18):
 * Hierarchy: DAERAH (Magetan Timur) -> DESA (Selatan, Tengah, Utara, Timur) -> KELOMPOK (Karas, Soco, Setren, dst.)
 * - formatDesaShort("Desa Selatan") => "Selatan"
 * - formatDesaLabel("Desa Selatan") => "Desa : Selatan"
 * - formatKelompokShort("Kelompok Karas") => "Karas"
 * - formatKelompokLabel("Karas") => "Kelompok : Karas"
 * - formatKelompokDesaInline("Karas", "Desa Selatan") => "Kelompok Karas, Desa Selatan"
 */
export const formatDesaShort = (wilayahOrDesa: string): string => {
  if (!wilayahOrDesa) return "Selatan";
  const cleaned = wilayahOrDesa.replace(/^(Wilayah\s+)?(Desa\s+)+/i, "").trim();
  if (["Selatan", "Tengah", "Utara", "Timur"].includes(cleaned)) {
    return cleaned;
  }
  const norm = normalizeDesaName(cleaned);
  const found = MASTER_WILAYAH_CONFIG.find(w => w.desas.some(d => normalizeDesaName(d) === norm));
  if (found) {
    return found.wilayah.replace(/^Desa\s+/i, "").trim();
  }
  return cleaned;
};

export const formatDesaLabel = (wilayahOrDesa: string): string => {
  return `Desa : ${formatDesaShort(wilayahOrDesa)}`;
};

export const formatKelompokShort = (kelompok: string): string => {
  if (!kelompok) return "";
  return normalizeDesaName(kelompok);
};

export const formatKelompokLabel = (kelompok: string): string => {
  return `Kelompok : ${formatKelompokShort(kelompok)}`;
};

export const formatKelompokDesaInline = (kelompok: string, desaInduk?: string): string => {
  const kel = formatKelompokShort(kelompok);
  const des = formatDesaShort(desaInduk || kelompok);
  return `Kelompok ${kel}, Desa ${des}`;
};

export const getCanonicalReportId = (periodId: string, kelompok: string): string => {
  const slug = normalizeDesaName(kelompok).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `sub-${periodId}-${slug}`;
};

/**
 * Mapping Status Canonical ke UI (Section 22):
 * DRAFT -> Draft
 * SUBMITTED -> Menunggu Persetujuan
 * VERIFIED -> Disetujui
 * REJECTED -> Perlu Perbaikan
 * LOCKED -> Dikunci
 */
export const formatApprovalStatusLabel = (status?: string): string => {
  switch (status) {
    case "VERIFIED":
      return "Disetujui";
    case "SUBMITTED":
      return "Menunggu Persetujuan";
    case "REJECTED":
      return "Perlu Perbaikan";
    case "LOCKED":
      return "Dikunci";
    case "NOT_STARTED":
      return "Belum Dimulai";
    case "DRAFT":
    default:
      return "Draft";
  }
};

// 18 Master Agenda Bulanan PPG Resmi
export interface MonevMasterAgenda {
  id: string;
  nomorUrut: number;
  judulAgenda: string;
  kategori: MonevAgendaKategori;
  sasaran: string;
  frekuensi: string;
  isMandatory: boolean;
  isActive: boolean;
  deskripsi?: string;
  createdAt: string;
  updatedAt: string;
}

export const INITIAL_18_MASTER_AGENDA: Omit<MonevMasterAgenda, "createdAt" | "updatedAt">[] = [
  {
    id: "mag-01",
    nomorUrut: 1,
    judulAgenda: "Musyawarah guru",
    kategori: "Musyawarah 5 Unsur",
    sasaran: "Guru",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Musyawarah pembinaan dan evaluasi guru/pengajar TPQ bulanan"
  },
  {
    id: "mag-02",
    nomorUrut: 2,
    judulAgenda: "Musyawarah 5 unsur",
    kategori: "Musyawarah 5 Unsur",
    sasaran: "5 Unsur",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Koordinasi pembinaan 5 unsur (Pengurus, Guru, Orang Tua, Tokoh, Mubaligh)"
  },
  {
    id: "mag-03",
    nomorUrut: 3,
    judulAgenda: "Muda mudi hadir pengajian kelompok",
    kategori: "Muda-Mudi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Monitoring tingkat kehadiran muda-mudi di pengajian rutin kelompok"
  },
  {
    id: "mag-04",
    nomorUrut: 4,
    judulAgenda: "Evaluasi target MM September",
    kategori: "Evaluasi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Evaluasi pencapaian target kurikulum dan karakter muda-mudi periode bulanan"
  },
  {
    id: "mag-05",
    nomorUrut: 5,
    judulAgenda: "Hari boso CR dan MM",
    kategori: "KBM Caberawit",
    sasaran: "Caberawit & MM",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Pelaksanaan program hari berbahasa krama/Jawa halus santri Caberawit dan Muda-Mudi"
  },
  {
    id: "mag-06",
    nomorUrut: 6,
    judulAgenda: "Tim bacaan dan Pegon khusus generus",
    kategori: "Kurikulum",
    sasaran: "Caberawit",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Pendampingan khusus tim verifikasi bacaan Al-Quran dan Pegon generus"
  },
  {
    id: "mag-07",
    nomorUrut: 7,
    judulAgenda: "Mas di jadwal ngajar Generus",
    kategori: "Pembinaan Mubaligh",
    sasaran: "Mubaligh & Pengajar",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Penjadwalan dan realisasi mengajar pengurus/mas-mas untuk kelas generus"
  },
  {
    id: "mag-08",
    nomorUrut: 8,
    judulAgenda: "Penerobosan MM (terjadwal)",
    kategori: "Muda-Mudi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Agenda penerobosan dan pendampingan santri muda-mudi terjadwal"
  },
  {
    id: "mag-09",
    nomorUrut: 9,
    judulAgenda: "Sambung CR dan MM",
    kategori: "KBM Caberawit",
    sasaran: "Caberawit & MM",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Kegiatan sambung keakraban antara Caberawit dan Muda-Mudi"
  },
  {
    id: "mag-10",
    nomorUrut: 10,
    judulAgenda: "Sensus Generus",
    kategori: "Administrasi & BK",
    sasaran: "Semua Generus",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Pembaruan data sensus santri, mutasi, dan pertumbuhan generus"
  },
  {
    id: "mag-11",
    nomorUrut: 11,
    judulAgenda: "Muda Mudi tidur masjid",
    kategori: "Muda-Mudi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Program qiyamul lail dan pembinaan karakter menginap/tidur masjid muda-mudi"
  },
  {
    id: "mag-12",
    nomorUrut: 12,
    judulAgenda: "Serkiler PPG September",
    kategori: "Administrasi & BK",
    sasaran: "Pengurus",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Penyaluran dan tindak lanjut surat edaran/serkiler resmi PPG bulanan"
  },
  {
    id: "mag-13",
    nomorUrut: 13,
    judulAgenda: "BK klp cek absensi",
    kategori: "Administrasi & BK",
    sasaran: "BK Kelompok",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Biro Konseling/BK kelompok melakukan audit dan cross-check absensi santri"
  },
  {
    id: "mag-14",
    nomorUrut: 14,
    judulAgenda: "BK kelompok setor lembar kerja ke BK desa",
    kategori: "Administrasi & BK",
    sasaran: "BK Kelompok",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Penyetoran form dan lembar kerja evaluasi BK kelompok ke koordinator BK desa"
  },
  {
    id: "mag-15",
    nomorUrut: 15,
    judulAgenda: "Asad khusus CR",
    kategori: "KBM Caberawit",
    sasaran: "Caberawit",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Latihan dan pembinaan seni beladiri ASAD khusus santri Caberawit"
  },
  {
    id: "mag-16",
    nomorUrut: 16,
    judulAgenda: "Asad khusus MM",
    kategori: "Muda-Mudi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Latihan dan pembinaan seni beladiri ASAD khusus santri Muda-Mudi"
  },
  {
    id: "mag-17",
    nomorUrut: 17,
    judulAgenda: "MBG (makan bersama Generus) CR",
    kategori: "KBM Caberawit",
    sasaran: "Caberawit",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Program Makan Bersama Generus (MBG) santri Caberawit untuk keakraban dan gizi"
  },
  {
    id: "mag-18",
    nomorUrut: 18,
    judulAgenda: "MBG Muda Mudi",
    kategori: "Muda-Mudi",
    sasaran: "Muda-Mudi",
    frekuensi: "Bulanan",
    isMandatory: true,
    isActive: true,
    deskripsi: "Program Makan Bersama Generus (MBG) muda-mudi untuk penguatan ukhuwah"
  }
];

export interface MonevPeriod {
  id: string;
  namaPeriode: string;
  tahun: number;
  bulan: number;
  periodeKode: string; // e.g. "2026-10"
  status: MonevPeriodStatus;
  tanggalMulai: string;
  tanggalSelesai: string;
  cakupanWilayah: string[];
  selectedAgendaIds?: string[];
  selectedDesas?: string[];
  totalDesa: number;
  totalAgenda: number;
  catatanPeriode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lockedBy?: string;
  lockedAt?: string;
}

export interface MonevPeriodAgendaSnapshot {
  id: string;
  periodId: string;
  masterAgendaId: string;
  nomorUrut: number;
  judulAgenda: string;
  kategori: MonevAgendaKategori;
  sasaran: string;
  isMandatory: boolean;
  bobotPersen: number;
  createdAt: string;
}

export interface MonevSubmission {
  id: string;
  reportId?: string;
  periodId: string;
  wilayah: string;
  desa: string;
  desaNama?: string;
  kelompokNama?: string;
  status: MonevSubmissionStatus;
  progressPersen: number;
  agendaSelesai: number;
  agendaTotal: number;
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  catatanVerifikasi?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface MonevMonitoringItem {
  id: string;
  submissionId: string;
  reportId?: string;
  periodId: string;
  agendaSnapshotId: string;
  wilayah: string;
  desa: string;
  desaNama?: string;
  kelompokNama?: string;
  judulAgenda: string;
  nomorUrut: number;
  kategori: MonevAgendaKategori;
  terlaksana: boolean;
  statusKetercapaian?: MonevAgendaCompletionStatus; // NOT_STARTED | COMPLETED | PARTIAL | NOT_COMPLETED
  isMandatory?: boolean;
  tanggalPelaksanaan?: string;
  ketercapaianPersen: number;
  jumlahPeserta?: number;
  penanggungJawab?: string;
  kendala?: string;
  tindakLanjut?: string;
  catatanEvaluasi?: string;
  laporanPelaksanaan?: string;
  evidenceUrls?: string[];
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuthScopeContext {
  username?: string;
  role: string;
  scope: string;
}

export interface MonevEvidence {
  id: string;
  monitoringItemId: string;
  periodId: string;
  wilayah: string;
  desa: string;
  judulDokumentasi: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface MonevFollowUp {
  id: string;
  monitoringItemId: string;
  periodId: string;
  wilayah: string;
  desa: string;
  agendaJudul: string;
  nomorUrut?: number;
  alasanKendala: string;
  deskripsiMasalah: string;
  rencanaTindakan: string;
  pic: string;
  targetPenyelesaian: string; // YYYY-MM-DD
  catatanProgres?: string;
  status: MonevFollowUpStatus; // OPEN | IN_PROGRESS | COMPLETED | CANCELLED
  hasilTindakLanjut?: string;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonevAuditLog {
  id: string;
  entityType: "PERIOD" | "MASTER_AGENDA" | "SUBMISSION" | "MONITORING_ITEM" | "FOLLOW_UP" | "EVIDENCE";
  entityId: string;
  action: "CREATE" | "UPDATE" | "STATUS_CHANGE" | "VERIFY" | "REJECT" | "RESUBMIT" | "GENERATE_ITEMS" | "BATCH_UPDATE" | "LOCK";
  actorUsername: string;
  actorRole: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  details?: Record<string, any>;
  createdAt: string;
}

export interface DesaSubmissionSummary {
  periodId: string;
  reportId: string;
  desa: string;
  wilayah: string;
  desaNama: string;
  kelompokNama: string;
  submission: MonevSubmission | null;
  items: MonevMonitoringItem[];
  totalAgendas: number;
  totalMandatory: number;
  agendaTerisi: number;
  agendaTerlaksana: number;
  agendaPartial: number;
  agendaNotCompleted?: number;
  agendaBelumTerlaksana: number;
  agendaNotStarted: number;
  completedMandatory: number;
  avgKetercapaian: number; // Persentase penyelesaian = completedMandatory / totalMandatory * 100
  statusLaporan?: MonevSubmissionStatus | "NOT_STARTED";
  statusVerifikasi?: "PENDING" | "VERIFIED" | "REJECTED" | "DRAFT" | "LOCKED";
  isReadyToSubmit: boolean;
  unreviewedMandatoryCount: number;
  incompleteAgendas: { nomorUrut: number; judulAgenda: string }[];
  kendalaItems: MonevMonitoringItem[];
}

export interface WilayahProgressSummary {
  wilayah: string;
  totalDesa: number;
  verifiedCount: number;
  submittedCount: number;
  draftCount: number;
  rejectedCount: number;
  belumDimulaiCount: number;
  reportingRate: number;
  attentionRequiredCount: number;
  avgProgress: number;
}

export interface AgendaBermasalahSummary {
  agendaSnapshotId?: string;
  judulAgenda: string;
  kategori: MonevAgendaKategori;
  nomorUrut: number;
  notCompletedCount: number;
  partialCount: number;
  totalProblematic: number;
  affectedDesas: string[];
}

export interface MonevCommandCenterData {
  periodId: string;
  periodName: string;
  periodStatus: MonevPeriodStatus;
  totalDesa: number;
  belumDimulai: number;
  draft: number;
  submitted: number;
  verified: number;
  rejected: number;
  desaBelumMelapor: number;
  rataRataProgres: number;
  reportingRate: number;
  verificationRate: number;
  wilayahSummaries: WilayahProgressSummary[];
  agendaBermasalah: AgendaBermasalahSummary[];
  totalFollowUps: number;
  openFollowUps: number;
  inProgressFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  villagePerformance?: VillagePerformanceItem[];
}

export interface QuickFillItemInput {
  itemId: string;
  judulAgenda: string;
  nomorUrut: number;
  kategori: MonevAgendaKategori;
  isMandatory: boolean;
  statusKetercapaian: MonevAgendaCompletionStatus;
  ketercapaianPersen: number;
  tanggalPelaksanaan?: string;
  jumlahPeserta?: number;
  penanggungJawab?: string;
  kendala?: string;
  rencanaTindakan?: string;
  catatanEvaluasi?: string;
  laporanPelaksanaan?: string;
  evidenceUrls?: string[];
}

export interface AgendaAnalyticsItem {
  nomorUrut: number;
  judulAgenda: string;
  kategori: MonevAgendaKategori;
  completedCount: number;
  partialCount: number;
  notCompletedCount: number;
  notStartedCount: number;
  totalVillages: number;
  completionRate: number;
  partialRate: number;
  notCompletedRate: number;
}

export interface VillagePerformanceItem {
  desa: string;
  wilayah: string;
  submissionId?: string;
  submissionStatus: MonevSubmissionStatus | "NOT_STARTED";
  completionRate: number;
  completedCount: number;
  partialCount: number;
  notCompletedCount: number;
  notStartedCount: number;
  totalMandatory: number;
  openFollowUpsCount: number;
  overdueFollowUpsCount: number;
  attentionRequired: boolean;
  attentionReasons: string[];
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  catatanVerifikasi?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface HeatmapCell {
  itemId: string;
  desa: string;
  wilayah: string;
  nomorUrut: number;
  judulAgenda: string;
  status: MonevAgendaCompletionStatus;
  persen: number;
  kendala?: string;
}

export interface PeriodTrendItem {
  periodId: string;
  periodeKode: string;
  namaPeriode: string;
  status: MonevPeriodStatus;
  avgCompletionRate: number;
  reportingRate: number;
  verificationRate: number;
  totalVillages: number;
}

export interface MonevAnalyticsData {
  periodId: string;
  periodName: string;
  agendaPerformance: AgendaAnalyticsItem[];
  highestCompletionAgendas: AgendaAnalyticsItem[];
  highestPartialAgendas: AgendaAnalyticsItem[];
  highestNotCompletedAgendas: AgendaAnalyticsItem[];
  villagePerformance: VillagePerformanceItem[];
  highestVillages: VillagePerformanceItem[];
  lowestVillages: VillagePerformanceItem[];
  attentionVillages: VillagePerformanceItem[];
  regionPerformance: WilayahProgressSummary[];
  heatmapMatrix: {
    desa: string;
    wilayah: string;
    submissionStatus: string;
    completionRate: number;
    cells: HeatmapCell[];
  }[];
  periodTrends: PeriodTrendItem[];
}

export interface MonevExecutiveReport {
  period: MonevPeriod;
  totalVillages: number;
  reportedVillages: number;
  verifiedVillages: number;
  reportingRate: number;
  completionRate: number;
  verificationRate: number;
  regionalReport: WilayahProgressSummary[];
  villageReport: VillagePerformanceItem[];
  agendaReport: AgendaAnalyticsItem[];
  followUpSummary: {
    total: number;
    open: number;
    inProgress: number;
    overdue: number;
    completed: number;
    cancelled: number;
    items: MonevFollowUp[];
  };
}


