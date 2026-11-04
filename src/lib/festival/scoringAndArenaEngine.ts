// ============================================================================
// MODULE: FESTIVAL GENERUS — PART 2 (SCORING, TIE-BREAKER, QUIZ & ARENA ENGINE)
// ============================================================================

import type {
  ArenaCallStatus,
  CheckinStatus,
  FgArenaQueue,
  FgArtwork,
  FgCompetition,
  FgQuizLeaderboard,
  FgQuizMatch,
  FgQuizScoreEvent,
  FgScoringResult,
  FgScoringRevision,
  FgScoringSubmission,
  QuizRoundType,
  ScheduleConflictItem,
  ScoringSubmissionStatus,
} from "./types";
import {
  assertJudgeCompetitionAccess,
  type CanonicalFestivalActor,
  canOperatorAccessArena,
} from "./festivalAuth";
import {
  getFestivalStore,
  recordFestivalAudit,
  saveFestivalStore,
  toDecimal2,
  toDecimal4,
} from "./festivalService";

// ============================================================================
// 1. DIGITAL SCORING ENGINE & TIE-BREAKER ENGINE
// ============================================================================

const TIE_BREAKER_PRIORITY_BY_COMP: Record<string, string[]> = {
  "fg-comp-mewarnai-paud": ["WARNA", "KERAPIAN", "SELESAI"],
  "fg-comp-kaligrafi-sd13": ["KREATIVITAS", "TULISAN", "KERAPIAN"],
  "fg-comp-kaligrafi-sd46": ["KREATIVITAS", "TULISAN", "KERAPIAN"],
  "fg-comp-adzan-sd": ["MAKHRAJ", "NADA", "VOLUME"],
  "fg-comp-adzan-smp": ["MAKHRAJ", "NADA", "VOLUME"],
  "fg-comp-tilawati-sd13": ["MAKHRAJ", "NADA", "VOLUME"],
  "fg-comp-quran-sd46": ["TAJWID", "MAKHRAJ", "NADA", "VOLUME"],
  "fg-comp-nasehat-sd": ["HIKMAH", "MENTAL", "VOLUME", "PAKAIAN"],
  "fg-comp-nasehat-smp": ["HIKMAH", "MENTAL", "VOLUME", "PENAMPILAN"],
  "fg-comp-nasehat-sma": ["HIKMAH", "MENTAL", "VOLUME", "PENAMPILAN"],
  "fg-comp-tahfidz-sd": ["HAFALAN", "TAJWID", "MAKHRAJ"],
  "fg-comp-asad-sd": ["WIRAGA", "WIRAMA", "WIRASA"],
  "fg-comp-hadist-sma": ["HIKMAH", "BACAAN", "PENYAMPAIAN"],
  "fg-comp-quran-makna-smp": ["HIKMAH", "BACAAN", "PENYAMPAIAN"],
  "fg-comp-quran-makna-sma": ["HIKMAH", "BACAAN", "PENYAMPAIAN"],
};

