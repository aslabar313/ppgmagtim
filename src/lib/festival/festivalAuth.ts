// ============================================================================
// MODULE: FESTIVAL GENERUS — PART 1 & 2 (3-LAYER RBAC & JUDGE ISOLATION)
// ============================================================================

import { getUserDetails } from "../mockData";
import type {
  FestivalRole,
  FestivalSubPage,
  FgArena,
  FgCompetition,
  FgJudge,
  FgJudgeAssignment,
  FgScoringSubmission,
} from "./types";

export const CANONICAL_REGION_NAME = "Daerah Magetan Timur";

export const FESTIVAL_VILLAGE_GROUPS_MAP: Record<string, string[]> = {
  "Desa Selatan": [
    "Kelompok Karas",
    "Kelompok Patihan",
    "Kelompok Malang",
    "Kelompok Pandeyan",
    "Kelompok Soco",
    "Kelompok Setren",
    "Kelompok Bendo",
  ],
  "Desa Tengah": [
    "Kelompok Candi",
    "Kelompok Gombel",
    "Kelompok Barat",
    "Kelompok Ngumpul",
    "Kelompok Blaran 2",
    "Kelompok Sumberejo",
  ],
  "Desa Utara": [
    "Kelompok Blaran 1",
    "Kelompok Tawang",
    "Kelompok Jeruk",
    "Kelompok Singgahan 1",
    "Kelompok Singgahan 2",
    "Kelompok Karasan",
    "Kelompok Klampisan",
    "Kelompok Dinden",
    "Kelompok Wruk",
    "Kelompok Guyung",
  ],
  "Desa Timur": [
    "Kelompok Panggangung",
    "Kelompok Klagen Serut",
    "Kelompok Teseh",
    "Kelompok Dingin",
    "Kelompok Klayapan 1",
    "Kelompok Klayapan 2",
    "Kelompok Pencol",
  ],
};

export interface CanonicalFestivalActor {
  username: string;
  role: FestivalRole;
  regionName: string;
  villageName: string; // "Semua" | "Desa Selatan" | "Desa Tengah" | "Desa Utara" | "Desa Timur"
  groupName: string;   // "Semua" | "Kelompok Karas" | ...
  judgeId?: string;
  assignedCompetitionIds: string[];
  assignedArenaIds: string[];
}

export function normalizeGroupCanonical(groupInput: string): string {
  const trimmed = (groupInput || "").trim();
  if (!trimmed || trimmed === "Semua") return "Semua";
  const withoutPrefix = trimmed.replace(/^Kelompok\s+/i, "").trim();
  if (withoutPrefix.toLowerCase() === "waruk") return "Kelompok Wruk";
  if (withoutPrefix.toLowerCase() === "panggung") return "Kelompok Panggangung";
  return `Kelompok ${withoutPrefix}`;
}

export function normalizeVillageCanonical(villageInput: string): string {
  const trimmed = (villageInput || "").trim();
  if (!trimmed || trimmed === "Semua") return "Semua";
  if (trimmed.startsWith("Desa ")) return trimmed;
  return `Desa ${trimmed}`;
}

export function findVillageForGroup(groupInput: string): string | null {
  const canonicalGroup = normalizeGroupCanonical(groupInput);
  for (const [village, groups] of Object.entries(FESTIVAL_VILLAGE_GROUPS_MAP)) {
    if (groups.some((g) => g.toLowerCase() === canonicalGroup.toLowerCase())) {
      return village;
    }
  }
  return null;
}

export function normalizeFestivalRole(rawRole: string): FestivalRole {
  const r = (rawRole || "").trim();
  if (r === "Super Admin" || r === "Superadmin") return "Superadmin";
  if (r === "Admin Daerah") return "Admin Daerah";
  if (r === "Admin Desa") return "Admin Desa";
  if (r === "Admin Kelompok") return "Admin Kelompok";
  if (r === "Admin Festival") return "Admin Festival";
  if (r === "Ketua Panitia") return "Ketua Panitia";
  if (r === "Sekretaris") return "Sekretaris";
  if (r === "Admin Registrasi") return "Admin Registrasi";
  if (r === "Ketua Dewan Juri") return "Ketua Dewan Juri";
  if (r === "Juri") return "Juri";
  if (r === "Operator Arena") return "Operator Arena";
  if (r === "Operator Cerdas Cermat") return "Operator Cerdas Cermat";
  if (r === "Petugas Check-in") return "Petugas Check-in";
  if (r === "Pendamping" || r === "Pengajar") return "Pendamping";
  return "Viewer";
}

