// ============================================================================
// MODULE: FESTIVAL GENERUS — PART 1 & PART 2 (TYPES & DATA CONTRACTS)
// ============================================================================

export type FestivalRole =
  | "Superadmin"
  | "Admin Daerah"
  | "Admin Desa"
  | "Admin Kelompok"
  | "Admin Festival"
  | "Ketua Panitia"
  | "Sekretaris"
  | "Admin Registrasi"
  | "Ketua Dewan Juri"
  | "Juri"
  | "Operator Arena"
  | "Operator Cerdas Cermat"
  | "Petugas Check-in"
  | "Viewer"
  | "Pendamping";

export const ALL_FESTIVAL_ROLES: FestivalRole[] = [
  "Superadmin",
  "Admin Daerah",
  "Admin Desa",
  "Admin Kelompok",
  "Admin Festival",
  "Ketua Panitia",
  "Sekretaris",
  "Admin Registrasi",
  "Ketua Dewan Juri",
  "Juri",
  "Operator Arena",
  "Operator Cerdas Cermat",
  "Petugas Check-in",
  "Viewer",
  "Pendamping",
];

export type EducationLevel =
  | "PAUD/TK"
  | "SD 1-3"
  | "SD 4-6"
  | "SD"
  | "SMP"
  | "SMA/SMK"
  | "SMP-SMA";

export const ALL_EDUCATION_LEVELS: EducationLevel[] = [
  "PAUD/TK",
  "SD 1-3",
  "SD 4-6",
  "SD",
  "SMP",
  "SMA/SMK",
  "SMP-SMA",
];

export type FestivalSubPage =
  | "dashboard"
  | "manajemen_festival"
  | "cabang_perlombaan"
  | "peserta_kontingen"
  | "verifikasi_peserta"
  | "jadwal_arena"
  | "dewan_juri"
  | "penilaian"
  | "hasil_juara"
  | "sertifikat"
  | "laporan"
  | "pengaturan";

export type FestivalEventStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "ONGOING"
  | "SCORING_LOCKED"
  | "COMPLETED"
  | "ARCHIVED";

export type CompetitionType = "INDIVIDUAL" | "TEAM" | "QUIZ_TEAM";

export type RegistrationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CHECKED_IN"
  | "DISQUALIFIED";

export type CheckinStatus = "PENDING" | "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type ArenaCallStatus =
  | "WAITING"
  | "CALLED"
  | "PERFORMING"
  | "COMPLETED"
  | "SKIPPED"
  | "ABSENT";

export type ScoringSubmissionStatus = "DRAFT" | "SUBMITTED" | "FINALIZED" | "LOCKED";

export type QuizRoundType = "GILIRAN" | "WAJIB" | "LEMPARAN" | "REBUTAN" | "PENALTY";

export type AuditActionCategory =
  | "DATA_CREATE"
  | "DATA_UPDATE"
  | "DATA_DELETE"
  | "ACCESS_CHANGE"
  | "ROLE_ASSIGNMENT"
  | "SCORE_CHANGE"
  | "RESULT_APPROVAL"
  | "RESULT_PUBLISH";

// ----------------------------------------------------------------------------
// A. Core Festival & 17 Competition Categories
// ----------------------------------------------------------------------------

export interface FgEvent {
  id: string;
  code: string;
  name: string;
  theme: string;
  hijriYear: string;
  gregorianYear: number;
  regionName: string;
  hostVillageName: string;
  locationName: string;
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: FestivalEventStatus;
  totalCategories: number;
  judgesPerCompetition: number;
  description: string;
  createdBy: string;
  updatedAt: string;
}