export function recomputeCompetitionRankings(
  competitionId: string,
  stageId: string,
  storeParam?: ReturnType<typeof getFestivalStore>
): FgScoringResult[] {
  const store = storeParam || getFestivalStore();
  const criteriaList = store.criteria
    .filter((c) => c.competitionId === competitionId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const priorityCodes =
    TIE_BREAKER_PRIORITY_BY_COMP[competitionId] ||
    criteriaList
      .slice()
      .sort((a, b) => Number(b.isTieBreakerPriority) - Number(a.isTieBreakerPriority))
      .map((c) => c.code);

  const compResults = store.scoringResults.filter(
    (r) => r.competitionId === competitionId && r.stageId === stageId
  );

  // Refresh criteriaAverages for each result from its 3 judge submissions
  for (const res of compResults) {
    const subs = store.scoringSubmissions.filter(
      (s) => s.registrationId === res.registrationId && s.stageId === stageId
    );
    const avgs: Record<string, number> = {};
    for (const crit of criteriaList) {
      const vals = subs
        .map((s) => s.criteriaScores?.[crit.code])
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      avgs[crit.code] =
        vals.length > 0
          ? toDecimal4(vals.reduce((acc, v) => acc + v, 0) / vals.length)
          : 0;
    }
    res.criteriaAverages = avgs;
    if (priorityCodes.length > 0 && avgs[priorityCodes[0]] !== undefined && avgs[priorityCodes[0]] > 0) {
      res.tieBreakerScore = toDecimal2(avgs[priorityCodes[0]]);
    }
  }

  // Deterministic sort: finalScore DESC -> priority criterion 1 DESC -> priority criterion 2 DESC -> manual deliberation -> tieBreakerScore DESC
  compResults.sort((a, b) => {
    const diffFinal = toDecimal4(b.finalScore - a.finalScore);
    if (Math.abs(diffFinal) > 0.0001) return diffFinal;

    for (const code of priorityCodes) {
      const aCrit = a.criteriaAverages?.[code] ?? 0;
      const bCrit = b.criteriaAverages?.[code] ?? 0;
      const diffCrit = toDecimal4(bCrit - aCrit);
      if (Math.abs(diffCrit) > 0.0001) return diffCrit;
    }

    const diffTb = toDecimal4(b.tieBreakerScore - a.tieBreakerScore);
    if (Math.abs(diffTb) > 0.0001) return diffTb;

    return 0;
  });

  compResults.forEach((r, idx) => {
    r.rankNumber = idx + 1;
  });

  return compResults;
}

export function submitJudgeScore(
  actor: CanonicalFestivalActor,
  params: {
    registrationId: string;
    stageId: string;
    judgePosition: 1 | 2 | 3;
    rawScore?: number;
    criteriaScores?: Record<string, number>;
    penaltyDeduction?: number;
    judgeNotes?: string;
    artworkId?: string;
    status?: ScoringSubmissionStatus; // "DRAFT" | "SUBMITTED" | "FINALIZED"
  }
): { submission: FgScoringSubmission; aggregatedResult: FgScoringResult } {
  const store = getFestivalStore();
  const registration = store.registrations.find((r) => r.id === params.registrationId);
  if (!registration) {
    throw new Error(`Registrasi '${params.registrationId}' tidak ditemukan.`);
  }

  assertJudgeCompetitionAccess(
    actor,
    registration.competitionId,
    store.judgeAssignments,
    store.judges
  );

  const targetStatus: ScoringSubmissionStatus = params.status || "SUBMITTED";
  const compCriteria = store.criteria
    .filter((c) => c.competitionId === registration.competitionId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  let existingSub = store.scoringSubmissions.find(
    (s) =>
      s.registrationId === registration.id &&
      s.stageId === params.stageId &&
      s.judgePosition === params.judgePosition
  );

  // Prevent direct overwrite if already FINALIZED (must use reviseLockedSubmissionScore)
  if (existingSub && existingSub.submissionStatus === "FINALIZED") {
    throw new Error(
      `LOCKED: Nilai Juri ${params.judgePosition} untuk registrasi '${registration.registrationCode}' sudah dikunci (FINALIZED). Gunakan mekanisme Revisi Resmi Ketua Dewan Juri.`
    );
  }

  let computedRawScore = 0;
  let normalizedCriteriaScores: Record<string, number> | undefined = params.criteriaScores
    ? { ...params.criteriaScores }
    : existingSub?.criteriaScores;

  if (params.criteriaScores && compCriteria.length > 0) {
    // Check incomplete criteria when status is SUBMITTED or FINALIZED
    if (targetStatus === "SUBMITTED" || targetStatus === "FINALIZED") {
      for (const crit of compCriteria) {
        const val = params.criteriaScores[crit.code];
        if (val === undefined || val === null || Number.isNaN(Number(val))) {
          throw new Error(
            `Validasi Penilaian Gagal: Kriteria '${crit.name}' (${crit.code}) belum diisi. Seluruh kriteria wajib diisi sebelum submit.`
          );
        }
        if (val < 0 || val > 100) {
          throw new Error(
            `Nilai kriteria '${crit.name}' (${val}) harus berada dalam rentang 0.00 s/d 100.00.`
          );
        }
      }
    }

    let weightedSum = 0;
    let totalWeight = 0;
    for (const crit of compCriteria) {
      const val = Number(params.criteriaScores[crit.code] ?? 0);
      weightedSum += val * crit.weightPercent;
      totalWeight += crit.weightPercent;
    }
    computedRawScore = totalWeight > 0 ? toDecimal4(weightedSum / totalWeight) : 0;
  } else if (typeof params.rawScore === "number" && !Number.isNaN(params.rawScore)) {
    computedRawScore = toDecimal4(params.rawScore);
    if (!normalizedCriteriaScores && compCriteria.length > 0) {
      normalizedCriteriaScores = {};
      for (const crit of compCriteria) {
        normalizedCriteriaScores[crit.code] = toDecimal2(computedRawScore);
      }
    }
  } else {
    throw new Error("Harap masukkan nilai per kriteria atau nilai mentah juri.");
  }

  if (computedRawScore < 0 || computedRawScore > 100) {
    throw new Error("Nilai juri harus berada dalam rentang 0.00 s/d 100.00.");
  }

  const penaltyDec = toDecimal2(params.penaltyDeduction || 0);
  const finalJudgeScore = toDecimal2(Math.max(0, computedRawScore - penaltyDec));
  const judgeId = actor.judgeId || `jdg-0${params.judgePosition}`;
  const now = new Date().toISOString();
  const oldScore = existingSub ? existingSub.finalJudgeScore : undefined;

  if (existingSub) {
    existingSub.criteriaScores = normalizedCriteriaScores;
    existingSub.rawScore = toDecimal2(computedRawScore);
    existingSub.penaltyDeduction = penaltyDec;
    existingSub.finalJudgeScore = finalJudgeScore;
    existingSub.submissionStatus = targetStatus;
    existingSub.judgeNotes = params.judgeNotes ?? existingSub.judgeNotes;
    existingSub.artworkId = params.artworkId ?? existingSub.artworkId;
    existingSub.submittedAt = now;
  } else {
    existingSub = {
      id: `sub-${registration.id}-j${params.judgePosition}`,
      eventId: registration.eventId,
      competitionId: registration.competitionId,
      stageId: params.stageId,
      registrationId: registration.id,
      judgeId,
      judgePosition: params.judgePosition,
      criteriaScores: normalizedCriteriaScores,
      rawScore: toDecimal2(computedRawScore),
      penaltyDeduction: penaltyDec,
      finalJudgeScore,
      submissionStatus: targetStatus,
      judgeNotes: params.judgeNotes || "",
      artworkId: params.artworkId,
      submittedAt: now,
    };
    store.scoringSubmissions.push(existingSub);
  }

  const aggregatedResult = recalculateRegistrationScoringResult(
    registration.id,
    params.stageId,
    store
  );

  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "SCORE_CHANGE",
    entityTable: "fg_scoring_submissions",
    entityId: existingSub.id,
    actor,
    regionName: registration.regionName,
    villageName: registration.villageName,
    groupName: registration.groupName,
    oldValues: oldScore !== undefined ? { finalJudgeScore: oldScore } : undefined,
    newValues: {
      judgePosition: params.judgePosition,
      status: targetStatus,
      finalJudgeScore,
      averageJudgeScore: aggregatedResult.averageJudgeScore,
    },
    description: `Juri ${params.judgePosition} (${actor.username}) menyimpan nilai [${targetStatus}] ${finalJudgeScore.toFixed(2)} untuk ${registration.registrationCode}. Nilai Akhir Rata-Rata 3 Juri: ${aggregatedResult.finalScore.toFixed(2)}.`,
  });

  return { submission: existingSub, aggregatedResult };
}

