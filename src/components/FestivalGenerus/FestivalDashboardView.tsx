import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  Award,
  Shield,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
  Layers,
  Clock,
  Scale,
  History,
  ChevronRight,
} from "lucide-react";
import {
  FestivalStoreState,
  FestivalSubPage,
  FgChampionshipStanding,
  FgContingent,
  FgParticipant,
  FgRegistration,
} from "@/lib/festival/types";
import { CanonicalFestivalActor, FESTIVAL_VILLAGE_GROUPS_MAP } from "@/lib/festival/festivalAuth";

interface FestivalDashboardViewProps {
  actor: CanonicalFestivalActor;
  store: FestivalStoreState;
  scopedContingents: FgContingent[];
  scopedParticipants: FgParticipant[];
  scopedRegistrations: FgRegistration[];
  groupStandings: FgChampionshipStanding[];
  villageStandings: FgChampionshipStanding[];
  onNavigate: (page: FestivalSubPage) => void;
}

export function FestivalDashboardView({
  actor,
  store,
  scopedContingents,
  scopedParticipants,
  scopedRegistrations,
  groupStandings,
  villageStandings,
  onNavigate,
}: FestivalDashboardViewProps) {
  const activeEvent = store.events[0];
  const individualComps = store.competitions.filter((c) => c.competitionType === "INDIVIDUAL").length;
  const teamComps = store.competitions.filter((c) => c.competitionType !== "INDIVIDUAL").length;
  const activeStage = store.stages.find((s) => s.isActive) || store.stages[0];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* 1. Hero Banner Festival Generus */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-lg border border-emerald-700/40">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-400/20 text-amber-200 border border-amber-300/30 font-black text-[10px] px-3 py-1 rounded-full">
                FESTIVAL GENERUS CABERAWIT • {activeEvent?.hijriYear} / {activeEvent?.gregorianYear}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 font-bold text-[10px] px-3 py-1 rounded-full">
                Status: {activeEvent?.status}
              </Badge>
              <Badge className="bg-white/10 text-white border border-white/20 font-bold text-[10px] px-3 py-1 rounded-full">
                Scope Aktif: {actor.groupName !== "Semua" ? actor.groupName : actor.villageName !== "Semua" ? actor.villageName : actor.regionName}
              </Badge>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
              {activeEvent?.name}
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm font-medium leading-relaxed">
              {activeEvent?.theme}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-emerald-100">
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <Calendar className="h-3.5 w-3.5 text-amber-300" />
                {activeEvent?.startDate} s/d {activeEvent?.endDate}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <MapPin className="h-3.5 w-3.5 text-amber-300" />
                {activeEvent?.locationName}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Tahap Aktif: {activeStage?.stageName}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Button
              onClick={() => onNavigate("peserta_kontingen")}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md px-5 py-2.5"
            >
              Kelola Peserta & Kontingen <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              onClick={() => onNavigate("penilaian")}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/25 font-bold text-xs rounded-xl px-5 py-2.5"
            >
              Konsol Penilaian 3 Juri & CCA
            </Button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cabang Perlombaan
              </span>
              <div className="text-2xl font-display font-black text-slate-900 mt-1">
                {store.competitions.length} Kategori
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">
                {individualComps} Individu • {teamComps} Beregu & CCA
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kontingen & Wilayah (Scoped)
              </span>
              <div className="text-2xl font-display font-black text-slate-900 mt-1">
                {scopedContingents.length} Kelompok
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 mt-1 block">
                Struktur Kelompok → 4 Desa → Daerah
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Peserta & Entri Lomba
              </span>
              <div className="text-2xl font-display font-black text-slate-900 mt-1">
                {scopedParticipants.length} Santri / {scopedRegistrations.length} Entri
              </div>
              <span className="text-[11px] font-semibold text-amber-700 mt-1 block">
                Snapshot Identitas & XOR Constraint Aktif
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dewan Juri & Arena
              </span>
              <div className="text-2xl font-display font-black text-slate-900 mt-1">
                3 Juri / Lomba
              </div>
              <span className="text-[11px] font-semibold text-teal-700 mt-1 block">
                {store.arenas.length} Arena • Presisi NUMERIC(8,2)
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Struktur Organisasi Kontingen (4 Desa -> 30 Kelompok) & Klasemen Juara Umum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sebaran Kontingen per Desa sesuai Hak Akses */}
        <Card className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Integrasi Kontingen Kelompok → Desa → Daerah
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Menampilkan kontingen sesuai otorisasi peran aktif ({actor.role})
                </CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                RLS Filter Aktif
              </Badge>
            </div>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(FESTIVAL_VILLAGE_GROUPS_MAP).map(([villageName, allGroups]) => {
              const visibleInVillage = scopedContingents.filter(
                (c) => c.villageName === villageName
              );
              const isAccessible = visibleInVillage.length > 0;
              return (
                <div
                  key={villageName}
                  className={`p-4 rounded-xl border transition-all ${
                    isAccessible
                      ? "bg-slate-50/70 border-slate-200"
                      : "bg-slate-100/50 border-slate-200/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">{villageName}</span>
                    <Badge
                      className={
                        isAccessible
                          ? "bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold"
                          : "bg-rose-100 text-rose-700 border-none text-[10px] font-bold"
                      }
                    >
                      {isAccessible
                        ? `${visibleInVillage.length} / ${allGroups.length} Kelompok Diakses`
                        : "Dibatasi RLS"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {visibleInVillage.length > 0 ? (
                      visibleInVillage.map((c) => (
                        <span
                          key={c.id}
                          className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md"
                        >
                          {c.groupName.replace("Kelompok ", "")}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        Tidak dapat diakses oleh scope {actor.role} ({actor.villageName !== "Semua" ? actor.villageName : actor.groupName})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Klasemen Juara Umum Desa & Kelompok */}
        <Card className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Klasemen Sementara Juara Umum Desa
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
              Akumulasi poin medali (Emas = 5, Perak = 3, Perunggu = 1)
            </CardDescription>
          </CardHeader>

          <div className="space-y-2.5">
            {villageStandings.map((vs) => (
              <div
                key={vs.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-6 w-6 rounded-lg flex items-center justify-center font-black text-[11px] ${
                      vs.standingRank === 1
                        ? "bg-amber-400 text-slate-950"
                        : vs.standingRank === 2
                          ? "bg-slate-300 text-slate-900"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    #{vs.standingRank}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 block">{vs.villageName}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      🥇 {vs.goldCount} • 🥈 {vs.silverCount} • 🥉 {vs.bronzeCount}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-display font-black text-sm text-emerald-700">
                    {vs.totalPoints.toFixed(2)} Pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Top 3 Kelompok Terbaik
            </span>
            <div className="grid grid-cols-3 gap-2">
              {groupStandings.slice(0, 3).map((gs) => (
                <div
                  key={gs.id}
                  className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-center"
                >
                  <span className="text-[10px] font-black text-emerald-800 block truncate">
                    #{gs.standingRank} {gs.groupName?.replace("Kelompok ", "")}
                  </span>
                  <span className="text-xs font-black text-slate-900 mt-0.5 block">
                    {gs.totalPoints.toFixed(2)} Pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Live Cerdas Cermat Match Preview & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Live Pertandingan Tim: Cerdas Cermat Agama (CCA)
              </CardTitle>
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                Relasi Match & Regu
              </Badge>
            </div>
            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
              {store.quizMatches[0]?.matchName}
            </CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {store.quizLeaderboards.map((qlb, idx) => (
              <div
                key={qlb.id}
                className={`p-3.5 rounded-xl border ${
                  idx === 0
                    ? "bg-indigo-50/60 border-indigo-200"
                    : "bg-slate-50 border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-slate-900 text-white text-[9px] font-bold">
                    Meja {String.fromCharCode(65 + idx)}
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-500">
                    Rank #{qlb.rankInMatch}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 truncate mt-1">
                  {qlb.teamName}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">{qlb.villageName}</div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold">Total Skor:</span>
                  <span className="font-display font-black text-base text-indigo-700">
                    {qlb.totalScore.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Audit Trail Keamanan Festival (fg_audit_logs)
              </CardTitle>
              <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold">
                {store.auditLogs.length} Log Tercatat
              </Badge>
            </div>
            <CardDescription className="text-[11px] text-slate-500 font-medium mt-0.5">
              Pencatatan otomatis pembuatan data, perubahan nilai, persetujuan, dan publikasi
            </CardDescription>
          </CardHeader>

          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {store.auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-3"
              >
                <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-[11px]">
                      [{log.actionCategory}] {log.actorUsername} ({log.actorRole})
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {log.entityTable}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {log.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
