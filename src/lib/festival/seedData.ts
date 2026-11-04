// ============================================================================
// MODULE: FESTIVAL GENERUS — PART 1 & 2 (SEED DATA & 17 MASTER CATEGORIES)
// ============================================================================

import type {
  EducationLevel,
  FestivalStoreState,
  FgApprovalRecord,
  FgArena,
  FgArenaQueue,
  FgArtwork,
  FgAuditLog,
  FgCertificate,
  FgChampionshipConfig,
  FgCheckinRecord,
  FgCompetition,
  FgCompetitionCategory,
  FgCompetitionResult,
  FgCompetitionRule,
  FgContingent,
  FgEvent,
  FgEventStage,
  FgJudge,
  FgJudgeAssignment,
  FgParticipant,
  FgQuizLeaderboard,
  FgQuizMatch,
  FgQuizScoreEvent,
  FgRegistration,
  FgScoringCriteria,
  FgScoringResult,
  FgScoringRevision,
  FgScoringSubmission,
  FgTeam,
} from "./types";
import { CANONICAL_REGION_NAME, FESTIVAL_VILLAGE_GROUPS_MAP } from "./festivalAuth";

export const INITIAL_FG_EVENT: FgEvent = {
  id: "fg-evt-2026",
  code: "FG-MAGTIM-2026",
  name: "Festival Generus Caberawit & Remaja Daerah Magetan Timur 2026",
  theme: "Mewujudkan Generus yang Alim-Faqih, Berakhlaqul Karimah, dan Mandiri (Tri Sukses Generus)",
  hijriYear: "1448 H",
  gregorianYear: 2026,
  regionName: CANONICAL_REGION_NAME,
  hostVillageName: "Desa Selatan",
  locationName: "Kompleks Masjid Baitul Makmur & Aula PPG Magetan Timur",
  startDate: "2026-11-15",
  endDate: "2026-11-16",
  registrationStartDate: "2026-10-25",
  registrationEndDate: "2026-11-12",
  status: "ONGOING",
  totalCategories: 17,
  judgesPerCompetition: 3,
  description:
    "Sistem manajemen perlombaan Islami Festival Generus tingkat Kelompok, Desa, dan Daerah Magetan Timur dengan 17 kategori lomba, 3 juri per kategori, penilaian digital berbobot, karya fisik, dan Cerdas Cermat.",
  createdBy: "superadminaldi",
  updatedAt: "2026-11-04T08:00:00Z",
};

export const INITIAL_FG_STAGES: FgEventStage[] = [
  {
    id: "stg-penyisihan",
    eventId: "fg-evt-2026",
    stageCode: "PENYISIHAN",
    stageName: "Babak Penyisihan",
    sequenceOrder: 1,
    isActive: true,
    startTime: "2026-11-15T07:30:00Z",
    endTime: "2026-11-15T12:00:00Z",
  },
  {
    id: "stg-semifinal",
    eventId: "fg-evt-2026",
    stageCode: "SEMIFINAL",
    stageName: "Babak Semifinal",
    sequenceOrder: 2,
    isActive: true,
    startTime: "2026-11-15T13:00:00Z",
    endTime: "2026-11-15T16:30:00Z",
  },
  {
    id: "stg-final",
    eventId: "fg-evt-2026",
    stageCode: "FINAL",
    stageName: "Babak Grand Final",
    sequenceOrder: 3,
    isActive: true,
    startTime: "2026-11-16T08:00:00Z",
    endTime: "2026-11-16T14:00:00Z",
  },
];

export const INITIAL_FG_CATEGORIES: FgCompetitionCategory[] = [
  { id: "cat-seni", eventId: "fg-evt-2026", code: "SENI_KALIGRAFI", name: "Seni Mewarnai & Menggambar Kaligrafi (Karya Fisik)", description: "Kategori #1 s/d #3: Mewarnai PAUD/TK dan Menggambar Kaligrafi SD 1-3 & SD 4-6.", displayOrder: 1, isActive: true },
  { id: "cat-quran", eventId: "fg-evt-2026", code: "QURAN_ADZAN_TAHFIDZ", name: "Al-Qur'an, Tilawati, Tahfidz & Adzan", description: "Kategori #4, #5, #6, #8, #10, #14, #15: Adzan, Tilawati, Bacaan Al-Qur'an, Tahfidz, dan Bacaan + Makna.", displayOrder: 2, isActive: true },
  { id: "cat-dakwah", eventId: "fg-evt-2026", code: "NASEHAT_HADIST_ASAD", name: "Nasehat, Penyampaian Hadist & Asad Pasanggiri", description: "Kategori #7, #9, #11, #12, #13: Nasehat SD/SMP/SMA, Hadist Adab, dan Asad Pasanggiri.", displayOrder: 3, isActive: true },
  { id: "cat-beregu", eventId: "fg-evt-2026", code: "CERDAS_CERMAT_BEREGU", name: "Cerdas Cermat Beregu (SD & SMP-SMA)", description: "Kategori #16 & #17: Cerdas Cermat beregu 2-3 peserta dengan babak penyisihan & final.", displayOrder: 4, isActive: true },
];