export function recalculateRegistrationScoringResult(
  registrationId: string,
  stageId: string,
  storeParam?: ReturnType<typeof getFestivalStore>
): FgScoringResult {
  const store = storeParam || getFestivalStore();
  const registration = store.registrations.find((r) => r.id === registrationId);
  if (!registration) {
    throw new Error(`Registrasi '${registrationId}' tidak ditemukan.`);
  }
  const competition = store.competitions.find((c) => c.id === registration.competitionId);
  const participant = registration.participantId
    ? store.participants.find((p) => p.id === registration.participantId)
    : undefined;

  const allSubsForReg = store.scoringSubmissions.filter(
    (s) => s.registrationId === registration.id && s.stageId === stageId
  );
  const j1 = toDecimal2(allSubsForReg.find((s) => s.judgePosition === 1)?.finalJudgeScore || 0);
  const j2 = toDecimal2(allSubsForReg.find((s) => s.judgePosition === 2)?.finalJudgeScore || 0);
  const j3 = toDecimal2(allSubsForReg.find((s) => s.judgePosition === 3)?.finalJudgeScore || 0);
  const totalPenalty = toDecimal2(
    allSubsForReg.reduce((acc, s) => acc + s.penaltyDeduction, 0)
  );
  const totalJudgeScore = toDecimal2(j1 + j2 + j3);
  // Part 2 Formula: Nilai Akhir = (Nilai Juri 1 + Nilai Juri 2 + Nilai Juri 3) / 3
  const averageJudgeScore = toDecimal4(totalJudgeScore / 3);

  // Optional committee-approved male bonus for Nasehat SMP / SMA
  let bonusApplied = 0;
  if (
    competition?.maleBonusConfig?.enabled &&
    competition.maleBonusConfig.approvedByCommittee &&
    typeof competition.maleBonusConfig.bonusPoints === "number" &&
    participant?.snapshotGender === "Laki-laki"
  ) {
    bonusApplied = toDecimal2(competition.maleBonusConfig.bonusPoints);
  }

  const finalScore = toDecimal4(averageJudgeScore + bonusApplied);
  const allThreeFinalized =
    allSubsForReg.filter((s) => s.submissionStatus === "FINALIZED").length === 3;

  let resultRecord = store.scoringResults.find(
    (r) => r.registrationId === registration.id && r.stageId === stageId
  );

  if (resultRecord) {
    resultRecord.judge1Score = j1;
    resultRecord.judge2Score = j2;
    resultRecord.judge3Score = j3;
    resultRecord.totalJudgeScore = totalJudgeScore;
    resultRecord.averageJudgeScore = averageJudgeScore;
    resultRecord.totalPenalty = totalPenalty;
    resultRecord.bonusApplied = bonusApplied;
    resultRecord.finalScore = finalScore;
    resultRecord.tieBreakerScore = j1;
    if (allThreeFinalized) {
      resultRecord.isLocked = true;
    }
  } else {
    resultRecord = {
      id: `res-${registration.id}`,
      eventId: registration.eventId,
      competitionId: registration.competitionId,
      stageId,
      registrationId: registration.id,
      judge1Score: j1,
      judge2Score: j2,
      judge3Score: j3,
      totalJudgeScore,
      averageJudgeScore,
      totalPenalty,
      bonusApplied,
      finalScore,
      tieBreakerScore: j1,
      rankNumber: 1,
      isLocked: allThreeFinalized,
    };
    store.scoringResults.push(resultRecord);
  }

  recomputeCompetitionRankings(registration.competitionId, stageId, store);
  return resultRecord;
}

