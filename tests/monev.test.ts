import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_18_MASTER_AGENDA,
  MASTER_WILAYAH_CONFIG,
  normalizeDesaName,
  formatDesaShort,
  formatDesaLabel,
  formatKelompokShort,
  formatKelompokLabel,
  formatKelompokDesaInline,
  getCanonicalReportId,
  formatApprovalStatusLabel
} from "../src/lib/monev/types";

import {
  getMasterAgendas,
  getPeriods,
  createPeriod,
  updatePeriodStatus,
  ensurePeriodSnapshots,
  generatePeriodMonitoringItems,
  getMonitoringItems,
  getSubmissions,
  updateMonitoringItem,
  batchUpdateMonitoringItems,
  submitDesaReport,
  verifyDesaReport,
  getDesaSubmissionSummary,
  calculateCompletionRate,
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  addEvidence,
  getEvidenceList,
  getSubmissionById,
  getMonitoringItemById,
  getFollowUpById,
  getEvidenceById,
  getUserMonevPermissions,
  getScopedExportData,
  getCommandCenterData,
  getAnalyticsData,
  getExecutiveReport,
  getMonevAuditLogs,
  canManagePeriods,
  canManageMasterAgenda,
  canVerify,
  canApproveReport,
  canEditMonitoring,
  validateVillageAccess,
  updateMasterAgenda
} from "../src/lib/monev/monevService";

test("1. Master Agenda PPG — harus persis memiliki 18 agenda resmi", () => {
  const agendas = getMasterAgendas();
  assert.strictEqual(agendas.length, 18, "Jumlah master agenda harus tepat 18");

  const expectedTitles = [
    "Musyawarah guru",
    "Musyawarah 5 unsur",
    "Muda mudi hadir pengajian kelompok",
    "Evaluasi target MM September",
    "Hari boso CR dan MM",
    "Tim bacaan dan Pegon khusus generus",
    "Mas di jadwal ngajar Generus",
    "Penerobosan MM (terjadwal)",
    "Sambung CR dan MM",
    "Sensus Generus",
    "Muda Mudi tidur masjid",
    "Serkiler PPG September",
    "BK klp cek absensi",
    "BK kelompok setor lembar kerja ke BK desa",
    "Asad khusus CR",
    "Asad khusus MM",
    "MBG (makan bersama Generus) CR",
    "MBG Muda Mudi"
  ];

  expectedTitles.forEach((title, idx) => {
    assert.strictEqual(agendas[idx].judulAgenda, title, `Agenda ke-${idx + 1} harus ${title}`);
    assert.strictEqual(agendas[idx].nomorUrut, idx + 1);
    assert.strictEqual(agendas[idx].isActive, true);
    assert.strictEqual(agendas[idx].isMandatory, true);
  });
});

test("2. Master Data Wilayah & Normalisasi Desa", () => {
  assert.strictEqual(MASTER_WILAYAH_CONFIG.length, 4, "Harus ada 4 wilayah induk");

  const wilayahMap = Object.fromEntries(MASTER_WILAYAH_CONFIG.map(w => [w.wilayah, w.desas]));
  assert.strictEqual(wilayahMap["Desa Selatan"].length, 7);
  assert.strictEqual(wilayahMap["Desa Tengah"].length, 6);
  assert.strictEqual(wilayahMap["Desa Utara"].length, 10);
  assert.strictEqual(wilayahMap["Desa Timur"].length, 7);

  const totalDesas = MASTER_WILAYAH_CONFIG.reduce((acc, c) => acc + c.desas.length, 0);
  assert.strictEqual(totalDesas, 30, "Total desa di 4 wilayah adalah 30 desa/kelompok");

  // Normalization aliases
  assert.strictEqual(normalizeDesaName("Wruk"), "Waruk");
  assert.strictEqual(normalizeDesaName("Panggangung"), "Panggung");
  assert.strictEqual(normalizeDesaName("Kelompok Soco"), "Soco");
  assert.strictEqual(normalizeDesaName("Kelompok Karas"), "Karas");
});

test("3. Siklus Periode, Locking Metadata & Validasi State Transitions", () => {
  const testPeriod = createPeriod({
    namaPeriode: "Monev PPG Periode November 2026",
    tahun: 2026,
    bulan: 11,
    tanggalMulai: "2026-11-01",
    tanggalSelesai: "2026-11-30"
  }, "SuperAdmin1", "Super Admin");

  assert.strictEqual(testPeriod.status, "DRAFT");
  assert.strictEqual(testPeriod.periodeKode, "2026-11");

  // Transisi valid: DRAFT -> OPEN
  const openPeriod = updatePeriodStatus(testPeriod.id, "OPEN", "SuperAdmin1", "Super Admin");
  assert.strictEqual(openPeriod.status, "OPEN");

  // Transisi valid: OPEN -> VERIFICATION
  const verifPeriod = updatePeriodStatus(testPeriod.id, "VERIFICATION", "SuperAdmin1", "Super Admin");
  assert.strictEqual(verifPeriod.status, "VERIFICATION");

  // Transisi valid: VERIFICATION -> LOCKED (harus mencatat lockedBy dan lockedAt)
  const lockedPeriod = updatePeriodStatus(testPeriod.id, "LOCKED", "SuperAdmin1", "Super Admin");
  assert.strictEqual(lockedPeriod.status, "LOCKED");
  assert.strictEqual(lockedPeriod.lockedBy, "SuperAdmin1");
  assert.ok(lockedPeriod.lockedAt, "lockedAt harus tercatat saat periode dikunci");

  // Transisi valid: LOCKED -> ARCHIVED
  const archivedPeriod = updatePeriodStatus(testPeriod.id, "ARCHIVED", "SuperAdmin1", "Super Admin");
  assert.strictEqual(archivedPeriod.status, "ARCHIVED");

  // Transisi tidak valid: ARCHIVED langsung ke OPEN
  assert.throws(() => {
    updatePeriodStatus(testPeriod.id, "OPEN", "SuperAdmin1", "Super Admin");
  }, /Transisi status dari ARCHIVED ke OPEN tidak valid/);
});