// Built-in specialized Festival Generus accounts for testing & operational use
const SPECIAL_FESTIVAL_ACCOUNTS: Record<string, CanonicalFestivalActor> = {
  adminfestival1: {
    username: "adminfestival1",
    role: "Admin Festival",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["*"],
  },
  ketuapanitia1: {
    username: "ketuapanitia1",
    role: "Ketua Panitia",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["*"],
  },
  sekretarisfestival1: {
    username: "sekretarisfestival1",
    role: "Sekretaris",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["*"],
  },
  adminregistrasi1: {
    username: "adminregistrasi1",
    role: "Admin Registrasi",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["*"],
  },
  ketuajuri1: {
    username: "ketuajuri1",
    role: "Ketua Dewan Juri",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    judgeId: "jdg-01",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["*"],
  },
  juri1: {
    username: "juri1",
    role: "Juri",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    judgeId: "jdg-01",
    assignedCompetitionIds: [
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
    ],
    assignedArenaIds: ["arn-01", "arn-04", "arn-06"],
  },
  juri2: {
    username: "juri2",
    role: "Juri",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    judgeId: "jdg-02",
    assignedCompetitionIds: [
      "fg-comp-mewarnai-paud",
      "fg-comp-kaligrafi-sd13",
      "fg-comp-kaligrafi-sd46",
      "fg-comp-adzan-sd",
      "fg-comp-tilawati-sd13",
      "fg-comp-quran-sd46",
      "fg-comp-nasehat-sd",
      "fg-comp-tahfidz-sd",
      "fg-comp-nasehat-smp",
      "fg-comp-nasehat-sma",
    ],
    assignedArenaIds: ["arn-01", "arn-02", "arn-04"],
  },
  juri3: {
    username: "juri3",
    role: "Juri",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    judgeId: "jdg-03",
    assignedCompetitionIds: [
      "fg-comp-mewarnai-paud",
      "fg-comp-kaligrafi-sd13",
      "fg-comp-kaligrafi-sd46",
      "fg-comp-adzan-sd",
      "fg-comp-tilawati-sd13",
      "fg-comp-quran-sd46",
      "fg-comp-nasehat-sd",
      "fg-comp-tahfidz-sd",
      "fg-comp-hadist-sma",
      "fg-comp-quran-makna-smp",
      "fg-comp-quran-makna-sma",
    ],
    assignedArenaIds: ["arn-01", "arn-03", "arn-04"],
  },
  juri4: {
    username: "juri4",
    role: "Juri",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    judgeId: "jdg-04",
    assignedCompetitionIds: ["fg-comp-hadist-sma"],
    assignedArenaIds: ["arn-03"],
  },
  operatorarena1: {
    username: "operatorarena1",
    role: "Operator Arena",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: [
      "fg-comp-tahfidz-sd",
      "fg-comp-adzan-sd",
      "fg-comp-mewarnai-paud",
      "fg-comp-kaligrafi-sd13",
    ],
    assignedArenaIds: ["arn-01", "arn-04"],
  },
  operatorcc1: {
    username: "operatorcc1",
    role: "Operator Cerdas Cermat",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["fg-comp-cca-sd", "fg-comp-cca-smpsma"],
    assignedArenaIds: ["arn-06"],
  },
  petugascheckin1: {
    username: "petugascheckin1",
    role: "Petugas Check-in",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: ["*"],
    assignedArenaIds: ["arn-01", "arn-02", "arn-04"],
  },
  pendampingkaras1: {
    username: "pendampingkaras1",
    role: "Pendamping",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Desa Selatan",
    groupName: "Kelompok Karas",
    assignedCompetitionIds: [],
    assignedArenaIds: [],
  },
  pendampingsoco1: {
    username: "pendampingsoco1",
    role: "Pendamping",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Desa Selatan",
    groupName: "Kelompok Soco",
    assignedCompetitionIds: [],
    assignedArenaIds: [],
  },
};

/**
 * Resolves the canonical identity, role, and organizational scope on the server/service layer.
 * Never trusts spoofed group_id, village_id, region_id, or judge_id sent by the client.
 */
