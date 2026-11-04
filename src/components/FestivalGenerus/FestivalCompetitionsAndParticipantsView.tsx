import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getGenerus } from "@/lib/mockData";
import {
  ALL_EDUCATION_LEVELS,
  ArenaCallStatus,
  EducationLevel,
  FestivalStoreState,
  FestivalSubPage,
  FgCompetition,
  FgContingent,
  FgParticipant,
  FgRegistration,
  RegistrationStatus,
} from "@/lib/festival/types";
import { CanonicalFestivalActor } from "@/lib/festival/festivalAuth";
import {
  createCompetitionRegistration,
  detectScheduleConflicts,
  enrollParticipantFromGenerus,
  performQrCheckin,
  registerTeamForCompetition,
  updateArenaParticipantQueue,
  updateCompetitionCategoryConfig,
  updateRegistrationStatus,
} from "@/lib/festival/festivalService";
import {
  Trophy,
  Users,
  CheckCircle2,
  MapPin,
  Calendar,
  Plus,
  FileCheck,
  Clock,
  AlertTriangle,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

interface FestivalCompetitionsAndParticipantsViewProps {
  activeSubPage: FestivalSubPage;
  actor: CanonicalFestivalActor;
  store: FestivalStoreState;
  scopedCompetitions: FgCompetition[];
  scopedContingents: FgContingent[];
  scopedParticipants: FgParticipant[];
  scopedRegistrations: FgRegistration[];
  onRefresh: () => void;
}

export function FestivalCompetitionsAndParticipantsView({
  activeSubPage,
  actor,
  store,
  scopedCompetitions,
  scopedContingents,
  scopedParticipants,
  scopedRegistrations,
  onRefresh,
}: FestivalCompetitionsAndParticipantsViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedGenerusId, setSelectedGenerusId] = useState<string>("");
  const [selectedEduLevel, setSelectedEduLevel] = useState<EducationLevel>("SD 4-6");
  const [selectedRegCompId, setSelectedRegCompId] = useState<string>("fg-comp-tahfidz-sd");
  const [selectedRegPartId, setSelectedRegPartId] = useState<string>("");

  // Team Registration State (2-3 members for Cerdas Cermat)
  const [teamCompId, setTeamCompId] = useState<string>("fg-comp-cca-sd");
  const [teamNameInput, setTeamNameInput] = useState<string>("");
  const [teamMember1, setTeamMember1] = useState<string>("fg-part-01");
  const [teamMember2, setTeamMember2] = useState<string>("fg-part-08");
  const [teamMember3, setTeamMember3] = useState<string>("");
  const [qrInputToken, setQrInputToken] = useState<string>("REG-2026-MWR-001");

  const handleQrCheckinSubmit = () => {
    try {
      const rec = performQrCheckin(actor, { qrTokenOrCode: qrInputToken });
      toast.success(
        `Check-in QR Berhasil! Token '${rec.qrTokenUsed}' tercatat hadir di ${rec.arenaId}.`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal melakukan QR Check-in.");
    }
  };

  const generusMasterList = getGenerus().filter((g) => g.usia <= 19);
  const scheduleConflicts = detectScheduleConflicts();

  const handleEnrollGenerus = () => {
    if (!selectedGenerusId) {
      toast.error("Pilih santri/generus terlebih dahulu.");
      return;
    }
    try {
      const p = enrollParticipantFromGenerus(
        actor,
        selectedGenerusId,
        undefined,
        selectedEduLevel
      );
      toast.success(
        `Peserta '${p.snapshotFullName}' (${p.snapshotEducationLevel} - ${p.snapshotGroupName}) berhasil didaftarkan!`
      );
      setSelectedGenerusId("");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mendaftarkan peserta.");
    }
  };

  const handleRegisterCompetition = () => {
    if (!selectedRegPartId) {
      toast.error("Pilih peserta untuk didaftarkan ke cabang lomba.");
      return;
    }
    try {
      const reg = createCompetitionRegistration(actor, {
        competitionId: selectedRegCompId,
        participantId: selectedRegPartId,
        teamId: null,
      });
      toast.success(
        `Registrasi lomba berhasil dibuat (${reg.registrationCode} • No. Peserta: ${reg.displayNumber})!`
      );
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat registrasi.");
    }
  };

  const handleRegisterTeam = () => {
    if (!teamNameInput.trim()) {
      toast.error("Masukkan nama regu/tim Cerdas Cermat.");
      return;
    }
    try {
      const members = [teamMember1, teamMember2, teamMember3].filter(Boolean);
      const team = registerTeamForCompetition(actor, {
        competitionId: teamCompId,
        teamName: teamNameInput,
        memberParticipantIds: members,
      });
      const reg = createCompetitionRegistration(actor, {
        competitionId: teamCompId,
        participantId: null,
        teamId: team.id,
      });
      toast.success(
        `Tim '${team.teamName}' (${team.memberCount} peserta) terdaftar dengan No. Peserta ${reg.displayNumber}!`
      );
      setTeamNameInput("");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mendaftarkan tim beregu.");
    }
  };

  const handleStatusChange = (regId: string, newStatus: RegistrationStatus) => {
    try {
      const updated = updateRegistrationStatus(actor, {
        registrationId: regId,
        newStatus,
      });
      toast.success(`Status registrasi ${updated.registrationCode} diubah ke ${updated.status}.`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status registrasi.");
    }
  };

  const handleQueueCall = (regId: string, callStatus: ArenaCallStatus, elapsedSeconds?: number) => {
    try {
      const q = updateArenaParticipantQueue(actor, {
        registrationId: regId,
        callStatus,
        elapsedSeconds,
      });
      toast.success(`Status arena ${q.displayNumber}: ${q.callStatus}${q.isOvertime ? " (OVERTIME)" : ""}`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui antrean arena.");
    }
  };

  const handleConfirmAsadRules = (compId: string) => {
    try {
      updateCompetitionCategoryConfig(actor, {
        competitionId: compId,
        rulesConfirmedByCommittee: true,
      });
      toast.success("Peraturan resmi ASAD Pasanggiri telah dikonfirmasi Panitia!");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengonfirmasi peraturan.");
    }
  };

  if (activeSubPage === "manajemen_festival") {
    const evt = store.events[0];
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-emerald-600" />
              Manajemen Event & Tahapan Babak Festival Generus
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Konfigurasi utama pelaksanaan Festival Generus tingkat Daerah, Desa, dan Kelompok
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Kode & Nama Festival</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{evt.name}</p>
              <Badge className="mt-2 bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                {evt.code} • {evt.status}
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Lokasi & Tuan Rumah</span>
              <p className="font-bold text-sm text-slate-900 mt-1">{evt.locationName}</p>
              <span className="text-xs text-slate-500 block mt-1">
                Wilayah: {evt.regionName} (Tuan Rumah: {evt.hostVillageName})
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-400">Parameter Standar</span>
              <p className="font-bold text-sm text-slate-900 mt-1">
                {evt.totalCategories} Kategori Lomba • {evt.judgesPerCompetition} Juri / Lomba
              </p>
              <span className="text-xs text-slate-500 block mt-1">
                30 Kontingen Kelompok • 4 Desa Induk
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Tahapan Babak Perlombaan (fg_event_stages)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {store.stages.map((stg) => (
                <div
                  key={stg.id}
                  className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex items-center justify-between"
                >
                  <div>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold mb-1">
                      Tahap #{stg.sequenceOrder} • {stg.stageCode}
                    </Badge>
                    <div className="font-bold text-sm text-slate-900">{stg.stageName}</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (activeSubPage === "cabang_perlombaan") {
    const filteredComps =
      selectedCategoryId === "ALL"
        ? scopedCompetitions
        : scopedCompetitions.filter((c) => c.categoryId === selectedCategoryId);

    return (
      <div className="space-y-6 text-left animate-fade-in">
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-emerald-600" />
                Master 17 Kategori Lomba Festival Generus (ID Internal Konsisten)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dilengkapi bobot kriteria dinamis, durasi timer, karya fisik F4, peraturan ASAD, & konfigurasi bonus
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={selectedCategoryId === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedCategoryId("ALL")}
                className="text-xs rounded-xl font-bold h-8"
              >
                Semua ({scopedCompetitions.length})
              </Button>
              {store.categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategoryId === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="text-xs rounded-xl font-bold h-8"
                >
                  {cat.name.split(" (")[0]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredComps.map((comp) => {
              const arena = store.arenas.find((a) => a.id === comp.arenaId);
              const criteria = store.criteria.filter((cr) => cr.competitionId === comp.id);
              return (
                <div
                  key={comp.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 transition-all space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge className="bg-slate-900 text-white text-[10px] font-mono">
                        {comp.id}
                      </Badge>
                      <Badge
                        className={
                          comp.competitionType === "INDIVIDUAL"
                            ? "bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold"
                            : "bg-indigo-100 text-indigo-800 border-none text-[10px] font-bold"
                        }
                      >
                        {comp.competitionType === "INDIVIDUAL"
                          ? `Individu • ${comp.educationLevel}`
                          : `Beregu (${comp.minMembersPerTeam}-${comp.maxMembersPerTeam} Org) • ${comp.educationLevel}`}
                      </Badge>
                    </div>
                    <div className="font-bold text-sm text-slate-900">{comp.name}</div>
                    {comp.themeText && (
                      <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        Tema: {comp.themeText}
                      </div>
                    )}
                    {comp.materialText && (
                      <div className="text-[11px] text-slate-600">{comp.materialText}</div>
                    )}
                    {comp.equipmentNotes && (
                      <div className="text-[10px] text-slate-500 italic">{comp.equipmentNotes}</div>
                    )}

                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Kriteria & Bobot Penilaian:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {criteria.map((cr) => (
                          <span
                            key={cr.id}
                            className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-semibold text-slate-700"
                          >
                            {cr.name} ({cr.weightPercent}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Arena: {arena?.code || comp.arenaId}</span>
                      {comp.timerDurationMinutes && (
                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Maks {comp.timerDurationMinutes} Menit
                        </span>
                      )}
                    </div>
                    {comp.isPhysicalArtwork && (
                      <Badge className="bg-amber-100 text-amber-900 border-none text-[10px] font-bold">
                        <Palette className="h-3 w-3 mr-1 inline" /> Karya Fisik Kertas F4 (Foto + Penilaian Fisik)
                      </Badge>
                    )}
                    {comp.maleBonusConfig && (
                      <div className="text-[10px] bg-indigo-50 text-indigo-800 px-2 py-1 rounded font-semibold">
                        Bonus Peserta Laki-laki:{" "}
                        {comp.maleBonusConfig.approvedByCommittee
                          ? `+${comp.maleBonusConfig.bonusPoints} Poin (Disetujui)`
                          : "Menunggu Persetujuan Panitia (Nilai Belum Ditetapkan)"}
                      </div>
                    )}
                    {comp.isAsadOfficialRules && (
                      <div className="flex items-center justify-between bg-amber-50 px-2 py-1 rounded">
                        <span className="text-[10px] font-semibold text-amber-900">
                          Regulasi ASAD: {comp.rulesConfirmedByCommittee ? "Terkonfirmasi" : "Menunggu Konfirmasi"}
                        </span>
                        {!comp.rulesConfirmedByCommittee && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmAsadRules(comp.id)}
                            className="h-6 px-2 text-[9px] bg-amber-600 text-white rounded"
                          >
                            Konfirmasi
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  if (activeSubPage === "peserta_kontingen") {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Tarik Peserta Individu */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                1. Tarik Peserta & Validasi Jenjang Pendidikan
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <select
                value={selectedGenerusId}
                onChange={(e) => setSelectedGenerusId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
              >
                <option value="">-- Pilih Data Santri/Generus --</option>
                {generusMasterList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.namaLengkap} ({g.usia} Thn) — {g.namaKelompok}
                  </option>
                ))}
              </select>
              <select
                value={selectedEduLevel}
                onChange={(e) => setSelectedEduLevel(e.target.value as EducationLevel)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
              >
                {ALL_EDUCATION_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    Jenjang Pendidikan: {lv}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleEnrollGenerus}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Simpan Peserta & Snapshot
              </Button>
            </div>
          </Card>

          {/* 2. Registrasi Individu */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-indigo-600" />
                2. Pendaftaran Lomba Individu (Cek Duplikasi & Jenjang)
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <select
                value={selectedRegPartId}
                onChange={(e) => setSelectedRegPartId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
              >
                <option value="">-- Pilih Peserta Terdaftar --</option>
                {scopedParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.snapshotFullName} ({p.snapshotEducationLevel} • {p.snapshotGroupName.replace("Kelompok ", "")})
                  </option>
                ))}
              </select>
              <select
                value={selectedRegCompId}
                onChange={(e) => setSelectedRegCompId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold"
              >
                {store.competitions
                  .filter((c) => c.competitionType === "INDIVIDUAL")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Jenjang {c.educationLevel})
                    </option>
                  ))}
              </select>
              <Button
                onClick={handleRegisterCompetition}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                Daftarkan & Buat Nomor Peserta Otomatis
              </Button>
            </div>
          </Card>

          {/* 3. Pendaftaran Tim Beregu Cerdas Cermat (2-3 Peserta) */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <CardHeader className="p-0">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                3. Pendaftaran Tim Beregu Cerdas Cermat (2–3 Peserta)
              </CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <select
                value={teamCompId}
                onChange={(e) => setTeamCompId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
              >
                {store.competitions
                  .filter((c) => c.competitionType === "QUIZ_TEAM")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                placeholder="Nama Regu (mis. Regu Al-Hikmah)"
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
              />
              <div className="grid grid-cols-3 gap-1">
                {[
                  { val: teamMember1, set: setTeamMember1, label: "Anggota 1" },
                  { val: teamMember2, set: setTeamMember2, label: "Anggota 2" },
                  { val: teamMember3, set: setTeamMember3, label: "Anggota 3 (Ops)" },
                ].map((slot, idx) => (
                  <select
                    key={idx}
                    value={slot.val}
                    onChange={(e) => slot.set(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold"
                  >
                    <option value="">{slot.label}</option>
                    {scopedParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.snapshotFullName}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              <Button
                onClick={handleRegisterTeam}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl"
              >
                Daftarkan Tim Beregu (2–3 Anggota)
              </Button>
            </div>
          </Card>
        </div>

        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Peserta Terdaftar ({scopedParticipants.length} Peserta • {scopedContingents.length} Kontingen)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2 px-3">NIS</th>
                  <th className="py-2 px-3">Nama Peserta</th>
                  <th className="py-2 px-3">Jenjang Pendidikan</th>
                  <th className="py-2 px-3">Usia / L/P</th>
                  <th className="py-2 px-3">Kelompok & Desa</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-3 font-mono font-bold text-slate-600">{p.snapshotNis}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{p.snapshotFullName}</td>
                    <td className="py-2 px-3">
                      <Badge className="bg-indigo-50 text-indigo-800 border-none text-[10px] font-bold">
                        {p.snapshotEducationLevel}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{p.snapshotAge} Thn • {p.snapshotGender}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">
                      {p.snapshotGroupName} ({p.snapshotVillageName})
                    </td>
                    <td className="py-2 px-3">
                      <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                        {p.eligibilityStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (activeSubPage === "verifikasi_peserta") {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                Siklus Status Pendaftaran: DRAFT → SUBMITTED → VERIFIED → REJECTED → WITHDRAWN
              </h3>
              <p className="text-xs text-slate-500">
                Nomor peserta dihasilkan otomatis dan setiap entri divalidasi di tingkat server/database
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2.5 px-3">No. Peserta</th>
                  <th className="py-2.5 px-3">Kategori Lomba</th>
                  <th className="py-2.5 px-3">Peserta / Tim (XOR)</th>
                  <th className="py-2.5 px-3">Kelompok & Desa</th>
                  <th className="py-2.5 px-3">Status Saat Ini</th>
                  <th className="py-2.5 px-3">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedRegistrations.map((reg) => {
                  const comp = store.competitions.find((c) => c.id === reg.competitionId);
                  const part = reg.participantId
                    ? store.participants.find((p) => p.id === reg.participantId)
                    : null;
                  const team = reg.teamId ? store.teams.find((t) => t.id === reg.teamId) : null;
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-black text-indigo-700">
                        {reg.displayNumber || reg.registrationCode}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{comp?.name}</td>
                      <td className="py-2.5 px-3">
                        {part ? (
                          <span className="font-semibold text-emerald-700">
                            Individu: {part.snapshotFullName} ({part.snapshotEducationLevel})
                          </span>
                        ) : (
                          <span className="font-semibold text-indigo-700">
                             Beregu: {team?.teamName} ({team?.memberCount} Anggota)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {reg.groupName} • {reg.villageName}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                          {reg.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 flex flex-wrap gap-1">
                        {(["VERIFIED", "REJECTED", "WITHDRAWN"] as RegistrationStatus[]).map((st) => (
                          <Button
                            key={st}
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(reg.id, st)}
                            className="h-6 px-2 text-[9px] font-bold rounded"
                          >
                            {st}
                          </Button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // Default: jadwal_arena
  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* QR Code Check-in & Anti-Duplicate Guard (Part 3 Section 9 #9) */}
      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Meja Registrasi & QR Code Check-in Peserta (Anti-Check-in Ganda)
            </h3>
            <p className="text-xs text-slate-500">
              Setiap QR Code / Kode Registrasi hanya dapat digunakan untuk 1 kali check-in; percobaan kedua otomatis ditolak
            </p>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            {(store.checkins || []).length} Peserta Sudah Check-in QR
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <select
            value={qrInputToken}
            onChange={(e) => setQrInputToken(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            {store.registrations.map((r) => (
              <option key={r.id} value={r.registrationCode}>
                {r.registrationCode} ({r.displayNumber} • {r.groupName}) — Status Check-in: {r.checkinStatus}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={qrInputToken}
            onChange={(e) => setQrInputToken(e.target.value)}
            placeholder="Scan / ketik Kode QR Registrasi..."
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold"
          />
          <Button
            onClick={handleQrCheckinSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
          >
            Scan & Verifikasi QR Check-in
          </Button>
        </div>
      </Card>

      <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Antrean Panggilan Peserta, Kehadiran & Timer Lomba (Kaligrafi 90m • Nasehat/Hadist/Al-Quran 10m)
            </h3>
            <p className="text-xs text-slate-500">
              Indikator overtime memberikan peringatan waktu tanpa mendiskualifikasi peserta secara otomatis
            </p>
          </div>
          <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
            {scheduleConflicts.length} Peringatan Bentrok Jadwal
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {store.arenaQueues.map((q) => (
            <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-900 text-white text-[10px] font-mono">
                  #{q.queueNumber} • {q.displayNumber}
                </Badge>
                <div className="flex items-center gap-1.5">
                  {q.isOvertime && (
                    <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                      OVERTIME (Non-Auto-Disqualify)
                    </Badge>
                  )}
                  <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                    {q.callStatus}
                  </Badge>
                </div>
              </div>
              <div className="font-bold text-sm text-slate-900">{q.entryName}</div>
              <div className="text-xs text-slate-600">
                {q.groupName} ({q.villageName}) • Durasi Timer: {Math.round(q.timerDurationSeconds / 60)} Menit (Berjalan: {q.elapsedSeconds} dtk)
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button
                  size="sm"
                  onClick={() => handleQueueCall(q.registrationId, "CALLED")}
                  className="h-7 px-2.5 text-[10px] font-bold bg-indigo-600 text-white rounded-lg"
                >
                  Panggil Peserta
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleQueueCall(q.registrationId, "PERFORMING", 120)}
                  className="h-7 px-2.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg"
                >
                  Mulai Tampil
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleQueueCall(q.registrationId, "PERFORMING", q.timerDurationSeconds + 30)}
                  className="h-7 px-2.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-lg"
                >
                  Uji Overtime
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleQueueCall(q.registrationId, "COMPLETED")}
                  className="h-7 px-2.5 text-[10px] font-bold bg-slate-800 text-white rounded-lg"
                >
                  Selesai Tampil
                </Button>
              </div>
            </div>
          ))}
        </div>

        {scheduleConflicts.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Detektor Bentrok Jadwal Arena / Juri / Peserta ({scheduleConflicts.length} Terdeteksi)
            </div>
            {scheduleConflicts.slice(0, 3).map((cf, i) => (
              <div key={i} className="text-[11px] text-amber-800">
                • [{cf.conflictType}] {cf.description}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
