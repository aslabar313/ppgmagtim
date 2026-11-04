import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ALL_FESTIVAL_ROLES } from "../src/lib/festival/types";
import {
  canAccessFestivalOrg,
  canJudgeAccessCompetition,
  FESTIVAL_VILLAGE_GROUPS_MAP,
  getAccessibleFestivalPages,
  resolveCanonicalFestivalActor,
} from "../src/lib/festival/festivalAuth";
import {
  approveAndRatifyCompetitionResults,
  calculateChampionshipStandings,
  createCompetitionRegistration,
  detectScheduleConflicts,
  enrollParticipantFromGenerus,
  exportFestivalReportData,
  getFestivalStore,
  getFinalDashboardMetrics,
  getScopedContingents,
  getScopedParticipants,
  getScopedRegistrations,
  getScopedSubmissionsForActor,
  issueCompetitionCertificate,
  performQrCheckin,
  pressQuizBuzzer,
  recordQuizMatchScoreEvent,
  registerArtworkForEntry,
  registerTeamForCompetition,
  replaceAssignedJudgeWithAudit,
  resetFestivalStoreToSeed,
  resetQuizBuzzerAndSetTurn,
  resolveManualTieBreakDeliberation,
  reviseLockedSubmissionScore,
  revokeCompetitionApprovalWithAudit,
  saveFestivalStore,
  submitJudgeScore,
  toDecimal2,
  toDecimal4,
  updateArenaParticipantQueue,
  updateCompetitionCategoryConfig,
  updateRegistrationStatus,
  verifyFestivalDataIntegrity,
} from "../src/lib/festival/festivalService";
import { getGenerus, getKelompok, verifyCredentials } from "../src/lib/mockData";

test("Part 1 & 2 — Audit SQL Migrations (Foundation + Part 2 Core Engine) & RLS Verification", () => {
  const part1Path = path.resolve(
    process.cwd(),
    "supabase/migrations/20261104_festival_generus_foundation.sql"
  );
  const part2Path = path.resolve(
    process.cwd(),
    "supabase/migrations/20261105_festival_generus_part2_core_engine.sql"
  );
  assert.ok(fs.existsSync(part1Path), "File migration SQL Part 1 harus tersedia");
  assert.ok(fs.existsSync(part2Path), "File migration SQL Part 2 harus tersedia");

  const sql1 = fs.readFileSync(part1Path, "utf-8");
  const sql2 = fs.readFileSync(part2Path, "utf-8");

  assert.ok(sql1.includes("chk_fg_registrations_exclusive_entry"));
  assert.ok(sql2.includes("CREATE TABLE IF NOT EXISTS public.fg_artworks"));
  assert.ok(sql2.includes("CREATE TABLE IF NOT EXISTS public.fg_arena_queues"));
  assert.ok(sql2.includes("ALTER TABLE public.fg_artworks ENABLE ROW LEVEL SECURITY;"));
  assert.ok(sql2.includes("ALTER TABLE public.fg_arena_queues ENABLE ROW LEVEL SECURITY;"));
  assert.ok(!sql1.includes("DROP TABLE public.generus"));
  assert.ok(!sql2.includes("DROP TABLE public.generus"));
});

test("Part 1 & 2 — Master 17 Kategori Lomba dengan ID Internal Konsisten & Konfigurasi Kriteria", () => {
  const store = resetFestivalStoreToSeed();

  assert.strictEqual(store.competitions.length, 17, "Harus tepat 17 kategori lomba");
  // Pastikan ID internal konsisten (bukan angka urut sebagai primary key)
  const expectedIds = [
    "fg-comp-mewarnai-paud",
    "fg-comp-kaligrafi-sd13",
    "fg-comp-kaligrafi-sd46",
    "fg-comp-adzan-sd",
    "fg-comp-tilawati-sd13",
    "fg-comp-quran-sd46",
    "fg-comp-nasehat-sd",
    "fg-comp-tahfidz-sd",
    "fg-comp-asad-sd",
    "fg-comp-adzan-smp",
    "fg-comp-nasehat-smp",
    "fg-comp-nasehat-sma",
    "fg-comp-hadist-sma",
    "fg-comp-quran-makna-smp",
    "fg-comp-quran-makna-sma",
    "fg-comp-cca-sd",
    "fg-comp-cca-smpsma",
  ];
  assert.deepStrictEqual(
    store.competitions.map((c) => c.id),
    expectedIds
  );

  // Pastikan 3 juri ditugaskan pada setiap kategori
  for (const comp of store.competitions) {
    assert.strictEqual(comp.judgeCount, 3);
    const assigned = store.judgeAssignments.filter((ja) => ja.competitionId === comp.id);
    assert.strictEqual(assigned.length, 3);
  }

  // Pastikan Nasehat SMP & SMA memiliki konfigurasi bonus peserta laki-laki yang belum ditetapkan nilainya sebelum disetujui panitia
  const nasehatSmp = store.competitions.find((c) => c.id === "fg-comp-nasehat-smp");
  const nasehatSma = store.competitions.find((c) => c.id === "fg-comp-nasehat-sma");
  assert.ok(nasehatSmp?.maleBonusConfig?.enabled);
  assert.strictEqual(nasehatSmp?.maleBonusConfig?.bonusPoints, null);
  assert.strictEqual(nasehatSmp?.maleBonusConfig?.approvedByCommittee, false);
  assert.strictEqual(nasehatSma?.maleBonusConfig?.bonusPoints, null);

  // Pastikan Asad Pasanggiri memiliki sistem kriteria dinamis yang dapat dikonfirmasi panitia
  const asadSd = store.competitions.find((c) => c.id === "fg-comp-asad-sd");
  assert.strictEqual(asadSd?.isAsadOfficialRules, true);
  assert.strictEqual(asadSd?.rulesConfirmedByCommittee, false);

  assert.strictEqual(store.contingents.length, 30);
  assert.strictEqual(Object.keys(FESTIVAL_VILLAGE_GROUPS_MAP).length, 4);
});