export function reviseLockedSubmissionScore(
  actor: CanonicalFestivalActor,
  params: {
    submissionId: string;
    newRawScore?: number;
    newCriteriaScores?: Record<string, number>;
    newPenaltyDeduction?: number;
    reason: string;
  }
): { revision: FgScoringRevision; submission: FgScoringSubmission; result: FgScoringResult } {
  if (
    !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Panitia", "Ketua Dewan Juri"].includes(
      actor.role
    )
  ) {
    throw new Error(
      `DENY: Peran '${actor.role}' tidak berwenang merevisi nilai juri yang sudah dikunci (FINALIZED).`
    );
  }
  if (!params.reason || params.reason.trim().length < 5) {
    throw new Error("Revisi resmi nilai terkunci wajib menyertakan alasan tertulis minimal 5 karakter.");
  }

  const store = getFestivalStore();
  const sub = store.scoringSubmissions.find((s) => s.id === params.submissionId);
  if (!sub) {
    throw new Error(`Data penilaian '${params.submissionId}' tidak ditemukan.`);
  }

  const oldFinalScore = sub.finalJudgeScore;
  const compCriteria = store.criteria.filter((c) => c.competitionId === sub.competitionId);

  let updatedRaw = sub.rawScore;
  if (params.newCriteriaScores && compCriteria.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const crit of compCriteria) {
      const val = Number(params.newCriteriaScores[crit.code] ?? sub.criteriaScores?.[crit.code] ?? 0);
      weightedSum += val * crit.weightPercent;
      totalWeight += crit.weightPercent;
    }
    updatedRaw = totalWeight > 0 ? toDecimal2(weightedSum / totalWeight) : sub.rawScore;
    sub.criteriaScores = { ...sub.criteriaScores, ...params.newCriteriaScores };
  } else if (typeof params.newRawScore === "number") {
    updatedRaw = toDecimal2(params.newRawScore);
  }

  const penalty =
    typeof params.newPenaltyDeduction === "number"
      ? toDecimal2(params.newPenaltyDeduction)
      : sub.penaltyDeduction;

  sub.rawScore = updatedRaw;
  sub.penaltyDeduction = penalty;
  sub.finalJudgeScore = toDecimal2(Math.max(0, updatedRaw - penalty));
  sub.submissionStatus = "FINALIZED";

  const revision: FgScoringRevision = {
    id: `rev-${Date.now()}`,
    eventId: sub.eventId,
    submissionId: sub.id,
    registrationId: sub.registrationId,
    judgeId: sub.judgeId,
    previousScore: oldFinalScore,
    newScore: sub.finalJudgeScore,
    reason: params.reason.trim(),
    approvedBy: actor.username,
    createdAt: new Date().toISOString(),
  };

  store.scoringRevisions = [revision, ...(store.scoringRevisions || [])];
  const result = recalculateRegistrationScoringResult(sub.registrationId, sub.stageId, store);
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "SCORE_CHANGE",
    entityTable: "fg_scoring_revisions",
    entityId: revision.id,
    actor,
    oldValues: { previousScore: oldFinalScore },
    newValues: { newScore: sub.finalJudgeScore, reason: revision.reason },
    description: `Revisi resmi nilai terkunci Juri ${sub.judgePosition} (${oldFinalScore.toFixed(2)} -> ${sub.finalJudgeScore.toFixed(2)}) oleh ${actor.username}. Alasan: ${revision.reason}`,
  });

  return { revision, submission: sub, result };
}

export function resolveManualTieBreakDeliberation(
  actor: CanonicalFestivalActor,
  params: {
    competitionId: string;
    stageId: string;
    winnerRegistrationId: string;
    deliberationNote: string;
  }
): FgScoringResult {
  if (
    !["Superadmin", "Admin Festival", "Ketua Panitia", "Ketua Dewan Juri"].includes(actor.role)
  ) {
    throw new Error(`DENY: Hanya Ketua Dewan Juri atau Ketua Panitia yang dapat menetapkan musyawarah tie-breaker.`);
  }
  const store = getFestivalStore();
  const target = store.scoringResults.find(
    (r) => r.registrationId === params.winnerRegistrationId && r.stageId === params.stageId
  );
  if (!target) {
    throw new Error(`Hasil penilaian untuk registrasi '${params.winnerRegistrationId}' tidak ditemukan.`);
  }

  target.tieBreakerScore = toDecimal2(target.tieBreakerScore + 0.01);
  target.tieBreakDeliberationNote = params.deliberationNote.trim();
  recomputeCompetitionRankings(params.competitionId, params.stageId, store);
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "RESULT_APPROVAL",
    entityTable: "fg_scoring_results",
    entityId: target.id,
    actor,
    newValues: { winnerRegistrationId: params.winnerRegistrationId, deliberationNote: target.tieBreakDeliberationNote },
    description: `Musyawarah Dewan Juri tie-breaker menetapkan '${params.winnerRegistrationId}' unggul: ${target.tieBreakDeliberationNote}`,
  });

  return target;
}

