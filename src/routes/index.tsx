import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  const [adminRole, setAdminRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_logged_role");
    }
    return null;
  });

  const handleLogin = (role: string) => {
    localStorage.setItem("sim_tpq_logged_role", role);
    setAdminRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem("sim_tpq_logged_role");
    localStorage.removeItem("sim_tpq_active_scope");
    localStorage.removeItem("sim_tpq_admin_num");
    setAdminRole(null);
  };

  if (adminRole) {
    return <AdminPanel initialRole={adminRole} onLogout={handleLogout} />;
  }

  return <PortalPublic onEnterAdmin={handleLogin} />;
}
