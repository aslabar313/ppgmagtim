// ============================================================================
// MODULE: FESTIVAL GENERUS — PART 1 & 2 (CORE DOMAIN, REGISTRATION & JUDGE SERVICE)
// ============================================================================

import { loadData, saveData } from "../mockDataHelper";
import { getGenerus } from "../mockData";
import type {
  AuditActionCategory,
  EducationLevel,
  FestivalRole,
  FestivalStoreState,
  FgAuditLog,
  FgChampionshipStanding,
  FgCompetition,
  FgCompetitionResult,
  FgContingent,
  FgJudgeAssignment,
  FgParticipant,
  FgRegistration,
  FgScoringSubmission,
  FgTeam,
  RegistrationStatus,
} from "./types";
import {
  assertFestivalOrgAccess,
  assertJudgeCompetitionAccess,
  CANONICAL_REGION_NAME,
  type CanonicalFestivalActor,
  canAccessFestivalOrg,
  canActorViewSubmissionDetail,
  canJudgeAccessCompetition,
  findVillageForGroup,
  normalizeGroupCanonical,
  resolveCanonicalFestivalActor,
} from "./festivalAuth";
import { buildDefaultFestivalStore } from "./seedData";

const STORAGE_KEY_FESTIVAL = "sim_tpq_festival_generus_store_v2";