export function updateCompetitionCategoryConfig(
  actor: CanonicalFestivalActor,
  params: {
    competitionId: string;
    criteriaWeights?: Record<string, number>;
    rulesConfirmedByCommittee?: boolean;
    maleBonusPoints?: number | null;
    maleBonusApprovedByCommittee?: boolean;
    allowPeerScorePreviewBeforeLock?: boolean;
  }
): FgCompetition {
  if (
    !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Panitia", "Ketua Dewan Juri"].includes(
      actor.role
    )
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mengubah konfigurasi kategori lomba.`);
  }

  const store = getFestivalStore();
  const comp = store.competitions.find((c) => c.id === params.competitionId);
  if (!comp) {
    throw new Error(`Kategori lomba '${params.competitionId}' tidak ditemukan.`);
  }

  if (params.criteriaWeights) {
    const compCrits = store.criteria.filter((c) => c.competitionId === comp.id);
    for (const crit of compCrits) {
      if (typeof params.criteriaWeights[crit.code] === "number") {
        crit.weightPercent = toDecimal2(params.criteriaWeights[crit.code]);
      }
    }
  }

  if (typeof params.rulesConfirmedByCommittee === "boolean") {
    comp.rulesConfirmedByCommittee = params.rulesConfirmedByCommittee;
  }
  if (typeof params.allowPeerScorePreviewBeforeLock === "boolean") {
    comp.allowPeerScorePreviewBeforeLock = params.allowPeerScorePreviewBeforeLock;
  }
  if (comp.maleBonusConfig) {
    if (params.maleBonusPoints !== undefined) {
      comp.maleBonusConfig.bonusPoints = params.maleBonusPoints;
    }
    if (typeof params.maleBonusApprovedByCommittee === "boolean") {
      comp.maleBonusConfig.approvedByCommittee = params.maleBonusApprovedByCommittee;
    }
  }

  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_UPDATE",
    entityTable: "fg_competitions",
    entityId: comp.id,
    actor,
    newValues: { ...params },
    description: `Pembaruan konfigurasi kategori '${comp.name}' oleh ${actor.username}.`,
  });

  return comp;
}

// ============================================================================
// 2. PHYSICAL ARTWORK JUDGING (CATEGORIES 1, 2, 3)
// ============================================================================

export function registerArtworkForEntry(
  actor: CanonicalFestivalActor,
  params: {
    registrationId: string;
    titleOrTheme: string;
    photoUrl: string;
    physicalStorageLocation?: string;
    notes?: string;
  }
): FgArtwork {
  if (
    ![
      "Superadmin",
      "Admin Daerah",
      "Admin Festival",
      "Admin Registrasi",
      "Operator Arena",
      "Petugas Check-in",
      "Ketua Dewan Juri",
    ].includes(actor.role)
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mengunggah foto karya fisik.`);
  }

  const store = getFestivalStore();
  const reg = store.registrations.find((r) => r.id === params.registrationId);
  if (!reg || !reg.participantId) {
    throw new Error(`Registrasi peserta individu '${params.registrationId}' tidak ditemukan.`);
  }
  const comp = store.competitions.find((c) => c.id === reg.competitionId);
  if (!comp) {
    throw new Error(`Kategori lomba tidak ditemukan.`);
  }

  const existing = store.artworks.find((a) => a.registrationId === reg.id);
  const now = new Date().toISOString();

  if (existing) {
    existing.titleOrTheme = params.titleOrTheme;
    existing.photoUrl = params.photoUrl;
    existing.physicalStorageLocation = params.physicalStorageLocation || existing.physicalStorageLocation;
    existing.notes = params.notes || existing.notes;
    existing.uploadedBy = actor.username;
    existing.uploadedAt = now;
    saveFestivalStore(store);
    return existing;
  }

  const artwork: FgArtwork = {
    id: `art-${Date.now()}`,
    eventId: reg.eventId,
    competitionId: reg.competitionId,
    registrationId: reg.id,
    participantId: reg.participantId,
    artworkCode: `KARYA-${comp.code}-${String(store.artworks.length + 1).padStart(3, "0")}`,
    titleOrTheme: params.titleOrTheme,
    paperSize: "F4",
    photoUrl: params.photoUrl,
    physicalStorageLocation: params.physicalStorageLocation || "Meja Display Arena Kaligrafi",
    uploadedBy: actor.username,
    uploadedAt: now,
    notes: params.notes,
  };

  store.artworks.push(artwork);
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_CREATE",
    entityTable: "fg_artworks",
    entityId: artwork.id,
    actor,
    regionName: reg.regionName,
    villageName: reg.villageName,
    groupName: reg.groupName,
    newValues: { artworkCode: artwork.artworkCode, registrationId: reg.id, photoUrl: artwork.photoUrl },
    description: `Registrasi karya fisik '${artwork.artworkCode}' (${comp.name}) untuk peserta ${reg.displayNumber || reg.registrationCode}.`,
  });

  return artwork;
}

// ============================================================================
// 3. CERDAS CERMAT ENGINE (TURN, BUZZER LOCK, SCORE EVENT LOG)
// ============================================================================