export interface FgEventStage {
  id: string;
  eventId: string;
  stageCode: "PENYISIHAN" | "SEMIFINAL" | "FINAL";
  stageName: string;
  sequenceOrder: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export interface FgCompetitionCategory {
  id: string;
  eventId: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FgArena {
  id: string;
  eventId: string;
  code: string;
  name: string;
  buildingOrZone: string;
  capacity: number;
  operatorUsername: string;
  checkinOfficerUsername: string;
  status: "READY" | "ACTIVE" | "BREAK" | "CLOSED";
  notes: string;
}

export interface MaleBonusConfig {
  enabled: boolean;
  /** Null until explicitly approved by committee */
  bonusPoints: number | null;
  approvedByCommittee: boolean;
  approvedBy?: string;
  description: string;
}

export interface FgCompetition {
  id: string; // Consistent internal ID (e.g. fg-comp-mewarnai-paud), not sequence number
  eventId: string;
  categoryId: string;
  arenaId: string;
  code: string;
  name: string;
  competitionType: CompetitionType;
  educationLevel: EducationLevel;
  genderScope: "PUTRA" | "PUTRI" | "MIXED" | "PUTRA_PUTRI_SEPARATE";
  ageSegment: string;
  minAge: number;
  maxAge: number;
  minMembersPerTeam: number;
  maxMembersPerTeam: number;
  maxQuotaPerGroup: number;
  maxQuotaPerVillage: number;
  judgeCount: 3;
  scoringMethod: "AVERAGE_3_JUDGES" | "SUM_3_JUDGES" | "QUIZ_POINT_SYSTEM";
  scheduleStart: string;
  scheduleEnd: string;
  status: "SCHEDULED" | "CHECKIN" | "ONGOING" | "SCORING_COMPLETED" | "PUBLISHED";
  timerDurationMinutes?: number;
  themeText?: string;
  materialText?: string;
  equipmentNotes?: string;
  isPhysicalArtwork?: boolean;
  isAsadOfficialRules?: boolean;
  rulesConfirmedByCommittee?: boolean;
  maleBonusConfig?: MaleBonusConfig;
  allowPeerScorePreviewBeforeLock?: boolean;
}

export interface FgCompetitionRule {
  id: string;
  competitionId: string;
  ruleNumber: number;
  ruleTitle: string;
  ruleDescription: string;
  durationMinutes: number;
  isMandatoryDocument: boolean;
  disqualificationCondition: string;
}

// ----------------------------------------------------------------------------
// B. Peserta, Kontingen, Artwork & Arena Queue
// ----------------------------------------------------------------------------

export interface FgContingent {
  id: string;
  eventId: string;
  regionName: string;
  villageName: string;
  groupId: string;
  groupName: string;
  contingentCode: string;
  leaderName: string;
  leaderWhatsapp: string;
  pendampingUsername: string;
  totalParticipants: number;
  totalTeams: number;
  verificationStatus: "DRAFT" | "SUBMITTED" | "VERIFIED" | "LOCKED";
  updatedAt: string;
}

export interface FgParticipant {
  id: string;
  eventId: string;
  contingentId: string;
  generusId: string;
  snapshotFullName: string;
  snapshotNis: string;
  snapshotGender: "Laki-laki" | "Perempuan";
  snapshotBirthDate: string;
  snapshotAge: number;
  snapshotEducationLevel: EducationLevel;
  snapshotCategory: "Caberawit" | "Pra-Remaja" | "Remaja";
  snapshotParentName: string;
  snapshotParentWhatsapp: string;
  snapshotGroupId: string;
  snapshotGroupName: string;
  snapshotVillageName: string;
  snapshotRegionName: string;
  photoUrl?: string;
  eligibilityStatus: "PENDING" | "VERIFIED" | "INELIGIBLE";
  eligibilityNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface FgTeam {
  id: string;
  eventId: string;
  competitionId: string;
  contingentId: string;
  teamCode: string;
  teamName: string;
  educationLevel?: EducationLevel;
  captainParticipantId: string;
  memberParticipantIds: string[]; // 2-3 members for Cerdas Cermat
  regionName: string;
  villageName: string;
  groupName: string;
  memberCount: number;
  status: "DRAFT" | "ACTIVE" | "DISQUALIFIED";
  createdBy: string;
}

export interface FgRegistration {
  id: string;
  eventId: string;
  competitionId: string;
  contingentId: string;
  /** Exactly ONE of participantId OR teamId must be non-null */
  participantId: string | null;
  /** Exactly ONE of participantId OR teamId must be non-null */
  teamId: string | null;
  registrationCode: string;
  regionName: string;
  villageName: string;
  groupName: string;
  status: RegistrationStatus;
  displayNumber?: string;
  turnOrder?: number;
  checkinStatus?: CheckinStatus;
  documentUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FgArtwork {
  id: string;
  eventId: string;
  competitionId: string;
  registrationId: string;
  participantId: string;
  artworkCode: string;
  titleOrTheme: string;
  paperSize: "F4" | "A4" | "A3";
  photoUrl: string;
  physicalStorageLocation: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface FgArenaQueue {
  id: string;
  eventId: string;
  arenaId: string;
  competitionId: string;
  registrationId: string;
  displayNumber: string;
  entryName: string;
  groupName: string;
  villageName: string;
  queueNumber: number;
  callStatus: ArenaCallStatus;
  attendanceStatus: CheckinStatus;
  timerDurationSeconds: number;
  elapsedSeconds: number;
  isOvertime: boolean;
  calledAt?: string;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ScheduleConflictItem {
  conflictType: "ARENA_CONFLICT" | "JUDGE_CONFLICT" | "PARTICIPANT_CONFLICT";
  entityId: string;
  entityName: string;
  competitionAId: string;
  competitionAName: string;
  competitionBId: string;
  competitionBName: string;
  overlapWindow: string;
  description: string;
}

// ----------------------------------------------------------------------------
// C. Juri & D. Digital Scoring Engine ((J1 + J2 + J3) / 3)
// ----------------------------------------------------------------------------

export interface FgJudge {
  id: string;
  eventId: string;
  username: string;
  fullName: string;
  honorificTitle: string;
  originUnit: string;
  specialization: string;
  whatsapp: string;
  isChiefJudge: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface FgJudgeAssignment {
  id: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  judgeId: string;
  judgePosition: 1 | 2 | 3;
  arenaId: string;
  isLeadJudge: boolean;
  assignedBy: string;
}

export interface FgScoringCriteria {
  id: string;
  competitionId: string;
  code: string;
  name: string;
  weightPercent: number;
  minScore: number;
  maxScore: number;
  sequenceOrder: number;
  isTieBreakerPriority: boolean;
  confirmedByCommittee?: boolean;
}

export interface FgScoringSubmission {
  id: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  registrationId: string;
  judgeId: string;
  judgePosition: 1 | 2 | 3;
  criteriaScores?: Record<string, number>;
  rawScore: number;
  penaltyDeduction: number;
  finalJudgeScore: number;
  submissionStatus: ScoringSubmissionStatus;
  judgeNotes: string;
  artworkId?: string;
  submittedAt: string;
}

export interface FgScoringResult {
  id: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  registrationId: string;
  judge1Score: number;
  judge2Score: number;
  judge3Score: number;
  totalJudgeScore: number;
  averageJudgeScore: number;
  totalPenalty: number;
  bonusApplied?: number;
  finalScore: number;
  tieBreakerScore: number;
  criteriaAverages?: Record<string, number>;
  tieBreakDeliberationNote?: string;
  rankNumber: number;
  isLocked: boolean;
  lockedBy?: string;
}

export interface FgScoringRevision {
  id: string;
  eventId: string;
  submissionId: string;
  registrationId: string;
  judgeId: string;
  previousScore: number;
  newScore: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// E. Cerdas Cermat Engine
// ----------------------------------------------------------------------------

export interface FgQuizMatch {
  id: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  arenaId: string;
  matchCode: string;
  matchName: string;
  teamAId: string;
  teamBId: string;
  teamCId: string;
  winnerTeamId: string | null;
  operatorUsername: string;
  chiefJudgeId: string;
  matchStatus: "SCHEDULED" | "LIVE" | "COMPLETED" | "VERIFIED";
  activeRoundType?: QuizRoundType;
  activeTurnTeamId?: string | null;
  buzzerLockedByTeamId?: string | null;
  questionTimerSeconds?: number;
  scoringRulesConfirmedByCommittee?: boolean;
  giliranCorrectPoints?: number;
  giliranWrongPoints?: number;
  rebutanCorrectPoints?: number;
  rebutanWrongPoints?: number;
}

export interface FgQuizScoreEvent {
  id: string;
  eventId: string;
  matchId: string;
  roundType: QuizRoundType;
  questionNumber: number;
  questionId: string;
  teamId: string;
  answerSummary: string;
  isCorrect: boolean;
  scoreBefore: number;
  pointsDelta: number;
  scoreAfter: number;
  reason: string;
  operatorUsername: string;
  judgeId?: string;
  recordedAt: string;
}

export interface FgQuizLeaderboard {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  groupName: string;
  villageName: string;
  wajibScore: number;
  lemparanScore: number;
  rebutanScore: number;
  penaltyScore: number;
  totalScore: number;
  correctAnswersCount?: number;
  wrongAnswersCount?: number;
  rankInMatch: number;
  isAdvancing: boolean;
}

// ----------------------------------------------------------------------------
// F. Hasil, Juara Umum, Sertifikat & Audit Logs
// ----------------------------------------------------------------------------

export interface FgCompetitionResult {
  id: string;
  eventId: string;
  competitionId: string;
  registrationId: string;
  contingentId: string;
  entryName: string;
  regionName: string;
  villageName: string;
  groupName: string;
  finalScore: number;
  finalRank: number;
  predicateLabel: "Juara 1" | "Juara 2" | "Juara 3" | "Harapan 1" | "Harapan 2" | "Harapan 3";
  medalType: "GOLD" | "SILVER" | "BRONZE" | "HONORABLE";
  championshipPoints: number;
  isPublished: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface FgChampionshipStanding {
  id: string;
  eventId: string;
  standingLevel: "KELOMPOK" | "DESA";
  regionName: string;
  villageName: string;
  groupName?: string;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  honorableCount: number;
  totalPoints: number;
  standingRank: number;
  isOverallChampion: boolean;
}

export interface FgCertificate {
  id: string;
  eventId: string;
  certificateNumber: string;
  competitionId?: string;
  registrationId?: string;
  recipientName: string;
  recipientRole: "PESERTA" | "JUARA" | "JURI" | "PANITIA" | "PENDAMPING";
  competitionName: string;
  predicateLabel: string;
  regionName: string;
  villageName: string;
  groupName: string;
  qrVerificationToken: string;
  issuedBy: string;
  issuedAt: string;
}

export interface FgCheckinRecord {
  id: string;
  eventId: string;
  competitionId: string;
  registrationId: string;
  arenaId: string;
  qrTokenUsed: string;
  checkinStatus: CheckinStatus;
  checkedInBy: string;
  checkedInAt: string;
  notes?: string;
}

export interface FgApprovalRecord {
  id: string;
  eventId: string;
  competitionId: string;
  stageId: string;
  approvalStatus: "PENDING" | "APPROVED" | "REVOKED";
  approvedBy: string;
  approvedRole: FestivalRole;
  approvedAt: string;
  approvalNotes: string;
  revokedBy?: string;
  revokedAt?: string;
  revokeReason?: string;
}

export interface FgChampionshipConfig {
  id: string;
  eventId: string;
  goldPoints: number;
  silverPoints: number;
  bronzePoints: number;
  honorable1Points: number;
  honorable2Points: number;
  honorable3Points: number;
  updatedBy: string;
  updatedAt: string;
}

export interface FinalDashboardMetrics {
  totalParticipants: number;
  totalTeams: number;
  totalCategories: number;
  totalJudges: number;
  totalJudgeAssignments: number;
  activeSchedulesCount: number;
  arenaStatuses: Array<{
    arenaId: string;
    code: string;
    name: string;
    locationDetail: string;
    status: "READY" | "ACTIVE" | "BREAK" | "CLOSED";
    operatorUsername: string;
    activeCompetitionCount: number;
    performingEntryName: string | null;
  }>;
  currentlyCompetingEntries: Array<{
    queueId: string;
    registrationId: string;
    displayNumber: string;
    entryName: string;
    competitionName: string;
    arenaName: string;
    callStatus: ArenaCallStatus;
    groupName: string;
    villageName: string;
  }>;
  scoringProgressPercent: number;
  totalExpectedJudgeSubmissions: number;
  completedJudgeSubmissions: number;
  completedCategoriesCount: number;
  ratifiedCategoriesCount: number;
  provisionalPointsTotal: number;
  groupStandings: FgChampionshipStanding[];
  villageStandings: FgChampionshipStanding[];
}

export interface FgAuditLog {
  id: string;
  eventId: string;
  actionCategory: AuditActionCategory;
  entityTable: string;
  entityId: string;
  actorUsername: string;
  actorRole: FestivalRole;
  actorScope: string;
  regionName?: string;
  villageName?: string;
  groupName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description: string;
  createdAt: string;
}

export interface FestivalStoreState {
  events: FgEvent[];
  stages: FgEventStage[];
  categories: FgCompetitionCategory[];
  arenas: FgArena[];
  competitions: FgCompetition[];
  rules: FgCompetitionRule[];
  contingents: FgContingent[];
  participants: FgParticipant[];
  teams: FgTeam[];
  registrations: FgRegistration[];
  artworks: FgArtwork[];
  arenaQueues: FgArenaQueue[];
  checkins?: FgCheckinRecord[];
  judges: FgJudge[];
  judgeAssignments: FgJudgeAssignment[];
  criteria: FgScoringCriteria[];
  scoringSubmissions: FgScoringSubmission[];
  scoringResults: FgScoringResult[];
  scoringRevisions: FgScoringRevision[];
  quizMatches: FgQuizMatch[];
  quizScoreEvents: FgQuizScoreEvent[];
  quizLeaderboards: FgQuizLeaderboard[];
  competitionResults: FgCompetitionResult[];
  approvals?: FgApprovalRecord[];
  championshipConfig?: FgChampionshipConfig;
  certificates: FgCertificate[];
  auditLogs: FgAuditLog[];
  updatedAt: string;
}