test("Part 1 — RBAC & RLS Testing: Admin Kelompok, Admin Desa, Admin Daerah & Superadmin", () => {
  resetFestivalStoreToSeed();

  // 1. Admin Kelompok Karas hanya bisa mengakses Kelompok Karas
  const adminKaras = resolveCanonicalFestivalActor("adminkaras1");
  assert.strictEqual(getScopedContingents(adminKaras).length, 1);
  assert.throws(() => {
    getScopedContingents(adminKaras, undefined, undefined, "Kelompok Soco");
  }, /DENY/);

  // 2. Admin Desa Selatan hanya bisa mengakses 7 kelompok di Desa Selatan
  const adminDesaSelatan = resolveCanonicalFestivalActor("desaselatan1");
  assert.strictEqual(getScopedContingents(adminDesaSelatan).length, 7);
  assert.throws(() => {
    getScopedContingents(adminDesaSelatan, undefined, "Desa Utara");
  }, /DENY/);

  // 3. Admin Daerah Magetan Timur tidak bisa mengakses Daerah lain
  const adminDaerah = resolveCanonicalFestivalActor("daerah1");
  assert.strictEqual(getScopedContingents(adminDaerah).length, 30);
  assert.throws(() => {
    getScopedContingents(adminDaerah, "Daerah Magetan Barat");
  }, /DENY/);

  // 4. Superadmin akses penuh
  const superadmin = resolveCanonicalFestivalActor("superadminaldi");
  assert.strictEqual(
    canAccessFestivalOrg(superadmin, "Daerah Magetan Barat", "Desa Barat", "Kelompok Barat 1")
      .allowed,
    true
  );
  assert.strictEqual(ALL_FESTIVAL_ROLES.length, 15);
  for (const r of ALL_FESTIVAL_ROLES) {
    assert.ok(getAccessibleFestivalPages(r).includes("dashboard"));
  }
});

test("Acceptance Test 1, 2 & 3 — Pendaftaran Individu, Tim Beregu (2-3 Peserta), Duplikasi Ditolak & Siklus Status", () => {
  resetFestivalStoreToSeed();
  const superadmin = resolveCanonicalFestivalActor("superadminaldi");

  // AT-1: Pendaftaran individu berhasil + validasi jenjang pendidikan + nomor peserta otomatis
  const regIndividu = createCompetitionRegistration(superadmin, {
    competitionId: "fg-comp-tilawati-sd13",
    participantId: "fg-part-02", // Siti Rahmawati (SD 1-3)
    teamId: null,
    initialStatus: "DRAFT",
  });
  assert.strictEqual(regIndividu.participantId, "fg-part-02");
  assert.strictEqual(regIndividu.teamId, null);
  assert.strictEqual(regIndividu.status, "DRAFT");
  assert.ok(regIndividu.displayNumber?.startsWith("TLW-SD13-"));

  // Validasi jenjang gagal jika peserta PAUD/TK didaftarkan ke lomba SD 4-6
  assert.throws(() => {
    createCompetitionRegistration(superadmin, {
      competitionId: "fg-comp-quran-sd46",
      participantId: "fg-part-03", // PAUD/TK
      teamId: null,
    });
  }, /Validasi Jenjang Pendidikan Gagal/);

  // AT-3: Duplikasi peserta pada kategori yang sama ditolak
  assert.throws(() => {
    createCompetitionRegistration(superadmin, {
      competitionId: "fg-comp-tilawati-sd13",
      participantId: "fg-part-02",
      teamId: null,
    });
  }, /Duplikasi Pendaftaran Ditolak/);

  // Siklus Status: DRAFT -> SUBMITTED -> VERIFIED -> REJECTED -> WITHDRAWN
  updateRegistrationStatus(superadmin, { registrationId: regIndividu.id, newStatus: "SUBMITTED" });
  assert.strictEqual(
    getFestivalStore().registrations.find((r) => r.id === regIndividu.id)?.status,
    "SUBMITTED"
  );
  updateRegistrationStatus(superadmin, { registrationId: regIndividu.id, newStatus: "VERIFIED" });
  assert.strictEqual(
    getFestivalStore().registrations.find((r) => r.id === regIndividu.id)?.status,
    "VERIFIED"
  );
  updateRegistrationStatus(superadmin, {
    registrationId: regIndividu.id,
    newStatus: "REJECTED",
    rejectionReason: "Dokumen belum lengkap",
  });
  assert.strictEqual(
    getFestivalStore().registrations.find((r) => r.id === regIndividu.id)?.status,
    "REJECTED"
  );
  updateRegistrationStatus(superadmin, { registrationId: regIndividu.id, newStatus: "WITHDRAWN" });
  assert.strictEqual(
    getFestivalStore().registrations.find((r) => r.id === regIndividu.id)?.status,
    "WITHDRAWN"
  );

  // AT-2: Pendaftaran tim beregu (2-3 peserta) berhasil & < 2 peserta ditolak
  assert.throws(() => {
    registerTeamForCompetition(superadmin, {
      competitionId: "fg-comp-cca-sd",
      teamName: "Regu Kurang Anggota",
      memberParticipantIds: ["fg-part-01"], // Hanya 1 peserta -> harus ditolak
    });
  }, /Validasi Tim Beregu Gagal/);

  const validTeam = registerTeamForCompetition(superadmin, {
    competitionId: "fg-comp-cca-sd",
    teamName: "Regu CCA Al-Mubarok",
    memberParticipantIds: ["fg-part-01", "fg-part-04", "fg-part-06"], // 3 peserta SD
  });
  assert.strictEqual(validTeam.memberCount, 3);

  const regTeam = createCompetitionRegistration(superadmin, {
    competitionId: "fg-comp-cca-sd",
    participantId: null,
    teamId: validTeam.id,
  });
  assert.strictEqual(regTeam.teamId, validTeam.id);
  assert.strictEqual(regTeam.participantId, null);
});