export function toDecimal2(value: number | string): number {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0.0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function toDecimal4(value: number | string): number {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0.0;
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

export function deriveEducationLevelFromAge(age: number): EducationLevel {
  if (age <= 6) return "PAUD/TK";
  if (age <= 9) return "SD 1-3";
  if (age <= 12) return "SD 4-6";
  if (age <= 15) return "SMP";
  return "SMA/SMK";
}

export function isEducationLevelCompatible(
  participantLevel: EducationLevel,
  competitionLevel: EducationLevel
): boolean {
  if (participantLevel === competitionLevel) return true;
  if (competitionLevel === "SD" && ["SD", "SD 1-3", "SD 4-6"].includes(participantLevel)) {
    return true;
  }
  if (
    competitionLevel === "SMP-SMA" &&
    ["SMP", "SMA/SMK", "SMP-SMA"].includes(participantLevel)
  ) {
    return true;
  }
  return false;
}

export function getFestivalStore(): FestivalStoreState {
  const defaultStore = buildDefaultFestivalStore();
  const loaded = loadData<FestivalStoreState | null>(STORAGE_KEY_FESTIVAL, null);
  if (
    !loaded ||
    !Array.isArray(loaded.competitions) ||
    loaded.competitions.length < 17 ||
    !loaded.competitions.some((c) => c.id === "fg-comp-mewarnai-paud")
  ) {
    saveData(STORAGE_KEY_FESTIVAL, defaultStore);
    return defaultStore;
  }
  // Ensure Part 2 & Part 3 arrays are initialized
  loaded.artworks = loaded.artworks || [];
  loaded.arenaQueues = loaded.arenaQueues || [];
  loaded.scoringRevisions = loaded.scoringRevisions || [];
  loaded.quizScoreEvents = loaded.quizScoreEvents || [];
  loaded.checkins = loaded.checkins || defaultStore.checkins || [];
  loaded.approvals = loaded.approvals || defaultStore.approvals || [];
  loaded.championshipConfig = loaded.championshipConfig || defaultStore.championshipConfig;
  if (!Array.isArray(loaded.arenas) || loaded.arenas.length < 12) {
    loaded.arenas = defaultStore.arenas;
  }
  return loaded;
}

export function saveFestivalStore(store: FestivalStoreState): void {
  store.updatedAt = new Date().toISOString();
  saveData(STORAGE_KEY_FESTIVAL, store);
}

export function resetFestivalStoreToSeed(): FestivalStoreState {
  const seeded = buildDefaultFestivalStore();
  saveFestivalStore(seeded);
  return seeded;
}

export function recordFestivalAudit(params: {
  actionCategory: AuditActionCategory;
  entityTable: string;
  entityId: string;
  actor: CanonicalFestivalActor;
  regionName?: string;
  villageName?: string;
  groupName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description: string;
}): FgAuditLog {
  const store = getFestivalStore();
  const logEntry: FgAuditLog = {
    id: `fga-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId: store.events[0]?.id || "fg-evt-2026",
    actionCategory: params.actionCategory,
    entityTable: params.entityTable,
    entityId: params.entityId,
    actorUsername: params.actor.username,
    actorRole: params.actor.role,
    actorScope:
      params.actor.groupName !== "Semua"
        ? params.actor.groupName
        : params.actor.villageName !== "Semua"
          ? params.actor.villageName
          : params.actor.regionName,
    regionName: params.regionName || params.actor.regionName,
    villageName: params.villageName,
    groupName: params.groupName,
    oldValues: params.oldValues,
    newValues: params.newValues,
    description: params.description,
    createdAt: new Date().toISOString(),
  };

  store.auditLogs = [logEntry, ...store.auditLogs];
  saveFestivalStore(store);
  return logEntry;
}

// ============================================================================
// 1. SCOPED QUERIES & JUDGE BLIND-SCORING ISOLATION
// ============================================================================

export function getScopedContingents(
  actor: CanonicalFestivalActor,
  requestedRegion?: string,
  requestedVillage?: string,
  requestedGroup?: string
): FgContingent[] {
  if (requestedRegion || requestedVillage || requestedGroup) {
    assertFestivalOrgAccess(actor, requestedRegion, requestedVillage, requestedGroup);
  }
  const store = getFestivalStore();
  return store.contingents.filter((c) => {
    const check = canAccessFestivalOrg(actor, c.regionName, c.villageName, c.groupName);
    if (!check.allowed) return false;
    if (requestedVillage && requestedVillage !== "Semua" && c.villageName !== requestedVillage) {
      return false;
    }
    if (
      requestedGroup &&
      requestedGroup !== "Semua" &&
      normalizeGroupCanonical(c.groupName) !== normalizeGroupCanonical(requestedGroup)
    ) {
      return false;
    }
    return true;
  });
}

export function getScopedParticipants(
  actor: CanonicalFestivalActor,
  requestedRegion?: string,
  requestedVillage?: string,
  requestedGroup?: string
): FgParticipant[] {
  if (requestedRegion || requestedVillage || requestedGroup) {
    assertFestivalOrgAccess(actor, requestedRegion, requestedVillage, requestedGroup);
  }
  const store = getFestivalStore();
  return store.participants.filter((p) => {
    const check = canAccessFestivalOrg(
      actor,
      p.snapshotRegionName,
      p.snapshotVillageName,
      p.snapshotGroupName
    );
    if (!check.allowed) return false;
    if (
      requestedVillage &&
      requestedVillage !== "Semua" &&
      p.snapshotVillageName !== requestedVillage
    ) {
      return false;
    }
    if (
      requestedGroup &&
      requestedGroup !== "Semua" &&
      normalizeGroupCanonical(p.snapshotGroupName) !== normalizeGroupCanonical(requestedGroup)
    ) {
      return false;
    }
    return true;
  });
}

export function getScopedRegistrations(
  actor: CanonicalFestivalActor,
  options?: {
    competitionId?: string;
    regionName?: string;
    villageName?: string;
    groupName?: string;
  }
): FgRegistration[] {
  if (options?.regionName || options?.villageName || options?.groupName) {
    assertFestivalOrgAccess(
      actor,
      options.regionName,
      options.villageName,
      options.groupName
    );
  }
  const store = getFestivalStore();
  if (actor.role === "Juri" && options?.competitionId) {
    assertJudgeCompetitionAccess(
      actor,
      options.competitionId,
      store.judgeAssignments,
      store.judges
    );
  }

  return store.registrations.filter((r) => {
    if (options?.competitionId && r.competitionId !== options.competitionId) return false;
    if (actor.role === "Juri") {
      return canJudgeAccessCompetition(actor, r.competitionId, store.judgeAssignments, store.judges);
    }
    const check = canAccessFestivalOrg(actor, r.regionName, r.villageName, r.groupName);
    if (!check.allowed) return false;
    if (
      options?.villageName &&
      options.villageName !== "Semua" &&
      r.villageName !== options.villageName
    ) {
      return false;
    }
    if (
      options?.groupName &&
      options.groupName !== "Semua" &&
      normalizeGroupCanonical(r.groupName) !== normalizeGroupCanonical(options.groupName)
    ) {
      return false;
    }
    return true;
  });
}

export function getScopedCompetitions(actor: CanonicalFestivalActor): FgCompetition[] {
  const store = getFestivalStore();
  if (actor.role === "Juri") {
    return store.competitions.filter((c) =>
      canJudgeAccessCompetition(actor, c.id, store.judgeAssignments, store.judges)
    );
  }
  return store.competitions;
}

/**
 * Returns scoring submissions for a registration, enforcing blind-scoring isolation:
 * Peer judges' scores are hidden from a regular Juri until all 3 judges submit/finalize
 * (unless the competition explicitly enables `allowPeerScorePreviewBeforeLock`).
 */
export function getScopedSubmissionsForActor(
  actor: CanonicalFestivalActor,
  registrationId: string,
  stageId: string = "stg-penyisihan"
): FgScoringSubmission[] {
  const store = getFestivalStore();
  const reg = store.registrations.find((r) => r.id === registrationId);
  if (!reg) return [];
  const comp = store.competitions.find((c) => c.id === reg.competitionId);
  const allForReg = store.scoringSubmissions.filter(
    (s) => s.registrationId === registrationId && s.stageId === stageId
  );

  return allForReg.filter((s) =>
    canActorViewSubmissionDetail(actor, s, allForReg, comp)
  );
}

// ============================================================================
// 2. PARTICIPANT, TEAM & ENTRY REGISTRATION ENGINE (PART 2 SECTION 3)
// ============================================================================

export function enrollParticipantFromGenerus(
  actor: CanonicalFestivalActor,
  generusId: string,
  overrideTargetGroup?: string,
  overrideEducationLevel?: EducationLevel
): FgParticipant {
  if (
    ![
      "Superadmin",
      "Admin Daerah",
      "Admin Desa",
      "Admin Kelompok",
      "Admin Festival",
      "Admin Registrasi",
    ].includes(actor.role)
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mendaftarkan peserta baru.`);
  }

  const allGenerus = getGenerus();
  const generus = allGenerus.find((g) => g.id === generusId);
  if (!generus) {
    throw new Error(`Data santri/generus dengan ID '${generusId}' tidak ditemukan.`);
  }

  const groupCanonical = normalizeGroupCanonical(overrideTargetGroup || generus.namaKelompok);
  const villageCanonical = findVillageForGroup(groupCanonical);
  if (!villageCanonical) {
    throw new Error(`Kelompok '${groupCanonical}' tidak terdaftar dalam struktur Desa Magetan Timur.`);
  }

  assertFestivalOrgAccess(actor, CANONICAL_REGION_NAME, villageCanonical, groupCanonical);

  if (generus.usia > 19) {
    throw new Error(
      `Validasi jenjang gagal: Santri '${generus.namaLengkap}' berusia ${generus.usia} tahun (melebihi batas usia jenjang SMA/SMK Festival Generus).`
    );
  }

  const store = getFestivalStore();
  const existing = store.participants.find((p) => p.generusId === generus.id);
  if (existing) {
    if (overrideEducationLevel && existing.snapshotEducationLevel !== overrideEducationLevel) {
      existing.snapshotEducationLevel = overrideEducationLevel;
      saveFestivalStore(store);
    }
    return existing;
  }

  const contingent = store.contingents.find(
    (c) => normalizeGroupCanonical(c.groupName) === groupCanonical
  );
  if (!contingent) {
    throw new Error(`Kontingen untuk '${groupCanonical}' belum tersedia.`);
  }

  const educationLevel = overrideEducationLevel || deriveEducationLevelFromAge(generus.usia);
  const newParticipant: FgParticipant = {
    id: `fg-part-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    eventId: store.events[0].id,
    contingentId: contingent.id,
    generusId: generus.id,
    snapshotFullName: generus.namaLengkap,
    snapshotNis: generus.nisInternal,
    snapshotGender: generus.jenisKelamin,
    snapshotBirthDate: generus.tanggalLahir,
    snapshotAge: generus.usia,
    snapshotCategory: generus.usia < 13 ? "Caberawit" : generus.usia <= 15 ? "Pra-Remaja" : "Remaja",
    snapshotEducationLevel: educationLevel,
    snapshotParentName: generus.namaOrangTua,
    snapshotParentWhatsapp: generus.whatsappOrangTua,
    snapshotGroupId: contingent.groupId,
    snapshotGroupName: groupCanonical,
    snapshotVillageName: villageCanonical,
    snapshotRegionName: CANONICAL_REGION_NAME,
    eligibilityStatus: "VERIFIED",
    createdBy: actor.username,
    createdAt: new Date().toISOString(),
  };

  store.participants.push(newParticipant);
  contingent.totalParticipants += 1;
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_CREATE",
    entityTable: "fg_participants",
    entityId: newParticipant.id,
    actor,
    regionName: CANONICAL_REGION_NAME,
    villageName: villageCanonical,
    groupName: groupCanonical,
    newValues: {
      generusId: generus.id,
      snapshotFullName: newParticipant.snapshotFullName,
      snapshotEducationLevel: newParticipant.snapshotEducationLevel,
      snapshotGroupName: groupCanonical,
    },
    description: `Pendaftaran peserta '${newParticipant.snapshotFullName}' (${educationLevel}, ${groupCanonical} - ${villageCanonical}).`,
  });

  return newParticipant;
}

export function registerTeamForCompetition(
  actor: CanonicalFestivalActor,
  params: {
    competitionId: string;
    teamName: string;
    memberParticipantIds: string[];
    groupName?: string;
  }
): FgTeam {
  if (
    ![
      "Superadmin",
      "Admin Daerah",
      "Admin Desa",
      "Admin Kelompok",
      "Admin Festival",
      "Admin Registrasi",
    ].includes(actor.role)
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mendaftarkan tim beregu.`);
  }

  const store = getFestivalStore();
  const comp = store.competitions.find((c) => c.id === params.competitionId);
  if (!comp) {
    throw new Error(`Kategori lomba '${params.competitionId}' tidak ditemukan.`);
  }
  if (comp.competitionType === "INDIVIDUAL") {
    throw new Error(`Kategori '${comp.name}' adalah lomba individu, bukan beregu.`);
  }

  const uniqueMemberIds = Array.from(new Set(params.memberParticipantIds.filter(Boolean)));
  if (
    uniqueMemberIds.length < comp.minMembersPerTeam ||
    uniqueMemberIds.length > comp.maxMembersPerTeam
  ) {
    throw new Error(
      `Validasi Tim Beregu Gagal: Kategori '${comp.name}' mewajibkan ${comp.minMembersPerTeam} s/d ${comp.maxMembersPerTeam} peserta per tim (diterima: ${uniqueMemberIds.length} peserta).`
    );
  }

  const members = uniqueMemberIds.map((pid) => {
    const p = store.participants.find((item) => item.id === pid);
    if (!p) {
      throw new Error(`Peserta anggota tim '${pid}' tidak ditemukan.`);
    }
    if (!isEducationLevelCompatible(p.snapshotEducationLevel, comp.educationLevel)) {
      throw new Error(
        `Validasi Jenjang Gagal: Anggota tim '${p.snapshotFullName}' berjenjang '${p.snapshotEducationLevel}', tidak sesuai dengan '${comp.name}' (Jenjang ${comp.educationLevel}).`
      );
    }
    return p;
  });

  const groupCanonical = normalizeGroupCanonical(
    params.groupName || members[0].snapshotGroupName
  );
  const villageCanonical = findVillageForGroup(groupCanonical) || members[0].snapshotVillageName;
  assertFestivalOrgAccess(actor, CANONICAL_REGION_NAME, villageCanonical, groupCanonical);

  const contingent = store.contingents.find(
    (c) => normalizeGroupCanonical(c.groupName) === groupCanonical
  );
  if (!contingent) {
    throw new Error(`Kontingen untuk '${groupCanonical}' tidak ditemukan.`);
  }

  const newTeam: FgTeam = {
    id: `fg-team-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    eventId: comp.eventId,
    competitionId: comp.id,
    contingentId: contingent.id,
    teamCode: `REGU-${comp.code}-${String(store.teams.length + 1).padStart(2, "0")}`,
    teamName: params.teamName.trim(),
    captainParticipantId: uniqueMemberIds[0],
    memberParticipantIds: uniqueMemberIds,
    regionName: CANONICAL_REGION_NAME,
    villageName: villageCanonical,
    groupName: groupCanonical,
    memberCount: uniqueMemberIds.length,
    status: "ACTIVE",
    createdBy: actor.username,
  };

  store.teams.push(newTeam);
  contingent.totalTeams += 1;
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_CREATE",
    entityTable: "fg_teams",
    entityId: newTeam.id,
    actor,
    regionName: CANONICAL_REGION_NAME,
    villageName: villageCanonical,
    groupName: groupCanonical,
    newValues: { teamName: newTeam.teamName, memberCount: newTeam.memberCount, competitionId: comp.id },
    description: `Pendaftaran tim beregu '${newTeam.teamName}' (${newTeam.memberCount} anggota) untuk '${comp.name}'.`,
  });

  return newTeam;
}

export function createCompetitionRegistration(
  actor: CanonicalFestivalActor,
  params: {
    competitionId: string;
    participantId: string | null;
    teamId: string | null;
    initialStatus?: "DRAFT" | "SUBMITTED";
    documentUrl?: string;
  }
): FgRegistration {
  if (
    ![
      "Superadmin",
      "Admin Daerah",
      "Admin Desa",
      "Admin Kelompok",
      "Admin Festival",
      "Admin Registrasi",
    ].includes(actor.role)
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang membuat registrasi lomba.`);
  }

  const hasParticipant = Boolean(params.participantId && params.participantId.trim());
  const hasTeam = Boolean(params.teamId && params.teamId.trim());

  if ((hasParticipant && hasTeam) || (!hasParticipant && !hasTeam)) {
    throw new Error(
      "CONSTRAINT VIOLATION (chk_fg_registrations_exclusive_entry): Setiap registrasi wajib mengisi tepat satu antara participant_id ATAU team_id."
    );
  }

  const store = getFestivalStore();
  const competition = store.competitions.find((c) => c.id === params.competitionId);
  if (!competition) {
    throw new Error(`Cabang perlombaan '${params.competitionId}' tidak ditemukan.`);
  }

  let regionName = CANONICAL_REGION_NAME;
  let villageName = "";
  let groupName = "";
  let contingentId = "";

  if (hasParticipant) {
    if (competition.competitionType !== "INDIVIDUAL") {
      throw new Error(
        `Cabang '${competition.name}' adalah lomba beregu (${competition.competitionType}), wajib menggunakan team_id.`
      );
    }
    const participant = store.participants.find((p) => p.id === params.participantId);
    if (!participant) {
      throw new Error(`Peserta '${params.participantId}' tidak ditemukan.`);
    }

    // Education Level Validation (Part 2 Section 3)
    if (!isEducationLevelCompatible(participant.snapshotEducationLevel, competition.educationLevel)) {
      throw new Error(
        `Validasi Jenjang Pendidikan Gagal: Peserta '${participant.snapshotFullName}' berjenjang '${participant.snapshotEducationLevel}', tidak memenuhi syarat jenjang '${competition.educationLevel}' pada '${competition.name}'.`
      );
    }

    // Duplicate Registration Prevention in the Same Category (Part 2 Section 3)
    const duplicate = store.registrations.find(
      (r) =>
        r.competitionId === competition.id &&
        r.participantId === participant.id &&
        r.status !== "WITHDRAWN" &&
        r.status !== "REJECTED"
    );
    if (duplicate) {
      throw new Error(
        `Duplikasi Pendaftaran Ditolak: Peserta '${participant.snapshotFullName}' sudah terdaftar pada kategori '${competition.name}' (${duplicate.registrationCode}).`
      );
    }

    regionName = participant.snapshotRegionName;
    villageName = participant.snapshotVillageName;
    groupName = participant.snapshotGroupName;
    contingentId = participant.contingentId;
  } else {
    if (competition.competitionType === "INDIVIDUAL") {
      throw new Error(
        `Cabang '${competition.name}' adalah lomba individu, wajib menggunakan participant_id.`
      );
    }
    const team = store.teams.find((t) => t.id === params.teamId);
    if (!team) {
      throw new Error(`Regu/Tim '${params.teamId}' tidak ditemukan.`);
    }
    if (
      team.memberCount < competition.minMembersPerTeam ||
      team.memberCount > competition.maxMembersPerTeam
    ) {
      throw new Error(
        `Jumlah anggota tim '${team.teamName}' (${team.memberCount}) tidak sesuai ketentuan ${competition.minMembersPerTeam}-${competition.maxMembersPerTeam} peserta.`
      );
    }

    const duplicateTeam = store.registrations.find(
      (r) =>
        r.competitionId === competition.id &&
        r.teamId === team.id &&
        r.status !== "WITHDRAWN" &&
        r.status !== "REJECTED"
    );
    if (duplicateTeam) {
      throw new Error(
        `Duplikasi Pendaftaran Tim Ditolak: Tim '${team.teamName}' sudah terdaftar pada '${competition.name}'.`
      );
    }

    regionName = team.regionName;
    villageName = team.villageName;
    groupName = team.groupName;
    contingentId = team.contingentId;
  }

  assertFestivalOrgAccess(actor, regionName, villageName, groupName);

  const compRegCount =
    store.registrations.filter((r) => r.competitionId === competition.id).length + 1;
  const autoDisplayNumber = `${competition.code}-${String(compRegCount).padStart(3, "0")}`;
  const now = new Date().toISOString();

  const newReg: FgRegistration = {
    id: `fg-reg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    eventId: competition.eventId,
    competitionId: competition.id,
    contingentId,
    participantId: hasParticipant ? params.participantId : null,
    teamId: hasTeam ? params.teamId : null,
    registrationCode: `REG-2026-${competition.code}-${String(store.registrations.length + 1).padStart(3, "0")}`,
    regionName,
    villageName,
    groupName,
    status: params.initialStatus || "SUBMITTED",
    displayNumber: autoDisplayNumber,
    turnOrder: compRegCount,
    checkinStatus: "PENDING",
    documentUrl: params.documentUrl,
    createdBy: actor.username,
    createdAt: now,
    updatedAt: now,
  };

  store.registrations.push(newReg);
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_CREATE",
    entityTable: "fg_registrations",
    entityId: newReg.id,
    actor,
    regionName,
    villageName,
    groupName,
    newValues: {
      competitionId: newReg.competitionId,
      participantId: newReg.participantId,
      teamId: newReg.teamId,
      registrationCode: newReg.registrationCode,
      displayNumber: newReg.displayNumber,
      status: newReg.status,
    },
    description: `Registrasi lomba ${competition.name} (${newReg.registrationCode} / No. Peserta ${newReg.displayNumber}) oleh ${groupName}.`,
  });

  return newReg;
}

export function updateRegistrationStatus(
  actor: CanonicalFestivalActor,
  params: {
    registrationId: string;
    newStatus: RegistrationStatus;
    rejectionReason?: string;
    documentUrl?: string;
  }
): FgRegistration {
  const store = getFestivalStore();
  const reg = store.registrations.find((r) => r.id === params.registrationId);
  if (!reg) {
    throw new Error(`Data registrasi '${params.registrationId}' tidak ditemukan.`);
  }

  if (params.newStatus === "VERIFIED" || params.newStatus === "REJECTED") {
    if (
      !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Panitia", "Sekretaris", "Admin Registrasi"].includes(
        actor.role
      )
    ) {
      throw new Error(`DENY: Peran '${actor.role}' tidak berwenang memverifikasi atau menolak pendaftaran.`);
    }
  } else {
    assertFestivalOrgAccess(actor, reg.regionName, reg.villageName, reg.groupName);
  }

  const oldStatus = reg.status;
  reg.status = params.newStatus;
  if (params.rejectionReason !== undefined) reg.rejectionReason = params.rejectionReason;
  if (params.documentUrl !== undefined) reg.documentUrl = params.documentUrl;
  if (params.newStatus === "VERIFIED") {
    reg.verifiedBy = actor.username;
    reg.verifiedAt = new Date().toISOString();
  }
  reg.updatedAt = new Date().toISOString();
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "DATA_UPDATE",
    entityTable: "fg_registrations",
    entityId: reg.id,
    actor,
    regionName: reg.regionName,
    villageName: reg.villageName,
    groupName: reg.groupName,
    oldValues: { status: oldStatus },
    newValues: { status: reg.status, rejectionReason: reg.rejectionReason },
    description: `Perubahan status registrasi ${reg.registrationCode}: ${oldStatus} -> ${reg.status}.`,
  });

  return reg;
}

// ============================================================================
// 3. JUDGE MANAGEMENT & REPLACEMENT WITH AUDIT LOG (PART 2 SECTION 4)
// ============================================================================

export function replaceAssignedJudgeWithAudit(
  actor: CanonicalFestivalActor,
  params: {
    competitionId: string;
    judgePosition: 1 | 2 | 3;
    newJudgeId: string;
    reason: string;
  }
): FgJudgeAssignment {
  if (
    !["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Panitia", "Ketua Dewan Juri"].includes(
      actor.role
    )
  ) {
    throw new Error(`DENY: Peran '${actor.role}' tidak berwenang mengganti penugasan Dewan Juri.`);
  }
  if (!params.reason || params.reason.trim().length < 3) {
    throw new Error("Penggantian juri wajib menyertakan alasan pada audit log.");
  }

  const store = getFestivalStore();
  const newJudge = store.judges.find((j) => j.id === params.newJudgeId);
  if (!newJudge) {
    throw new Error(`Akun juri '${params.newJudgeId}' tidak ditemukan.`);
  }

  const assignment = store.judgeAssignments.find(
    (a) => a.competitionId === params.competitionId && a.judgePosition === params.judgePosition
  );
  if (!assignment) {
    throw new Error(
      `Penugasan Juri posisi ${params.judgePosition} pada kategori '${params.competitionId}' tidak ditemukan.`
    );
  }

  const previousJudgeId = assignment.judgeId;
  assignment.judgeId = newJudge.id;
  assignment.assignedBy = actor.username;
  saveFestivalStore(store);

  recordFestivalAudit({
    actionCategory: "ROLE_ASSIGNMENT",
    entityTable: "fg_judge_assignments",
    entityId: assignment.id,
    actor,
    oldValues: { judgeId: previousJudgeId, judgePosition: params.judgePosition },
    newValues: { judgeId: newJudge.id, judgePosition: params.judgePosition, reason: params.reason.trim() },
    description: `Penggantian Juri Posisi ${params.judgePosition} pada '${params.competitionId}': ${previousJudgeId} -> ${newJudge.id} (${newJudge.fullName}). Alasan: ${params.reason.trim()}`,
  });

  return assignment;
}

// ============================================================================
// 4. CHAMPIONSHIP STANDINGS (JUARA UMUM KELOMPOK & DESA)
// ============================================================================

export function calculateChampionshipStandings(): {
  groupStandings: FgChampionshipStanding[];
  villageStandings: FgChampionshipStanding[];
} {
  const store = getFestivalStore();
  const publishedResults = store.competitionResults.filter((r) => r.isPublished);

  const groupMap = new Map<string, FgChampionshipStanding>();
  for (const c of store.contingents) {
    groupMap.set(c.groupName, {
      id: `std-klp-${c.id}`,
      eventId: c.eventId,
      standingLevel: "KELOMPOK",
      regionName: c.regionName,
      villageName: c.villageName,
      groupName: c.groupName,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      honorableCount: 0,
      totalPoints: 0,
      standingRank: 1,
      isOverallChampion: false,
    });
  }

  const seenCompRegKeys = new Set<string>();
  for (const res of publishedResults) {
    // Anti-Double-Count Guard (Section 8: Tidak ada poin juara umum yang terhitung dua kali)
    const uniqueKey = `${res.competitionId}::${res.registrationId}`;
    if (seenCompRegKeys.has(uniqueKey)) {
      continue;
    }
    seenCompRegKeys.add(uniqueKey);

    const gStanding = groupMap.get(res.groupName);
    if (gStanding) {
      if (res.medalType === "GOLD") gStanding.goldCount += 1;
      else if (res.medalType === "SILVER") gStanding.silverCount += 1;
      else if (res.medalType === "BRONZE") gStanding.bronzeCount += 1;
      else gStanding.honorableCount += 1;
      gStanding.totalPoints = toDecimal2(gStanding.totalPoints + res.championshipPoints);
    }
  }

  const groupStandings = Array.from(groupMap.values()).sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.goldCount - a.goldCount ||
      b.silverCount - a.silverCount ||
      b.bronzeCount - a.bronzeCount
  );
  groupStandings.forEach((s, idx) => {
    s.standingRank = idx + 1;
    s.isOverallChampion = idx === 0 && s.totalPoints > 0;
  });

  const villageMap = new Map<string, FgChampionshipStanding>();
  for (const g of groupStandings) {
    const existing = villageMap.get(g.villageName) || {
      id: `std-desa-${g.villageName.toLowerCase().replace(/\s+/g, "-")}`,
      eventId: g.eventId,
      standingLevel: "DESA" as const,
      regionName: g.regionName,
      villageName: g.villageName,
      goldCount: 0,
      silverCount: 0,
      bronzeCount: 0,
      honorableCount: 0,
      totalPoints: 0,
      standingRank: 1,
      isOverallChampion: false,
    };
    existing.goldCount += g.goldCount;
    existing.silverCount += g.silverCount;
    existing.bronzeCount += g.bronzeCount;
    existing.honorableCount += g.honorableCount;
    existing.totalPoints = toDecimal2(existing.totalPoints + g.totalPoints);
    villageMap.set(g.villageName, existing);
  }

  const villageStandings = Array.from(villageMap.values()).sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.goldCount - a.goldCount ||
      b.silverCount - a.silverCount
  );
  villageStandings.forEach((s, idx) => {
    s.standingRank = idx + 1;
    s.isOverallChampion = idx === 0 && s.totalPoints > 0;
  });

  return { groupStandings, villageStandings };
}

export * from "./scoringAndArenaEngine";
export { resolveCanonicalFestivalActor };
export type { FestivalRole, CanonicalFestivalActor, FgTeam, FgCompetitionResult };
