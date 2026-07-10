import React, { useState, useEffect } from "react";
import { 
  getGenerus, getMubalighSetempat, getMubalighTugasan, getKelompok, getPresensi, getRaport, getSarpras,
  getUserDetails, getRoleFromUsername, ROLE_HIERARCHY
} from "@/lib/mockData";
import { SiswaPanel } from "./SiswaPanel";
import { GuruPanel } from "./GuruPanel";
import { PresensiPanel } from "./PresensiPanel";
import { RaportPanel } from "./RaportPanel";
import { KurikulumPanel } from "./KurikulumPanel";
import { SarprasPanel } from "./SarprasPanel";
import { WhatsAppPanel } from "./WhatsAppPanel";
import { AnalitikPanel } from "./AnalitikPanel";
import { MapPanel } from "./MapPanel";
import { AlumniPanel } from "./AlumniPanel";
import { AuditPanel } from "./AuditPanel";
import { BackupPanel } from "./BackupPanel";
import { GaleriPanel } from "./GaleriPanel";
import { PengumumanPanel } from "./PengumumanPanel";
import { RankingPanel } from "./RankingPanel";
import { EnterpriseModuleLoader } from "./EnterpriseModuleLoader";
import { APIDocsPanel } from "./APIDocsPanel";
import { LaporanPerubahanPanel } from "./LaporanPerubahanPanel";
import { MonitoringMubalighPanel } from "./MonitoringMubalighPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  LayoutDashboard, Users, UserCheck, Calendar, MapPin, LogOut, 
  TrendingUp, BookOpen, MessageSquare, Wrench, FileText, ChevronRight,
  Shield, Download, Eye, Award, Settings, Layers, Wifi, Bell, History, ClipboardList,
  AlertCircle, BarChart3, Star, Map, CheckCircle2, GraduationCap, Clock
} from "lucide-react";
import { toast } from "sonner";

interface AdminPanelProps {
  initialRole: string;
  onLogout: () => void;
}