test("Acceptance Test 4, 5 & 6 — Penugasan 3 Juri, Penggantian Juri Ber-Audit, Pembatasan Kategori & Isolasi Nilai Juri", () => {
  resetFestivalStoreToSeed();
  const ketuaJuri = resolveCanonicalFestivalActor("ketuajuri1");
  const juri1 = resolveCanonicalFestivalActor("juri1");
  const juri2 = resolveCanonicalFestivalActor("juri2");
  const juri3 = resolveCanonicalFestivalActor("juri3");
  const juri4 = resolveCanonicalFestivalActor("juri4");

  // AT-4: Penggantian juri pada kategori fg-comp-tahfidz-sd posisi #3 ke juri4 tercatat di audit log
  const updatedAssignment = replaceAssignedJudgeWithAudit(ketuaJuri, {
    competitionId: "fg-comp-tahfidz-sd",
    judgePosition: 3,
    newJudgeId: "jdg-04",
    reason: "Juri 3 bertugas di ruang kaligrafi",
  });
  assert.strictEqual(updatedAssignment.judgeId, "jdg-04");

  const store = getFestivalStore();
  assert.ok(
    store.auditLogs.some(
      (l) => l.actionCategory === "ROLE_ASSIGNMENT" && l.description.includes("jdg-04")
    ),
    "Penggantian juri wajib tercatat di fg_audit_logs"
  );

  // AT-5: Juri 3 yang sudah digantikan tidak dapat lagi menilai fg-comp-tahfidz-sd
  assert.strictEqual(
    canJudgeAccessCompetition(juri3, "fg-comp-tahfidz-sd", store.judgeAssignments, store.judges),
    false
  );
  assert.throws(() => {
    submitJudgeScore(juri3, {
      registrationId: "fg-reg-01",
      stageId: "stg-penyisihan",
      judgePosition: 3,
      rawScore: 90,
    });
  }, /DENY: Juri 'juri3' tidak ditugaskan/);

  // Sedangkan juri4 (pengganti) kini dapat menilai fg-comp-tahfidz-sd
  assert.strictEqual(
    canJudgeAccessCompetition(juri4, "fg-comp-tahfidz-sd", store.judgeAssignments, store.judges),
    true
  );

  // AT-6: Juri tidak dapat melihat nilai juri lain sebelum ke-3 juri menyelesaikan penilaian
  // Pada fg-reg-04 (Mewarnai Kaligrafi), baru Juri 1 yang memasukkan nilai:
  submitJudgeScore(juri1, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 1,
    criteriaScores: { WARNA: 90, KERAPIAN: 88, SELESAI: 92 },
    status: "SUBMITTED",
  });

  // Juri 1 dapat melihat nilainya sendiri (1 submission)
  assert.strictEqual(getScopedSubmissionsForActor(juri1, "fg-reg-04").length, 1);
  // Juri 2 TIDAK BISA melihat nilai Juri 1 karena belum seluruh 3 juri selesai menilai
  assert.strictEqual(
    getScopedSubmissionsForActor(juri2, "fg-reg-04").length,
    0,
    "Nilai Juri 1 harus disembunyikan dari Juri 2 sebelum ke-3 juri selesai"
  );

  // Setelah Juri 2 dan Juri 3 juga submit, barulah seluruh 3 nilai dapat dilihat
  submitJudgeScore(juri2, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 2,
    criteriaScores: { WARNA: 92, KERAPIAN: 90, SELESAI: 90 },
    status: "SUBMITTED",
  });
  submitJudgeScore(juri3, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 3,
    criteriaScores: { WARNA: 94, KERAPIAN: 92, SELESAI: 90 },
    status: "SUBMITTED",
  });
  assert.strictEqual(
    getScopedSubmissionsForActor(juri2, "fg-reg-04").length,
    3,
    "Setelah ke-3 juri submit, ke-3 nilai dapat dilihat"
  );
});

