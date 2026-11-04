import React, { useState } from "react";
import { MonevAgendaBulananPanel } from "./MonevAgendaBulananPanel";
import { MonitoringMubalighPanel } from "./MonitoringMubalighPanel";
import { Card } from "@/components/ui/card";
import { Calendar, UserCheck, BarChart3, Layers, Sparkles } from "lucide-react";

interface MonevPPGContainerProps {
  userRole: string;
  initialSubTab?: "agenda_bulanan" | "mubaligh_harian";
}

export function MonevPPGContainer({ userRole, initialSubTab = "agenda_bulanan" }: MonevPPGContainerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"agenda_bulanan" | "mubaligh_harian">(initialSubTab);

  return (
    <div className="space-y-6 text-left">
      {/* Navigation Switcher Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 max-w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("agenda_bulanan")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
            activeSubTab === "agenda_bulanan"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Calendar className="h-4 w-4" />
          1. Monev Agenda Bulanan PPG
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("mubaligh_harian")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
            activeSubTab === "mubaligh_harian"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          2. Monev Harian Mubaligh
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
            Fitur Masa Depan
          </span>
        </button>
      </div>

      {/* View Content */}
      {activeSubTab === "agenda_bulanan" ? (
        <div className="animate-fade-in">
          <MonevAgendaBulananPanel userRole={userRole} />
        </div>
      ) : (
        <div className="animate-fade-in space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-medium flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>Informasi Pengembangan:</strong> Modul 2 (Monev Harian Mubaligh) merupakan roadmap pengembangan masa depan. Saat ini fokus utama adalah pelaksanaan <strong>Monev Agenda Bulanan PPG</strong>.
            </div>
          </div>
          <MonitoringMubalighPanel userRole={userRole} />
        </div>
      )}
    </div>
  );
}