export function pressQuizBuzzer(
  actor: CanonicalFestivalActor,
  params: { matchId: string; teamId: string }
): FgQuizMatch {
  const store = getFestivalStore();
  const match = store.quizMatches.find((m) => m.id === params.matchId);
  if (!match) {
    throw new Error(`Pertandingan Cerdas Cermat '${params.matchId}' tidak ditemukan.`);
  }
  if (![match.teamAId, match.teamBId, match.teamCId].includes(params.teamId)) {
    throw new Error(`Regu '${params.teamId}' bukan peserta pertandingan '${match.matchCode}'.`);
  }
  if (match.buzzerLockedByTeamId && match.buzzerLockedByTeamId !== params.teamId) {
    throw new Error(
      `BUZZER TERKUNCI: Regu '${match.buzzerLockedByTeamId}' sudah menekan bel terlebih dahulu.`
    );
  }

  match.activeRoundType = "REBUTAN";
  match.buzzerLockedByTeamId = params.teamId;
  match.activeTurnTeamId = params.teamId;
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_UPDATE",
    entityTable: "fg_quiz_matches",
    entityId: match.id,
    actor,
    newValues: { buzzerLockedByTeamId: params.teamId },
    description: `Buzzer Cerdas Cermat dikunci oleh regu '${params.teamId}' pada pertandingan ${match.matchCode}.`,
  });

  return match;
}

export function resetQuizBuzzerAndSetTurn(
  actor: CanonicalFestivalActor,
  params: {
    matchId: string;
    roundType: QuizRoundType;
    activeTurnTeamId: string | null;
    questionTimerSeconds?: number;
  }
): FgQuizMatch {
  if (
    !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Dewan Juri", "Operator Cerdas Cermat"].includes(
      actor.role
    )
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mengatur giliran Cerdas Cermat.`);
  }
  const store = getFestivalStore();
  const match = store.quizMatches.find((m) => m.id === params.matchId);
  if (!match) {
    throw new Error(`Pertandingan '${params.matchId}' tidak ditemukan.`);
  }

  match.activeRoundType = params.roundType;
  match.activeTurnTeamId = params.activeTurnTeamId;
  match.buzzerLockedByTeamId = null;
  if (typeof params.questionTimerSeconds === "number") {
    match.questionTimerSeconds = params.questionTimerSeconds;
  }
  saveFestivalStore(store);
  return match;
}

export function recordQuizMatchScoreEvent(
  actor: CanonicalFestivalActor,
  params: {
    matchId: string;
    teamId: string;
    roundType: QuizRoundType;
    pointsDelta?: number;
    isCorrect?: boolean;
    questionNumber?: number;
    questionId?: string;
    answerSummary?: string;
    reason?: string;
  }
): FgQuizLeaderboard {
  if (
    !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Dewan Juri", "Operator Cerdas Cermat"].includes(
      actor.role
    )
  ) {
    throw new Error(
      `DENY: Peran '${actor.role}' tidak memiliki otoritas mengoperasikan skor Cerdas Cermat.`
    );
  }

  const store = getFestivalStore();
  const match = store.quizMatches.find((m) => m.id === params.matchId);
  const lb = store.quizLeaderboards.find(
    (item) => item.matchId === params.matchId && item.teamId === params.teamId
  );
  if (!lb) {
    throw new Error(`Klasemen regu '${params.teamId}' pada pertandingan '${params.matchId}' tidak ditemukan.`);
  }

  let delta: number;
  if (typeof params.pointsDelta === "number") {
    delta = toDecimal2(params.pointsDelta);
  } else {
    const isRebutan = params.roundType === "REBUTAN";
    if (params.isCorrect) {
      delta = isRebutan ? (match?.rebutanCorrectPoints ?? 100) : (match?.giliranCorrectPoints ?? 100);
    } else {
      delta = isRebutan ? (match?.rebutanWrongPoints ?? -50) : (match?.giliranWrongPoints ?? 0);
    }
  }

  const scoreBefore = lb.totalScore;

  if (params.roundType === "WAJIB" || params.roundType === "GILIRAN") {
    lb.wajibScore = toDecimal2(lb.wajibScore + delta);
  } else if (params.roundType === "LEMPARAN") {
    lb.lemparanScore = toDecimal2(lb.lemparanScore + delta);
  } else if (params.roundType === "REBUTAN") {
    lb.rebutanScore = toDecimal2(lb.rebutanScore + delta);
  } else if (params.roundType === "PENALTY") {
    lb.penaltyScore = toDecimal2(lb.penaltyScore + Math.abs(delta));
  }

  if (params.isCorrect === true || (params.isCorrect === undefined && delta > 0)) {
    lb.correctAnswersCount = (lb.correctAnswersCount || 0) + 1;
  } else if (params.isCorrect === false || delta < 0) {
    lb.wrongAnswersCount = (lb.wrongAnswersCount || 0) + 1;
  }

  lb.totalScore = toDecimal2(
    lb.wajibScore + lb.lemparanScore + lb.rebutanScore - lb.penaltyScore
  );
  const scoreAfter = lb.totalScore;

  // Release buzzer lock after recording score
  if (match && match.buzzerLockedByTeamId === params.teamId) {
    match.buzzerLockedByTeamId = null;
  }

  // Deterministic Cerdas Cermat Tie-Breaker:
  // 1. totalScore DESC -> 2. rebutanScore DESC -> 3. correctAnswersCount DESC
  const matchBoards = store.quizLeaderboards
    .filter((item) => item.matchId === params.matchId)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        b.rebutanScore - a.rebutanScore ||
        (b.correctAnswersCount || 0) - (a.correctAnswersCount || 0)
    );
  matchBoards.forEach((item, index) => {
    item.rankInMatch = index + 1;
    item.isAdvancing = index < 2;
  });

  if (match && matchBoards.length > 0) {
    match.winnerTeamId = matchBoards[0].teamId;
  }

  const eventLog: FgQuizScoreEvent = {
    id: `qse-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    eventId: match?.eventId || "fg-evt-2026",
    matchId: params.matchId,
    roundType: params.roundType,
    questionNumber: params.questionNumber || (store.quizScoreEvents?.length || 0) + 1,
    questionId: params.questionId || `Q-${params.roundType}-${(store.quizScoreEvents?.length || 0) + 1}`,
    teamId: params.teamId,
    answerSummary: params.answerSummary || `Jawaban babak ${params.roundType}`,
    isCorrect: params.isCorrect ?? delta > 0,
    scoreBefore,
    pointsDelta: delta,
    scoreAfter,
    reason: params.reason || `Penilaian soal ${params.roundType} (${delta >= 0 ? "+" : ""}${delta})`,
    operatorUsername: actor.username,
    recordedAt: new Date().toISOString(),
  };

  store.quizScoreEvents = [eventLog, ...(store.quizScoreEvents || [])];
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "SCORE_CHANGE",
    entityTable: "fg_quiz_score_events",
    entityId: eventLog.id,
    actor,
    villageName: lb.villageName,
    groupName: lb.groupName,
    oldValues: { scoreBefore },
    newValues: {
      questionId: eventLog.questionId,
      roundType: params.roundType,
      pointsDelta: delta,
      scoreAfter,
      reason: eventLog.reason,
    },
    description: `Log Skor Cerdas Cermat [${eventLog.questionId}] untuk ${lb.teamName}: ${scoreBefore.toFixed(0)} -> ${scoreAfter.toFixed(0)} (${delta >= 0 ? "+" : ""}${delta}).`,
  });

  return lb;
}