test("Acceptance Test 7, 8, 9 & 10 — Validasi Kriteria Lengkap, Rumus (J1+J2+J3)/3, Kunci Finalisasi & Revisi Resmi", () => {
  resetFestivalStoreToSeed();
  const juri1 = resolveCanonicalFestivalActor("juri1");
  const juri2 = resolveCanonicalFestivalActor("juri2");
  const juri3 = resolveCanonicalFestivalActor("juri3");
  const ketuaJuri = resolveCanonicalFestivalActor("ketuajuri1");

  // AT-7: Penilaian belum lengkap tidak dapat disubmit (SELESAI belum diisi pada Mewarnai Kaligrafi)
  assert.throws(() => {
    submitJudgeScore(juri1, {
      registrationId: "fg-reg-04",
      stageId: "stg-penyisihan",
      judgePosition: 1,
      criteriaScores: { WARNA: 90, KERAPIAN: 85 }, // SELESAI kosong!
      status: "SUBMITTED",
    });
  }, /Validasi Penilaian Gagal: Kriteria 'Keterselesaian' \(SELESAI\) belum diisi/);

  // Draft diizinkan meskipun belum lengkap
  const draftRes = submitJudgeScore(juri1, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 1,
    criteriaScores: { WARNA: 90, KERAPIAN: 85 },
    status: "DRAFT",
  });
  assert.strictEqual(draftRes.submission.submissionStatus, "DRAFT");

  // AT-8: Perhitungan nilai 3 juri akurat dengan rumus Nilai Akhir = (J1 + J2 + J3) / 3
  // Kriteria Mewarnai: WARNA (40%), KERAPIAN (30%), SELESAI (30%)
  // J1: 90*0.4 + 80*0.3 + 90*0.3 = 36 + 24 + 27 = 87.00
  submitJudgeScore(juri1, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 1,
    criteriaScores: { WARNA: 90, KERAPIAN: 80, SELESAI: 90 },
    status: "FINALIZED",
  });
  // J2: 90*0.4 + 90*0.3 + 90*0.3 = 90.00
  submitJudgeScore(juri2, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 2,
    criteriaScores: { WARNA: 90, KERAPIAN: 90, SELESAI: 90 },
    status: "FINALIZED",
  });
  // J3: 95*0.4 + 90*0.3 + 90*0.3 = 38 + 27 + 27 = 92.00
  const final3 = submitJudgeScore(juri3, {
    registrationId: "fg-reg-04",
    stageId: "stg-penyisihan",
    judgePosition: 3,
    criteriaScores: { WARNA: 95, KERAPIAN: 90, SELESAI: 90 },
    status: "FINALIZED",
  });

  // Nilai Akhir = (87 + 90 + 92) / 3 = 269 / 3 = 89.6667
  assert.strictEqual(final3.aggregatedResult.judge1Score, 87.0);
  assert.strictEqual(final3.aggregatedResult.judge2Score, 90.0);
  assert.strictEqual(final3.aggregatedResult.judge3Score, 92.0);
  assert.strictEqual(final3.aggregatedResult.finalScore, toDecimal4(269 / 3));
  assert.strictEqual(final3.aggregatedResult.isLocked, true);

  // AT-9: Nilai yang sudah difinalisasi TERKUNCI dan menolak perubahan langsung
  assert.throws(() => {
    submitJudgeScore(juri1, {
      registrationId: "fg-reg-04",
      stageId: "stg-penyisihan",
      judgePosition: 1,
      criteriaScores: { WARNA: 100, KERAPIAN: 100, SELESAI: 100 },
      status: "SUBMITTED",
    });
  }, /LOCKED: Nilai Juri 1 untuk registrasi 'REG-2026-MWR-001' sudah dikunci/);

  // AT-10: Revisi resmi nilai terkunci oleh Ketua Dewan Juri berhasil & tercatat di audit log
  const revOut = reviseLockedSubmissionScore(ketuaJuri, {
    submissionId: draftRes.submission.id,
    newRawScore: 93.0,
    reason: "Koreksi berita acara penilaian warna oleh Ketua Dewan Juri",
  });
  assert.strictEqual(revOut.revision.previousScore, 87.0);
  assert.strictEqual(revOut.revision.newScore, 93.0);
  // Nilai Akhir baru = (93 + 90 + 92) / 3 = 275 / 3 = 91.6667
  assert.strictEqual(revOut.result.finalScore, toDecimal4(275 / 3));
  assert.strictEqual(getFestivalStore().scoringRevisions.length, 1);
});

test("Acceptance Test 11 — Tie-Breaker Engine Konsisten Berdasarkan Prioritas Kriteria & Musyawarah (Tanpa Acak)", () => {
  resetFestivalStoreToSeed();
  const ketuaJuri = resolveCanonicalFestivalActor("ketuajuri1");

  // Pada Tahfidz SD (fg-comp-tahfidz-sd), prioritas tie-breaker adalah: 1. HAFALAN (40%), 2. TAJWID (30%), 3. MAKHRAJ (30%).
  // Kita buat Peserta 1 (fg-reg-01) dan Peserta 2 (fg-reg-02) memiliki Nilai Akhir identik = 90.00,
  // tetapi Peserta 2 memiliki nilai HAFALAN lebih tinggi (95 vs 85).
  const store = getFestivalStore();
  for (const s of store.scoringSubmissions) {
    if (s.competitionId === "fg-comp-tahfidz-sd") {
      s.submissionStatus = "SUBMITTED"; // Buka kunci sementara untuk skenario uji tie-breaker
    }
  }
  saveFestivalStore(store);

  for (const pos of [1, 2, 3] as const) {
    // Peserta 1: HAFALAN=85 (40% -> 34), TAJWID=95 (30% -> 28.5), MAKHRAJ=91.6667 (30% -> 27.5) => Total = 90.00
    submitJudgeScore(ketuaJuri, {
      registrationId: "fg-reg-01",
      stageId: "stg-penyisihan",
      judgePosition: pos,
      criteriaScores: { HAFALAN: 85, TAJWID: 95, MAKHRAJ: 91.6667 },
      status: "SUBMITTED",
    });
    // Peserta 2: HAFALAN=95 (40% -> 38), TAJWID=85 (30% -> 25.5), MAKHRAJ=88.3333 (30% -> 26.5) => Total = 90.00
    submitJudgeScore(ketuaJuri, {
      registrationId: "fg-reg-02",
      stageId: "stg-penyisihan",
      judgePosition: pos,
      criteriaScores: { HAFALAN: 95, TAJWID: 85, MAKHRAJ: 88.3333 },
      status: "SUBMITTED",
    });
  }

  const resultsAfterTie = getFestivalStore().scoringResults.filter(
    (r) => r.competitionId === "fg-comp-tahfidz-sd"
  );
  const r1 = resultsAfterTie.find((r) => r.registrationId === "fg-reg-01")!;
  const r2 = resultsAfterTie.find((r) => r.registrationId === "fg-reg-02")!;

  assert.strictEqual(toDecimal2(r1.finalScore), 90.0);
  assert.strictEqual(toDecimal2(r2.finalScore), 90.0);
  // Peserta 2 wajib peringkat #1 karena kriteria utama HAFALAN (95) > Peserta 1 (85)
  assert.strictEqual(r2.rankNumber, 1, "Peserta dengan nilai kriteria utama HAFALAN lebih tinggi wajib Rank #1");
  assert.strictEqual(r1.rankNumber, 2);

  // Uji juga musyawarah manual Ketua Dewan Juri jika seluruh kriteria sama persis
  resolveManualTieBreakDeliberation(ketuaJuri, {
    competitionId: "fg-comp-tahfidz-sd",
    stageId: "stg-penyisihan",
    winnerRegistrationId: "fg-reg-01",
    deliberationNote: "Hasil musyawarah Dewan Juri berdasarkan kefasihan waqaf",
  });
  const r1AfterDelib = getFestivalStore().scoringResults.find((r) => r.registrationId === "fg-reg-01")!;
  assert.ok(r1AfterDelib.tieBreakDeliberationNote?.includes("musyawarah Dewan Juri"));
});

