import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ALL_FESTIVAL_ROLES,
  FestivalRole,
  FestivalSubPage,
} from "@/lib/festival/types";
import {
  FESTIVAL_VILLAGE_GROUPS_MAP,
  getAccessibleFestivalPages,
  normalizeFestivalRole,
  resolveCanonicalFestivalActor,
} from "@/lib/festival/festivalAuth";
import {
  calculateChampionshipStandings,
  getFestivalStore,
  getScopedCompetitions,
  getScopedContingents,
  getScopedParticipants,
  getScopedRegistrations,
  recordFestivalAudit,
} from "@/lib/festival/festivalService";
import { FestivalDashboardView } from "./FestivalDashboardView";
import { FestivalCompetitionsAndParticipantsView } from "./FestivalCompetitionsAndParticipantsView";
import { FestivalScoringAndResultsView } from "./FestivalScoringAndResultsView";
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  Users,
  FileCheck,
  MapPin,
  Scale,
  Calculator,
  Award,
  FileBadge,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface FestivalGenerusContainerProps {
  userRole: string;
}

const NAV_ITEMS: Array<{
  id: FestivalSubPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard Festival", icon: LayoutDashboard },
  { id: "manajemen_festival", label: "Manajemen Festival", icon: Calendar },
  { id: "cabang_perlombaan", label: "Cabang Perlombaan", icon: Trophy },
  { id: "peserta_kontingen", label: "Peserta & Kontingen", icon: Users },
  { id: "verifikasi_peserta", label: "Verifikasi Peserta", icon: FileCheck },
  { id: "jadwal_arena", label: "Jadwal & Arena", icon: MapPin },
  { id: "dewan_juri", label: "Dewan Juri", icon: Scale },
  { id: "penilaian", label: "Penilaian", icon: Calculator },
  { id: "hasil_juara", label: "Hasil & Juara Umum", icon: Award },
  { id: "sertifikat", label: "Sertifikat", icon: FileBadge },
  { id: "laporan", label: "Laporan", icon: FileText },
  { id: "pengaturan", label: "Pengaturan", icon: Settings },
];