test("4. Idempotent Item Generation & Uniqueness (PERIOD + VILLAGE + AGENDA)", () => {
  const periodId = "period-2026-10";

  // Snapshot generation
  const snapshots = ensurePeriodSnapshots(periodId);
  assert.strictEqual(snapshots.length, 18, "Snapshot periode harus berisi 18 master agenda");

  // First generation run
  const run1 = generatePeriodMonitoringItems(periodId, "SuperAdmin1", "Super Admin");
  assert.strictEqual(run1.totalVillages, 30);
  assert.strictEqual(run1.totalAgendas, 18);
  assert.strictEqual(run1.totalExpectedItems, 540); // 30 desa x 18 agenda
  assert.strictEqual(run1.createdSubmissions, 30);
  assert.strictEqual(run1.createdItems, 540);

  // Second run: Harus idempotent (0 duplicate created)
  const run2 = generatePeriodMonitoringItems(periodId, "SuperAdmin1", "Super Admin");
  assert.strictEqual(run2.createdSubmissions, 0, "Idempotent: tidak boleh ada submission duplikat");
  assert.strictEqual(run2.createdItems, 0, "Idempotent: tidak boleh ada monitoring item duplikat");

  // Check items retrieval
  const socoItems = getMonitoringItems(periodId, "Soco");
  assert.strictEqual(socoItems.length, 18, "Desa Soco harus memiliki tepat 18 item monitoring");
  assert.strictEqual(socoItems[0].statusKetercapaian, "NOT_STARTED", "Item baru berstatus NOT_STARTED");

  const submissions = getSubmissions(periodId);
  assert.strictEqual(submissions.length, 30, "Harus ada 30 submission header untuk seluruh desa");
});

test("5. Security & Authorization Testing (Cross-Village, Viewer, Unauthorized Mutations)", () => {
  const periodId = "period-2026-10";
  const socoItems = getMonitoringItems(periodId, "Soco");
  const jerukItems = getMonitoringItems(periodId, "Jeruk");

  // 1. Koordinator Desa Soco tidak boleh mengakses/mengubah Desa Jeruk (Manipulated ID)
  assert.throws(() => {
    updateMonitoringItem(
      jerukItems[0].id,
      { statusKetercapaian: "COMPLETED" },
      "adminsoco1",
      "Admin Kelompok",
      "Kelompok Soco"
    );
  }, /Akses ditolak/);

  // 2. Viewer tidak boleh mengubah item, membuat periode, verifikasi, atau membuat follow-up
  assert.throws(() => {
    updateMonitoringItem(
      socoItems[0].id,
      { statusKetercapaian: "COMPLETED" },
      "viewer1",
      "Viewer",
      "Semua"
    );
  }, /Akses ditolak/);

  assert.throws(() => {
    createPeriod({
      namaPeriode: "Periode Ilegal",
      tahun: 2026,
      bulan: 12,
      tanggalMulai: "2026-12-01",
      tanggalSelesai: "2026-12-31"
    }, "adminsoco1", "Admin Kelompok");
  }, /Akses ditolak/);

  assert.throws(() => {
    updatePeriodStatus(periodId, "LOCKED", "adminsoco1", "Admin Kelompok");
  }, /Akses ditolak/);

  // 3. RBAC Matrix checks
  assert.strictEqual(canManagePeriods("Super Admin"), true);
  assert.strictEqual(canManagePeriods("Admin Daerah"), true);
  assert.strictEqual(canManagePeriods("Admin Desa"), false);
  assert.strictEqual(canManagePeriods("Viewer"), false);

  assert.strictEqual(canEditMonitoring("Admin Desa", "OPEN", "Desa Selatan", "Soco", "Desa Selatan"), true);
  assert.strictEqual(canEditMonitoring("Admin Desa", "OPEN", "Desa Utara", "Jeruk", "Desa Selatan"), false);
  assert.strictEqual(canEditMonitoring("Admin Desa", "LOCKED", "Desa Selatan", "Soco", "Desa Selatan"), false);
  assert.strictEqual(canEditMonitoring("Viewer", "OPEN", "Desa Selatan", "Soco", "Semua"), false);
});

