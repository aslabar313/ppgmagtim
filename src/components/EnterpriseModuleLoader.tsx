import React, { useState } from "react";
import { KeuanganPanel } from "./KeuanganPanel";
import { InventarisPanel } from "./InventarisPanel";
import { HelpdeskPanel } from "./HelpdeskPanel";
import { SurveiPanel } from "./SurveiPanel";
import { SertifikatPanel } from "./SertifikatPanel";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { APIDocsPanel } from "./APIDocsPanel";

interface LoaderProps {
  activeTab: string;
  role: string;
}

export function EnterpriseModuleLoader({ activeTab, role }: LoaderProps) {
  switch (activeTab) {
    case "keuangan":
      return <KeuanganPanel userRole={role} />;
    case "inventaris":
      return <InventarisPanel userRole={role} />;
    case "sertifikat":
      return <SertifikatPanel />;
    case "feedback":
      return <FeedbackView role={role} />;
    case "ai_assistant":
      return <AIAssistantPanel />;
    case "apidocs":
      return <APIDocsPanel />;
    default:
      return null;
  }
}

function FeedbackView({ role }: { role: string }) {
  const [fbTab, setFbTab] = useState<"helpdesk" | "survei">("helpdesk");
  return (
    <div className="space-y-6 text-left">
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit">
        <button 
          onClick={() => setFbTab("helpdesk")} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            fbTab === "helpdesk" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
          }`}
        >
          Pusat Helpdesk (Ticketing)
        </button>
        <button 
          onClick={() => setFbTab("survei")} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            fbTab === "survei" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
          }`}
        >
          Hasil Kuesioner Survei Wali
        </button>
      </div>
      {fbTab === "helpdesk" ? <HelpdeskPanel userRole={role} /> : <SurveiPanel />}
    </div>
  );
}