test("Acceptance Test 12, 13 & 14 — Cerdas Cermat (Giliran & Buzzer Lock), Penilaian Karya Fisik F4 & Antrean/Timer/Konflik Arena", () => {
  resetFestivalStoreToSeed();
  const operatorCC = resolveCanonicalFestivalActor("operatorcc1");
  const operatorArena = resolveCanonicalFestivalActor("operatorarena1");
  const juri3 = resolveCanonicalFestivalActor("juri3");
  const ketuaPanitia = resolveCanonicalFestivalActor("ketuapanitia1");

  // AT-12: Cerdas Cermat Buzzer Lock, Giliran, Rebutan, & Score Event Log (Before/After)
  const matchLocked = pressQuizBuzzer(operatorCC, {
    matchId: "qm-01",
    teamId: "fg-team-02",
  });
  assert.strictEqual(matchLocked.buzzerLockedByTeamId, "fg-team-02");

  // Regu lain tidak bisa merebut buzzer ketika sudah dikunci oleh fg-team-02
  assert.throws(() => {
    pressQuizBuzzer(operatorCC, { matchId: "qm-01", teamId: "fg-team-03" });
  }, /BUZZER TERKUNCI/);

  // Catat jawaban benar Rebutan (+100) untuk fg-team-02
  const lb2 = recordQuizMatchScoreEvent(operatorCC, {
    matchId: "qm-01",
    teamId: "fg-team-02",
    roundType: "REBUTAN",
    isCorrect: true,
    questionId: "Q-REB-05",
    reason: "Jawaban tepat babak rebutan",
  });
  assert.strictEqual(lb2.totalScore, 1250); // 1150 -> 1250

  // Pastikan log perubahan skor mencatat questionId, teamId, operator, scoreBefore, scoreAfter, reason, dan waktu
  const latestQuizLog = getFestivalStore().quizScoreEvents[0];
  assert.strictEqual(latestQuizLog.questionId, "Q-REB-05");
  assert.strictEqual(latestQuizLog.teamId, "fg-team-02");
  assert.strictEqual(latestQuizLog.scoreBefore, 1150);
  assert.strictEqual(latestQuizLog.scoreAfter, 1250);
  assert.strictEqual(latestQuizLog.operatorUsername, "operatorcc1");

  // Reset buzzer & atur giliran berikutnya
  const matchReset = resetQuizBuzzerAndSetTurn(operatorCC, {
    matchId: "qm-01",
    roundType: "GILIRAN",
    activeTurnTeamId: "fg-team-03",
  });
  assert.strictEqual(matchReset.buzzerLockedByTeamId, null);
  assert.strictEqual(matchReset.activeTurnTeamId, "fg-team-03");

  // AT-13: Penilaian karya fisik Kaligrafi & Mewarnai (Kertas F4 + Foto Karya + Nilai & Catatan Juri)
  const artwork = registerArtworkForEntry(operatorArena, {
    registrationId: "fg-reg-06", // Menggambar Kaligrafi SD 4-6
    titleOrTheme: "Bismillahi Rohman Nirohim",
    photoUrl: "https://example.com/kaligrafi-f4-001.jpg",
    physicalStorageLocation: "Rak Karya Pendopo B-02",
    notes: "Kertas F4 panitia, tanpa latar belakang berwarna",
  });
  assert.strictEqual(artwork.paperSize, "F4");

  const scoredArtwork = submitJudgeScore(juri3, {
    registrationId: "fg-reg-06",
    stageId: "stg-penyisihan",
    judgePosition: 3,
    criteriaScores: { KREATIVITAS: 95, KERAPIAN: 92, TULISAN: 96 },
    artworkId: artwork.id,
    judgeNotes: "Khat sangat proporsional sesuai kaidah",
    status: "SUBMITTED",
  });
  assert.strictEqual(scoredArtwork.submission.artworkId, artwork.id);
  // 95*0.4 + 92*0.25 + 96*0.35 = 38 + 23 + 33.6 = 94.60
  assert.strictEqual(scoredArtwork.submission.finalJudgeScore, 94.6);

  // AT-14: Antrean panggilan arena, timer lomba (overtime tidak mendiskualifikasi otomatis), & deteksi konflik jadwal
  const queueOvertime = updateArenaParticipantQueue(operatorArena, {
    registrationId: "fg-reg-04", // Mewarnai 90 menit (5400 detik)
    callStatus: "PERFORMING",
    elapsedSeconds: 5500, // Melewati 5400 detik
  });
  assert.strictEqual(queueOvertime.isOvertime, true);
  const reg04 = getFestivalStore().registrations.find((r) => r.id === "fg-reg-04")!;
  assert.notStrictEqual(
    reg04.status,
    "DISQUALIFIED",
    "Overtime timer tidak boleh mendiskualifikasi peserta secara otomatis"
  );

  const conflicts = detectScheduleConflicts();
  assert.ok(Array.isArray(conflicts));
  assert.ok(conflicts.length > 0, "Detektor konflik jadwal harus mendeteksi irisan jadwal arena/juri");

  // Uji persetujuan konfigurasi peraturan ASAD oleh Ketua Panitia
  const updatedAsad = updateCompetitionCategoryConfig(ketuaPanitia, {
    competitionId: "fg-comp-asad-sd",
    rulesConfirmedByCommittee: true,
  });
  assert.strictEqual(updatedAsad.rulesConfirmedByCommittee, true);

  // Uji klasemen juara umum tetap akurat
  const standings = calculateChampionshipStandings();
  assert.strictEqual(standings.villageStandings.length, 4);
  assert.strictEqual(standings.groupStandings.length, 30);
});