export function resolveCanonicalFestivalActor(
  usernameInput: string,
  superadminSimulatedRole?: FestivalRole,
  superadminSimulatedScope?: {
    regionName?: string;
    villageName?: string;
    groupName?: string;
    judgeId?: string;
    assignedCompetitionIds?: string[];
    assignedArenaIds?: string[];
  }
): CanonicalFestivalActor {
  const cleanUser = (usernameInput || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

  if (SPECIAL_FESTIVAL_ACCOUNTS[cleanUser]) {
    return { ...SPECIAL_FESTIVAL_ACCOUNTS[cleanUser] };
  }

  const baseUser = getUserDetails(cleanUser);
  if (!baseUser) {
    throw new Error(
      `Akses ditolak (401): Identitas pengguna '${usernameInput}' tidak terdaftar di sistem.`
    );
  }

  const mappedRole = normalizeFestivalRole(baseUser.role);

  if (mappedRole === "Superadmin" && superadminSimulatedRole) {
    const simRole = normalizeFestivalRole(superadminSimulatedRole);
    const simGroup = superadminSimulatedScope?.groupName
      ? normalizeGroupCanonical(superadminSimulatedScope.groupName)
      : simRole === "Admin Kelompok" || simRole === "Pendamping"
        ? "Kelompok Karas"
        : "Semua";
    const simVillage = superadminSimulatedScope?.villageName
      ? normalizeVillageCanonical(superadminSimulatedScope.villageName)
      : simRole === "Admin Desa"
        ? "Desa Selatan"
        : simGroup !== "Semua"
          ? findVillageForGroup(simGroup) || "Desa Selatan"
          : "Semua";

    return {
      username: baseUser.username,
      role: simRole,
      regionName: superadminSimulatedScope?.regionName || CANONICAL_REGION_NAME,
      villageName: simVillage,
      groupName: simGroup,
      judgeId:
        superadminSimulatedScope?.judgeId ||
        (simRole === "Juri" || simRole === "Ketua Dewan Juri" ? "jdg-01" : undefined),
      assignedCompetitionIds:
        superadminSimulatedScope?.assignedCompetitionIds ||
        (simRole === "Juri"
          ? [
              "fg-comp-tahfidz-sd",
              "fg-comp-mewarnai-paud",
              "fg-comp-kaligrafi-sd13",
              "fg-comp-adzan-sd",
            ]
          : simRole === "Operator Cerdas Cermat"
            ? ["fg-comp-cca-sd", "fg-comp-cca-smpsma"]
            : ["*"]),
      assignedArenaIds:
        superadminSimulatedScope?.assignedArenaIds ||
        (simRole === "Operator Arena" ? ["arn-01", "arn-04"] : ["*"]),
    };
  }

  if (mappedRole === "Superadmin") {
    return {
      username: baseUser.username,
      role: "Superadmin",
      regionName: "Semua",
      villageName: "Semua",
      groupName: "Semua",
      assignedCompetitionIds: ["*"],
      assignedArenaIds: ["*"],
    };
  }

  if (mappedRole === "Admin Daerah") {
    return {
      username: baseUser.username,
      role: "Admin Daerah",
      regionName: CANONICAL_REGION_NAME,
      villageName: "Semua",
      groupName: "Semua",
      assignedCompetitionIds: ["*"],
      assignedArenaIds: ["*"],
    };
  }

  if (mappedRole === "Admin Desa") {
    return {
      username: baseUser.username,
      role: "Admin Desa",
      regionName: CANONICAL_REGION_NAME,
      villageName: normalizeVillageCanonical(baseUser.scope),
      groupName: "Semua",
      assignedCompetitionIds: [],
      assignedArenaIds: [],
    };
  }

  if (mappedRole === "Admin Kelompok" || mappedRole === "Pendamping") {
    const groupCanonical = normalizeGroupCanonical(baseUser.scope);
    const villageCanonical = findVillageForGroup(groupCanonical) || "Desa Selatan";
    return {
      username: baseUser.username,
      role: mappedRole,
      regionName: CANONICAL_REGION_NAME,
      villageName: villageCanonical,
      groupName: groupCanonical,
      assignedCompetitionIds: [],
      assignedArenaIds: [],
    };
  }

  return {
    username: baseUser.username,
    role: "Viewer",
    regionName: CANONICAL_REGION_NAME,
    villageName: "Semua",
    groupName: "Semua",
    assignedCompetitionIds: [],
    assignedArenaIds: [],
  };
}

export function canAccessFestivalOrg(
  actor: CanonicalFestivalActor,
  targetRegion?: string,
  targetVillage?: string,
  targetGroup?: string
): { allowed: boolean; reason?: string } {
  const reqRegion = (targetRegion || CANONICAL_REGION_NAME).trim();
  const reqVillage = targetVillage ? normalizeVillageCanonical(targetVillage) : "Semua";
  const reqGroup = targetGroup ? normalizeGroupCanonical(targetGroup) : "Semua";

  if (actor.role === "Superadmin") {
    return { allowed: true };
  }

  if (
    reqRegion &&
    reqRegion !== "Semua" &&
    actor.regionName !== "Semua" &&
    reqRegion.toLowerCase() !== actor.regionName.toLowerCase()
  ) {
    return {
      allowed: false,
      reason: `DENY: ${actor.role} (${actor.regionName}) tidak memiliki akses ke wilayah daerah '${reqRegion}'.`,
    };
  }

  if (
    [
      "Admin Daerah",
      "Admin Festival",
      "Ketua Panitia",
      "Sekretaris",
      "Admin Registrasi",
      "Ketua Dewan Juri",
    ].includes(actor.role)
  ) {
    return { allowed: true };
  }

  if (actor.role === "Admin Desa") {
    if (reqVillage !== "Semua" && reqVillage !== actor.villageName) {
      return {
        allowed: false,
        reason: `DENY: Admin Desa (${actor.villageName}) tidak diizinkan mengakses data '${reqVillage}'.`,
      };
    }
    if (reqGroup !== "Semua") {
      const groupVillage = findVillageForGroup(reqGroup);
      if (groupVillage !== actor.villageName) {
        return {
          allowed: false,
          reason: `DENY: Admin Desa (${actor.villageName}) tidak diizinkan mengakses '${reqGroup}' yang berada di '${groupVillage || "Desa Lain"}'.`,
        };
      }
    }
    return { allowed: true };
  }

  if (actor.role === "Admin Kelompok" || actor.role === "Pendamping") {
    if (reqVillage !== "Semua" && reqVillage !== actor.villageName) {
      return {
        allowed: false,
        reason: `DENY: ${actor.role} (${actor.groupName}) tidak dapat mengakses desa '${reqVillage}'.`,
      };
    }
    if (reqGroup !== "Semua" && reqGroup.toLowerCase() !== actor.groupName.toLowerCase()) {
      return {
        allowed: false,
        reason: `DENY: ${actor.role} (${actor.groupName}) tidak diizinkan mengakses kelompok lain ('${reqGroup}').`,
      };
    }
    return { allowed: true };
  }

  if (
    ["Juri", "Operator Arena", "Operator Cerdas Cermat", "Petugas Check-in", "Viewer"].includes(
      actor.role
    )
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "DENY: Peran tidak memiliki hak akses organisasi." };
}

export function assertFestivalOrgAccess(
  actor: CanonicalFestivalActor,
  targetRegion?: string,
  targetVillage?: string,
  targetGroup?: string
): void {
  const result = canAccessFestivalOrg(actor, targetRegion, targetVillage, targetGroup);
  if (!result.allowed) {
    throw new Error(result.reason || "Akses ditolak oleh kebijakan organisasi Festival Generus.");
  }
}

/**
 * Checks whether a judge is assigned to the given competition.
 * Dynamic assignments in `assignments` take precedence so judge replacement immediately updates permissions.
 */
export function canJudgeAccessCompetition(
  actor: CanonicalFestivalActor,
  competitionId: string,
  assignments: FgJudgeAssignment[],
  judges: FgJudge[]
): boolean {
  if (["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Dewan Juri"].includes(actor.role)) {
    return true;
  }
  if (actor.role !== "Juri") {
    return false;
  }

  const judgeRecord = judges.find(
    (j) => j.username.toLowerCase() === actor.username.toLowerCase() || j.id === actor.judgeId
  );

  // If assignments exist for this competition in the store, check dynamic assignment first
  const compAssignments = assignments.filter((a) => a.competitionId === competitionId);
  if (compAssignments.length > 0 && judgeRecord) {
    return compAssignments.some((a) => a.judgeId === judgeRecord.id);
  }

  if (actor.assignedCompetitionIds.includes("*")) return true;
  if (actor.assignedCompetitionIds.includes(competitionId)) return true;
  return false;
}

export function assertJudgeCompetitionAccess(
  actor: CanonicalFestivalActor,
  competitionId: string,
  assignments: FgJudgeAssignment[],
  judges: FgJudge[]
): void {
  if (!canJudgeAccessCompetition(actor, competitionId, assignments, judges)) {
    throw new Error(
      `DENY: Juri '${actor.username}' tidak ditugaskan pada cabang perlombaan '${competitionId}'.`
    );
  }
}

/**
 * Enforces Part 2 Judge Blind-Scoring Isolation:
 * A regular Juri cannot see other judges' scores on a registration unless:
 * 1. The competition explicitly enables `allowPeerScorePreviewBeforeLock`, OR
 * 2. All 3 judges have completed (`SUBMITTED` or `FINALIZED`) their submissions for that registration.
 */
export function canActorViewSubmissionDetail(
  actor: CanonicalFestivalActor,
  submission: FgScoringSubmission,
  allSubmissionsForReg: FgScoringSubmission[],
  competition?: FgCompetition
): boolean {
  if (
    [
      "Superadmin",
      "Admin Daerah",
      "Admin Festival",
      "Ketua Panitia",
      "Ketua Dewan Juri",
    ].includes(actor.role)
  ) {
    return true;
  }

  if (actor.role === "Juri") {
    if (actor.judgeId === submission.judgeId) {
      return true;
    }
    if (competition?.allowPeerScorePreviewBeforeLock) {
      return true;
    }
    const completedCount = allSubmissionsForReg.filter(
      (s) => s.submissionStatus === "SUBMITTED" || s.submissionStatus === "FINALIZED"
    ).length;
    return completedCount >= 3;
  }

  return true;
}

export function canOperatorAccessArena(
  actor: CanonicalFestivalActor,
  arenaId: string,
  arenas: FgArena[]
): boolean {
  if (
    ["Superadmin", "Admin Daerah", "Admin Festival", "Ketua Panitia"].includes(actor.role)
  ) {
    return true;
  }
  if (!["Operator Arena", "Petugas Check-in", "Operator Cerdas Cermat"].includes(actor.role)) {
    return false;
  }
  if (actor.assignedArenaIds.includes("*") || actor.assignedArenaIds.includes(arenaId)) {
    return true;
  }
  const arena = arenas.find((a) => a.id === arenaId);
  if (!arena) return false;
  return (
    arena.operatorUsername === actor.username ||
    arena.checkinOfficerUsername === actor.username
  );
}

export function getAccessibleFestivalPages(role: FestivalRole): FestivalSubPage[] {
  switch (role) {
    case "Superadmin":
    case "Admin Daerah":
    case "Admin Festival":
    case "Ketua Panitia":
      return [
        "dashboard",
        "manajemen_festival",
        "cabang_perlombaan",
        "peserta_kontingen",
        "verifikasi_peserta",
        "jadwal_arena",
        "dewan_juri",
        "penilaian",
        "hasil_juara",
        "sertifikat",
        "laporan",
        "pengaturan",
      ];
    case "Sekretaris":
      return [
        "dashboard",
        "manajemen_festival",
        "cabang_perlombaan",
        "peserta_kontingen",
        "verifikasi_peserta",
        "jadwal_arena",
        "hasil_juara",
        "sertifikat",
        "laporan",
      ];
    case "Admin Registrasi":
      return [
        "dashboard",
        "cabang_perlombaan",
        "peserta_kontingen",
        "verifikasi_peserta",
        "jadwal_arena",
        "sertifikat",
        "laporan",
      ];
    case "Admin Desa":
    case "Admin Kelompok":
    case "Pendamping":
      return [
        "dashboard",
        "cabang_perlombaan",
        "peserta_kontingen",
        "verifikasi_peserta",
        "jadwal_arena",
        "hasil_juara",
        "sertifikat",
        "laporan",
      ];
    case "Ketua Dewan Juri":
      return [
        "dashboard",
        "cabang_perlombaan",
        "jadwal_arena",
        "dewan_juri",
        "penilaian",
        "hasil_juara",
        "laporan",
      ];
    case "Juri":
      return ["dashboard", "cabang_perlombaan", "jadwal_arena", "dewan_juri", "penilaian", "hasil_juara"];
    case "Operator Arena":
    case "Operator Cerdas Cermat":
      return ["dashboard", "jadwal_arena", "penilaian", "hasil_juara"];
    case "Petugas Check-in":
      return ["dashboard", "peserta_kontingen", "verifikasi_peserta", "jadwal_arena"];
    case "Viewer":
    default:
      return ["dashboard", "cabang_perlombaan", "jadwal_arena", "hasil_juara"];
  }
}