export const INITIAL_FG_ARENAS: FgArena[] = [
  { id: "arn-01", eventId: "fg-evt-2026", code: "ARENA-01", name: "Arena 1 — Masjid Baitul Makmur Lt. 1", buildingOrZone: "Zona A (Utama)", capacity: 150, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Tahfidz SD, Bacaan Al-Quran, Tilawati, Adzan SD." },
  { id: "arn-02", eventId: "fg-evt-2026", code: "ARENA-02", name: "Arena 2 — Aula PPG Magetan Timur Lt. 2", buildingOrZone: "Zona B (Aula)", capacity: 120, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Nasehat SD, Nasehat SMP, dan Nasehat SMA/SMK." },
  { id: "arn-03", eventId: "fg-evt-2026", code: "ARENA-03", name: "Arena 3 — Ruang Kelas Keilmuan 1 & 2", buildingOrZone: "Zona C (Timur)", capacity: 60, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Penyampaian Hadist SMA/SMK & Bacaan + Makna Al-Quran SMP/SMA." },
  { id: "arn-04", eventId: "fg-evt-2026", code: "ARENA-04", name: "Arena 4 — Pendopo Kreativitas Kaligrafi", buildingOrZone: "Zona D (Pendopo)", capacity: 100, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Mewarnai PAUD/TK & Menggambar Kaligrafi SD 1-3 dan SD 4-6 (Durasi 90 Menit)." },
  { id: "arn-05", eventId: "fg-evt-2026", code: "ARENA-05", name: "Arena 5 — Gelanggang Asad Pasanggiri", buildingOrZone: "Zona E (Barat)", capacity: 80, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Asad Pasanggiri SD." },
  { id: "arn-06", eventId: "fg-evt-2026", code: "ARENA-06", name: "Arena 6 — Panggung Utama Cerdas Cermat Buzzer", buildingOrZone: "Zona F (Panggung Buzzer)", capacity: 200, operatorUsername: "operatorcc1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Cerdas Cermat Beregu SD dan SMP-SMA." },
  { id: "arn-07", eventId: "fg-evt-2026", code: "ARENA-07", name: "Arena 7 — Serambi Selatan Masjid Baitul Makmur", buildingOrZone: "Zona G (Serambi Selatan)", capacity: 70, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Arena Paralel Adzan SMP & Tilawati Cadangan." },
  { id: "arn-08", eventId: "fg-evt-2026", code: "ARENA-08", name: "Arena 8 — Serambi Utara Masjid Baitul Makmur", buildingOrZone: "Zona H (Serambi Utara)", capacity: 70, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Arena Paralel Tahfidz & Bacaan Al-Quran." },
  { id: "arn-09", eventId: "fg-evt-2026", code: "ARENA-09", name: "Arena 9 — Ruang Multimedia PPG Lt. 1", buildingOrZone: "Zona I (Multimedia)", capacity: 50, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Arena Penyisihan Cerdas Cermat Grup B." },
  { id: "arn-10", eventId: "fg-evt-2026", code: "ARENA-10", name: "Arena 10 — Gedung Dakwah Desa Selatan", buildingOrZone: "Zona J (Gedung Dakwah)", capacity: 90, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "READY", notes: "Arena Paralel Nasehat & Penyampaian Hadist." },
  { id: "arn-11", eventId: "fg-evt-2026", code: "ARENA-11", name: "Arena 11 — Galeri Karya & Display F4", buildingOrZone: "Zona K (Galeri Karya)", capacity: 80, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Ruang Penjurian Karya Fisik Kaligrafi & Mewarnai F4." },
  { id: "arn-12", eventId: "fg-evt-2026", code: "ARENA-12", name: "Arena 12 — Posko Sekretariat & Meja Check-in QR", buildingOrZone: "Zona L (Registrasi & Check-in)", capacity: 100, operatorUsername: "operatorarena1", checkinOfficerUsername: "petugascheckin1", status: "ACTIVE", notes: "Sentra Registrasi Ulang, Verifikasi Berkas & QR Check-in Kontingen." },
];

// 17 Master Competition Categories (Part 2 Exact Specification with Consistent Internal IDs)
const MASTER_17_COMPETITIONS: Array<{
  id: string;
  code: string;
  name: string;
  categoryId: string;
  arenaId: string;
  type: "INDIVIDUAL" | "TEAM" | "QUIZ_TEAM";
  gender: "PUTRA" | "PUTRI" | "MIXED" | "PUTRA_PUTRI_SEPARATE";
  educationLevel: EducationLevel;
  minAge: number;
  maxAge: number;
  minMembers: number;
  maxMembers: number;
  timerMinutes?: number;
  themeText?: string;
  materialText?: string;
  equipmentNotes?: string;
  isPhysicalArtwork?: boolean;
  isAsadOfficialRules?: boolean;
  hasMaleBonusConfig?: boolean;
  criteriaList: Array<{ code: string; name: string; weight: number; priority?: boolean }>;
}> = [
  {
    id: "fg-comp-mewarnai-paud", code: "MWR-PAUD", name: "Mewarnai Kaligrafi — PAUD/TK",
    categoryId: "cat-seni", arenaId: "arn-04", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "PAUD/TK", minAge: 4, maxAge: 7, minMembers: 1, maxMembers: 1,
    timerMinutes: 90, themeText: "Tema sesuai materi lomba",
    equipmentNotes: "Meja dan alat sendiri, kertas F4 disediakan panitia, durasi 1,5 jam, tanpa pendampingan orang tua.",
    isPhysicalArtwork: true,
    criteriaList: [
      { code: "WARNA", name: "Perpaduan Warna", weight: 40, priority: true },
      { code: "KERAPIAN", name: "Kerapian", weight: 30 },
      { code: "SELESAI", name: "Keterselesaian", weight: 30 },
    ],
  },
  {
    id: "fg-comp-kaligrafi-sd13", code: "KLG-SD13", name: "Menggambar Kaligrafi — SD 1–3",
    categoryId: "cat-seni", arenaId: "arn-04", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD 1-3", minAge: 7, maxAge: 9, minMembers: 1, maxMembers: 1,
    timerMinutes: 90, themeText: "Allohu Akbar",
    equipmentNotes: "Tanpa latar belakang berwarna, meja dan alat sendiri, kertas F4 disediakan, durasi 1,5 jam.",
    isPhysicalArtwork: true,
    criteriaList: [
      { code: "KREATIVITAS", name: "Kreativitas", weight: 40, priority: true },
      { code: "KERAPIAN", name: "Kerapian", weight: 25 },
      { code: "TULISAN", name: "Ketepatan Tulisan", weight: 35 },
    ],
  },
  {
    id: "fg-comp-kaligrafi-sd46", code: "KLG-SD46", name: "Menggambar Kaligrafi — SD 4–6",
    categoryId: "cat-seni", arenaId: "arn-04", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD 4-6", minAge: 10, maxAge: 12, minMembers: 1, maxMembers: 1,
    timerMinutes: 90, themeText: "Bismillahi Rohman Nirohim",
    equipmentNotes: "Tanpa latar belakang berwarna, meja dan alat sendiri, kertas F4 disediakan, durasi 1,5 jam.",
    isPhysicalArtwork: true,
    criteriaList: [
      { code: "KREATIVITAS", name: "Kreativitas", weight: 40, priority: true },
      { code: "KERAPIAN", name: "Kerapian", weight: 25 },
      { code: "TULISAN", name: "Ketepatan Tulisan", weight: 35 },
    ],
  },
  {
    id: "fg-comp-adzan-sd", code: "ADZ-SD", name: "Adzan — SD",
    categoryId: "cat-quran", arenaId: "arn-01", type: "INDIVIDUAL", gender: "PUTRA",
    educationLevel: "SD", minAge: 7, maxAge: 12, minMembers: 1, maxMembers: 1,
    materialText: "Adzan, Iqomah, dan Doa setelah Adzan",
    criteriaList: [
      { code: "MAKHRAJ", name: "Lafadz dan Makhraj", weight: 40, priority: true },
      { code: "NADA", name: "Nada / Lagu", weight: 30 },
      { code: "VOLUME", name: "Volume Suara", weight: 30 },
    ],
  },
  {
    id: "fg-comp-tilawati-sd13", code: "TLW-SD13", name: "Bacaan Tilawati — SD 1–3",
    categoryId: "cat-quran", arenaId: "arn-01", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD 1-3", minAge: 7, maxAge: 9, minMembers: 1, maxMembers: 1,
    materialText: "Tilawati Jilid 4 (Materi dipilih juri, dua kali pembacaan)",
    criteriaList: [
      { code: "MAKHRAJ", name: "Makhraj", weight: 40, priority: true },
      { code: "VOLUME", name: "Volume", weight: 20 },
      { code: "NADA", name: "Nada / Lagu", weight: 40 },
    ],
  },
  {
    id: "fg-comp-quran-sd46", code: "QRN-SD46", name: "Bacaan Al-Quran — SD 4–6",
    categoryId: "cat-quran", arenaId: "arn-01", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD 4-6", minAge: 10, maxAge: 12, minMembers: 1, maxMembers: 1,
    materialText: "Surah Al-Baqarah Juz 1 (Materi dipilih juri, dua kali pembacaan)",
    criteriaList: [
      { code: "TAJWID", name: "Tajwid", weight: 35, priority: true },
      { code: "MAKHRAJ", name: "Makhraj", weight: 30 },
      { code: "VOLUME", name: "Volume", weight: 15 },
      { code: "NADA", name: "Nada", weight: 20 },
    ],
  },
  {
    id: "fg-comp-nasehat-sd", code: "NSH-SD", name: "Nasehat — SD",
    categoryId: "cat-dakwah", arenaId: "arn-02", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD", minAge: 7, maxAge: 12, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, themeText: "Nasehat Pokok dan 29 Karakter (dipilih)",
    criteriaList: [
      { code: "HIKMAH", name: "Tema / Hikmah", weight: 35, priority: true },
      { code: "VOLUME", name: "Volume", weight: 20 },
      { code: "MENTAL", name: "Mental", weight: 25 },
      { code: "PAKAIAN", name: "Kerapian Pakaian", weight: 20 },
    ],
  },
  {
    id: "fg-comp-tahfidz-sd", code: "THF-SD", name: "Tahfidz — SD",
    categoryId: "cat-quran", arenaId: "arn-01", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SD", minAge: 7, maxAge: 12, minMembers: 1, maxMembers: 1,
    materialText: "Juz 30, QS An-Naas sampai Al-A'la (Wajib QS Al-Fajr, juri melanjutkan bacaan 2x)",
    criteriaList: [
      { code: "HAFALAN", name: "Hafalan", weight: 40, priority: true },
      { code: "TAJWID", name: "Tajwid", weight: 30 },
      { code: "MAKHRAJ", name: "Makhraj", weight: 30 },
    ],
  },
  {
    id: "fg-comp-asad-sd", code: "ASD-SD", name: "Asad Pasanggiri — SD",
    categoryId: "cat-dakwah", arenaId: "arn-05", type: "INDIVIDUAL", gender: "PUTRA_PUTRI_SEPARATE",
    educationLevel: "SD", minAge: 7, maxAge: 12, minMembers: 1, maxMembers: 1,
    materialText: "Peraturan Resmi ASAD Pasanggiri (Dikonfigurasi & dikonfirmasi Panitia)",
    isAsadOfficialRules: true,
    criteriaList: [
      { code: "WIRAGA", name: "Wiraga / Kebenaran Teknik Jurus", weight: 40, priority: true },
      { code: "WIRAMA", name: "Wirama / Ketepatan Ritme & Tenaga", weight: 30 },
      { code: "WIRASA", name: "Wirasa / Penghayatan & Sikap", weight: 30 },
    ],
  },
  {
    id: "fg-comp-adzan-smp", code: "ADZ-SMP", name: "Adzan — SMP",
    categoryId: "cat-quran", arenaId: "arn-01", type: "INDIVIDUAL", gender: "PUTRA",
    educationLevel: "SMP", minAge: 12, maxAge: 15, minMembers: 1, maxMembers: 1,
    materialText: "Adzan, Iqomah, dan Doa (Menggunakan ketentuan Adzan SD)",
    criteriaList: [
      { code: "MAKHRAJ", name: "Lafadz dan Makhraj", weight: 40, priority: true },
      { code: "NADA", name: "Nada / Lagu", weight: 30 },
      { code: "VOLUME", name: "Volume Suara", weight: 30 },
    ],
  },
  {
    id: "fg-comp-nasehat-smp", code: "NSH-SMP", name: "Nasehat — SMP",
    categoryId: "cat-dakwah", arenaId: "arn-02", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SMP", minAge: 12, maxAge: 15, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, themeText: "Nasehat Pokok dan Menjaga Pergaulan",
    hasMaleBonusConfig: true,
    criteriaList: [
      { code: "HIKMAH", name: "Tema / Hikmah", weight: 35, priority: true },
      { code: "VOLUME", name: "Volume", weight: 20 },
      { code: "MENTAL", name: "Mental", weight: 25 },
      { code: "PENAMPILAN", name: "Penampilan", weight: 20 },
    ],
  },
  {
    id: "fg-comp-nasehat-sma", code: "NSH-SMA", name: "Nasehat — SMA/SMK",
    categoryId: "cat-dakwah", arenaId: "arn-02", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SMA/SMK", minAge: 15, maxAge: 19, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, themeText: "Nasehat Pokok dan Menjaga Pergaulan",
    hasMaleBonusConfig: true,
    criteriaList: [
      { code: "HIKMAH", name: "Tema / Hikmah", weight: 35, priority: true },
      { code: "VOLUME", name: "Volume", weight: 20 },
      { code: "MENTAL", name: "Mental", weight: 25 },
      { code: "PENAMPILAN", name: "Penampilan", weight: 20 },
    ],
  },
  {
    id: "fg-comp-hadist-sma", code: "HDT-SMA", name: "Penyampaian Hadist — SMA/SMK",
    categoryId: "cat-dakwah", arenaId: "arn-03", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SMA/SMK", minAge: 15, maxAge: 19, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, materialText: "Hadist Adab (pembacaan, makna, dan penjelasan)",
    criteriaList: [
      { code: "HIKMAH", name: "Kesimpulan / Hikmah", weight: 35, priority: true },
      { code: "BACAAN", name: "Bacaan", weight: 30 },
      { code: "PENYAMPAIAN", name: "Penyampaian", weight: 35 },
    ],
  },
  {
    id: "fg-comp-quran-makna-smp", code: "QMK-SMP", name: "Bacaan + Makna Al-Quran — SMP",
    categoryId: "cat-quran", arenaId: "arn-03", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SMP", minAge: 12, maxAge: 15, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, materialText: "QS Fatir ayat 1–45",
    criteriaList: [
      { code: "HIKMAH", name: "Kesimpulan / Hikmah", weight: 35, priority: true },
      { code: "BACAAN", name: "Bacaan", weight: 30 },
      { code: "PENYAMPAIAN", name: "Penyampaian", weight: 35 },
    ],
  },
  {
    id: "fg-comp-quran-makna-sma", code: "QMK-SMA", name: "Bacaan + Makna Al-Quran — SMA/SMK",
    categoryId: "cat-quran", arenaId: "arn-03", type: "INDIVIDUAL", gender: "MIXED",
    educationLevel: "SMA/SMK", minAge: 15, maxAge: 19, minMembers: 1, maxMembers: 1,
    timerMinutes: 10, materialText: "QS Yunus ayat 1–70",
    criteriaList: [
      { code: "HIKMAH", name: "Kesimpulan / Hikmah", weight: 35, priority: true },
      { code: "BACAAN", name: "Bacaan", weight: 30 },
      { code: "PENYAMPAIAN", name: "Penyampaian", weight: 35 },
    ],
  },
  {
    id: "fg-comp-cca-sd", code: "CCA-SD", name: "Cerdas Cermat — SD (Beregu)",
    categoryId: "cat-beregu", arenaId: "arn-06", type: "QUIZ_TEAM", gender: "MIXED",
    educationLevel: "SD", minAge: 7, maxAge: 12, minMembers: 2, maxMembers: 3,
    materialText: "Babak Penyisihan dan Final. Sistem Giliran dan Rebutan/Buzzer (2–3 peserta/tim).",
    criteriaList: [
      { code: "GILIRAN", name: "Babak Giliran / Wajib", weight: 50, priority: false },
      { code: "REBUTAN", name: "Babak Rebutan / Buzzer", weight: 50, priority: true },
    ],
  },
  {
    id: "fg-comp-cca-smpsma", code: "CCA-SMPSMA", name: "Cerdas Cermat — SMP–SMA (Beregu)",
    categoryId: "cat-beregu", arenaId: "arn-06", type: "QUIZ_TEAM", gender: "MIXED",
    educationLevel: "SMP-SMA", minAge: 12, maxAge: 19, minMembers: 2, maxMembers: 3,
    materialText: "Babak Penyisihan dan Final. Sistem Giliran dan Rebutan/Buzzer (2–3 peserta/tim).",
    criteriaList: [
      { code: "GILIRAN", name: "Babak Giliran / Wajib", weight: 50, priority: false },
      { code: "REBUTAN", name: "Babak Rebutan / Buzzer", weight: 50, priority: true },
    ],
  },
];

export const INITIAL_FG_COMPETITIONS: FgCompetition[] = MASTER_17_COMPETITIONS.map((c, idx) => ({
  id: c.id,
  eventId: "fg-evt-2026",
  categoryId: c.categoryId,
  arenaId: c.arenaId,
  code: c.code,
  name: c.name,
  competitionType: c.type,
  genderScope: c.gender,
  educationLevel: c.educationLevel,
  ageSegment: `Jenjang ${c.educationLevel} (${c.minAge}-${c.maxAge} Thn)`,
  minAge: c.minAge,
  maxAge: c.maxAge,
  minMembersPerTeam: c.minMembers,
  maxMembersPerTeam: c.maxMembers,
  maxQuotaPerGroup: c.type === "INDIVIDUAL" ? 2 : 1,
  maxQuotaPerVillage: c.type === "INDIVIDUAL" ? 14 : 7,
  judgeCount: 3,
  scoringMethod: c.type === "QUIZ_TEAM" ? "QUIZ_POINT_SYSTEM" : "AVERAGE_3_JUDGES",
  scheduleStart: `2026-11-15T0${8 + (idx % 4)}:00:00Z`,
  scheduleEnd: `2026-11-15T1${1 + (idx % 4)}:30:00Z`,
  status: idx < 8 ? "ONGOING" : "SCHEDULED",
  timerDurationMinutes: c.timerMinutes,
  themeText: c.themeText,
  materialText: c.materialText,
  equipmentNotes: c.equipmentNotes,
  isPhysicalArtwork: Boolean(c.isPhysicalArtwork),
  isAsadOfficialRules: Boolean(c.isAsadOfficialRules),
  rulesConfirmedByCommittee: !c.isAsadOfficialRules,
  maleBonusConfig: c.hasMaleBonusConfig
    ? {
        enabled: true,
        bonusPoints: null, // Belum ditentukan sebelum disetujui panitia
        approvedByCommittee: false,
        description: "Konfigurasi bonus peserta laki-laki (menunggu persetujuan nilai oleh panitia).",
      }
    : undefined,
  allowPeerScorePreviewBeforeLock: false,
}));

export const INITIAL_FG_CRITERIA: FgScoringCriteria[] = MASTER_17_COMPETITIONS.flatMap((comp) =>
  comp.criteriaList.map((cr, idx) => ({
    id: `crit-${comp.id}-${idx + 1}`,
    competitionId: comp.id,
    code: cr.code,
    name: cr.name,
    weightPercent: cr.weight,
    minScore: 50.0,
    maxScore: 100.0,
    sequenceOrder: idx + 1,
    isTieBreakerPriority: Boolean(cr.priority),
  }))
);

export const INITIAL_FG_RULES: FgCompetitionRule[] = MASTER_17_COMPETITIONS.map((comp, idx) => ({
  id: `rule-${comp.id}`,
  competitionId: comp.id,
  ruleNumber: idx + 1,
  ruleTitle: `Ketentuan Teknis ${comp.name}`,
  ruleDescription: comp.materialText || comp.equipmentNotes || comp.themeText || `Peserta wajib memenuhi jenjang ${comp.educationLevel}.`,
  durationMinutes: comp.timerMinutes || 10,
  isMandatoryDocument: false,
  disqualificationCondition: "Melanggar tata tertib berdasarkan keputusan resmi Dewan Juri & Ketua Panitia.",
}));

export function buildInitialContingents(): FgContingent[] {
  const list: FgContingent[] = [];
  let idx = 1;
  for (const [village, groups] of Object.entries(FESTIVAL_VILLAGE_GROUPS_MAP)) {
    for (const groupName of groups) {
      const code = `KTG-${String(idx).padStart(2, "0")}`;
      const shortName = groupName.replace("Kelompok ", "");
      list.push({
        id: `ktg-${idx}`,
        eventId: "fg-evt-2026",
        regionName: CANONICAL_REGION_NAME,
        villageName: village,
        groupId: `klp-${idx}`,
        groupName,
        contingentCode: code,
        leaderName: `Koordinator ${shortName}`,
        leaderWhatsapp: `08123456${String(100 + idx)}`,
        pendampingUsername: `admin${shortName.toLowerCase().replace(/[^a-z0-9]/g, "")}1`,
        totalParticipants: idx <= 7 ? 2 : 1,
        totalTeams: idx <= 4 ? 1 : 0,
        verificationStatus: "VERIFIED",
        updatedAt: "2026-11-04T08:00:00Z",
      });
      idx++;
    }
  }
  return list;
}

export const INITIAL_FG_CONTINGENTS: FgContingent[] = buildInitialContingents();

export const INITIAL_FG_PARTICIPANTS: FgParticipant[] = [
  { id: "fg-part-01", eventId: "fg-evt-2026", contingentId: "ktg-1", generusId: "g-1", snapshotFullName: "Ahmad Bagus Pratama", snapshotNis: "NIS-2026001", snapshotGender: "Laki-laki", snapshotBirthDate: "2015-05-12", snapshotAge: 11, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "H. Joko Susilo", snapshotParentWhatsapp: "081234567890", snapshotGroupId: "klp-1", snapshotGroupName: "Kelompok Karas", snapshotVillageName: "Desa Selatan", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T09:00:00Z", createdBy: "adminkaras1", createdAt: "2026-10-29T08:00:00Z" },
  { id: "fg-part-02", eventId: "fg-evt-2026", contingentId: "ktg-2", generusId: "g-2", snapshotFullName: "Siti Rahmawati", snapshotNis: "NIS-2026002", snapshotGender: "Perempuan", snapshotBirthDate: "2017-08-22", snapshotAge: 9, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 1-3", snapshotParentName: "Budi Utomo", snapshotParentWhatsapp: "081398765432", snapshotGroupId: "klp-2", snapshotGroupName: "Kelompok Patihan", snapshotVillageName: "Desa Selatan", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T09:15:00Z", createdBy: "adminpatihan1", createdAt: "2026-10-29T08:30:00Z" },
  { id: "fg-part-03", eventId: "fg-evt-2026", contingentId: "ktg-4", generusId: "g-4", snapshotFullName: "Aisyah Humaira", snapshotNis: "NIS-2026004", snapshotGender: "Perempuan", snapshotBirthDate: "2020-04-10", snapshotAge: 6, snapshotCategory: "Caberawit", snapshotEducationLevel: "PAUD/TK", snapshotParentName: "Dwi Cahyono", snapshotParentWhatsapp: "082155443322", snapshotGroupId: "klp-4", snapshotGroupName: "Kelompok Pandeyan", snapshotVillageName: "Desa Selatan", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T09:30:00Z", createdBy: "adminpandeyan1", createdAt: "2026-10-29T09:00:00Z" },
  { id: "fg-part-04", eventId: "fg-evt-2026", contingentId: "ktg-5", generusId: "g-soco-01", snapshotFullName: "Muhammad Faiz Al-Farizi", snapshotNis: "NIS-2026015", snapshotGender: "Laki-laki", snapshotBirthDate: "2015-03-14", snapshotAge: 11, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "H. Sulaiman", snapshotParentWhatsapp: "081233445566", snapshotGroupId: "klp-5", snapshotGroupName: "Kelompok Soco", snapshotVillageName: "Desa Selatan", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T10:00:00Z", createdBy: "adminsoco1", createdAt: "2026-10-30T08:00:00Z" },
  { id: "fg-part-05", eventId: "fg-evt-2026", contingentId: "ktg-8", generusId: "g-candi-01", snapshotFullName: "Nabila Zahra Khairunnisa", snapshotNis: "NIS-2026021", snapshotGender: "Perempuan", snapshotBirthDate: "2016-06-18", snapshotAge: 10, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "M. Ridwan", snapshotParentWhatsapp: "081344556677", snapshotGroupId: "klp-8", snapshotGroupName: "Kelompok Candi", snapshotVillageName: "Desa Tengah", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T10:30:00Z", createdBy: "admincandi1", createdAt: "2026-10-30T09:00:00Z" },
  { id: "fg-part-06", eventId: "fg-evt-2026", contingentId: "ktg-16", generusId: "g-jeruk-01", snapshotFullName: "Hafidz Abdurrahman", snapshotNis: "NIS-2026032", snapshotGender: "Laki-laki", snapshotBirthDate: "2015-09-05", snapshotAge: 11, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "Ust. Munir", snapshotParentWhatsapp: "081566778899", snapshotGroupId: "klp-16", snapshotGroupName: "Kelompok Jeruk", snapshotVillageName: "Desa Utara", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T11:00:00Z", createdBy: "adminjeruk1", createdAt: "2026-10-30T10:00:00Z" },
  { id: "fg-part-07", eventId: "fg-evt-2026", contingentId: "ktg-24", generusId: "g-panggung-01", snapshotFullName: "Zahra Aulia Putri", snapshotNis: "NIS-2026045", snapshotGender: "Perempuan", snapshotBirthDate: "2016-01-20", snapshotAge: 10, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "Supriyadi", snapshotParentWhatsapp: "081677889900", snapshotGroupId: "klp-24", snapshotGroupName: "Kelompok Panggangung", snapshotVillageName: "Desa Timur", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T11:30:00Z", createdBy: "adminpanggung1", createdAt: "2026-10-30T11:00:00Z" },
  { id: "fg-part-08", eventId: "fg-evt-2026", contingentId: "ktg-1", generusId: "g-karas-02", snapshotFullName: "Rizky Pratama Putra", snapshotNis: "NIS-2026050", snapshotGender: "Laki-laki", snapshotBirthDate: "2016-02-11", snapshotAge: 10, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "Hendro", snapshotParentWhatsapp: "081211223344", snapshotGroupId: "klp-1", snapshotGroupName: "Kelompok Karas", snapshotVillageName: "Desa Selatan", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T11:40:00Z", createdBy: "adminkaras1", createdAt: "2026-10-30T11:10:00Z" },
  { id: "fg-part-09", eventId: "fg-evt-2026", contingentId: "ktg-8", generusId: "g-candi-02", snapshotFullName: "Farhan Ramadhan", snapshotNis: "NIS-2026051", snapshotGender: "Laki-laki", snapshotBirthDate: "2015-11-04", snapshotAge: 11, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "Lukman", snapshotParentWhatsapp: "081222334455", snapshotGroupId: "klp-8", snapshotGroupName: "Kelompok Candi", snapshotVillageName: "Desa Tengah", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T11:45:00Z", createdBy: "admincandi1", createdAt: "2026-10-30T11:15:00Z" },
  { id: "fg-part-10", eventId: "fg-evt-2026", contingentId: "ktg-16", generusId: "g-jeruk-02", snapshotFullName: "Ilham Maulana", snapshotNis: "NIS-2026052", snapshotGender: "Laki-laki", snapshotBirthDate: "2016-07-09", snapshotAge: 10, snapshotCategory: "Caberawit", snapshotEducationLevel: "SD 4-6", snapshotParentName: "Syamsul", snapshotParentWhatsapp: "081233445577", snapshotGroupId: "klp-16", snapshotGroupName: "Kelompok Jeruk", snapshotVillageName: "Desa Utara", snapshotRegionName: CANONICAL_REGION_NAME, eligibilityStatus: "VERIFIED", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-01T11:50:00Z", createdBy: "adminjeruk1", createdAt: "2026-10-30T11:20:00Z" },
];

export const INITIAL_FG_TEAMS: FgTeam[] = [
  { id: "fg-team-01", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-1", teamCode: "REGU-CCA-KARAS", teamName: "Regu CCA Al-Fath (Kelompok Karas)", captainParticipantId: "fg-part-01", memberParticipantIds: ["fg-part-01", "fg-part-08"], regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", memberCount: 2, status: "ACTIVE", createdBy: "adminkaras1" },
  { id: "fg-team-02", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-8", teamCode: "REGU-CCA-CANDI", teamName: "Regu CCA An-Nuur (Kelompok Candi)", captainParticipantId: "fg-part-05", memberParticipantIds: ["fg-part-05", "fg-part-09"], regionName: CANONICAL_REGION_NAME, villageName: "Desa Tengah", groupName: "Kelompok Candi", memberCount: 2, status: "ACTIVE", createdBy: "admincandi1" },
  { id: "fg-team-03", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-16", teamCode: "REGU-CCA-JERUK", teamName: "Regu CCA Ar-Rayyan (Kelompok Jeruk)", captainParticipantId: "fg-part-06", memberParticipantIds: ["fg-part-06", "fg-part-10"], regionName: CANONICAL_REGION_NAME, villageName: "Desa Utara", groupName: "Kelompok Jeruk", memberCount: 2, status: "ACTIVE", createdBy: "adminjeruk1" },
];

export const INITIAL_FG_REGISTRATIONS: FgRegistration[] = [
  { id: "fg-reg-01", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", contingentId: "ktg-1", participantId: "fg-part-01", teamId: null, registrationCode: "REG-2026-THF-001", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", status: "CHECKED_IN", displayNumber: "THF-001", turnOrder: 1, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T08:00:00Z", createdBy: "adminkaras1", createdAt: "2026-10-30T08:00:00Z", updatedAt: "2026-11-15T07:30:00Z" },
  { id: "fg-reg-02", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", contingentId: "ktg-5", participantId: "fg-part-04", teamId: null, registrationCode: "REG-2026-THF-002", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Soco", status: "CHECKED_IN", displayNumber: "THF-002", turnOrder: 2, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T08:10:00Z", createdBy: "adminsoco1", createdAt: "2026-10-30T08:30:00Z", updatedAt: "2026-11-15T07:35:00Z" },
  { id: "fg-reg-03", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", contingentId: "ktg-16", participantId: "fg-part-06", teamId: null, registrationCode: "REG-2026-THF-003", regionName: CANONICAL_REGION_NAME, villageName: "Desa Utara", groupName: "Kelompok Jeruk", status: "CHECKED_IN", displayNumber: "THF-003", turnOrder: 3, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T08:20:00Z", createdBy: "adminjeruk1", createdAt: "2026-10-30T09:00:00Z", updatedAt: "2026-11-15T07:40:00Z" },
  { id: "fg-reg-04", eventId: "fg-evt-2026", competitionId: "fg-comp-mewarnai-paud", contingentId: "ktg-4", participantId: "fg-part-03", teamId: null, registrationCode: "REG-2026-MWR-001", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Pandeyan", status: "VERIFIED", displayNumber: "MWR-001", turnOrder: 1, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T09:00:00Z", createdBy: "adminpandeyan1", createdAt: "2026-10-30T09:30:00Z", updatedAt: "2026-11-15T07:45:00Z" },
  { id: "fg-reg-05", eventId: "fg-evt-2026", competitionId: "fg-comp-nasehat-sd", contingentId: "ktg-8", participantId: "fg-part-05", teamId: null, registrationCode: "REG-2026-NSH-001", regionName: CANONICAL_REGION_NAME, villageName: "Desa Tengah", groupName: "Kelompok Candi", status: "VERIFIED", displayNumber: "NSH-001", turnOrder: 1, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T09:15:00Z", createdBy: "admincandi1", createdAt: "2026-10-30T10:00:00Z", updatedAt: "2026-11-15T07:50:00Z" },
  { id: "fg-reg-06", eventId: "fg-evt-2026", competitionId: "fg-comp-kaligrafi-sd46", contingentId: "ktg-24", participantId: "fg-part-07", teamId: null, registrationCode: "REG-2026-KLG-001", regionName: CANONICAL_REGION_NAME, villageName: "Desa Timur", groupName: "Kelompok Panggangung", status: "VERIFIED", displayNumber: "KLG-001", turnOrder: 1, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T09:30:00Z", createdBy: "adminpanggung1", createdAt: "2026-10-30T10:30:00Z", updatedAt: "2026-11-15T07:55:00Z" },
  { id: "fg-reg-07", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-1", participantId: null, teamId: "fg-team-01", registrationCode: "REG-2026-CCA-001", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", status: "CHECKED_IN", displayNumber: "CCA-A", turnOrder: 1, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T10:00:00Z", createdBy: "adminkaras1", createdAt: "2026-10-31T08:00:00Z", updatedAt: "2026-11-15T08:00:00Z" },
  { id: "fg-reg-08", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-8", participantId: null, teamId: "fg-team-02", registrationCode: "REG-2026-CCA-002", regionName: CANONICAL_REGION_NAME, villageName: "Desa Tengah", groupName: "Kelompok Candi", status: "CHECKED_IN", displayNumber: "CCA-B", turnOrder: 2, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T10:05:00Z", createdBy: "admincandi1", createdAt: "2026-10-31T08:15:00Z", updatedAt: "2026-11-15T08:00:00Z" },
  { id: "fg-reg-09", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", contingentId: "ktg-16", participantId: null, teamId: "fg-team-03", registrationCode: "REG-2026-CCA-003", regionName: CANONICAL_REGION_NAME, villageName: "Desa Utara", groupName: "Kelompok Jeruk", status: "CHECKED_IN", displayNumber: "CCA-C", turnOrder: 3, checkinStatus: "PRESENT", verifiedBy: "adminregistrasi1", verifiedAt: "2026-11-02T10:10:00Z", createdBy: "adminjeruk1", createdAt: "2026-10-31T08:30:00Z", updatedAt: "2026-11-15T08:00:00Z" },
];

export const INITIAL_FG_JUDGES: FgJudge[] = [
  { id: "jdg-01", eventId: "fg-evt-2026", username: "juri1", fullName: "Ust. H. Ali Mahmudi, S.Pd.I", honorificTitle: "Ketua Dewan Juri / Hakim Tajwid", originUnit: "PPG Daerah Magetan Timur", specialization: "Tahfidz, Al-Qur'an, Tilawati & Adzan", whatsapp: "0812555004", isChiefJudge: true, status: "ACTIVE" },
  { id: "jdg-02", eventId: "fg-evt-2026", username: "juri2", fullName: "Ust. Heri Susanto", honorificTitle: "Hakim Makhraj & Dakwah", originUnit: "Mubaligh Daerah", specialization: "Tahfidz, Nasehat & Asad Pasanggiri", whatsapp: "08123456001", isChiefJudge: false, status: "ACTIVE" },
  { id: "jdg-03", eventId: "fg-evt-2026", username: "juri3", fullName: "Usth. Fatmawati, M.Pd", honorificTitle: "Hakim Lagu, Kaligrafi & Keilmuan", originUnit: "Biro Kurikulum PPG", specialization: "Kaligrafi, Mewarnai, Hadist & Makna Al-Qur'an", whatsapp: "08123456002", isChiefJudge: false, status: "ACTIVE" },
  { id: "jdg-04", eventId: "fg-evt-2026", username: "juri4", fullName: "Ust. Ahmad Fauzi, Lc", honorificTitle: "Hakim Cadangan / Pengganti", originUnit: "Dewan Guru Pondok", specialization: "Hadist, Al-Qur'an & Cerdas Cermat", whatsapp: "08123456009", isChiefJudge: false, status: "ACTIVE" },
];

export const INITIAL_FG_JUDGE_ASSIGNMENTS: FgJudgeAssignment[] = INITIAL_FG_COMPETITIONS.flatMap((comp) => [
  { id: `ja-${comp.id}-1`, eventId: "fg-evt-2026", competitionId: comp.id, stageId: "stg-penyisihan", judgeId: "jdg-01", judgePosition: 1 as const, arenaId: comp.arenaId, isLeadJudge: true, assignedBy: "ketuajuri1" },
  { id: `ja-${comp.id}-2`, eventId: "fg-evt-2026", competitionId: comp.id, stageId: "stg-penyisihan", judgeId: "jdg-02", judgePosition: 2 as const, arenaId: comp.arenaId, isLeadJudge: false, assignedBy: "ketuajuri1" },
  { id: `ja-${comp.id}-3`, eventId: "fg-evt-2026", competitionId: comp.id, stageId: "stg-penyisihan", judgeId: "jdg-03", judgePosition: 3 as const, arenaId: comp.arenaId, isLeadJudge: false, assignedBy: "ketuajuri1" },
]);

export const INITIAL_FG_SCORING_SUBMISSIONS: FgScoringSubmission[] = [
  { id: "sub-01-j1", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-01", judgeId: "jdg-01", judgePosition: 1, criteriaScores: { HAFALAN: 95, TAJWID: 94, MAKHRAJ: 94.33 }, rawScore: 94.5, penaltyDeduction: 0.0, finalJudgeScore: 94.5, submissionStatus: "FINALIZED", judgeNotes: "Hafalan QS Al-Fajr sangat mutqin", submittedAt: "2026-11-15T09:00:00Z" },
  { id: "sub-01-j2", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-01", judgeId: "jdg-02", judgePosition: 2, criteriaScores: { HAFALAN: 93.5, TAJWID: 93, MAKHRAJ: 93.17 }, rawScore: 93.25, penaltyDeduction: 0.0, finalJudgeScore: 93.25, submissionStatus: "FINALIZED", judgeNotes: "Lancar 2x sambung ayat", submittedAt: "2026-11-15T09:01:00Z" },
  { id: "sub-01-j3", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-01", judgeId: "jdg-03", judgePosition: 3, criteriaScores: { HAFALAN: 95, TAJWID: 95, MAKHRAJ: 95 }, rawScore: 95.0, penaltyDeduction: 0.0, finalJudgeScore: 95.0, submissionStatus: "FINALIZED", judgeNotes: "Makhraj sangat fasih", submittedAt: "2026-11-15T09:02:00Z" },

  { id: "sub-02-j1", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-02", judgeId: "jdg-01", judgePosition: 1, criteriaScores: { HAFALAN: 91, TAJWID: 91, MAKHRAJ: 91 }, rawScore: 91.0, penaltyDeduction: 0.5, finalJudgeScore: 90.5, submissionStatus: "FINALIZED", judgeNotes: "Baik sekali, koreksi mad wajib", submittedAt: "2026-11-15T09:10:00Z" },
  { id: "sub-02-j2", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-02", judgeId: "jdg-02", judgePosition: 2, criteriaScores: { HAFALAN: 90.75, TAJWID: 90.75, MAKHRAJ: 90.75 }, rawScore: 90.75, penaltyDeduction: 0.0, finalJudgeScore: 90.75, submissionStatus: "FINALIZED", judgeNotes: "Lancar", submittedAt: "2026-11-15T09:11:00Z" },
  { id: "sub-02-j3", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-02", judgeId: "jdg-03", judgePosition: 3, criteriaScores: { HAFALAN: 91.25, TAJWID: 91.25, MAKHRAJ: 91.25 }, rawScore: 91.25, penaltyDeduction: 0.0, finalJudgeScore: 91.25, submissionStatus: "FINALIZED", judgeNotes: "Adab sopan", submittedAt: "2026-11-15T09:12:00Z" },

  { id: "sub-03-j1", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-03", judgeId: "jdg-01", judgePosition: 1, criteriaScores: { HAFALAN: 89, TAJWID: 89, MAKHRAJ: 89 }, rawScore: 89.0, penaltyDeduction: 0.0, finalJudgeScore: 89.0, submissionStatus: "FINALIZED", judgeNotes: "Cukup lancar", submittedAt: "2026-11-15T09:20:00Z" },
  { id: "sub-03-j2", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-03", judgeId: "jdg-02", judgePosition: 2, criteriaScores: { HAFALAN: 88.5, TAJWID: 88.5, MAKHRAJ: 88.5 }, rawScore: 88.5, penaltyDeduction: 0.0, finalJudgeScore: 88.5, submissionStatus: "FINALIZED", judgeNotes: "Perlu penguatan ghunnah", submittedAt: "2026-11-15T09:21:00Z" },
  { id: "sub-03-j3", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-03", judgeId: "jdg-03", judgePosition: 3, criteriaScores: { HAFALAN: 89.5, TAJWID: 89.5, MAKHRAJ: 89.5 }, rawScore: 89.5, penaltyDeduction: 0.0, finalJudgeScore: 89.5, submissionStatus: "FINALIZED", judgeNotes: "Baik", submittedAt: "2026-11-15T09:22:00Z" },
];

export const INITIAL_FG_SCORING_RESULTS: FgScoringResult[] = [
  { id: "res-01", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-01", judge1Score: 94.5, judge2Score: 93.25, judge3Score: 95.0, totalJudgeScore: 282.75, averageJudgeScore: 94.25, totalPenalty: 0.0, finalScore: 94.25, tieBreakerScore: 94.5, criteriaAverages: { HAFALAN: 94.5, TAJWID: 94.0, MAKHRAJ: 94.17 }, rankNumber: 1, isLocked: true, lockedBy: "ketuajuri1" },
  { id: "res-02", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-02", judge1Score: 90.5, judge2Score: 90.75, judge3Score: 91.25, totalJudgeScore: 272.5, averageJudgeScore: 90.8333, totalPenalty: 0.5, finalScore: 90.8333, tieBreakerScore: 91.0, criteriaAverages: { HAFALAN: 91.0, TAJWID: 91.0, MAKHRAJ: 91.0 }, rankNumber: 2, isLocked: true, lockedBy: "ketuajuri1" },
  { id: "res-03", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", stageId: "stg-penyisihan", registrationId: "fg-reg-03", judge1Score: 89.0, judge2Score: 88.5, judge3Score: 89.5, totalJudgeScore: 267.0, averageJudgeScore: 89.0, totalPenalty: 0.0, finalScore: 89.0, tieBreakerScore: 89.0, criteriaAverages: { HAFALAN: 89.0, TAJWID: 89.0, MAKHRAJ: 89.0 }, rankNumber: 3, isLocked: true, lockedBy: "ketuajuri1" },
];

export const INITIAL_FG_ARTWORKS: FgArtwork[] = [
  { id: "art-01", eventId: "fg-evt-2026", competitionId: "fg-comp-mewarnai-paud", registrationId: "fg-reg-04", participantId: "fg-part-03", artworkCode: "KARYA-MWR-001", titleOrTheme: "Mewarnai Kaligrafi PAUD/TK", paperSize: "F4", photoUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600", physicalStorageLocation: "Meja Display Pendopo A-01", uploadedBy: "operatorarena1", uploadedAt: "2026-11-15T09:30:00Z", notes: "Kertas F4 resmi panitia, alat mewarnai krayon sendiri." },
  { id: "art-02", eventId: "fg-evt-2026", competitionId: "fg-comp-kaligrafi-sd46", registrationId: "fg-reg-06", participantId: "fg-part-07", artworkCode: "KARYA-KLG-001", titleOrTheme: "Bismillahi Rohman Nirohim", paperSize: "F4", photoUrl: "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600", physicalStorageLocation: "Meja Display Pendopo B-01", uploadedBy: "operatorarena1", uploadedAt: "2026-11-15T09:40:00Z", notes: "Tanpa latar belakang berwarna, kertas F4 panitia." },
];

export const INITIAL_FG_ARENA_QUEUES: FgArenaQueue[] = [
  { id: "aq-01", eventId: "fg-evt-2026", arenaId: "arn-01", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-01", displayNumber: "THF-001", entryName: "Ahmad Bagus Pratama", groupName: "Kelompok Karas", villageName: "Desa Selatan", queueNumber: 1, callStatus: "COMPLETED", attendanceStatus: "PRESENT", timerDurationSeconds: 600, elapsedSeconds: 420, isOvertime: false, updatedBy: "operatorarena1", updatedAt: "2026-11-15T08:15:00Z" },
  { id: "aq-02", eventId: "fg-evt-2026", arenaId: "arn-01", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-02", displayNumber: "THF-002", entryName: "Muhammad Faiz Al-Farizi", groupName: "Kelompok Soco", villageName: "Desa Selatan", queueNumber: 2, callStatus: "PERFORMING", attendanceStatus: "PRESENT", timerDurationSeconds: 600, elapsedSeconds: 310, isOvertime: false, updatedBy: "operatorarena1", updatedAt: "2026-11-15T08:25:00Z" },
  { id: "aq-03", eventId: "fg-evt-2026", arenaId: "arn-01", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-03", displayNumber: "THF-003", entryName: "Hafidz Abdurrahman", groupName: "Kelompok Jeruk", villageName: "Desa Utara", queueNumber: 3, callStatus: "WAITING", attendanceStatus: "PRESENT", timerDurationSeconds: 600, elapsedSeconds: 0, isOvertime: false, updatedBy: "operatorarena1", updatedAt: "2026-11-15T08:00:00Z" },
  { id: "aq-04", eventId: "fg-evt-2026", arenaId: "arn-04", competitionId: "fg-comp-mewarnai-paud", registrationId: "fg-reg-04", displayNumber: "MWR-001", entryName: "Aisyah Humaira", groupName: "Kelompok Pandeyan", villageName: "Desa Selatan", queueNumber: 1, callStatus: "PERFORMING", attendanceStatus: "PRESENT", timerDurationSeconds: 5400, elapsedSeconds: 1800, isOvertime: false, updatedBy: "operatorarena1", updatedAt: "2026-11-15T08:30:00Z" },
];

export const INITIAL_FG_QUIZ_MATCHES: FgQuizMatch[] = [
  { id: "qm-01", eventId: "fg-evt-2026", competitionId: "fg-comp-cca-sd", stageId: "stg-final", arenaId: "arn-06", matchCode: "CCA-SD-FINAL-01", matchName: "Grand Final Cerdas Cermat SD (Meja A vs Meja B vs Meja C)", teamAId: "fg-team-01", teamBId: "fg-team-02", teamCId: "fg-team-03", winnerTeamId: "fg-team-01", operatorUsername: "operatorcc1", chiefJudgeId: "jdg-01", matchStatus: "LIVE", activeRoundType: "GILIRAN", activeTurnTeamId: "fg-team-01", buzzerLockedByTeamId: null, questionTimerSeconds: 30, scoringRulesConfirmedByCommittee: false, giliranCorrectPoints: 100, giliranWrongPoints: 0, rebutanCorrectPoints: 100, rebutanWrongPoints: -50 },
];

export const INITIAL_FG_QUIZ_LEADERBOARDS: FgQuizLeaderboard[] = [
  { id: "qlb-01", matchId: "qm-01", teamId: "fg-team-01", teamName: "Regu CCA Al-Fath (Kelompok Karas)", groupName: "Kelompok Karas", villageName: "Desa Selatan", wajibScore: 800.0, lemparanScore: 250.0, rebutanScore: 400.0, penaltyScore: 0.0, totalScore: 1450.0, correctAnswersCount: 14, wrongAnswersCount: 0, rankInMatch: 1, isAdvancing: true },
  { id: "qlb-02", matchId: "qm-01", teamId: "fg-team-02", teamName: "Regu CCA An-Nuur (Kelompok Candi)", groupName: "Kelompok Candi", villageName: "Desa Tengah", wajibScore: 700.0, lemparanScore: 200.0, rebutanScore: 300.0, penaltyScore: 50.0, totalScore: 1150.0, correctAnswersCount: 12, wrongAnswersCount: 1, rankInMatch: 2, isAdvancing: true },
  { id: "qlb-03", matchId: "qm-01", teamId: "fg-team-03", teamName: "Regu CCA Ar-Rayyan (Kelompok Jeruk)", groupName: "Kelompok Jeruk", villageName: "Desa Utara", wajibScore: 700.0, lemparanScore: 150.0, rebutanScore: 200.0, penaltyScore: 0.0, totalScore: 1050.0, correctAnswersCount: 10, wrongAnswersCount: 0, rankInMatch: 3, isAdvancing: false },
];

export const INITIAL_FG_QUIZ_SCORE_EVENTS: FgQuizScoreEvent[] = [
  { id: "qse-01", eventId: "fg-evt-2026", matchId: "qm-01", roundType: "GILIRAN", questionNumber: 1, questionId: "Q-CCA-SD-01", teamId: "fg-team-01", answerSummary: "Menyebutkan 6 Tabiat Luhur Orangiman dengan lengkap", isCorrect: true, scoreBefore: 1350, pointsDelta: 100, scoreAfter: 1450, reason: "Jawaban benar Babak Giliran Regu A", operatorUsername: "operatorcc1", judgeId: "jdg-01", recordedAt: "2026-11-16T09:10:00Z" },
];

export const INITIAL_FG_SCORING_REVISIONS: FgScoringRevision[] = [];

export const INITIAL_FG_COMPETITION_RESULTS: FgCompetitionResult[] = [
  { id: "fcr-01", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-01", contingentId: "ktg-1", entryName: "Ahmad Bagus Pratama", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", finalScore: 94.25, finalRank: 1, predicateLabel: "Juara 1", medalType: "GOLD", championshipPoints: 5.0, isPublished: true, approvedBy: "ketuajuri1", approvedAt: "2026-11-15T10:00:00Z" },
  { id: "fcr-02", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-02", contingentId: "ktg-5", entryName: "Muhammad Faiz Al-Farizi", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Soco", finalScore: 90.8333, finalRank: 2, predicateLabel: "Juara 2", medalType: "SILVER", championshipPoints: 3.0, isPublished: true, approvedBy: "ketuajuri1", approvedAt: "2026-11-15T10:00:00Z" },
  { id: "fcr-03", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-03", contingentId: "ktg-16", entryName: "Hafidz Abdurrahman", regionName: CANONICAL_REGION_NAME, villageName: "Desa Utara", groupName: "Kelompok Jeruk", finalScore: 89.0, finalRank: 3, predicateLabel: "Juara 3", medalType: "BRONZE", championshipPoints: 1.0, isPublished: true, approvedBy: "ketuajuri1", approvedAt: "2026-11-15T10:00:00Z" },
];

export const INITIAL_FG_CERTIFICATES: FgCertificate[] = [
  { id: "cert-01", eventId: "fg-evt-2026", certificateNumber: "SERT/FG-MAGTIM/2026/0001", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-01", recipientName: "Ahmad Bagus Pratama", recipientRole: "JUARA", competitionName: "Tahfidz — SD", predicateLabel: "Juara 1", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", qrVerificationToken: "QR-FG-2026-THF1-AHMAD-BAGUS", issuedBy: "ketuapanitia1", issuedAt: "2026-11-15T11:00:00Z" },
];

export const INITIAL_FG_CHECKINS: FgCheckinRecord[] = [
  { id: "chk-01", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-01", arenaId: "arn-01", qrTokenUsed: "REG-2026-THF-001", checkinStatus: "PRESENT", checkedInBy: "petugascheckin1", checkedInAt: "2026-11-15T07:30:00Z", notes: "Check-in QR terverifikasi di meja registrasi" },
  { id: "chk-02", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-02", arenaId: "arn-01", qrTokenUsed: "REG-2026-THF-002", checkinStatus: "PRESENT", checkedInBy: "petugascheckin1", checkedInAt: "2026-11-15T07:35:00Z", notes: "Check-in QR terverifikasi di meja registrasi" },
  { id: "chk-03", eventId: "fg-evt-2026", competitionId: "fg-comp-tahfidz-sd", registrationId: "fg-reg-03", arenaId: "arn-01", qrTokenUsed: "REG-2026-THF-003", checkinStatus: "PRESENT", checkedInBy: "petugascheckin1", checkedInAt: "2026-11-15T07:40:00Z", notes: "Check-in QR terverifikasi di meja registrasi" },
];

export const INITIAL_FG_APPROVALS: FgApprovalRecord[] = [];

export const INITIAL_FG_CHAMPIONSHIP_CONFIG: FgChampionshipConfig = {
  id: "cfg-champ-2026",
  eventId: "fg-evt-2026",
  goldPoints: 5,
  silverPoints: 3,
  bronzePoints: 1,
  honorable1Points: 0,
  honorable2Points: 0,
  honorable3Points: 0,
  updatedBy: "superadminaldi",
  updatedAt: "2026-11-04T08:00:00Z",
};

export const INITIAL_FG_AUDIT_LOGS: FgAuditLog[] = [
  { id: "fga-01", eventId: "fg-evt-2026", actionCategory: "DATA_CREATE", entityTable: "fg_events", entityId: "fg-evt-2026", actorUsername: "superadminaldi", actorRole: "Superadmin", actorScope: "Semua", regionName: CANONICAL_REGION_NAME, description: "Inisialisasi Festival Generus Daerah Magetan Timur 2026 (17 Kategori Lomba).", createdAt: "2026-11-04T08:00:00Z" },
  { id: "fga-02", eventId: "fg-evt-2026", actionCategory: "SCORE_CHANGE", entityTable: "fg_scoring_submissions", entityId: "sub-01-j1", actorUsername: "juri1", actorRole: "Juri", actorScope: "Tahfidz — SD", regionName: CANONICAL_REGION_NAME, villageName: "Desa Selatan", groupName: "Kelompok Karas", newValues: { finalJudgeScore: 94.5 }, description: "Input nilai Juri 1 (94.50) untuk peserta THF-001 (Ahmad Bagus Pratama).", createdAt: "2026-11-15T09:00:00Z" },
  { id: "fga-03", eventId: "fg-evt-2026", actionCategory: "RESULT_APPROVAL", entityTable: "fg_competition_results", entityId: "fcr-01", actorUsername: "ketuajuri1", actorRole: "Ketua Dewan Juri", actorScope: "Semua", regionName: CANONICAL_REGION_NAME, description: "Pengesahan berita acara hasil lomba Tahfidz — SD.", createdAt: "2026-11-15T10:00:00Z" },
  { id: "fga-04", eventId: "fg-evt-2026", actionCategory: "RESULT_PUBLISH", entityTable: "fg_competition_results", entityId: "fg-comp-tahfidz-sd", actorUsername: "ketuapanitia1", actorRole: "Ketua Panitia", actorScope: "Semua", regionName: CANONICAL_REGION_NAME, description: "Publikasi resmi hasil juara cabang Tahfidz — SD ke papan klasemen Juara Umum.", createdAt: "2026-11-15T10:15:00Z" },
];

export function buildDefaultFestivalStore(): FestivalStoreState {
  return {
    events: [INITIAL_FG_EVENT],
    stages: INITIAL_FG_STAGES,
    categories: INITIAL_FG_CATEGORIES,
    arenas: INITIAL_FG_ARENAS,
    competitions: INITIAL_FG_COMPETITIONS,
    rules: INITIAL_FG_RULES,
    contingents: INITIAL_FG_CONTINGENTS,
    participants: INITIAL_FG_PARTICIPANTS,
    teams: INITIAL_FG_TEAMS,
    registrations: INITIAL_FG_REGISTRATIONS,
    checkins: INITIAL_FG_CHECKINS,
    judges: INITIAL_FG_JUDGES,
    judgeAssignments: INITIAL_FG_JUDGE_ASSIGNMENTS,
    criteria: INITIAL_FG_CRITERIA,
    scoringSubmissions: INITIAL_FG_SCORING_SUBMISSIONS,
    scoringResults: INITIAL_FG_SCORING_RESULTS,
    scoringRevisions: INITIAL_FG_SCORING_REVISIONS,
    artworks: INITIAL_FG_ARTWORKS,
    arenaQueues: INITIAL_FG_ARENA_QUEUES,
    quizMatches: INITIAL_FG_QUIZ_MATCHES,
    quizLeaderboards: INITIAL_FG_QUIZ_LEADERBOARDS,
    quizScoreEvents: INITIAL_FG_QUIZ_SCORE_EVENTS,
    competitionResults: INITIAL_FG_COMPETITION_RESULTS,
    approvals: INITIAL_FG_APPROVALS,
    championshipConfig: INITIAL_FG_CHAMPIONSHIP_CONFIG,
    certificates: INITIAL_FG_CERTIFICATES,
    auditLogs: INITIAL_FG_AUDIT_LOGS,
    updatedAt: new Date().toISOString(),
  };
}