export function FestivalGenerusContainer({ userRole }: FestivalGenerusContainerProps) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeSubPage, setActiveSubPage] = useState<FestivalSubPage>("dashboard");

  // Logged user from main app
  const loggedUsername =
    typeof window !== "undefined"
      ? localStorage.getItem("sim_tpq_logged_user") || "superadminaldi"
      : "superadminaldi";

  const isGenuineSuperAdmin =
    normalizeFestivalRole(userRole) === "Superadmin" ||
    loggedUsername.startsWith("superadmin");

  const [simulatedRole, setSimulatedRole] = useState<FestivalRole>(() =>
    normalizeFestivalRole(userRole)
  );
  const [simulatedVillage, setSimulatedVillage] = useState<string>("Desa Selatan");
  const [simulatedGroup, setSimulatedGroup] = useState<string>("Kelompok Karas");

  useEffect(() => {
    setSimulatedRole(normalizeFestivalRole(userRole));
  }, [userRole]);

  const actor = useMemo(() => {
    try {
      return resolveCanonicalFestivalActor(
        loggedUsername,
        isGenuineSuperAdmin ? simulatedRole : undefined,
        isGenuineSuperAdmin
          ? {
              villageName:
                simulatedRole === "Admin Desa" ? simulatedVillage : undefined,
              groupName:
                simulatedRole === "Admin Kelompok" || simulatedRole === "Pendamping"
                  ? simulatedGroup
                  : undefined,
            }
          : undefined
      );
    } catch {
      return resolveCanonicalFestivalActor("superadminaldi");
    }
  }, [loggedUsername, isGenuineSuperAdmin, simulatedRole, simulatedVillage, simulatedGroup]);

  const accessiblePages = useMemo(
    () => getAccessibleFestivalPages(actor.role),
    [actor.role]
  );

  // Layer 1: Frontend Navigation Guard
  useEffect(() => {
    if (!accessiblePages.includes(activeSubPage)) {
      setActiveSubPage("dashboard");
      toast.warning(
        `Navigasi dialihkan: Peran '${actor.role}' tidak memiliki akses ke halaman tersebut.`
      );
    }
  }, [accessiblePages, activeSubPage, actor.role]);

  const store = useMemo(() => getFestivalStore(), [refreshTick]);
  const scopedCompetitions = useMemo(
    () => getScopedCompetitions(actor),
    [actor, refreshTick]
  );
  const scopedContingents = useMemo(
    () => getScopedContingents(actor),
    [actor, refreshTick]
  );
  const scopedParticipants = useMemo(
    () => getScopedParticipants(actor),
    [actor, refreshTick]
  );
  const scopedRegistrations = useMemo(
    () => getScopedRegistrations(actor),
    [actor, refreshTick]
  );
  const { groupStandings, villageStandings } = useMemo(
    () => calculateChampionshipStandings(),
    [refreshTick]
  );

  const handleRoleSwitch = (nextRole: FestivalRole) => {
    setSimulatedRole(nextRole);
    recordFestivalAudit({
      actionCategory: "ACCESS_CHANGE",
      entityTable: "fg_role_simulation",
      entityId: actor.username,
      actor,
      newValues: { role: nextRole },
      description: `Perubahan simulasi hak akses Festival Generus ke peran '${nextRole}'.`,
    });
    setRefreshTick((t) => t + 1);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Security & Scope Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-base text-slate-900">
                MODUL FESTIVAL GENERUS
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                3-Layer Security & RLS Active
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Peran Aktif: <strong>{actor.role}</strong> • Scope Wilayah:{" "}
              <strong>
                {actor.groupName !== "Semua"
                  ? `${actor.groupName} (${actor.villageName})`
                  : actor.villageName !== "Semua"
                    ? actor.villageName
                    : actor.regionName}
              </strong>
            </p>
          </div>
        </div>

        {/* Superadmin 15-Role & Organization Scope Simulator */}
        {isGenuineSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Uji 15 Role:
            </span>
            <select
              value={simulatedRole}
              onChange={(e) => handleRoleSwitch(e.target.value as FestivalRole)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800"
            >
              {ALL_FESTIVAL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {simulatedRole === "Admin Desa" && (
              <select
                value={simulatedVillage}
                onChange={(e) => setSimulatedVillage(e.target.value)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900"
              >
                {Object.keys(FESTIVAL_VILLAGE_GROUPS_MAP).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}

            {(simulatedRole === "Admin Kelompok" || simulatedRole === "Pendamping") && (
              <select
                value={simulatedGroup}
                onChange={(e) => setSimulatedGroup(e.target.value)}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-900"
              >
                {Object.values(FESTIVAL_VILLAGE_GROUPS_MAP)
                  .flat()
                  .map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 12-Item Festival Navigation Tabs (Guarded by Frontend RBAC) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-1.5">
        {NAV_ITEMS.filter((item) => accessiblePages.includes(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = activeSubPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSubPage(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Active Sub-Page Viewport */}
      {activeSubPage === "dashboard" ? (
        <FestivalDashboardView
          actor={actor}
          store={store}
          scopedContingents={scopedContingents}
          scopedParticipants={scopedParticipants}
          scopedRegistrations={scopedRegistrations}
          groupStandings={groupStandings}
          villageStandings={villageStandings}
          onNavigate={setActiveSubPage}
        />
      ) : [
          "manajemen_festival",
          "cabang_perlombaan",
          "peserta_kontingen",
          "verifikasi_peserta",
          "jadwal_arena",
        ].includes(activeSubPage) ? (
        <FestivalCompetitionsAndParticipantsView
          activeSubPage={activeSubPage}
          actor={actor}
          store={store}
          scopedCompetitions={scopedCompetitions}
          scopedContingents={scopedContingents}
          scopedParticipants={scopedParticipants}
          scopedRegistrations={scopedRegistrations}
          onRefresh={() => setRefreshTick((t) => t + 1)}
        />
      ) : (
        <FestivalScoringAndResultsView
          activeSubPage={activeSubPage}
          actor={actor}
          store={store}
          scopedRegistrations={scopedRegistrations}
          groupStandings={groupStandings}
          villageStandings={villageStandings}
          onRefresh={() => setRefreshTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