test("Part 3 Section 7 & 8 — Dashboard Final (11 Indikator), Audit & Integritas Data, Anti-Hitung Ganda Poin Juara Umum & Unduh Laporan", () => {
  resetFestivalStoreToSeed();
  const ketuaPanitia = resolveCanonicalFestivalActor("ketuapanitia1");

  // 1. Verifikasi file SQL Migration Part 3 tersedia & bebas perintah destruktif
  const part3Path = path.resolve(
    process.cwd(),
    "supabase/migrations/20261106_festival_generus_part3_finalization.sql"
  );
  assert.ok(fs.existsSync(part3Path), "File migration SQL Part 3 harus tersedia");
  const sql3 = fs.readFileSync(part3Path, "utf-8");
  assert.ok(sql3.includes("trg_fg_prevent_duplicate_qr_checkin"));
  assert.ok(sql3.includes("uq_fg_championship_points_comp_reg"));
  assert.ok(sql3.includes("trg_fg_lock_approved_scoring_submissions"));
  assert.ok(sql3.includes("trg_fg_guard_certificate_requires_approval"));

  // 2. Uji 11 Indikator Dashboard Final (Section 7)
  const metrics = getFinalDashboardMetrics();
  assert.strictEqual(metrics.totalCategories, 17, "Total kategori wajib 17");
  assert.strictEqual(metrics.arenaStatuses.length, 12, "Total arena pada Dashboard Final wajib 12 arena");
  assert.strictEqual(metrics.totalJudgeAssignments, 51, "Total penugasan juri wajib 51 (17 x 3)");
  assert.ok(metrics.totalParticipants >= 8);
  assert.ok(metrics.totalTeams >= 3);
  assert.ok(metrics.currentlyCompetingEntries.length >= 1);
  assert.ok(metrics.scoringProgressPercent > 0);
  assert.strictEqual(metrics.villageStandings.length, 4);
  assert.strictEqual(metrics.groupStandings.length, 30);

  // 3. Uji Anti-Hitung Ganda Poin Juara Umum (Section 8)
  const store = getFestivalStore();
  // Sengaja suntikkan baris duplikat ke competitionResults untuk menguji deduplikasi
  store.competitionResults.push({ ...store.competitionResults[0], id: "fcr-dup-test" });
  saveFestivalStore(store);

  const standingsDedup = calculateChampionshipStandings();
  const karasStanding = standingsDedup.groupStandings.find((g) => g.groupName === "Kelompok Karas")!;
  assert.strictEqual(
    karasStanding.totalPoints,
    5.0,
    "Poin Juara 1 Kelompok Karas (5.0) TIDAK BOLEH terhitung dua kali (bukan 10.0) meskipun ada duplikasi baris"
  );
  assert.strictEqual(karasStanding.goldCount, 1);

  // Bersihkan melalui pengesahan resmi yang idempoten
  approveAndRatifyCompetitionResults(ketuaPanitia, {
    competitionId: "fg-comp-tahfidz-sd",
    approvalNotes: "Pengesahan resmi hasil Tahfidz SD tanpa duplikasi",
  });

  const integrity = verifyFestivalDataIntegrity();
  assert.strictEqual(integrity.valid, true, `Integritas data wajib valid: ${integrity.issues.join(", ")}`);
  assert.strictEqual(integrity.zeroDoubleChampionshipPoints, true);
  assert.strictEqual(integrity.zeroDuplicateResults, true);
  assert.strictEqual(integrity.finalResultsMatchSource, true);
  assert.strictEqual(integrity.zeroCrossOrgLeakage, true);
  assert.strictEqual(integrity.allTimestampsIsoValid, true);

  // 4. Uji Unduh 4 Jenis Laporan Resmi (Section 12)
  for (const rType of ["REKAP_NILAI", "JUARA_UMUM", "PRESENSI_QR", "AUDIT_LOG"] as const) {
    const rep = exportFestivalReportData(ketuaPanitia, rType);
    assert.ok(rep.csvContent.length > 20, `Laporan ${rType} wajib menghasilkan konten CSV`);
    assert.ok(rep.rows.length > 0, `Laporan ${rType} wajib memiliki baris data`);
  }
});

