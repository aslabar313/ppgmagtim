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
  calculateChampionshipStandings,
  createCompetitionRegistration,
  detectScheduleConflicts,
  enrollParticipantFromGenerus,
  getFestivalStore,
  getScopedContingents,
  getScopedParticipants,
  getScopedRegistrations,
  getScopedSubmissionsForActor,
  pressQuizBuzzer,
  recordQuizMatchScoreEvent,
  registerArtworkForEntry,
  registerTeamForCompetition,
  replaceAssignedJudgeWithAudit,
  resetFestivalStoreToSeed,
  resetQuizBuzzerAndSetTurn,
  resolveManualTieBreakDeliberation,
  reviseLockedSubmissionScore,
  saveFestivalStore,
  submitJudgeScore,
  toDecimal2,
  toDecimal4,
  updateArenaParticipantQueue,
  updateCompetitionCategoryConfig,
  updateRegistrationStatus,
} from "../src/lib/festival/festivalService";

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