// ============================================================================
// 4. SCHEDULE, ARENA QUEUE, TIMER & CONFLICT DETECTION ENGINE
// ============================================================================

export function updateArenaParticipantQueue(
  actor: CanonicalFestivalActor,
  params: {
    registrationId: string;
    callStatus?: ArenaCallStatus;
    attendanceStatus?: CheckinStatus;
    elapsedSeconds?: number;
    timerDurationSeconds?: number;
    notes?: string;
  }
): FgArenaQueue {
  const store = getFestivalStore();
  const reg = store.registrations.find((r) => r.id === params.registrationId);
  if (!reg) {
    throw new Error(`Registrasi '${params.registrationId}' tidak ditemukan.`);
  }
  const comp = store.competitions.find((c) => c.id === reg.competitionId);
  if (!comp) {
    throw new Error(`Kategori lomba tidak ditemukan.`);
  }

  if (!canOperatorAccessArena(actor, comp.arenaId, store.arenas) && actor.role !== "Ketua Dewan Juri") {
    throw new Error(
      `DENY: Peran '${actor.role}' (${actor.username}) tidak ditugaskan pada arena '${comp.arenaId}'.`
    );
  }

  let queueItem = store.arenaQueues.find((q) => q.registrationId === reg.id);
  const participant = reg.participantId
    ? store.participants.find((p) => p.id === reg.participantId)
    : undefined;
  const team = reg.teamId ? store.teams.find((t) => t.id === reg.teamId) : undefined;
  const defaultDuration = (comp.timerDurationMinutes || 10) * 60;
  const now = new Date().toISOString();

  if (!queueItem) {
    queueItem = {
      id: `aq-${Date.now()}`,
      eventId: reg.eventId,
      arenaId: comp.arenaId,
      competitionId: comp.id,
      registrationId: reg.id,
      displayNumber: reg.displayNumber || reg.registrationCode,
      entryName: participant?.snapshotFullName || team?.teamName || reg.registrationCode,
      groupName: reg.groupName,
      villageName: reg.villageName,
      queueNumber: reg.turnOrder || store.arenaQueues.length + 1,
      callStatus: params.callStatus || "WAITING",
      attendanceStatus: params.attendanceStatus || reg.checkinStatus || "PRESENT",
      timerDurationSeconds: params.timerDurationSeconds || defaultDuration,
      elapsedSeconds: params.elapsedSeconds || 0,
      isOvertime: false,
      updatedBy: actor.username,
      updatedAt: now,
    };
    store.arenaQueues.push(queueItem);
  } else {
    if (params.callStatus) {
      queueItem.callStatus = params.callStatus;
      if (params.callStatus === "CALLED") queueItem.calledAt = now;
      if (params.callStatus === "PERFORMING") queueItem.startedAt = now;
      if (params.callStatus === "COMPLETED") queueItem.finishedAt = now;
    }
    if (params.attendanceStatus) {
      queueItem.attendanceStatus = params.attendanceStatus;
      reg.checkinStatus = params.attendanceStatus;
      if (params.attendanceStatus === "PRESENT" && reg.status === "VERIFIED") {
        reg.status = "CHECKED_IN";
      }
    }
    if (typeof params.timerDurationSeconds === "number") {
      queueItem.timerDurationSeconds = params.timerDurationSeconds;
    }
    if (typeof params.elapsedSeconds === "number") {
      queueItem.elapsedSeconds = params.elapsedSeconds;
    }
    if (params.notes !== undefined) {
      queueItem.notes = params.notes;
    }
    queueItem.updatedBy = actor.username;
    queueItem.updatedAt = now;
  }

  // Overtime indicator NEVER auto-disqualifies a participant (per Part 2 Section 9)
  queueItem.isOvertime = queueItem.elapsedSeconds > queueItem.timerDurationSeconds;

  saveFestivalStore(store);
  return queueItem;
}