test("Part 3 Section 9 — 10 Pengujian Keamanan (QR Anti-Ganda, Kunci Hasil Disahkan, Guard Sertifikat) & Regression Testing Aplikasi Utama", () => {
  resetFestivalStoreToSeed();
  const superAdmin = resolveCanonicalFestivalActor("superadminaldi");
  const adminDaerah = resolveCanonicalFestivalActor("daerah1");
  const adminDesaSelatan = resolveCanonicalFestivalActor("desaselatan1");
  const adminKaras = resolveCanonicalFestivalActor("adminkaras1");
  const juri1 = resolveCanonicalFestivalActor("juri1");
  const operatorArena = resolveCanonicalFestivalActor("operatorarena1");
  const petugasCheckin = resolveCanonicalFestivalActor("petugascheckin1");
  const ketuaPanitia = resolveCanonicalFestivalActor("ketuapanitia1");
  const viewer = resolveCanonicalFestivalActor("viewer1");

  // Security 1, 2, 3, 6: Hierarki Kelompok, Desa, Daerah, Superadmin
  assert.strictEqual(getScopedContingents(adminKaras).length, 1);
  assert.strictEqual(getScopedContingents(adminDesaSelatan).length, 7);
  assert.strictEqual(getScopedContingents(adminDaerah).length, 30);
  assert.strictEqual(getScopedContingents(superAdmin).length, 30);

  // Security 4 & 5: Juri & Operator hanya mengakses penugasan/fungsi operasionalnya
  assert.throws(() => {
    updateArenaParticipantQueue(juri1, { registrationId: "fg-reg-01", callStatus: "CALLED" });
  }, /DENY/);

  // Security 7: Pengguna tanpa izin (Viewer / Admin Kelompok) tidak dapat mengubah nilai
  assert.throws(() => {
    submitJudgeScore(viewer, {
      registrationId: "fg-reg-04",
      stageId: "stg-penyisihan",
      judgePosition: 1,
      rawScore: 90,
    });
  }, /DENY/);

  // Security 9: QR Code TIDAK DAPAT digunakan untuk check-in ganda
  const firstCheckin = performQrCheckin(petugasCheckin, {
    qrTokenOrCode: "REG-2026-MWR-001", // fg-reg-04 belum ada di INITIAL_FG_CHECKINS
    arenaId: "arn-04",
  });
  assert.strictEqual(firstCheckin.checkinStatus, "PRESENT");

  assert.throws(
    () => {
      performQrCheckin(petugasCheckin, {
        qrTokenOrCode: "REG-2026-MWR-001",
        arenaId: "arn-04",
      });
    },
    /QR CHECK-IN DITOLAK/,
    "Percobaan check-in kedua dengan QR Code yang sama wajib ditolak!"
  );

  // Security 10: Sertifikat TIDAK DAPAT diterbitkan dari hasil yang belum disahkan
  assert.throws(
    () => {
      issueCompetitionCertificate(ketuaPanitia, {
        registrationId: "fg-reg-04", // Kategori Mewarnai PAUD belum disahkan di fg_approvals
        recipientRole: "JUARA",
      });
    },
    /PENERBITAN SERTIFIKAT DITOLAK/,
    "Sertifikat tidak boleh diterbitkan dari hasil yang belum disahkan!"
  );

  // Security 8: Hasil yang sudah disahkan TIDAK DAPAT diubah sembarangan
  const apv = approveAndRatifyCompetitionResults(ketuaPanitia, {
    competitionId: "fg-comp-tahfidz-sd",
    approvalNotes: "Pengesahan Final Berita Acara Tahfidz SD",
  });
  assert.strictEqual(apv.approval.approvalStatus, "APPROVED");

  // Setelah disahkan, baik submitJudgeScore maupun reviseLockedSubmissionScore wajib ditolak!
  assert.throws(
    () => {
      reviseLockedSubmissionScore(ketuaPanitia, {
        submissionId: "sub-01-j1",
        newRawScore: 99,
        reason: "Coba ubah nilai setelah hasil disahkan",
      });
    },
    /HASIL SUDAH DISAHKAN/,
    "Hasil yang sudah disahkan tidak dapat diubah sembarangan!"
  );

  // Setelah kategori Tahfidz SD disahkan, penerbitan sertifikat untuk Juara 2 (fg-reg-02) BERHASIL
  const certJuara2 = issueCompetitionCertificate(ketuaPanitia, {
    registrationId: "fg-reg-02",
    recipientRole: "JUARA",
  });
  assert.strictEqual(certJuara2.predicateLabel, "Juara 2");
  assert.ok(certJuara2.certificateNumber.startsWith("SERT/FG-MAGTIM/2026/"));

  // Hanya Superadmin atau Ketua Panitia yang dapat mencabut pengesahan dengan alasan wajib
  assert.throws(() => {
    revokeCompetitionApprovalWithAudit(operatorArena, {
      competitionId: "fg-comp-tahfidz-sd",
      reason: "Operator coba buka kunci",
    });
  }, /DENY/);

  // Regression Testing Aplikasi Utama (Autentikasi, Kelompok, Generus)
  assert.strictEqual(getKelompok().length, 30, "Regression: 30 Kelompok utama tetap utuh");
  assert.ok(getGenerus().length >= 5, "Regression: Data santri/generus aplikasi utama tetap utuh");
  assert.strictEqual(verifyCredentials("superadminaldi", "admin123")?.success, true);
  assert.strictEqual(verifyCredentials("adminfestival1", "admin123")?.role, "Admin Festival");
  assert.strictEqual(verifyCredentials("juri1", "admin123")?.role, "Juri");
});