export function AdminPanel({ initialRole, onLogout }: AdminPanelProps) {
  const [loggedUser] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_logged_user");
    }
    return null;
  });

  const actualMaxRole = loggedUser ? getRoleFromUsername(loggedUser) : "Viewer";

  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("sim_tpq_logged_role") || initialRole;
      if (actualMaxRole !== "Super Admin") {
        return actualMaxRole;
      }
      const allowedRoles = ROLE_HIERARCHY[actualMaxRole] || ["Viewer"];
      if (allowedRoles.includes(storedRole)) {
        return storedRole;
      }
      return actualMaxRole;
    }
    return initialRole;
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");

  useEffect(() => {
    if (loggedUser) {
      const details = getUserDetails(loggedUser);
      if (details) {
        if (details.role !== "Super Admin" && role !== details.role) {
          setRole(details.role);
          localStorage.setItem("sim_tpq_logged_role", details.role);
          localStorage.setItem("sim_tpq_active_scope", details.scope);
          toast.error("Akses ditolak: Peran Anda dikunci pada tingkat " + details.role);
        } else {
          const allowedRoles = ROLE_HIERARCHY[details.role] || ["Viewer"];
          if (!allowedRoles.includes(role)) {
            setRole(details.role);
            localStorage.setItem("sim_tpq_logged_role", details.role);
            localStorage.setItem("sim_tpq_active_scope", details.scope);
            toast.error("Deteksi akses tidak sah: Peran disesuaikan kembali sesuai kredensial Anda.");
          }
        }
      }
    }
  }, [loggedUser, role]);

  const isAldi = loggedUser === "superadminaldi" || (role === "Super Admin" && typeof window !== "undefined" && localStorage.getItem("sim_tpq_admin_num") === "2");

  // PWA Install prompt listener
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          toast.success("Aplikasi PPG MAGETAN TIMUR CENTER berhasil terpasang di perangkat Anda!");
        } else {
          toast.info("Pemasangan aplikasi dibatalkan.");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast.info("Untuk memasang PPG MAGETAN TIMUR CENTER di iPhone/iPad (iOS): ketuk tombol 'Bagikan' (Share) di Safari, lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
    }
  };

  // Local datasets
  const generusList = getGenerus();
  const totalGenerus = generusList.length;
  const totalGuru = getMubalighSetempat().length + getMubalighTugasan().length;
  const totalKelompok = getKelompok().length;
  const totalPresensi = getPresensi().length;
  const raports = getRaport();
  const totalRaportIsi = raports.length;
  const sarpras = getSarpras();
  const totalSarprasLayak = sarpras.filter(s => s.statusLayak).length;

  // Determine active hierarchy level
  const getHierarchyLevel = () => {
    if (role === "Super Admin" || role === "Admin Daerah") return "daerah";
    if (role === "Admin Desa") return "desa";
    return "kelompok";
  };

  const level = getHierarchyLevel();

  const handleRoleChange = (newRole: string) => {
    if (actualMaxRole !== "Super Admin") {
      toast.error("Akses Ditolak: Hanya Super Admin yang diizinkan beralih peran!");
      return;
    }
    const allowedRoles = ROLE_HIERARCHY[actualMaxRole] || ["Viewer"];
    if (!allowedRoles.includes(newRole)) {
      toast.error("Akses Ditolak: Anda tidak memiliki otoritas untuk peran ini!");
      return;
    }
    setRole(newRole);
    localStorage.setItem("sim_tpq_logged_role", newRole);
    setActiveTab("dashboard");
    toast.info(`Peran beralih ke: ${newRole}. Hierarki dashboard disesuaikan.`);
  };

  const hasAccessTo = (tabName: string) => {
    const allowedRoles = ROLE_HIERARCHY[actualMaxRole] || ["Viewer"];
    const currentRole = allowedRoles.includes(role) ? role : actualMaxRole;

    if (currentRole === "Viewer") {
      return ["dashboard", "siswa", "guru", "kurikulum", "map", "galeri", "ranking", "alumni", "bi_platform", "monitoring_mubaligh"].includes(tabName);
    }
    if (currentRole === "Pengajar") {
      return ["dashboard", "siswa", "presensi", "raport", "kurikulum", "sertifikat", "monitoring_mubaligh"].includes(tabName);
    }
    if (currentRole === "Admin Kelompok") {
      return ["dashboard", "siswa", "guru", "presensi", "raport", "kurikulum", "map", "sarpras", "galeri", "ranking", "keuangan", "inventaris", "sertifikat", "feedback", "ai_assistant", "bi_platform", "monitoring_mubaligh"].includes(tabName);
    }
    if (currentRole === "Admin Desa") {
      return ["dashboard", "siswa", "guru", "presensi", "raport", "kurikulum", "map", "sarpras", "galeri", "ranking", "alumni", "keuangan", "inventaris", "sertifikat", "feedback", "ai_assistant", "bi_platform", "monitoring_mubaligh"].includes(tabName);
    }
    return true; // Super Admin & Admin Daerah see everything
  };

  const renderContent = () => {
    switch (activeTab) {
      case "siswa":
        return <SiswaPanel userRole={role} />;
      case "guru":
        return <GuruPanel userRole={role} />;
      case "monitoring_mubaligh":
        return <MonitoringMubalighPanel userRole={role} />;
      case "presensi":
        return <PresensiPanel userRole={role} />;
      case "raport":
        return <RaportPanel userRole={role} />;
      case "kurikulum":
        return <KurikulumPanel userRole={role} />;
      case "map":
        return <MapPanel userRole={role} />;
      case "sarpras":
        return <SarprasPanel userRole={role} />;
      case "galeri":
        return <GaleriPanel userRole={role} />;
      case "pengumuman":
        return <PengumumanPanel userRole={role} />;
      case "ranking":
        return <RankingPanel />;
      case "alumni":
        return <AlumniPanel userRole={role} />;
      case "whatsapp":
        return <WhatsAppPanel userRole={role} />;
      case "analitik":
        return <AnalitikPanel />;
      case "safety":
        return <SafetyView role={role} />;
      case "laporan_perubahan":
        return <LaporanPerubahanPanel />;
      default:
        if (["keuangan", "inventaris", "sertifikat", "feedback", "ai_assistant", "bi_platform"].includes(activeTab)) {
          return <EnterpriseModuleLoader activeTab={activeTab} role={role} />;
        }
        return renderDashboardBertingkat();
    }
  };

  // 16. Dashboard Realtime Widgets
  const renderDashboardBertingkat = () => {
    const activeScope = typeof window !== "undefined" ? (localStorage.getItem("sim_tpq_active_scope") || "Kelompok Karas") : "Kelompok Karas";
    const studentList = generusList.filter(g => g.namaKelompok === activeScope);
    
    // Attendance statistics
    const presensiHariIni = getPresensi().filter(p => p.namaKelompok === activeScope && p.tanggal === "2026-07-06");
    const totalHadir = presensiHariIni.filter(p => p.statusKehadiran === "Hadir").length;
    const attendancePercentage = presensiHariIni.length > 0 ? Math.round((totalHadir / presensiHariIni.length) * 100) : 95;

    // Student Categories
    const caberawitCount = studentList.filter(g => g.usia < 13).length;
    const mudamudiCount = studentList.filter(g => g.usia >= 13 && g.usia <= 22).length;

    const totalGenerusKelompok = studentList.length;
    
    const getGreetingName = () => {
      if (loggedUser === "superadminaldi") return "Ust. Aldi";
      if (loggedUser === "superadminharjito") return "Ust. Harjito";
      if (loggedUser?.startsWith("pengajar")) return "Ust. Ahmad";
      return "Ustadz";
    };
    const greetingName = getGreetingName();
    
    const teachersKelompok = 3;

    if (level === "daerah") {
      return (
        <div className="space-y-6 text-left">
          {/* Dashboard Daerah */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">Dashboard Daerah (Magetan)</h2>
              <p className="text-slate-500 text-sm">Pemantauan operasional koordinasi tingkat daerah untuk 32 kelompok TPQ.</p>
            </div>
            <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-3 py-1 font-semibold rounded-full text-xs">
              Akses Tingkat Daerah
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Jumlah Desa</span>
              <span className="font-display text-3xl font-black text-slate-900">8 Desa</span>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Jumlah Kelompok (TPQ)</span>
              <span className="font-display text-3xl font-black text-slate-900">{totalKelompok} Unit</span>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Total Generus Binaan</span>
              <span className="font-display text-3xl font-black text-emerald-600">{totalGenerus} Santri</span>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Rata-rata Kehadiran</span>
              <span className="font-display text-3xl font-black text-blue-600">92% Teratur</span>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><TrendingUp className="h-4.5 w-4.5 text-emerald-500" /> Tren Presensi Bulanan Daerah</CardTitle>
            </CardHeader>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: "Mei", Persentase: 90 }, { name: "Jun", Persentase: 95 }, { name: "Jul", Persentase: 93 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[70, 100]} />
                  <ChartTooltip />
                  <Bar dataKey="Persentase" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      );
    }

    if (level === "desa") {
      return (
        <div className="space-y-6 text-left">
          {/* Dashboard Desa */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-800">Dashboard Desa (Kecamatan)</h2>
              <p className="text-slate-500 text-sm">Pemantauan statistik kelompok TPQ binaan di wilayah desa.</p>
            </div>
            <Badge className="bg-blue-500/10 border border-blue-500/20 text-blue-700 px-3 py-1 font-semibold rounded-full text-xs">
              Akses Tingkat Desa
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Kelompok di Desa</span>
              <span className="font-display text-3xl font-black text-slate-900">4 Kelompok</span>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Progress Pengisian Raport</span>
              <span className="font-display text-3xl font-black text-blue-600">{totalRaportIsi} Terisi</span>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
              <span className="text-xs text-slate-400 font-semibold block">Sarpras Layak Operasi</span>
              <span className="font-display text-3xl font-black text-emerald-600">{totalSarprasLayak} TPQ</span>
            </Card>
          </div>

          {/* Ranking card */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Award className="h-4.5 w-4.5 text-amber-500 animate-bounce" /> Ranking Kelompok Teraktif Desa</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-xs font-bold text-slate-600">
              <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span>1. TPQ Al-Hikmah Kelompok 1 (Kiringan)</span>
                <Badge className="bg-emerald-50 text-emerald-700">Skor: 96</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span>2. TPQ Al-Hikmah Kelompok 2 (Kawedanan)</span>
                <Badge className="bg-emerald-50 text-emerald-700">Skor: 91</Badge>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    // Default Kelompok Dashboard
    return (
      <div className="space-y-8 text-left animate-pop-in">
        {/* 1. Hero Dashboard */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-sm hover:shadow-md transition-shadow">
          {/* Subtle Geometric Islamic pattern in background */}
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-[0.04] text-emerald-800 pointer-events-none hidden md:block">
            <svg viewBox="0 0 100 100" className="h-full w-full" fill="currentColor">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" fill="none" />
              <rect x="25" y="25" width="50" height="50" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(45 50 50)" />
              <rect x="25" y="25" width="50" height="50" stroke="currentColor" strokeWidth="1" fill="none" />
              <polygon points="50,10 90,50 50,90 10,50" stroke="currentColor" strokeWidth="1" fill="none" />
              <polygon points="50,10 90,50 50,90 10,50" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(30 50 50)" />
              <polygon points="50,10 90,50 50,90 10,50" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(60 50 50)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900">
                  Assalamu'alaikum, {greetingName} 👋
                </h1>
                <p className="text-slate-500 font-bold text-sm">
                  Selamat datang di Dashboard Kelompok {activeScope}
                </p>
              </div>

              {/* Today's Date */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Kamis, 9 Juli 2026
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100/50 rounded-lg px-2.5 py-1 text-emerald-800">
                  <Star className="h-3.5 w-3.5 text-emerald-500" />
                  13 Muharram 1448 H
                </div>
              </div>

              {/* Ringkasan Hari Ini */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ringkasan Hari Ini</span>
                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100/55 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {totalHadir || 23} Santri Hadir
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100/55 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    2 Kelas Berlangsung
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100/55 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    1 Pengumuman Baru
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-100/55 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                    Progress Semester 82%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats badges / actions on right */}
            {role === "Super Admin" && (
              <div className="shrink-0 pt-4 md:pt-0">
                <Button 
                  onClick={() => {
                    localStorage.setItem("sim_tpq_active_scope", "Desa Selatan");
                    setRole("Admin Desa");
                    toast.info("Beralih ke monitoring tingkat Desa.");
                  }} 
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 border-none shadow-sm"
                >
                  <Map className="h-4 w-4 text-emerald-450" /> Beralih ke Tingkat Desa
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Quick Actions */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Menu Kendali Cepat (Command Center)</span>
          <div className="overflow-x-auto pb-2 scrollbar-none -mx-6 px-6 md:mx-0 md:px-0">
            <div className="flex gap-4 min-w-max md:grid md:grid-cols-5 md:min-w-0">
              <button 
                onClick={() => setActiveTab("siswa")} 
                className="group flex flex-col items-center justify-center p-5 bg-white hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-250 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer w-44 md:w-full shrink-0"
              >
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Users className="h-5.5 w-5.5" />
                </div>
                <span className="font-display font-bold text-xs text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">➕ Tambah Santri</span>
              </button>

              <button 
                onClick={() => {
                  setActiveTab("presensi");
                  toast.success("Membuka scan QR presensi. Silakan arahkan kamera.");
                }} 
                className="group flex flex-col items-center justify-center p-5 bg-white hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-250 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer w-44 md:w-full shrink-0"
              >
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Eye className="h-5.5 w-5.5" />
                </div>
                <span className="font-display font-bold text-xs text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">📷 Scan QR</span>
              </button>

              <button 
                onClick={() => setActiveTab("presensi")} 
                className="group flex flex-col items-center justify-center p-5 bg-white hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-250 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer w-44 md:w-full shrink-0"
              >
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Calendar className="h-5.5 w-5.5" />
                </div>
                <span className="font-display font-bold text-xs text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">✅ Isi Presensi</span>
              </button>

              <button 
                onClick={() => setActiveTab("pengumuman")} 
                className="group flex flex-col items-center justify-center p-5 bg-white hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-250 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer w-44 md:w-full shrink-0"
              >
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Bell className="h-5.5 w-5.5" />
                </div>
                <span className="font-display font-bold text-xs text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">📢 Buat Pengumuman</span>
              </button>

              <button 
                onClick={() => setActiveTab("raport")} 
                className="group flex flex-col items-center justify-center p-5 bg-white hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-250 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer w-44 md:w-full shrink-0"
              >
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <FileText className="h-5.5 w-5.5" />
                </div>
                <span className="font-display font-bold text-xs text-slate-800 mt-3 group-hover:text-emerald-700 transition-colors">📄 Cetak Raport</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. KPI Cards (4) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pop-in">
          {/* Card 1: Santri Aktif */}
          <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Santri Aktif</span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-display text-3xl font-black text-slate-900 leading-none">{totalGenerusKelompok || 24}</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1.5">Santri</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-emerald-600 flex items-center">↑ +2</span>
              <span className="text-slate-400">bulan ini</span>
            </div>
          </div>

          {/* Card 2: Hadir Hari Ini */}
          <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hadir Hari Ini</span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-display text-3xl font-black text-slate-900 leading-none">{totalHadir || 23}</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1.5">Santri</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Tingkat Kehadiran:</span>
              <span className="text-emerald-600">{attendancePercentage}%</span>
            </div>
          </div>

          {/* Card 3: Pengajar Aktif */}
          <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pengajar Aktif</span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-display text-3xl font-black text-slate-900 leading-none">{teachersKelompok || 3}</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1.5">Ustadz</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Kehadiran Pengajar:</span>
              <span className="text-emerald-600">100% hadir</span>
            </div>
          </div>

          {/* Card 4: Progress Hafalan */}
          <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progress Hafalan</span>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="font-display text-3xl font-black text-slate-900 leading-none">82%</span>
              <span className="text-[10px] text-slate-400 font-bold ml-1.5">Selesai</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">Target Kurikulum:</span>
              <span className="text-indigo-600 font-extrabold">Juz 30</span>
            </div>
          </div>
        </div>

        {/* 4. Standalone Target Hafalan Progress Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pop-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-800 flex items-center gap-1.5 font-display font-bold">
                  <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
                  Target Hafalan Semester Aktif
                </span>
                <span className="text-emerald-600 font-black">82% Selesai</span>
              </div>
              <div className="h-3 w-full bg-slate-50 border border-slate-100 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-out shadow-sm"
                  style={{ width: "82%" }}
                />
              </div>
            </div>
            <div className="text-xs bg-slate-50 border border-slate-100 rounded-xl p-3 shrink-0 flex items-center justify-center gap-3">
              <div className="text-center font-bold">
                <span className="block text-[8px] text-slate-400 uppercase tracking-wider leading-none">Target Capaian</span>
                <span className="text-indigo-700 text-sm font-extrabold block mt-0.5">Juz 30 (Lancar & Tartil)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Dashboard Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pop-in">
          {/* Card 1: Line Chart Presensi 7 Hari Terakhir */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500" /> Presensi 7 Hari Terakhir
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px] font-semibold">Total kehadiran riil siswa per pertemuan</CardDescription>
            </CardHeader>
            <div className="h-[200px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: "Sen", Presensi: 22 },
                  { name: "Sel", Presensi: 23 },
                  { name: "Rab", Presensi: 21 },
                  { name: "Kam", Presensi: 23 },
                  { name: "Jum", Presensi: 24 },
                  { name: "Sab", Presensi: 22 },
                  { name: "Min", Presensi: 23 }
                ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGreenLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[15, 25]} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" name="Hadir" dataKey="Presensi" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGreenLine)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Card 2: Bar Chart Progress Hafalan */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-emerald-500" /> Progress Hafalan Kurikulum
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px] font-semibold">Tingkat persentase pencapaian materi berdasarkan kategori</CardDescription>
            </CardHeader>
            <div className="h-[200px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Al-Qur'an", Progress: 100 },
                  { name: "Hadits", Progress: 65 },
                  { name: "Karakter", Progress: 80 }
                ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="Progress" fill="#10b981" radius={[6, 6, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 6. Timeline + 7. Activity Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pop-in">
          {/* Timeline Jadwal Hari Ini */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-slate-500" /> Jadwal Kelas Pengajian Hari Ini
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px] font-semibold">Jadwal mengajar dan guru penanggung jawab</CardDescription>
            </CardHeader>
            
            <div className="space-y-6 relative pl-4 border-l border-dashed border-slate-200 mt-2 ml-1 text-xs">
              {/* Item 1 */}
              <div className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-450" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-455 font-bold">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    15.30 - 17:00 WIB
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs leading-none">📖 Iqro & Tahsin</span>
                      <span className="text-[10px] text-slate-450 font-semibold block mt-1">Ustd. Fatmawati</span>
                    </div>
                    <Badge className="bg-amber-50 text-amber-700 border-none font-bold text-[9px]">Belum Dimulai</Badge>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-650 font-bold">
                    <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    19.30 - 21:00 WIB
                  </div>
                  <div className="p-4 bg-emerald-50/10 border border-emerald-100 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs leading-none">📚 Hadits & Karakter</span>
                      <span className="text-[10px] text-slate-455 font-semibold block mt-1">Ust. Heri Susanto</span>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[9px]">Malam</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-5">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-slate-500" /> Aktivitas Terbaru Kelompok
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px] font-semibold">Log riwayat kegiatan harian pengurus & ustadz</CardDescription>
            </CardHeader>

            <div className="space-y-5 mt-2 ml-1 text-xs">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100 shadow-sm">
                  ✓
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold text-slate-800 block text-xs leading-none">Presensi Harian diisi</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">10 menit lalu • Ustd. Fatmawati</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100 shadow-sm">
                  ✓
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold text-slate-800 block text-xs leading-none">Santri baru ditambahkan</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">30 menit lalu • Ust. Heri Susanto</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100 shadow-sm">
                  ✓
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold text-slate-800 block text-xs leading-none">Jadwal Kelas diperbarui</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">1 jam lalu • Sistem PPG</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100 shadow-sm">
                  ✓
                </div>
                <div className="flex-1 space-y-0.5">
                  <span className="font-bold text-slate-800 block text-xs leading-none">Target Kurikulum diperbarui</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">Hari ini • PPG Daerah</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 8. Pengumuman + 10. Insight AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pop-in">
          {/* Pengumuman Redesign */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500 animate-swing" /> Pengumuman Resmi Kelompok
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 mt-2">
              <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-xs space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <Badge className="bg-rose-100 text-rose-800 border-none text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                    <AlertCircle className="h-3 w-3" /> Penting
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold">15 Juli 2026</span>
                </div>
                <div>
                  <span className="font-bold text-rose-900 block text-xs leading-tight">Pemberitahuan Ujian Munaqosah Semester</span>
                  <p className="text-slate-655 mt-1 leading-relaxed text-[11px] font-medium font-sans">
                    Diharapkan seluruh santri kelas pra-remaja mempersiapkan hafalan materi target. Ujian lisan akan dilaksanakan serentak.
                  </p>
                </div>
                <div className="pt-2 border-t border-rose-100/50 flex justify-between items-center text-[10px] font-bold">
                  <span className="text-amber-800 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Deadline: 14 Juli 2026
                  </span>
                  <button 
                    onClick={() => toast.info("Detail ujian dapat dilihat pada menu Kurikulum & Kalender.")} 
                    className="text-rose-700 hover:text-rose-900 transition-colors"
                  >
                    Lihat Selengkapnya
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Insight AI Hari Ini */}
          <Card className="bg-gradient-to-br from-emerald-50/30 to-teal-50/10 border border-emerald-100 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
                <Star className="h-5 w-5 text-emerald-500 fill-emerald-500 animate-sparkle" /> Insight AI Hari Ini
              </CardTitle>
              <CardDescription className="text-slate-400 text-[10px] font-semibold">Analisis otomatis database santri oleh AI Assistant</CardDescription>
            </CardHeader>
            <div className="space-y-3 mt-2 text-xs">
              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-sm">
                <span className="text-base leading-none font-sans">💡</span>
                <p className="text-slate-650 leading-relaxed font-semibold">
                  Kehadiran minggu ini <span className="text-emerald-600 font-bold">meningkat 12%</span> dibandingkan rata-rata kehadiran bulan lalu.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-sm">
                <span className="text-base leading-none font-sans">💡</span>
                <p className="text-slate-650 leading-relaxed font-semibold">
                  Target hafalan semester hampir tercapai (<span className="text-indigo-650 font-bold">82% selesai</span>). Kelas Caberawit menunjukkan progress tercepat.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-2.5 border-l-rose-500 border-l-4 shadow-sm">
                <span className="text-base leading-none font-sans">💡</span>
                <p className="text-slate-650 leading-relaxed font-semibold text-rose-950">
                  Ada <span className="text-rose-600 font-bold">2 santri</span> yang tidak hadir selama 3 pertemuan berturut-turut. Disarankan untuk segera mengirim notifikasi WhatsApp ke orang tua.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 9. Ringkasan Performa Kelompok */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 animate-pop-in">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-emerald-500" /> Ringkasan Performa Kelompok
            </CardTitle>
            <CardDescription className="text-slate-400 text-[10px] font-semibold">Matriks evaluasi kinerja operasional dan akademik TPQ daerah</CardDescription>
          </CardHeader>
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mt-2">
            {/* Circular Progress Rings */}
            <div className="flex flex-wrap items-center justify-center gap-8 flex-1">
              {/* Ring 1: Kehadiran */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center h-16 w-16">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500" strokeDasharray="96, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-800 font-display">96%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kehadiran</span>
              </div>

              {/* Ring 2: Hafalan */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center h-16 w-16">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-indigo-650" strokeDasharray="82, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-800 font-display">82%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress Hafalan</span>
              </div>

              {/* Ring 3: Kurikulum */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center h-16 w-16">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-teal-500" strokeDasharray="75, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-800 font-display">75%</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Kurikulum</span>
              </div>
            </div>

            {/* Badges metrics on right */}
            <div className="flex flex-row sm:flex-col gap-4 text-xs font-bold shrink-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-8">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-1 sm:w-44 text-center">
                <span className="block text-[8px] text-slate-400 uppercase tracking-wider leading-none font-semibold">Nilai Audit Sarpras</span>
                <Badge className="bg-emerald-500 text-white border-none font-black text-base px-3.5 py-1 rounded-lg mt-2 inline-block">
                  A
                </Badge>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-1 sm:w-44 text-center">
                <span className="block text-[8px] text-slate-400 uppercase tracking-wider leading-none font-semibold">Ranking Daerah</span>
                <span className="text-slate-800 text-sm font-black block mt-2 font-display font-semibold">
                  #3 <span className="text-[10px] text-slate-400 font-bold font-sans">/ 32 Kelompok</span>
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      
      {/* 12. Sidebar (Responsive collapsed on mobile view) */}
      <aside className="w-64 bg-slate-950 text-slate-300 border-r border-slate-900 flex flex-col justify-between shrink-0 hidden md:flex text-left">
        <div className="space-y-6 py-6">
          <div className="px-6 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img src="https://cdn.phototourl.com/free/2026-07-09-8adacd09-43f1-441b-b2ea-577757bfa123.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-white tracking-tight">PPG Magtim</span>
              <span className="block text-[8px] font-bold text-emerald-400 tracking-widest uppercase">Generus Central App</span>
            </div>
          </div>

          <nav className="px-3 space-y-1.5">
            {hasAccessTo("dashboard") && (
              <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "dashboard" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <LayoutDashboard className="h-4.5 w-4.5" /> Dashboard
              </button>
            )}
            {hasAccessTo("siswa") && (
              <button onClick={() => setActiveTab("siswa")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "siswa" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Users className="h-4.5 w-4.5" /> Database Jama'ah & Generus
              </button>
            )}
            {hasAccessTo("guru") && (
              <button onClick={() => setActiveTab("guru")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "guru" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <UserCheck className="h-4.5 w-4.5" /> Mubaligh & Pengurus
              </button>
            )}
            {hasAccessTo("monitoring_mubaligh") && (
              <button onClick={() => setActiveTab("monitoring_mubaligh")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "monitoring_mubaligh" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <ClipboardList className="h-4.5 w-4.5" /> Monev Harian Mubaligh
              </button>
            )}
            {hasAccessTo("presensi") && (
              <button onClick={() => setActiveTab("presensi")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "presensi" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Calendar className="h-4.5 w-4.5" /> Presensi Kehadiran
              </button>
            )}
            {hasAccessTo("raport") && (
              <button onClick={() => setActiveTab("raport")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "raport" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <FileText className="h-4.5 w-4.5" /> Raport Kurikulum
              </button>
            )}
            {hasAccessTo("kurikulum") && (
              <button onClick={() => setActiveTab("kurikulum")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "kurikulum" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <BookOpen className="h-4.5 w-4.5" /> Kurikulum & Kalender
              </button>
            )}
            {hasAccessTo("map") && (
              <button onClick={() => setActiveTab("map")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "map" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <MapPin className="h-4.5 w-4.5" /> Peta Sebaran Kelompok
              </button>
            )}
            {hasAccessTo("sarpras") && (
              <button onClick={() => setActiveTab("sarpras")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "sarpras" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Wrench className="h-4.5 w-4.5" /> Audit Sarpras
              </button>
            )}
            {hasAccessTo("galeri") && (
              <button onClick={() => setActiveTab("galeri")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "galeri" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Layers className="h-4.5 w-4.5" /> Galeri Dokumentasi
              </button>
            )}
            {hasAccessTo("pengumuman") && (
              <button onClick={() => setActiveTab("pengumuman")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "pengumuman" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Bell className="h-4.5 w-4.5" /> Pengumuman
              </button>
            )}
            {hasAccessTo("ranking") && (
              <button onClick={() => setActiveTab("ranking")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "ranking" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Award className="h-4.5 w-4.5" /> Ranking & Lencana
              </button>
            )}
            {hasAccessTo("alumni") && (
              <button onClick={() => setActiveTab("alumni")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "alumni" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Users className="h-4.5 w-4.5" /> Arsip Alumni
              </button>
            )}
            {hasAccessTo("keuangan") && (
              <button onClick={() => setActiveTab("keuangan")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "keuangan" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <FileText className="h-4.5 w-4.5" /> Keuangan SPP & Kas
              </button>
            )}
            {hasAccessTo("inventaris") && (
              <button onClick={() => setActiveTab("inventaris")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "inventaris" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Wrench className="h-4.5 w-4.5" /> Inventaris Aset
              </button>
            )}
            {hasAccessTo("sertifikat") && (
              <button onClick={() => setActiveTab("sertifikat")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "sertifikat" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Award className="h-4.5 w-4.5" /> Cetak Sertifikat
              </button>
            )}
            {hasAccessTo("feedback") && (
              <button onClick={() => setActiveTab("feedback")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "feedback" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <MessageSquare className="h-4.5 w-4.5" /> Helpdesk & Survei
              </button>
            )}
            {hasAccessTo("ai_assistant") && (
              <button onClick={() => setActiveTab("ai_assistant")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "ai_assistant" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Settings className="h-4.5 w-4.5" /> AI Assistant
              </button>
            )}
            {hasAccessTo("bi_platform") && (
              <button onClick={() => setActiveTab("bi_platform")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "bi_platform" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <TrendingUp className="h-4.5 w-4.5" /> BI Dashboard
              </button>
            )}
            {hasAccessTo("whatsapp") && (
              <button onClick={() => setActiveTab("whatsapp")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "whatsapp" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <MessageSquare className="h-4.5 w-4.5" /> WhatsApp Gateway
              </button>
            )}
            {hasAccessTo("analitik") && (
              <button onClick={() => setActiveTab("analitik")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "analitik" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <TrendingUp className="h-4.5 w-4.5" /> Analitik Lanjut
              </button>
            )}
            {hasAccessTo("safety") && (
              <button onClick={() => setActiveTab("safety")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "safety" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <Shield className="h-4.5 w-4.5" /> System & Safety
              </button>
            )}
            {isAldi && (
              <button onClick={() => setActiveTab("laporan_perubahan")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "laporan_perubahan" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "hover:bg-slate-900 text-indigo-400 hover:text-indigo-200"}`}>
                <History className="h-4.5 w-4.5 animate-pulse" /> Laporan Perubahan
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-900">
          <Button onClick={onLogout} variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl font-bold text-xs gap-2">
            <LogOut className="h-4 w-4" /> Keluar Dashboard
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar with PWA indicator & Role Switcher */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-450 text-xs font-semibold uppercase tracking-wider">{activeTab}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-slate-900 text-sm font-bold capitalize">PPG MAGETAN TIMUR CENTER</span>
            </div>

            {/* 12. PWA Install & Offline Sync Simulator Indicator */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={handleInstallPwa}>
              <Download className="h-3 w-3" /> Pasang PWA
            </div>
            
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase"><Wifi className="h-3.5 w-3.5 text-emerald-500" /> Online (Sync Aktif)</div>
          </div>

          <div className="flex items-center gap-4">
            {/* RBAC Active Role Selector Switcher */}
            {actualMaxRole === "Super Admin" ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Shield className="h-4 w-4 text-emerald-600 animate-pulse" />
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="bg-transparent text-slate-700 border-none focus:outline-none text-xs font-bold cursor-pointer"
                >
                  {(ROLE_HIERARCHY[actualMaxRole] || ["Viewer"]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700 text-xs font-bold">{role}</span>
              </div>
            )}

            <Button onClick={onLogout} variant="ghost" size="sm" className="md:hidden gap-1 text-slate-400 hover:text-slate-900 rounded-xl text-xs font-semibold px-2 py-1">
              <LogOut className="h-4 w-4" />
            </Button>
            
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200 uppercase">
              {role.substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Dynamic Mobile Nav Header */}
        <div className="bg-slate-950 text-slate-400 p-2 overflow-x-auto flex gap-2 md:hidden">
          {hasAccessTo("dashboard") && <button onClick={() => setActiveTab("dashboard")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "dashboard" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Dashboard</button>}
          {hasAccessTo("siswa") && <button onClick={() => setActiveTab("siswa")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "siswa" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Siswa</button>}
          {hasAccessTo("guru") && <button onClick={() => setActiveTab("guru")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "guru" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Guru</button>}
          {hasAccessTo("monitoring_mubaligh") && <button onClick={() => setActiveTab("monitoring_mubaligh")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "monitoring_mubaligh" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Monev Mubaligh</button>}
          {hasAccessTo("presensi") && <button onClick={() => setActiveTab("presensi")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "presensi" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Presensi</button>}
          {hasAccessTo("raport") && <button onClick={() => setActiveTab("raport")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "raport" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Raport</button>}
          {hasAccessTo("kurikulum") && <button onClick={() => setActiveTab("kurikulum")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "kurikulum" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Kurikulum</button>}
          {hasAccessTo("map") && <button onClick={() => setActiveTab("map")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "map" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Peta</button>}
          {hasAccessTo("sarpras") && <button onClick={() => setActiveTab("sarpras")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "sarpras" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Sarpras</button>}
          {hasAccessTo("galeri") && <button onClick={() => setActiveTab("galeri")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "galeri" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Galeri</button>}
          {hasAccessTo("pengumuman") && <button onClick={() => setActiveTab("pengumuman")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "pengumuman" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Pengumuman</button>}
          {hasAccessTo("ranking") && <button onClick={() => setActiveTab("ranking")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "ranking" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Ranking</button>}
          {hasAccessTo("alumni") && <button onClick={() => setActiveTab("alumni")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "alumni" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Alumni</button>}
          {hasAccessTo("whatsapp") && <button onClick={() => setActiveTab("whatsapp")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "whatsapp" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>WhatsApp</button>}
          {hasAccessTo("analitik") && <button onClick={() => setActiveTab("analitik")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "analitik" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Analitik</button>}
          {hasAccessTo("safety") && <button onClick={() => setActiveTab("safety")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${activeTab === "safety" ? "bg-emerald-600 text-white" : "hover:bg-slate-900"}`}>Safety</button>}
        </div>

        {/* Dynamic component layout viewport */}
        <main className="flex-grow p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// 15. Compliance and safety consolidated sub-tabs
function SafetyView({ role }: { role: string }) {
  const [safetyTab, setSafetyTab] = useState<"backup" | "audit" | "api">("backup");
  return (
    <div className="space-y-6">
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit text-left">
        <button 
          onClick={() => setSafetyTab("backup")} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            safetyTab === "backup" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
          }`}
        >
          Backup & Restore
        </button>
        <button 
          onClick={() => setSafetyTab("audit")} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            safetyTab === "audit" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
          }`}
        >
          Audit Logs
        </button>
        <button 
          onClick={() => setSafetyTab("api")} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            safetyTab === "api" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"
          }`}
        >
          Dokumentasi REST API
        </button>
      </div>
      {safetyTab === "backup" && <BackupPanel userRole={role} />}
      {safetyTab === "audit" && <AuditPanel />}
      {safetyTab === "api" && <APIDocsPanel />}
    </div>
  );
}
