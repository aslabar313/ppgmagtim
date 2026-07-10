import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PortalPublic } from "@/components/PortalPublic";
import { AdminPanel } from "@/components/AdminPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PintarYuk — Sistem Informasi Monitoring Kelompok (SIM Kelompok)" },
      {
        name: "description",
        content: "Platform Sistem Informasi Monitoring Kelompok (SIM Kelompok) untuk memonitor aktivitas harian, absensi, kurikulum materi, raport, sarpras, dan WhatsApp center.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("sim_tpq_logged_role");
      if (storedRole) {
        setAdminRole(storedRole);
      }
    }
  }, []);

  const handleLogin = (role: string) => {
    localStorage.setItem("sim_tpq_logged_role", role);
    setAdminRole(role);
  };

  const handleLogout = () => {
    setAdminRole(null);
    if (typeof window !== "undefined") {
      setTimeout(() => {
        localStorage.removeItem("sim_tpq_logged_role");
        localStorage.removeItem("sim_tpq_active_scope");
        localStorage.removeItem("sim_tpq_admin_num");
        localStorage.removeItem("sim_tpq_logged_user");
      }, 50);
    }
  };

  // Prevent SSR hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-sans">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span>Menghubungkan ke Portal PintarYuk...</span>
      </div>
    );
  }

  if (adminRole) {
    return <AdminPanel initialRole={adminRole} onLogout={handleLogout} />;
  }

  return <PortalPublic onEnterAdmin={handleLogin} />;
}