test("6. Data Accuracy: Completion Formula, Incomplete Validation, Reject -> Edit -> Resubmit -> Verify", () => {
  const periodId = "period-2026-10";
  const socoItems = getMonitoringItems(periodId, "Soco");
  assert.strictEqual(socoItems.length, 18);

  // Set 9 items COMPLETED, 3 items PARTIAL, 5 items NOT_COMPLETED, 1 item (ke-18) masih NOT_STARTED
  // Rumus: 9 / 18 * 100 = 50% (PARTIAL tidak dihitung sebagai COMPLETED)
  for (let i = 0; i < 9; i++) {
    updateMonitoringItem(socoItems[i].id, {
      statusKetercapaian: "COMPLETED",
      penanggungJawab: "Koordinator Soco",
      laporanPelaksanaan: `Laporan realisasi agenda #${i + 1} Soco selesai 100%`
    }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }
  for (let i = 9; i < 12; i++) {
    updateMonitoringItem(socoItems[i].id, {
      statusKetercapaian: "PARTIAL",
      ketercapaianPersen: 60,
      kendala: "Kehadiran belum 100%",
      laporanPelaksanaan: `Laporan realisasi sebagian agenda #${i + 1}`
    }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }
  for (let i = 12; i < 17; i++) {
    updateMonitoringItem(socoItems[i].id, {
      statusKetercapaian: "NOT_COMPLETED",
      kendala: "Jadwal diundur",
      laporanPelaksanaan: `Laporan evaluasi kendala agenda #${i + 1}`
    }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }

  // Test 7 (Section 38): Incomplete Agenda Validation -> Jika 1 dari 18 agenda belum diisi, Submit harus ditolak dengan warning jelas!
  const summaryBefore18 = getDesaSubmissionSummary(periodId, "Soco");
  assert.strictEqual(summaryBefore18.incompleteAgendas.length, 1, "Masih ada 1 agenda (#18) yang belum diisi");
  assert.strictEqual(summaryBefore18.isReadyToSubmit, false);

  assert.throws(() => {
    submitDesaReport(periodId, "Soco", "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }, /Masih ada 1 agenda yang belum diisi/);

  // Sekarang lengkapi agenda ke-18 sebagai NOT_COMPLETED
  updateMonitoringItem(socoItems[17].id, {
    statusKetercapaian: "NOT_COMPLETED",
    kendala: "Akan dilaksanakan pekan depan",
    laporanPelaksanaan: "Laporan agenda #18 ditunda pekan depan"
  }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");

  const summary = getDesaSubmissionSummary(periodId, "Soco");
  assert.strictEqual(summary.completedMandatory, 9, "Hanya yang COMPLETED dihitung selesai");
  assert.strictEqual(summary.agendaPartial, 3, "PARTIAL tercatat terpisah");
  assert.strictEqual(summary.avgKetercapaian, 50, "9 dari 18 wajib = 50% (PARTIAL ≠ COMPLETED)");
  assert.strictEqual(summary.incompleteAgendas.length, 0, "Seluruh 18 agenda telah diisi");
  assert.strictEqual(summary.isReadyToSubmit, true);

  // Koordinator Submit laporan
  const submittedSub = submitDesaReport(periodId, "Soco", "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  assert.strictEqual(submittedSub.status, "SUBMITTED");

  // Saat SUBMITTED, koordinator desa terkunci dari pengeditan langsung
  assert.throws(() => {
    updateMonitoringItem(socoItems[0].id, { catatanEvaluasi: "Coba ubah" }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }, /terkunci/);

  // PPG Admin melakukan REJECT tanpa alasan -> Harus ditolak!
  assert.throws(() => {
    verifyDesaReport(submittedSub.id, "REJECTED", "   ", "SuperAdmin1", "Super Admin");
  }, /Alasan penolakan wajib disertakan/);

  // PPG Admin melakukan REJECT dengan alasan valid
  const rejectedSub = verifyDesaReport(
    submittedSub.id,
    "REJECTED",
    "Mohon lengkapi tindak lanjut untuk agenda yang belum terlaksana",
    "SuperAdmin1",
    "Super Admin"
  );
  assert.strictEqual(rejectedSub.status, "REJECTED");

  // Setelah REJECTED, koordinator desa dapat mengedit kembali dan RESUBMIT
  updateMonitoringItem(socoItems[12].id, {
    tindakLanjut: "Dijadwalkan ulang pekan depan"
  }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");

  const resubmittedSub = submitDesaReport(periodId, "Soco", "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  assert.strictEqual(resubmittedSub.status, "SUBMITTED");

  // Pastikan audit log mencatat RESUBMIT
  const resubmitAudit = getMonevAuditLogs().find(l => l.entityId === resubmittedSub.id && l.action === "RESUBMIT");
  assert.ok(resubmitAudit, "Audit log harus mencatat aksi RESUBMIT saat pengiriman ulang dari REJECTED");

  // PPG Admin memverifikasi (VERIFY) laporan meskipun capaian 50% (VERIFIED ≠ 100% COMPLETED)
  const verifiedSub = verifyDesaReport(
    resubmittedSub.id,
    "VERIFIED",
    "Laporan disahkan dengan catatan tindak lanjut dipantau",
    "SuperAdmin1",
    "Super Admin"
  );
  assert.strictEqual(verifiedSub.status, "VERIFIED");
  assert.strictEqual(verifiedSub.progressPersen, 50, "VERIFIED tidak memalsukan persentase completion menjadi 100%");
});

test("7. Follow-Up System: Follow-Up COMPLETED Tidak Mengubah Status Agenda Menjadi COMPLETED", () => {
  const periodId = "period-2026-10";
  const bendoItems = getMonitoringItems(periodId, "Bendo");
  const problemItem = bendoItems[0];

  // Tandai agenda #1 Desa Bendo sebagai NOT_COMPLETED
  updateMonitoringItem(problemItem.id, {
    statusKetercapaian: "NOT_COMPLETED",
    kendala: "Pengajar sedang tugas luar kota"
  }, "adminbendo1", "Admin Kelompok", "Kelompok Bendo");

  // Buat Follow-up untuk agenda tersebut
  const fu = createFollowUp({
    monitoringItemId: problemItem.id,
    periodId,
    wilayah: "Desa Selatan",
    desa: "Bendo",
    agendaJudul: problemItem.judulAgenda,
    nomorUrut: problemItem.nomorUrut,
    alasanKendala: "Pengajar tugas luar kota",
    deskripsiMasalah: "Musyawarah guru tertunda",
    rencanaTindakan: "Koordinasi daring pengganti",
    pic: "Ketua Kelompok Bendo",
    targetPenyelesaian: "2020-01-01", // Masa lalu -> harus terdeteksi OVERDUE saat OPEN
    status: "OPEN"
  }, "adminbendo1", "Admin Kelompok", "Kelompok Bendo");

  assert.strictEqual(fu.isOverdue, true, "Follow-up melewati batas waktu harus terdeteksi overdue");

  // Selesaikan Follow-up menjadi COMPLETED
  const completedFu = updateFollowUp(
    fu.id,
    { status: "COMPLETED", hasilTindakLanjut: "Sudah koordinasi daring" },
    "adminbendo1",
    "Admin Kelompok",
    "Kelompok Bendo"
  );
  assert.strictEqual(completedFu.status, "COMPLETED");
  assert.strictEqual(completedFu.isOverdue, false, "Follow-up COMPLETED tidak lagi overdue");

  // Verifikasi agenda awal TIDAK otomatis berubah menjadi COMPLETED (Aturan Section 26 & 38)
  const bendoItemsAfter = getMonitoringItems(periodId, "Bendo");
  const itemAfter = bendoItemsAfter.find(i => i.id === problemItem.id)!;
  assert.strictEqual(
    itemAfter.statusKetercapaian,
    "NOT_COMPLETED",
    "Follow-up COMPLETED tidak boleh mengubah status agenda awal menjadi COMPLETED"
  );
});

test("8. Snapshot Isolation, Command Center, Analytics & Executive Report", () => {
  const periodId = "period-2026-10";
  const snapshotsBefore = ensurePeriodSnapshots(periodId);
  const snapshotItem = snapshotsBefore.find(s => s.masterAgendaId === "mag-01")!;
  const originalSnapshotTitle = snapshotItem.judulAgenda;

  // Ubah master agenda di katalog master
  updateMasterAgenda("mag-01", {
    judulAgenda: "Musyawarah guru dan evaluasi kurikulum terpadu"
  }, "SuperAdmin1", "Super Admin");

  // Verifikasi snapshot pada periode yang sudah berjalan tetap utuh
  const snapshotsAfter = ensurePeriodSnapshots(periodId);
  const snapshotItemAfter = snapshotsAfter.find(s => s.masterAgendaId === "mag-01")!;
  assert.strictEqual(
    snapshotItemAfter.judulAgenda,
    originalSnapshotTitle,
    "Judul snapshot periode lama harus tetap terisolasi"
  );

  // Kembalikan judul master agenda agar rapi
  updateMasterAgenda("mag-01", { judulAgenda: originalSnapshotTitle }, "SuperAdmin1", "Super Admin");

  // Verifikasi Command Center, Analytics & Executive Report
  const cmd = getCommandCenterData(periodId);
  assert.strictEqual(cmd.totalDesa, 30);
  assert.strictEqual(cmd.verified, 1); // Soco verified
  assert.strictEqual(cmd.wilayahSummaries.length, 4);

  const analytics = getAnalyticsData(periodId);
  assert.strictEqual(analytics.agendaPerformance.length, 18);
  assert.strictEqual(analytics.heatmapMatrix.length, 30);
  assert.strictEqual(analytics.heatmapMatrix[0].cells.length, 18);

  const execReport = getExecutiveReport(periodId);
  assert.strictEqual(execReport.totalVillages, 30);
  assert.strictEqual(execReport.verifiedVillages, 1);

  const audits = getMonevAuditLogs();
  assert.ok(audits.length > 0, "Audit log harus mencatat seluruh aktivitas penting");
});

test("9. Workflow Remediation (Tests 1–5): Period OPEN -> Langsung Isi Tanpa Approval Admin, Individual Agenda 1–18 & Draft Persistence", () => {
  // Buat periode baru & buka (OPEN) TANPA memanggil generatePeriodMonitoringItems dari Admin
  const newPeriod = createPeriod({
    namaPeriode: "Monev PPG Periode Desember 2026",
    tahun: 2026,
    bulan: 12,
    tanggalMulai: "2026-12-01",
    tanggalSelesai: "2026-12-31"
  }, "SuperAdmin1", "Super Admin");
  updatePeriodStatus(newPeriod.id, "OPEN", "SuperAdmin1", "Super Admin");

  // Test 1: Admin Kelompok (Karang = Kelompok Karas / Semen) langsung membuka periode OPEN tanpa menunggu approval admin
  const perms = getUserMonevPermissions(newPeriod.id, "Karas", "Admin Kelompok", "Kelompok Karas");
  assert.strictEqual(perms.canView, true, "CAN_VIEW harus TRUE");
  assert.strictEqual(perms.canFill, true, "CAN_FILL harus TRUE tanpa approval admin");
  assert.strictEqual(perms.canSave, true, "CAN_SAVE harus TRUE tanpa approval admin");
  assert.strictEqual(perms.canSubmit, true, "CAN_SUBMIT harus TRUE saat periode OPEN");

  // Pastikan 18 agenda langsung tersedia untuk diisi (auto-provisioned)
  const karasSummary = getDesaSubmissionSummary(newPeriod.id, "Karas", {
    username: "adminkaras1",
    role: "Admin Kelompok",
    scope: "Kelompok Karas"
  });
  assert.strictEqual(karasSummary.items.length, 18, "18 agenda harus langsung tampil tanpa menunggu admin");
  assert.strictEqual(karasSummary.submission?.status, "DRAFT");

  // Test 2 & Test 3: Individual Agenda Fill & Individual Agenda Report (Agenda 1 -> Selesai + Laporan A, Agenda 2 -> Sebagian + Laporan B, Agenda 3 -> Tidak Selesai + Laporan C)
  const items = karasSummary.items;
  updateMonitoringItem(items[0].id, {
    statusKetercapaian: "COMPLETED",
    laporanPelaksanaan: "Laporan A: Musyawarah guru terlaksana hadir 15 pengajar"
  }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  updateMonitoringItem(items[1].id, {
    statusKetercapaian: "PARTIAL",
    ketercapaianPersen: 70,
    kendala: "Unsur pembina berhalangan 1 orang",
    laporanPelaksanaan: "Laporan B: Musyawarah 5 unsur hadir 4 dari 5 unsur"
  }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  updateMonitoringItem(items[2].id, {
    statusKetercapaian: "NOT_COMPLETED",
    kendala: "Hujan deras & listrik padam",
    laporanPelaksanaan: "Laporan C: Pengajian MM dijadwalkan ulang"
  }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  const reloadedAfterIndividual = getMonitoringItems(newPeriod.id, "Karas");
  assert.strictEqual(reloadedAfterIndividual[0].statusKetercapaian, "COMPLETED");
  assert.strictEqual(reloadedAfterIndividual[0].laporanPelaksanaan, "Laporan A: Musyawarah guru terlaksana hadir 15 pengajar");
  assert.strictEqual(reloadedAfterIndividual[1].statusKetercapaian, "PARTIAL");
  assert.strictEqual(reloadedAfterIndividual[1].laporanPelaksanaan, "Laporan B: Musyawarah 5 unsur hadir 4 dari 5 unsur");
  assert.strictEqual(reloadedAfterIndividual[2].statusKetercapaian, "NOT_COMPLETED");
  assert.strictEqual(reloadedAfterIndividual[2].laporanPelaksanaan, "Laporan C: Pengajian MM dijadwalkan ulang");

  // Test 4 & Test 5: Pengisian Agenda 1–18 + Individual Update (Agenda 5 -> Sebagian, Agenda 12 -> Tidak Selesai) + Save Draft Persistence
  const bulkPayload = reloadedAfterIndividual.map(it => ({
    itemId: it.id,
    judulAgenda: it.judulAgenda,
    nomorUrut: it.nomorUrut,
    kategori: it.kategori,
    isMandatory: true,
    statusKetercapaian: "COMPLETED" as const,
    ketercapaianPersen: 100,
    laporanPelaksanaan: it.laporanPelaksanaan || `Laporan agenda #${it.nomorUrut} selesai`
  }));
  batchUpdateMonitoringItems(newPeriod.id, "Karas", bulkPayload, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  // Override Agenda 5 (index 4) -> Sebagian, dan Agenda 12 (index 11) -> Tidak Selesai
  updateMonitoringItem(reloadedAfterIndividual[4].id, {
    statusKetercapaian: "PARTIAL",
    ketercapaianPersen: 50,
    kendala: "Hari boso baru berjalan di kelas CR",
    laporanPelaksanaan: "Override Agenda 05: Baru berjalan sebagian"
  }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  updateMonitoringItem(reloadedAfterIndividual[11].id, {
    statusKetercapaian: "NOT_COMPLETED",
    kendala: "Serkiler belum turun",
    laporanPelaksanaan: "Override Agenda 12: Belum selesai"
  }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");

  const afterOverride = getDesaSubmissionSummary(newPeriod.id, "Karas");
  assert.strictEqual(afterOverride.submission?.status, "DRAFT", "Status tetap DRAFT saat disimpan");
  assert.strictEqual(afterOverride.completedMandatory, 16, "16 agenda tetap COMPLETED");
  assert.strictEqual(afterOverride.agendaPartial, 1, "Agenda 5 menjadi PARTIAL");
  assert.strictEqual(afterOverride.items[4].statusKetercapaian, "PARTIAL");
  assert.strictEqual(afterOverride.items[4].laporanPelaksanaan, "Override Agenda 05: Baru berjalan sebagian");
  assert.strictEqual(afterOverride.items[11].statusKetercapaian, "NOT_COMPLETED");
  assert.strictEqual(afterOverride.items[11].laporanPelaksanaan, "Override Agenda 12: Belum selesai");
  assert.strictEqual(afterOverride.items[0].statusKetercapaian, "COMPLETED", "Agenda lainnya tidak terganggu");
});

test("10. Authorization & Scope Enforcement Matrix (Tests 10–25): Admin Kelompok, Admin Desa, Admin PPG, IDOR, Evidence, Follow-Up, Dashboard & Export", () => {
  const periodId = "period-2026-10";

  const authKelompokSoco = { username: "adminsoco1", role: "Admin Kelompok", scope: "Kelompok Soco" };
  const authDesaSelatan = { username: "desaselatan1", role: "Admin Desa", scope: "Desa Selatan" };
  const authAdminPPG = { username: "superadminaldi", role: "Super Admin", scope: "Semua" };

  // Pastikan data untuk Desa Utara (Jeruk) juga siap untuk diuji lintas desa
  const jerukItems = getMonitoringItems(periodId, "Jeruk");
  const bendoItems = getMonitoringItems(periodId, "Bendo");
  const socoItems = getMonitoringItems(periodId, "Soco");

  // Tambahkan sample Evidence & Follow-up di Kelompok Bendo (Desa Selatan) dan Kelompok Jeruk (Desa Utara)
  const evBendo = addEvidence({
    monitoringItemId: bendoItems[0].id,
    periodId,
    wilayah: "Desa Selatan",
    desa: "Bendo",
    judulDokumentasi: "Foto Musyawarah Bendo",
    fileUrl: "https://example.com/bendo.jpg",
    fileType: "link",
    uploadedBy: "adminbendo1"
  }, "adminbendo1", "Admin Kelompok", "Kelompok Bendo");

  const fuJeruk = createFollowUp({
    monitoringItemId: jerukItems[0].id,
    periodId,
    wilayah: "Desa Utara",
    desa: "Jeruk",
    agendaJudul: jerukItems[0].judulAgenda,
    nomorUrut: 1,
    alasanKendala: "Kendala Jeruk",
    deskripsiMasalah: "Masalah Jeruk",
    rencanaTindakan: "Rencana Jeruk",
    pic: "PJ Jeruk",
    targetPenyelesaian: "2026-10-30",
    status: "OPEN"
  }, "SuperAdmin1", "Super Admin", "Semua");

  // Test 10: Admin Kelompok Own Group (Soco) -> ALLOW
  const ownGroupSummary = getDesaSubmissionSummary(periodId, "Soco", authKelompokSoco);
  assert.strictEqual(ownGroupSummary.desa, "Soco");

  // Test 11: Admin Kelompok Other Group (Soco accesses Bendo) -> DENY
  assert.throws(() => {
    getDesaSubmissionSummary(periodId, "Bendo", authKelompokSoco);
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  assert.throws(() => {
    getMonitoringItems(periodId, "Bendo", undefined, authKelompokSoco);
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  // Test 12: Admin Kelompok Update Other Group (Soco updates Bendo) -> DENY
  assert.throws(() => {
    updateMonitoringItem(bendoItems[0].id, { statusKetercapaian: "COMPLETED" }, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  // Test 13: Admin Kelompok Delete Other Group Follow-up -> DENY
  const bendoFu = getFollowUps(periodId, "Bendo")[0];
  assert.throws(() => {
    deleteFollowUp(bendoFu.id, "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  // Test 14: Admin Kelompok Export Other Group -> DENY
  assert.throws(() => {
    getScopedExportData(periodId, authKelompokSoco, "Bendo");
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  // Test 15 & Test 16: Admin Desa Own Desa (Desa Selatan) & Own Groups (Soco, Bendo) -> ALLOW
  const selatanSubs = getSubmissions(periodId, "Desa Selatan", authDesaSelatan);
  assert.strictEqual(selatanSubs.length, 7, "Admin Desa Selatan dapat melihat 7 kelompok di Desa Selatan");
  const selatanGroupSummary = getDesaSubmissionSummary(periodId, "Bendo", authDesaSelatan);
  assert.strictEqual(selatanGroupSummary.desa, "Bendo");

  // Test 17 & Test 18: Admin Desa Other Desa (Desa Utara) & Other Desa Group (Jeruk) -> DENY
  assert.throws(() => {
    getSubmissions(periodId, "Desa Utara", authDesaSelatan);
  }, /Akses ditolak \(Cross-Village Forbidden\)/);

  assert.throws(() => {
    getDesaSubmissionSummary(periodId, "Jeruk", authDesaSelatan);
  }, /Akses ditolak \(Cross-Village Forbidden\)/);

  // Test 19: Admin Desa Update Other Desa (Desa Selatan updates Jeruk in Desa Utara) -> DENY
  assert.throws(() => {
    updateMonitoringItem(jerukItems[0].id, { statusKetercapaian: "COMPLETED" }, "desaselatan1", "Admin Desa", "Desa Selatan");
  }, /Akses ditolak \(Cross-Village Forbidden\)/);

  // Test 20: Admin Desa Export Other Desa -> DENY
  assert.throws(() => {
    getScopedExportData(periodId, authDesaSelatan, undefined, "Desa Utara");
  }, /Akses ditolak \(Export Cross-Village Forbidden\)/);

  assert.throws(() => {
    getScopedExportData(periodId, authDesaSelatan, "Jeruk");
  }, /Akses ditolak \(Cross-Village Forbidden\)/);

  // Test 21: Admin PPG Global Access -> ALLOW
  const ppgAllSubs = getSubmissions(periodId, undefined, authAdminPPG);
  assert.strictEqual(ppgAllSubs.length, 30, "Admin PPG memiliki akses ke seluruh 30 kelompok di 4 desa");

  // Test 22: Direct URL / IDOR Manipulation (submission_id, monev_item_id, follow_up_id, evidence_id) -> DENY
  const bendoSub = getSubmissions(periodId, "Bendo")[0];
  assert.throws(() => {
    getSubmissionById(bendoSub.id, authKelompokSoco);
  }, /Akses ditolak/);

  assert.throws(() => {
    getMonitoringItemById(bendoItems[0].id, authKelompokSoco);
  }, /Akses ditolak/);

  assert.throws(() => {
    getFollowUpById(fuJeruk.id, authDesaSelatan);
  }, /Akses ditolak/);

  assert.throws(() => {
    getEvidenceById(evBendo.id, authKelompokSoco);
  }, /Akses ditolak/);

  // Test 23: API Payload Manipulation (Admin Kelompok Soco mengirim batch update dengan desa = "Bendo") -> DENY
  assert.throws(() => {
    batchUpdateMonitoringItems(periodId, "Bendo", [], "adminsoco1", "Admin Kelompok", "Kelompok Soco");
  }, /Akses ditolak/);

  // Test 24: Evidence Cross-Scope Access -> DENY
  assert.throws(() => {
    getEvidenceList(periodId, "Bendo", undefined, authKelompokSoco);
  }, /Akses ditolak/);

  assert.throws(() => {
    addEvidence({
      monitoringItemId: jerukItems[0].id,
      periodId,
      wilayah: "Desa Utara",
      desa: "Jeruk",
      judulDokumentasi: "Ilegal",
      fileUrl: "https://example.com/ilegal.jpg",
      fileType: "link",
      uploadedBy: "desaselatan1"
    }, "desaselatan1", "Admin Desa", "Desa Selatan");
  }, /Akses ditolak/);

  // Test 25: Follow-Up Cross-Scope Access -> DENY
  assert.throws(() => {
    getFollowUps(periodId, "Jeruk", undefined, authDesaSelatan);
  }, /Akses ditolak/);

  const scopedFuForSoco = getFollowUps(periodId, undefined, undefined, authKelompokSoco);
  assert.strictEqual(
    scopedFuForSoco.some(f => f.desa === "Bendo" || f.desa === "Jeruk"),
    false,
    "Daftar follow-up Admin Kelompok Soco tidak boleh membocorkan follow-up kelompok lain"
  );

  // Scoped Dashboard KPI Check (Section 33)
  const cmdSoco = getCommandCenterData(periodId, authKelompokSoco);
  assert.strictEqual(cmdSoco.totalDesa, 1, "Dashboard Admin Kelompok hanya menampilkan 1 kelompok miliknya");

  const cmdSelatan = getCommandCenterData(periodId, authDesaSelatan);
  assert.strictEqual(cmdSelatan.totalDesa, 7, "Dashboard Admin Desa Selatan hanya menampilkan 7 kelompok di desanya");
});

test("11. Acceptance Criteria Sections 5–13: Admin Kelompok Karas Scope, Section 6 Summary, Reject/Verify Metadata, Audit Trail & Scoped Export", () => {
  const periodId = "period-2026-10";
  const authKaras = { username: "adminkaras1", role: "Admin Kelompok", scope: "Kelompok Karas" };
  const authSuperAdmin = { username: "superadminaldi", role: "Super Admin", scope: "Semua" };

  // 1. Section 11: Test dengan akun Admin Kelompok Karas (Desa Selatan -> Kelompok Karas)
  // Karas -> ALLOW
  const karasAccess = validateVillageAccess("Admin Kelompok", "Kelompok Karas", "Karas", "Desa Selatan");
  assert.strictEqual(karasAccess.allowed, true, "Admin Kelompok Karas -> Karas harus ALLOW");

  // Kelompok lain di desa yang sama (Bendo / Soco di Desa Selatan) -> DENY
  const bendoAccess = validateVillageAccess("Admin Kelompok", "Kelompok Karas", "Bendo", "Desa Selatan");
  assert.strictEqual(bendoAccess.allowed, false, "Admin Kelompok Karas -> Kelompok lain (Bendo) harus DENY");

  // Desa lain (Jeruk di Desa Utara) -> DENY
  const jerukAccess = validateVillageAccess("Admin Kelompok", "Kelompok Karas", "Jeruk", "Desa Utara");
  assert.strictEqual(jerukAccess.allowed, false, "Admin Kelompok Karas -> Desa lain (Jeruk / Desa Utara) harus DENY");

  assert.throws(() => {
    getDesaSubmissionSummary(periodId, "Bendo", authKaras);
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  assert.throws(() => {
    getDesaSubmissionSummary(periodId, "Jeruk", authKaras);
  }, /Akses ditolak \(Cross-Group Forbidden\)/);

  assert.throws(() => {
    getSubmissions(periodId, "Desa Utara", authKaras);
  }, /Akses ditolak/);

  assert.throws(() => {
    getSubmissions(periodId, "Desa Tengah", authKaras);
  }, /Akses ditolak/);

  // Bahkan jika memfilter wilayahnya sendiri (Desa Selatan), Admin Kelompok Karas hanya boleh menerima 1 record (Karas)
  const karasOnlySubs = getSubmissions(periodId, "Desa Selatan", authKaras);
  assert.strictEqual(karasOnlySubs.length, 1);
  assert.strictEqual(karasOnlySubs[0].desa, "Karas");

  // Manipulasi group_id, village_id, submission_id, agenda_id oleh Admin Kelompok Karas -> DENY
  const socoSub = getSubmissions(periodId, "Soco", authSuperAdmin)[0];
  const socoItems = getMonitoringItems(periodId, "Soco", undefined, authSuperAdmin);

  assert.throws(() => {
    getSubmissionById(socoSub.id, authKaras);
  }, /Akses ditolak/, "Manipulasi submission_id harus DENY");

  assert.throws(() => {
    getMonitoringItemById(socoItems[0].id, authKaras);
  }, /Akses ditolak/, "Manipulasi agenda_id / item_id harus DENY");

  assert.throws(() => {
    updateMonitoringItem(socoItems[0].id, { statusKetercapaian: "COMPLETED" }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  }, /Akses ditolak/, "Manipulasi agenda_id saat update harus DENY");

  assert.throws(() => {
    batchUpdateMonitoringItems(periodId, "Jeruk", [], "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  }, /Akses ditolak/, "Manipulasi group_id / village_id saat batch update harus DENY");

  // 2. Section 5 & 6: Pengisian 18 Agenda Karas + Ringkasan Hasil Laporan
  const karasItems = getMonitoringItems(periodId, "Karas", undefined, authKaras);
  assert.strictEqual(karasItems.length, 18, "Karas harus memiliki 18 agenda");

  // Isi 12 COMPLETED, 3 PARTIAL, 3 NOT_COMPLETED
  for (let i = 0; i < 18; i++) {
    const status = i < 12 ? "COMPLETED" : i < 15 ? "PARTIAL" : "NOT_COMPLETED";
    updateMonitoringItem(
      karasItems[i].id,
      {
        statusKetercapaian: status,
        ketercapaianPersen: status === "COMPLETED" ? 100 : status === "PARTIAL" ? 50 : 0,
        laporanPelaksanaan: `Laporan Karas Agenda #${i + 1}: status ${status}`,
        kendala: status !== "COMPLETED" ? `Kendala agenda #${i + 1}` : ""
      },
      "adminkaras1",
      "Admin Kelompok",
      "Kelompok Karas"
    );
  }

  const summaryDraft = getDesaSubmissionSummary(periodId, "Karas", authKaras);
  assert.strictEqual(summaryDraft.totalAgendas, 18);
  assert.strictEqual(summaryDraft.completedMandatory, 12);
  assert.strictEqual(summaryDraft.agendaPartial, 3);
  assert.strictEqual(summaryDraft.agendaNotCompleted, 3);
  assert.strictEqual(summaryDraft.agendaNotStarted, 0);
  // Progress = 12 / 18 * 100 = 66.7%
  assert.strictEqual(summaryDraft.avgKetercapaian, 66.7);
  assert.strictEqual(summaryDraft.statusLaporan, "DRAFT");
  assert.strictEqual(summaryDraft.statusVerifikasi, "PENDING");

  // Submit laporan Karas
  const submittedKaras = submitDesaReport(periodId, "Karas", "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  assert.strictEqual(submittedKaras.status, "SUBMITTED");
  assert.strictEqual(submittedKaras.submittedBy, "adminkaras1");
  assert.ok(submittedKaras.submittedAt);

  const summarySubmitted = getDesaSubmissionSummary(periodId, "Karas", authKaras);
  assert.strictEqual(summarySubmitted.statusLaporan, "SUBMITTED");
  assert.strictEqual(summarySubmitted.statusVerifikasi, "PENDING");

  // 3. Section 7: Superadmin REJECT laporan Karas dengan alasan wajib
  const rejectedKaras = verifyDesaReport(
    submittedKaras.id,
    "REJECTED",
    "Mohon perjelas laporan pelaksanaan pada Agenda 16, 17, dan 18.",
    "superadminaldi",
    "Super Admin"
  );
  assert.strictEqual(rejectedKaras.status, "REJECTED");
  assert.strictEqual(rejectedKaras.rejectedBy, "superadminaldi");
  assert.ok(rejectedKaras.rejectedAt);
  assert.strictEqual(rejectedKaras.rejectionReason, "Mohon perjelas laporan pelaksanaan pada Agenda 16, 17, dan 18.");

  const summaryRejected = getDesaSubmissionSummary(periodId, "Karas", authKaras);
  assert.strictEqual(summaryRejected.statusLaporan, "REJECTED");
  assert.strictEqual(summaryRejected.statusVerifikasi, "REJECTED");

  // Admin Kelompok Karas memperbaiki Agenda 16 dan melakukan RESUBMIT
  updateMonitoringItem(
    karasItems[15].id,
    {
      laporanPelaksanaan: "Laporan Karas Agenda #16 diperbaiki: sudah koordinasi dengan pengajar"
    },
    "adminkaras1",
    "Admin Kelompok",
    "Kelompok Karas"
  );

  const resubmittedKaras = submitDesaReport(periodId, "Karas", "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  assert.strictEqual(resubmittedKaras.status, "SUBMITTED");

  const summaryResubmitted = getDesaSubmissionSummary(periodId, "Karas", authKaras);
  assert.strictEqual(summaryResubmitted.statusLaporan, "SUBMITTED");
  assert.strictEqual(summaryResubmitted.statusVerifikasi, "PENDING");

  // 4. Section 8: Superadmin VERIFIED laporan Karas TANPA mengubah data asli laporan secara diam-diam (dan Verification Note opsional)
  const verifiedKaras = verifyDesaReport(
    resubmittedKaras.id,
    "VERIFIED",
    "", // Optional verification note left empty
    "superadminaldi",
    "Super Admin"
  );
  assert.strictEqual(verifiedKaras.status, "VERIFIED");
  assert.strictEqual(verifiedKaras.verifiedBy, "superadminaldi");
  assert.ok(verifiedKaras.verifiedAt);
  assert.strictEqual(verifiedKaras.verificationNote, "");
  assert.strictEqual(verifiedKaras.progressPersen, 66.7, "Data progress asli laporan tidak berubah saat verifikasi");

  const summaryVerified = getDesaSubmissionSummary(periodId, "Karas", authKaras);
  assert.strictEqual(summaryVerified.statusLaporan, "VERIFIED");
  assert.strictEqual(summaryVerified.statusVerifikasi, "VERIFIED");
  assert.strictEqual(
    summaryVerified.items[15].laporanPelaksanaan,
    "Laporan Karas Agenda #16 diperbaiki: sudah koordinasi dengan pengajar",
    "Data asli item laporan tidak berubah saat verifikasi"
  );

  // Saat VERIFIED, Admin Kelompok Karas tidak dapat mengedit laporan
  assert.throws(() => {
    updateMonitoringItem(karasItems[0].id, { laporanPelaksanaan: "Ubah setelah verified" }, "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  }, /terkunci/);

  // 5. Section 12: Export mengikuti authorization scope
  const karasExport = getScopedExportData(periodId, authKaras);
  assert.strictEqual(karasExport.villages.length, 1, "Export Admin Kelompok Karas hanya berisi 1 kelompok (Karas)");
  assert.strictEqual(karasExport.villages[0].desa, "Karas");
  assert.strictEqual(karasExport.items.length, 18, "Export Admin Kelompok Karas hanya berisi 18 item agenda Karas");

  const superAdminExport = getScopedExportData(periodId, authSuperAdmin);
  assert.strictEqual(superAdminExport.villages.length, 30, "Export Superadmin mencakup seluruh 30 kelompok");
});

test("12. Sections 8–31: Single Source of Truth, Single Canonical report_id, Terminology Normalization (Daerah -> Desa -> Kelompok), and Scoped Approval by Admin Desa & Superadmin", () => {
  // 1. Terminology & Hierarchy Validation (Sections 10–18)
  assert.strictEqual(formatDesaShort("Desa Selatan"), "Selatan");
  assert.strictEqual(formatDesaLabel("Desa Selatan"), "Desa : Selatan");
  assert.strictEqual(formatDesaLabel("Wilayah Desa Selatan"), "Desa : Selatan");
  assert.strictEqual(formatKelompokShort("Kelompok Karas"), "Karas");
  assert.strictEqual(formatKelompokShort("Desa Karas"), "Karas");
  assert.strictEqual(formatKelompokLabel("Karas"), "Kelompok : Karas");
  assert.strictEqual(formatKelompokDesaInline("Karas", "Desa Selatan"), "Kelompok Karas, Desa Selatan");

  assert.strictEqual(formatApprovalStatusLabel("DRAFT"), "Draft");
  assert.strictEqual(formatApprovalStatusLabel("SUBMITTED"), "Menunggu Persetujuan");
  assert.strictEqual(formatApprovalStatusLabel("VERIFIED"), "Disetujui");
  assert.strictEqual(formatApprovalStatusLabel("REJECTED"), "Perlu Perbaikan");

  // 2. Buat periode September 2026 & buka (OPEN) untuk pengujian E2E Sections 15, 22, 23, 26, 27
  const periodSept = createPeriod({
    namaPeriode: "Monev PPG Periode September 2026",
    tahun: 2026,
    bulan: 9,
    tanggalMulai: "2026-09-01",
    tanggalSelesai: "2026-09-30"
  }, "superadminaldi", "Super Admin");
  updatePeriodStatus(periodSept.id, "OPEN", "superadminaldi", "Super Admin");

  const authKaras = { username: "adminkaras1", role: "Admin Kelompok", scope: "Kelompok Karas" };
  const authDesaSelatan = { username: "admindesaselatan", role: "Admin Desa", scope: "Desa Selatan" };
  const authDesaUtara = { username: "admindesautara", role: "Admin Desa", scope: "Desa Utara" };
  const authSuperAdmin = { username: "superadminaldi", role: "Super Admin", scope: "Semua" };

  // 3. Step 1 (Section 27): Login sebagai Admin Kelompok Karas -> Desa : Selatan, Kelompok : Karas -> Isi 18 agenda -> SAVE -> SUBMIT
  const karasSummaryInitial = getDesaSubmissionSummary(periodSept.id, "Karas", authKaras);
  const expectedReportId = getCanonicalReportId(periodSept.id, "Karas");
  assert.strictEqual(karasSummaryInitial.reportId, expectedReportId, "Report ID harus canonical");
  assert.strictEqual(karasSummaryInitial.desaNama, "Selatan", "Desa : Selatan");
  assert.strictEqual(karasSummaryInitial.kelompokNama, "Karas", "Kelompok : Karas");

  karasSummaryInitial.items.forEach((it) => {
    updateMonitoringItem(
      it.id,
      {
        statusKetercapaian: "COMPLETED",
        ketercapaianPersen: 100,
        laporanPelaksanaan: `Hasil pelaksanaan Agenda #${String(it.nomorUrut).padStart(2, "0")} Kelompok Karas`
      },
      "adminkaras1",
      "Admin Kelompok",
      "Kelompok Karas"
    );
  });

  const submittedSub = submitDesaReport(periodSept.id, "Karas", "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  assert.strictEqual(submittedSub.id, expectedReportId);
  assert.strictEqual(submittedSub.reportId, expectedReportId);
  assert.strictEqual(submittedSub.status, "SUBMITTED");
  assert.strictEqual(submittedSub.progressPersen, 100);

  // 4. Step 2 & 3 (Section 27): Pastikan Single Source of Truth & Single report_id lintas role (Admin Kelompok, Admin Desa Selatan, Superadmin)
  const viewByKelompok = getDesaSubmissionSummary(periodSept.id, "Karas", authKaras);
  const viewByDesaSelatan = getDesaSubmissionSummary(periodSept.id, "Karas", authDesaSelatan);
  const viewBySuperAdmin = getDesaSubmissionSummary(periodSept.id, "Karas", authSuperAdmin);

  assert.strictEqual(viewByKelompok.reportId, expectedReportId, "Admin Kelompok Karas melihat REPORT_ID = X");
  assert.strictEqual(viewByDesaSelatan.reportId, expectedReportId, "Admin Desa Selatan melihat REPORT_ID = X");
  assert.strictEqual(viewBySuperAdmin.reportId, expectedReportId, "Superadmin melihat REPORT_ID = X");
  assert.strictEqual(viewByDesaSelatan.statusLaporan, "SUBMITTED");
  assert.strictEqual(formatApprovalStatusLabel(viewByDesaSelatan.statusLaporan), "Menunggu Persetujuan");
  assert.strictEqual(viewByDesaSelatan.avgKetercapaian, 100);

  // 5. Security Matrix untuk Approval (Section 26)
  // a) Admin Kelompok Karas coba approve -> DENIED
  assert.strictEqual(canApproveReport("Admin Kelompok", "Kelompok Karas", "Karas", "Desa Selatan").allowed, false);
  assert.throws(() => {
    verifyDesaReport(expectedReportId, "VERIFIED", "Self approve", "adminkaras1", "Admin Kelompok", "Kelompok Karas");
  }, /Akses ditolak/);

  // b) Admin Desa Utara coba approve Kelompok Karas (Desa Selatan) -> DENIED
  assert.strictEqual(canApproveReport("Admin Desa", "Desa Utara", "Karas", "Desa Selatan").allowed, false);
  assert.throws(() => {
    verifyDesaReport(expectedReportId, "VERIFIED", "Cross village approve", "admindesautara", "Admin Desa", "Desa Utara");
  }, /Akses ditolak \(Cross-Village Approval Forbidden\)/);

  // c) Admin Desa Selatan coba approve Kelompok Jeruk (Desa Utara) -> DENIED
  assert.strictEqual(canApproveReport("Admin Desa", "Desa Selatan", "Jeruk", "Desa Utara").allowed, false);

  // d) Admin Desa Selatan approve Kelompok Karas (Desa Selatan) -> ALLOW
  assert.strictEqual(canApproveReport("Admin Desa", "Desa Selatan", "Karas", "Desa Selatan").allowed, true);
  const approvedByDesa = verifyDesaReport(
    expectedReportId,
    "VERIFIED",
    "Disetujui oleh Admin Desa Selatan",
    "admindesaselatan",
    "Admin Desa",
    "Desa Selatan"
  );
  assert.strictEqual(approvedByDesa.id, expectedReportId);
  assert.strictEqual(approvedByDesa.reportId, expectedReportId);
  assert.strictEqual(approvedByDesa.status, "VERIFIED");
  assert.strictEqual(approvedByDesa.verifiedBy, "admindesaselatan");
  assert.ok(approvedByDesa.verifiedAt);

  // 6. Step 4 (Section 27): Semua role melihat status berubah menjadi Disetujui (VERIFIED) pada REPORT_ID yang sama
  const afterApproveKelompok = getDesaSubmissionSummary(periodSept.id, "Karas", authKaras);
  const afterApproveDesa = getDesaSubmissionSummary(periodSept.id, "Karas", authDesaSelatan);
  const afterApproveSuperAdmin = getDesaSubmissionSummary(periodSept.id, "Karas", authSuperAdmin);

  assert.strictEqual(afterApproveKelompok.statusLaporan, "VERIFIED");
  assert.strictEqual(formatApprovalStatusLabel(afterApproveKelompok.statusLaporan), "Disetujui");
  assert.strictEqual(afterApproveDesa.statusLaporan, "VERIFIED");
  assert.strictEqual(afterApproveSuperAdmin.statusLaporan, "VERIFIED");
  assert.strictEqual(afterApproveSuperAdmin.reportId, expectedReportId);

  // 7. Audit Log untuk Approval (Section 25)
  const audits = getMonevAuditLogs(periodSept.id);
  const approvalLog = audits.find(a => a.entityId === expectedReportId && a.action === "VERIFY");
  assert.ok(approvalLog, "Audit log approval harus tercatat");
  assert.strictEqual(approvalLog.details?.report_id, expectedReportId);
  assert.strictEqual(approvalLog.details?.action, "APPROVED");
  assert.strictEqual(approvalLog.details?.performed_by, "admindesaselatan");
  assert.strictEqual(approvalLog.details?.previous_status, "SUBMITTED");
  assert.strictEqual(approvalLog.details?.new_status, "VERIFIED");
  assert.strictEqual(approvalLog.details?.note, "Disetujui oleh Admin Desa Selatan");
});