export function detectScheduleConflicts(): ScheduleConflictItem[] {
  const store = getFestivalStore();
  const conflicts: ScheduleConflictItem[] = [];

  const overlaps = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const a0 = new Date(startA).getTime();
    const a1 = new Date(endA).getTime();
    const b0 = new Date(startB).getTime();
    const b1 = new Date(endB).getTime();
    if (Number.isNaN(a0) || Number.isNaN(a1) || Number.isNaN(b0) || Number.isNaN(b1)) return false;
    return a0 < b1 && b0 < a1;
  };

  // 1. Arena schedule conflicts (two non-compatible competitions in the same arena at the same time)
  for (let i = 0; i < store.competitions.length; i++) {
    for (let j = i + 1; j < store.competitions.length; j++) {
      const cA = store.competitions[i];
      const cB = store.competitions[j];
      if (
        cA.arenaId === cB.arenaId &&
        overlaps(cA.scheduleStart, cA.scheduleEnd, cB.scheduleStart, cB.scheduleEnd)
      ) {
        const arena = store.arenas.find((a) => a.id === cA.arenaId);
        conflicts.push({
          conflictType: "ARENA_CONFLICT",
          entityId: cA.arenaId,
          entityName: arena?.name || cA.arenaId,
          competitionAId: cA.id,
          competitionAName: cA.name,
          competitionBId: cB.id,
          competitionBName: cB.name,
          overlapWindow: `${cA.scheduleStart} - ${cA.scheduleEnd}`,
          description: `Arena '${arena?.name || cA.arenaId}' digunakan bersamaan oleh '${cA.name}' dan '${cB.name}'.`,
        });
      }
    }
  }

  // 2. Judge assignment conflicts across different arenas at overlapping times
  for (const judge of store.judges) {
    const assignedComps = store.judgeAssignments
      .filter((a) => a.judgeId === judge.id)
      .map((a) => store.competitions.find((c) => c.id === a.competitionId))
      .filter((c): c is FgCompetition => Boolean(c));

    for (let i = 0; i < assignedComps.length; i++) {
      for (let j = i + 1; j < assignedComps.length; j++) {
        const cA = assignedComps[i];
        const cB = assignedComps[j];
        if (
          cA.id !== cB.id &&
          cA.arenaId !== cB.arenaId &&
          overlaps(cA.scheduleStart, cA.scheduleEnd, cB.scheduleStart, cB.scheduleEnd)
        ) {
          conflicts.push({
            conflictType: "JUDGE_CONFLICT",
            entityId: judge.id,
            entityName: judge.fullName,
            competitionAId: cA.id,
            competitionAName: cA.name,
            competitionBId: cB.id,
            competitionBName: cB.name,
            overlapWindow: `${cA.scheduleStart} - ${cA.scheduleEnd}`,
            description: `Juri '${judge.fullName}' ditugaskan pada dua arena berbeda (${cA.arenaId} & ${cB.arenaId}) di jam yang beririsan.`,
          });
        }
      }
    }
  }

  // 3. Participant schedule conflicts (registered in 2 competitions with overlapping schedule)
  for (const part of store.participants) {
    const activeRegs = store.registrations.filter(
      (r) =>
        r.participantId === part.id &&
        r.status !== "REJECTED" &&
        r.status !== "WITHDRAWN" &&
        r.status !== "DISQUALIFIED"
    );
    for (let i = 0; i < activeRegs.length; i++) {
      for (let j = i + 1; j < activeRegs.length; j++) {
        const cA = store.competitions.find((c) => c.id === activeRegs[i].competitionId);
        const cB = store.competitions.find((c) => c.id === activeRegs[j].competitionId);
        if (
          cA &&
          cB &&
          cA.id !== cB.id &&
          overlaps(cA.scheduleStart, cA.scheduleEnd, cB.scheduleStart, cB.scheduleEnd)
        ) {
          conflicts.push({
            conflictType: "PARTICIPANT_CONFLICT",
            entityId: part.id,
            entityName: part.snapshotFullName,
            competitionAId: cA.id,
            competitionAName: cA.name,
            competitionBId: cB.id,
            competitionBName: cB.name,
            overlapWindow: `${cA.scheduleStart} - ${cA.scheduleEnd}`,
            description: `Peserta '${part.snapshotFullName}' terdaftar di '${cA.name}' dan '${cB.name}' pada jadwal yang berbenturan.`,
          });
        }
      }
    }
  }

  return conflicts;
}
