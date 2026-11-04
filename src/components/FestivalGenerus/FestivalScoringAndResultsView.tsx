import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ALL_FESTIVAL_ROLES,
  FestivalStoreState,
  FestivalSubPage,
  FgChampionshipStanding,
  FgRegistration,
  ScoringSubmissionStatus,
} from "@/lib/festival/types";
import {
  CanonicalFestivalActor,
  getAccessibleFestivalPages,
} from "@/lib/festival/festivalAuth";
import {
  approveAndRatifyCompetitionResults,
  exportFestivalReportData,
  getScopedSubmissionsForActor,
  issueCompetitionCertificate,
  pressQuizBuzzer,
  recordQuizMatchScoreEvent,
  replaceAssignedJudgeWithAudit,
  resetQuizBuzzerAndSetTurn,
  reviseLockedSubmissionScore,
  revokeCompetitionApprovalWithAudit,
  submitJudgeScore,
  verifyFestivalDataIntegrity,
} from "@/lib/festival/festivalService";
import {
  Award,
  Scale,
  Shield,
  FileText,
  CheckCircle2,
  Database,
  History,
  Zap,
  Palette,
  Lock,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface FestivalScoringAndResultsViewProps {
  activeSubPage: FestivalSubPage;
  actor: CanonicalFestivalActor;
  store: FestivalStoreState;
  scopedRegistrations: FgRegistration[];
  groupStandings: FgChampionshipStanding[];
  villageStandings: FgChampionshipStanding[];
  onRefresh: () => void;
}

const ALL_38_FG_TABLES = [
  "fg_events", "fg_event_stages", "fg_competitions", "fg_competition_categories",
  "fg_competition_rules", "fg_arenas", "fg_event_settings",
  "fg_participants", "fg_registrations", "fg_teams", "fg_team_members",
  "fg_contingents", "fg_documents", "fg_checkins", "fg_participant_numbers", "fg_stage_advancements",
  "fg_judges", "fg_judge_assignments", "fg_judge_sessions", "fg_judge_reviews",
  "fg_scoring_templates", "fg_scoring_versions", "fg_scoring_criteria", "fg_scoring_penalties",
  "fg_scoring_submissions", "fg_scoring_details", "fg_scoring_results", "fg_tie_breaker_rules", "fg_scoring_revisions",
  "fg_artworks", "fg_arena_queues",
  "fg_quiz_rounds", "fg_quiz_questions", "fg_quiz_matches", "fg_quiz_responses",
  "fg_quiz_score_events", "fg_quiz_leaderboards",
  "fg_competition_results", "fg_awards", "fg_championship_configs", "fg_championship_points",
  "fg_championship_results", "fg_approvals", "fg_certificates", "fg_audit_logs",
];

export function FestivalScoringAndResultsView({
  activeSubPage,
  actor,
  store,
  scopedRegistrations,
  groupStandings,
  villageStandings,
  onRefresh,
}: FestivalScoringAndResultsViewProps) {
  const [selectedScoreRegId, setSelectedScoreRegId] = useState<string>("fg-reg-04");
  const [judgePos, setJudgePos] = useState<1 | 2 | 3>(1);
  const [criteriaInputs, setCriteriaInputs] = useState<Record<string, string>>({});
  const [penaltyInput, setPenaltyInput] = useState<string>("0.00");
  const [replaceCompId, setReplaceCompId] = useState<string>("fg-comp-hadist-sma");
  const [replacePos, setReplacePos] = useState<1 | 2 | 3>(3);
  const [replaceReason, setReplaceReason] = useState<string>("Berhalangan hadir mendadak");
  const [approvalCompId, setApprovalCompId] = useState<string>("fg-comp-tahfidz-sd");
  const [approvalNotesInput, setApprovalNotesInput] = useState<string>(
    "Berita Acara Pengesahan Resmi Hasil Penilaian Dewan Juri"
  );
  const [certRegId, setCertRegId] = useState<string>("fg-reg-01");

  const handleApproveCompetition = () => {
    try {
      const res = approveAndRatifyCompetitionResults(actor, {
        competitionId: approvalCompId,
        approvalNotes: approvalNotesInput,
      });
      toast.success(
        `Hasil kategori '${approvalCompId}' resmi DISAHKAN (${res.results.length} Pemenang) & dikunci dari perubahan sembarangan!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengesahkan hasil kategori.");
    }
  };

  const handleRevokeApproval = (compId: string) => {
    try {
      revokeCompetitionApprovalWithAudit(actor, {
        competitionId: compId,
        reason: "Pembukaan kunci resmi oleh Ketua Panitia / Superadmin untuk koreksi berita acara",
      });
      toast.info(`Kunci pengesahan kategori '${compId}' dibuka dengan catatan Audit Log.`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka kunci pengesahan.");
    }
  };

  const handleIssueCertificate = () => {
    try {
      const cert = issueCompetitionCertificate(actor, {
        registrationId: certRegId,
        recipientRole: "JUARA",
      });
      toast.success(
        `Sertifikat ${cert.certificateNumber} (${cert.predicateLabel}) untuk ${cert.recipientName} berhasil diterbitkan!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menerbitkan sertifikat.");
    }
  };

  const handleDownloadReport = (
    reportType: "REKAP_NILAI" | "JUARA_UMUM" | "PRESENSI_QR" | "AUDIT_LOG"
  ) => {
    try {
      const rep = exportFestivalReportData(actor, reportType);
      if (typeof window !== "undefined") {
        const blob = new Blob([rep.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", rep.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success(`Laporan '${rep.filename}' (${rep.rows.length} baris) berhasil diunduh!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunduh laporan.");
    }
  };

  const activeReg =
    store.registrations.find((r) => r.id === selectedScoreRegId) ||
    scopedRegistrations.find((r) => r.participantId !== null) ||
    store.registrations[0];
  const activeComp = store.competitions.find((c) => c.id === activeReg?.competitionId);
  const activeCriteria = store.criteria
    .filter((cr) => cr.competitionId === activeReg?.competitionId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const activeArtwork = store.artworks.find((a) => a.registrationId === activeReg?.id);
  const visibleSubmissions = activeReg
    ? getScopedSubmissionsForActor(actor, activeReg.id, "stg-penyisihan")
    : [];

  const handleJudgeSubmit = (statusMode: ScoringSubmissionStatus) => {
    if (!activeReg) return;
    try {
      const numericCriteria: Record<string, number> = {};
      for (const cr of activeCriteria) {
        const raw = criteriaInputs[cr.code] ?? "92.00";
        numericCriteria[cr.code] = parseFloat(raw);
      }
      const res = submitJudgeScore(actor, {
        registrationId: activeReg.id,
        stageId: "stg-penyisihan",
        judgePosition: judgePos,
        criteriaScores: numericCriteria,
        penaltyDeduction: parseFloat(penaltyInput || "0"),
        judgeNotes: `Penilaian [${statusMode}] Juri ${judgePos}`,
        artworkId: activeArtwork?.id,
        status: statusMode,
      });
      toast.success(
        `Nilai [${statusMode}] Juri ${judgePos}: ${res.submission.finalJudgeScore.toFixed(2)} tersimpan! Rata-rata (J1+J2+J3)/3 = ${res.aggregatedResult.finalScore.toFixed(2)}`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan nilai juri.");
    }
  };

  const handleOfficialRevision = (subId: string) => {
    try {
      const rev = reviseLockedSubmissionScore(actor, {
        submissionId: subId,
        newRawScore: 96.0,
        reason: "Koreksi resmi berita acara Ketua Dewan Juri",
      });
      toast.success(
        `Revisi resmi tersimpan (${rev.revision.previousScore.toFixed(2)} → ${rev.revision.newScore.toFixed(2)})!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal merevisi nilai terkunci.");
    }
  };

  const handleReplaceJudge = () => {
    try {
      const updated = replaceAssignedJudgeWithAudit(actor, {
        competitionId: replaceCompId,
        judgePosition: replacePos,
        newJudgeId: "jdg-04",
        reason: replaceReason,
      });
      toast.success(
        `Juri posisi #${updated.judgePosition} pada ${replaceCompId} berhasil diganti ke ${updated.judgeId} dengan Audit Log!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengganti penugasan juri.");
    }
  };

  const handleBuzzerLock = (teamId: string) => {
    try {
      const m = pressQuizBuzzer(actor, { matchId: "qm-01", teamId });
      toast.success(`Bel Rebutan dikunci oleh ${m.buzzerLockedByTeamId}!`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Buzzer sudah dikunci regu lain.");
    }
  };

  const handleResetBuzzer = () => {
    try {
      resetQuizBuzzerAndSetTurn(actor, {
        matchId: "qm-01",
        roundType: "GILIRAN",
        activeTurnTeamId: "fg-team-01",
      });
      toast.success("Bel buzzer dibuka kembali untuk soal berikutnya.");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset buzzer.");
    }
  };

  const handleQuizScore = (
    teamId: string,
    roundType: "GILIRAN" | "LEMPARAN" | "REBUTAN" | "PENALTY",
    isCorrect: boolean
  ) => {
    try {
      const updated = recordQuizMatchScoreEvent(actor, {
        matchId: "qm-01",
        teamId,
        roundType,
        isCorrect,
        reason: `${roundType} (${isCorrect ? "Benar" : "Salah"})`,
      });
      toast.success(
        `Skor ${updated.teamName} diperbarui menjadi ${updated.totalScore.toFixed(0)} poin!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui skor Cerdas Cermat.");
    }
  };

  if (activeSubPage === "dewan_juri") {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="h-4.5 w-4.5 text-emerald-600" />
              Manajemen Dewan Juri, Penugasan 3 Juri/Kategori & Penggantian Juri Ber-Audit
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Setiap juri hanya dapat menilai kategori yang ditugaskan; nilai juri lain disembunyikan sebelum ke-3 juri selesai
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {store.judges.map((j, idx) => (
              <div
                key={j.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    Juri #{idx + 1} ({j.username})
                  </Badge>
                  {j.isChiefJudge && (
                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold">
                      Ketua Juri
                    </Badge>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-900">{j.fullName}</div>
                <div className="text-xs text-emerald-700 font-semibold">{j.honorificTitle}</div>
                <div className="text-[11px] text-slate-600">Spesialisasi: {j.specialization}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={replaceCompId}
              onChange={(e) => setReplaceCompId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              {store.competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={replacePos}
              onChange={(e) => setReplacePos(Number(e.target.value) as 1 | 2 | 3)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              <option value={1}>Ganti Juri Posisi #1</option>
              <option value={2}>Ganti Juri Posisi #2</option>
              <option value={3}>Ganti Juri Posisi #3</option>
            </select>
            <input
              type="text"
              value={replaceReason}
              onChange={(e) => setReplaceReason(e.target.value)}
              placeholder="Alasan penggantian juri"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            />
            <Button
              onClick={handleReplaceJudge}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
            >
              Ganti ke Juri Cadangan (Audit Log)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (activeSubPage === "penilaian") {
    const match = store.quizMatches[0];
    return (
      <div className="space-y-6 text-left animate-fade-in">
        {/* 1. Digital Scoring Engine & Physical Artwork Judging */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-4.5 w-4.5 text-emerald-600" />
                Mesin Penilaian Digital Berbobot & Karya Fisik: Nilai Akhir = (J1 + J2 + J3) / 3
              </h3>
              <p className="text-xs text-slate-500">
                Mendukung Draft, Submit, Finalize (Lock), Penilaian Karya Fisik F4, dan Revisi Resmi Ketua Dewan Juri
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              Blind-Scoring Aktif ({visibleSubmissions.length} Nilai Juri Terlihat)
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Pilih Peserta / Registrasi
              </label>
              <select
                value={activeReg?.id || ""}
                onChange={(e) => setSelectedScoreRegId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              >
                {scopedRegistrations
                  .filter((r) => r.participantId !== null)
                  .map((r) => {
                    const c = store.competitions.find((x) => x.id === r.competitionId);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.displayNumber} — {c?.name} ({r.groupName})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Posisi Dewan Juri
              </label>
              <select
                value={judgePos}
                onChange={(e) => setJudgePos(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              >
                <option value={1}>Juri 1 (Utama)</option>
                <option value={2}>Juri 2</option>
                <option value={3}>Juri 3</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Potongan Penalti
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={penaltyInput}
                onChange={(e) => setPenaltyInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
              />
            </div>
          </div>

          {/* Physical Artwork Preview for Categories 1, 2, 3 */}
          {activeComp?.isPhysicalArtwork && activeArtwork && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                  <Palette className="h-3 w-3 mr-1 inline" /> ID Karya Fisik: {activeArtwork.artworkCode} (Kertas {activeArtwork.paperSize})
                </Badge>
                <div className="font-bold text-xs text-slate-900">
                  Tema Karya: {activeArtwork.titleOrTheme} • Lokasi Fisik: {activeArtwork.physicalStorageLocation}
                </div>
                <div className="text-[11px] text-slate-600">{activeArtwork.notes}</div>
              </div>
              <a
                href={activeArtwork.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-amber-800 underline shrink-0"
              >
                Lihat Foto Karya F4
              </a>
            </div>
          )}

          {/* Dynamic Criteria Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {activeCriteria.map((cr) => (
              <div key={cr.id} className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>{cr.name}</span>
                  <Badge className="bg-slate-100 text-slate-800 text-[9px]">
                    Bobot {cr.weightPercent}%
                  </Badge>
                </div>
                <input
                  type="number"
                  step="0.25"
                  min="50"
                  max="100"
                  value={criteriaInputs[cr.code] ?? "92.00"}
                  onChange={(e) =>
                    setCriteriaInputs((prev) => ({ ...prev, [cr.code]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleJudgeSubmit("DRAFT")}
              className="text-xs font-bold rounded-xl"
            >
              Simpan Draft (Autosave)
            </Button>
            <Button
              onClick={() => handleJudgeSubmit("SUBMITTED")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Submit Nilai Kriteria
            </Button>
            <Button
              onClick={() => handleJudgeSubmit("FINALIZED")}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              <Lock className="h-3.5 w-3.5 mr-1" /> Finalisasi & Kunci Nilai
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2 px-3">Rank</th>
                  <th className="py-2 px-3">Peserta & Kelompok</th>
                  <th className="py-2 px-3">Juri 1</th>
                  <th className="py-2 px-3">Juri 2</th>
                  <th className="py-2 px-3">Juri 3</th>
                  <th className="py-2 px-3">Nilai Akhir (J1+J2+J3)/3</th>
                  <th className="py-2 px-3">Tie-Breaker</th>
                  <th className="py-2 px-3">Status Kunci</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {store.scoringResults.map((sr) => {
                  const reg = store.registrations.find((r) => r.id === sr.registrationId);
                  const part = reg?.participantId
                    ? store.participants.find((p) => p.id === reg.participantId)
                    : null;
                  const sub1 = store.scoringSubmissions.find(
                    (s) => s.registrationId === sr.registrationId && s.judgePosition === 1
                  );
                  return (
                    <tr key={sr.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-black text-emerald-700">#{sr.rankNumber}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {part?.snapshotFullName || reg?.displayNumber} ({reg?.groupName})
                      </td>
                      <td className="py-2 px-3 font-mono">{sr.judge1Score.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono">{sr.judge2Score.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono">{sr.judge3Score.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono font-black text-emerald-700">
                        {sr.finalScore.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {sr.tieBreakerScore.toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        {sr.isLocked && sub1 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOfficialRevision(sub1.id)}
                            className="h-6 px-2 text-[9px] font-bold rounded"
                          >
                            LOCKED • Revisi Resmi
                          </Button>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-800 border-none text-[10px]">
                            OPEN
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2. Cerdas Cermat Engine (Turn, Buzzer Lock, & Score Event Log) */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-indigo-600" />
                Mesin Cerdas Cermat: Manajemen Giliran, Buzzer Lock & Log Perubahan Skor
              </h3>
              <p className="text-xs text-slate-500">
                Tie-Breaker CCA: 1. Skor Akhir → 2. Skor Rebutan → 3. Jumlah Jawaban Benar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                Buzzer Lock: {match?.buzzerLockedByTeamId || "TERBUKA"}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleResetBuzzer} className="h-7 text-[10px] font-bold rounded-lg">
                Reset Buzzer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {store.quizLeaderboards.map((qlb, idx) => (
              <div
                key={qlb.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Badge className="bg-slate-900 text-white text-[10px] font-bold">
                    Meja {String.fromCharCode(65 + idx)} • Rank #{qlb.rankInMatch}
                  </Badge>
                  <span className="font-display font-black text-lg text-indigo-700">
                    {qlb.totalScore.toFixed(0)} Pts
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">{qlb.teamName}</div>
                <div className="text-[11px] text-slate-500">
                  Giliran: {qlb.wajibScore} | Rebutan: {qlb.rebutanScore} | Benar: {qlb.correctAnswersCount || 0}x
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleBuzzerLock(qlb.teamId)}
                    className="h-7 px-2 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-lg"
                  >
                    Tekan Buzzer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleQuizScore(qlb.teamId, "GILIRAN", true)}
                    className="h-7 px-2 text-[10px] font-bold bg-emerald-600 text-white rounded-lg"
                  >
                    +100 Giliran
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleQuizScore(qlb.teamId, "REBUTAN", true)}
                    className="h-7 px-2 text-[10px] font-bold bg-indigo-600 text-white rounded-lg"
                  >
                    +100 Rebutan
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleQuizScore(qlb.teamId, "REBUTAN", false)}
                    className="h-7 px-2 text-[10px] font-bold bg-rose-600 text-white rounded-lg"
                  >
                    -50 Rebutan
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Log Perubahan Skor Cerdas Cermat (Soal, Tim, Operator, Skor Sebelum & Sesudah, Alasan, Waktu):
            </span>
            {store.quizScoreEvents.slice(0, 4).map((ev) => (
              <div
                key={ev.id}
                className="text-[11px] bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-lg flex items-center justify-between"
              >
                <span>
                  <strong>[{ev.questionId}]</strong> Regu {ev.teamId} • {ev.reason} (Operator: {ev.operatorUsername})
                </span>
                <span className="font-mono font-bold text-indigo-700">
                  {ev.scoreBefore} → {ev.scoreAfter} ({ev.pointsDelta >= 0 ? `+${ev.pointsDelta}` : ev.pointsDelta})
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (activeSubPage === "hasil_juara") {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        {/* Pengesahan Resmi Berita Acara & Kunci Hasil (Part 3 Section 8 & Section 9 #8) */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                Pengesahan Resmi Berita Acara & Kunci Hasil Kategori (fg_approvals)
              </h3>
              <p className="text-xs text-slate-500">
                Hasil yang sudah disahkan tidak dapat diubah sembarangan dan poin juara umum dijamin bebas hitung ganda
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              {(store.approvals || []).filter((a) => a.approvalStatus === "APPROVED").length} Kategori Disahkan
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <select
              value={approvalCompId}
              onChange={(e) => setApprovalCompId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            >
              {store.competitions.map((c) => {
                const isApv = (store.approvals || []).some(
                  (a) => a.competitionId === c.id && a.approvalStatus === "APPROVED"
                );
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {isApv ? "— [DISAHKAN]" : "— [BELUM DISAHKAN]"}
                  </option>
                );
              })}
            </select>
            <input
              type="text"
              value={approvalNotesInput}
              onChange={(e) => setApprovalNotesInput(e.target.value)}
              placeholder="Catatan berita acara pengesahan..."
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleApproveCompetition}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex-1"
              >
                Sahkan & Kunci Hasil
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRevokeApproval(approvalCompId)}
                className="text-xs font-bold rounded-xl"
              >
                Buka Kunci
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Klasemen Juara Umum Tingkat Desa (4 Desa Induk)
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {villageStandings.map((vs) => (
                <div
                  key={vs.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      #{vs.standingRank} {vs.villageName}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Emas: {vs.goldCount} | Perak: {vs.silverCount} | Perunggu: {vs.bronzeCount}
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs font-black">
                    {vs.totalPoints.toFixed(2)} Poin
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                Klasemen Juara Umum Tingkat Kelompok (Top 6 dari 30 Kelompok)
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {groupStandings.slice(0, 6).map((gs) => (
                <div
                  key={gs.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      #{gs.standingRank} {gs.groupName} ({gs.villageName})
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      🥇 {gs.goldCount} • 🥈 {gs.silverCount} • 🥉 {gs.bronzeCount}
                    </span>
                  </div>
                  <Badge className="bg-slate-900 text-white text-xs font-black">
                    {gs.totalPoints.toFixed(2)} Poin
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSubPage === "sertifikat" || activeSubPage === "laporan") {
    const integrity = verifyFestivalDataIntegrity();
    return (
      <div className="space-y-6 text-left animate-fade-in">
        {activeSubPage === "sertifikat" ? (
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-emerald-600" />
                Manajemen E-Sertifikat Juara & Peserta Terverifikasi QR (fg_certificates)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Proteksi Ketat: Sertifikat TIDAK DAPAT diterbitkan dari kategori yang hasilnya belum disahkan (fg_approvals)
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <select
                value={certRegId}
                onChange={(e) => setCertRegId(e.target.value)}
                className="sm:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              >
                {store.registrations.map((r) => {
                  const comp = store.competitions.find((c) => c.id === r.competitionId);
                  const isApv = (store.approvals || []).some(
                    (a) => a.competitionId === r.competitionId && a.approvalStatus === "APPROVED"
                  );
                  return (
                    <option key={r.id} value={r.id}>
                      {r.registrationCode} ({r.displayNumber} • {comp?.name}) — {isApv ? "DISAHKAN" : "BELUM DISAHKAN"}
                    </option>
                  );
                })}
              </select>
              <Button
                onClick={handleIssueCertificate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Terbitkan E-Sertifikat Resmi
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {store.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      {cert.certificateNumber}
                    </Badge>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold">
                      {cert.qrVerificationToken}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900">{cert.recipientName}</div>
                  <div className="text-xs text-slate-600">
                    {cert.predicateLabel} — {cert.competitionName} ({cert.groupName}, {cert.villageName})
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Download className="h-4.5 w-4.5 text-emerald-600" />
                Pusat Unduh Laporan Resmi & Verifikasi Integritas Data 9-Titik
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Unduh laporan resmi CSV/Excel-compatible untuk arsip kepanitiaan PPG Magetan Timur
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => handleDownloadReport("REKAP_NILAI")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl py-3"
              >
                <Download className="h-4 w-4 mr-1.5" /> Unduh Rekap Nilai 17 Lomba
              </Button>
              <Button
                onClick={() => handleDownloadReport("JUARA_UMUM")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl py-3"
              >
                <Download className="h-4 w-4 mr-1.5" /> Unduh Klasemen Juara Umum
              </Button>
              <Button
                onClick={() => handleDownloadReport("PRESENSI_QR")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl py-3"
              >
                <Download className="h-4 w-4 mr-1.5" /> Unduh Presensi QR Check-in
              </Button>
              <Button
                onClick={() => handleDownloadReport("AUDIT_LOG")}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl py-3"
              >
                <Download className="h-4 w-4 mr-1.5" /> Unduh Log Audit Keamanan
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Status Verifikasi Integritas Data (Part 3 Section 8):
                </span>
                <Badge
                  className={
                    integrity.valid
                      ? "bg-emerald-600 text-white text-[10px] font-bold"
                      : "bg-rose-600 text-white text-[10px] font-bold"
                  }
                >
                  {integrity.valid ? "100% VALID & KONSISTEN" : "PERLU PERHATIAN"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                <div>✅ Bebas Hitung Ganda Poin Juara Umum: {String(integrity.zeroDoubleChampionshipPoints)}</div>
                <div>✅ Bebas Duplikasi Hasil Lomba: {String(integrity.zeroDuplicateResults)}</div>
                <div>✅ Hasil Final = Data Sumber: {String(integrity.finalResultsMatchSource)}</div>
                <div>✅ Bebas Bocor Lintas Organisasi: {String(integrity.zeroCrossOrgLeakage)}</div>
                <div>✅ Revisi Wajib Alasan: {String(integrity.allRevisionsHaveReason)}</div>
                <div>✅ Standar Timestamp ISO-8601: {String(integrity.allTimestampsIsoValid)}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-emerald-600" />
            Matriks Hak Akses 15 Role & Keamanan 3-Lapis (Frontend + Backend API + PostgreSQL RLS)
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_FESTIVAL_ROLES.map((roleName) => {
            const pages = getAccessibleFestivalPages(roleName);
            const isCurrent = actor.role === roleName;
            return (
              <div
                key={roleName}
                className={`p-3.5 rounded-xl border text-xs ${
                  isCurrent
                    ? "bg-emerald-50 border-emerald-400 shadow-sm"
                    : "bg-slate-50/70 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{roleName}</span>
                  <Badge className="bg-slate-900 text-white text-[9px] font-bold">
                    {pages.length} Menu
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500">
                  Akses modul: {pages.slice(0, 4).join(", ")}
                  {pages.length > 4 ? ` +${pages.length - 4} lainnya` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-indigo-600" />
            Status Skema Database Modular Festival Generus ({ALL_38_FG_TABLES.length} Tabel `fg_*` Ber-RLS)
          </CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-1.5">
          {ALL_38_FG_TABLES.map((tbl) => (
            <span
              key={tbl}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono font-semibold text-slate-800"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              {tbl}
            </span>
          ))}
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-emerald-600" />
            Log Audit Aktivitas & Keamanan Lengkap (fg_audit_logs)
          </CardTitle>
        </CardHeader>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {store.auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between gap-4"
            >
              <div>
                <span className="font-bold text-slate-900">
                  [{log.actionCategory}] {log.actorUsername} ({log.actorRole})
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5">{log.description}</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {log.entityTable}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