test("Part 3 Section 10 — Performance & Load Testing: 500 Peserta, 17 Kategori, 3 Juri/Kategori, 12 Arena & 100 Pengguna Bersamaan", async () => {
  resetFestivalStoreToSeed();
  const store = getFestivalStore();
  const superAdmin = resolveCanonicalFestivalActor("superadminaldi");

  // 1. Verifikasi 17 kategori, 3 juri/kategori (51 penugasan), dan 12 arena
  assert.strictEqual(store.competitions.length, 17);
  assert.strictEqual(store.judgeAssignments.length, 51);
  assert.strictEqual(store.arenas.length, 12);

  // 2. Bangkitkan hingga tepat 500 Peserta & 500 Registrasi tersebar di 17 kategori dan 30 kelompok
  const existingPartCount = store.participants.length;
  const individualComps = store.competitions.filter((c) => c.competitionType === "INDIVIDUAL");

  for (let i = existingPartCount + 1; i <= 500; i++) {
    const contingent = store.contingents[(i - 1) % store.contingents.length];
    const comp = individualComps[(i - 1) % individualComps.length];
    const partId = `fg-part-load-${i}`;
    const regId = `fg-reg-load-${i}`;

    store.participants.push({
      id: partId,
      eventId: "fg-evt-2026",
      contingentId: contingent.id,
      generusId: `gen-load-${i}`,
      snapshotFullName: `Santri Peserta LoadTest #${i}`,
      snapshotNis: `NIS-LT-${String(i).padStart(4, "0")}`,
      snapshotGender: i % 2 === 0 ? "Perempuan" : "Laki-laki",
      snapshotBirthDate: "2015-05-10",
      snapshotAge: 11,
      snapshotEducationLevel: comp.educationLevel,
      snapshotCategory: "Caberawit",
      snapshotParentName: `Wali Santri #${i}`,
      snapshotParentWhatsapp: "081234567890",
      snapshotGroupId: contingent.groupId,
      snapshotGroupName: contingent.groupName,
      snapshotVillageName: contingent.villageName,
      snapshotRegionName: contingent.regionName,
      eligibilityStatus: "VERIFIED",
      createdBy: "loadtest",
      createdAt: "2026-11-05T00:00:00Z",
    });

    store.registrations.push({
      id: regId,
      eventId: "fg-evt-2026",
      competitionId: comp.id,
      contingentId: contingent.id,
      participantId: partId,
      teamId: null,
      registrationCode: `REG-LT-${String(i).padStart(4, "0")}`,
      regionName: contingent.regionName,
      villageName: contingent.villageName,
      groupName: contingent.groupName,
      status: "VERIFIED",
      displayNumber: `${comp.code}-${String(i).padStart(3, "0")}`,
      turnOrder: i,
      checkinStatus: "PRESENT",
      createdBy: "loadtest",
      createdAt: "2026-11-05T00:00:00Z",
      updatedAt: "2026-11-05T00:00:00Z",
    });
  }
  saveFestivalStore(store);

  assert.strictEqual(getFestivalStore().participants.length, 500, "Skenario load test wajib memiliki 500 peserta");

  // 3. Simulasi 100 Pengguna Bersamaan (Promise.all 100 Concurrent Operations):
  //    - 30 operasi penyimpanan nilai & autosave oleh 3 juri
  //    - 30 operasi pemuatan Dashboard Final & Leaderboard
  //    - 40 operasi query RLS oleh Admin Kelompok, Admin Desa, dan Admin Daerah
  const juri1 = resolveCanonicalFestivalActor("juri1");
  const juri2 = resolveCanonicalFestivalActor("juri2");
  const juri3 = resolveCanonicalFestivalActor("juri3");
  const adminDesa = resolveCanonicalFestivalActor("desaselatan1");
  const adminKelompok = resolveCanonicalFestivalActor("adminkaras1");

  const startMs = performance.now();

  const concurrentTasks = Array.from({ length: 100 }, (_, idx) =>
    Promise.resolve().then(() => {
      if (idx < 30) {
        // 30 operasi penyimpanan nilai & autosave pada 10 peserta load test (masing-masing 3 juri)
        const targetIndex = 20 + Math.floor(idx / 3);
        const judgePos = ((idx % 3) + 1) as 1 | 2 | 3;
        const actor = judgePos === 1 ? juri1 : judgePos === 2 ? juri2 : juri3;
        const statusMode = idx % 2 === 0 ? "DRAFT" : "SUBMITTED";
        const scoreVal = 80 + (idx % 18);
        return submitJudgeScore(actor, {
          registrationId: `fg-reg-load-${targetIndex}`,
          stageId: "stg-penyisihan",
          judgePosition: judgePos,
          rawScore: scoreVal,
          status: statusMode,
        });
      } else if (idx < 60) {
        // 30 operasi pemuatan Dashboard Final & perhitungan klasemen
        return getFinalDashboardMetrics();
      } else {
        // 40 operasi RLS query lintas peran
        const actor = idx % 2 === 0 ? adminDesa : adminKelompok;
        return getScopedRegistrations(actor);
      }
    })
  );

  const results = await Promise.all(concurrentTasks);
  const elapsedMs = performance.now() - startMs;

  assert.strictEqual(results.length, 100, "Seluruh 100 operasi pengguna bersamaan wajib berhasil tanpa kehilangan input");
  assert.ok(elapsedMs < 5000, `Waktu eksekusi 100 operasi bersamaan pada 500 peserta harus responsif (<5000ms, aktual: ${elapsedMs.toFixed(2)}ms)`);

  // 4. Verifikasi tidak ada duplikasi submission & konsistensi data pasca 100 operasi konkuren
  const postStore = getFestivalStore();
  const subKeySet = new Set<string>();
  for (const s of postStore.scoringSubmissions) {
    const key = `${s.registrationId}::${s.stageId}::${s.judgePosition}`;
    assert.ok(!subKeySet.has(key), `Tidak boleh ada duplikasi submission pada ${key}`);
    subKeySet.add(key);
  }

  // Kembalikan ke seed bersih setelah load test selesai
  resetFestivalStoreToSeed();
  assert.strictEqual(getFestivalStore().competitions.length, 17);
});
