import React, { useState } from "react";
import { 
  getGenerus, getMubalighSetempat, getMubalighTugasan, getKelompok, getPresensi, getRaport, getSarpras
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  LayoutDashboard, Users, UserCheck, Calendar, MapPin, LogOut, 
  TrendingUp, BookOpen, MessageSquare, Wrench, FileText, ChevronRight,
  Shield, Download, Eye, Award, Settings, Layers, Wifi, Bell
} from "lucide-react";
import { toast } from "sonner";

interface AdminPanelProps {
  initialRole: string;
  onLogout: () => void;
}

export function AdminPanel({ initialRole, onLogout }: AdminPanelProps) {
  const [role, setRole] = useState(initialRole);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

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
          toast.success("Aplikasi PintarYuk SIM Kelompok berhasil terpasang di perangkat Anda!");
        } else {
          toast.info("Pemasangan aplikasi dibatalkan.");
        }
        setDeferredPrompt(null);
      });
    } else {
      toast.info("Untuk memasang PintarYuk di iPhone/iPad (iOS): ketuk tombol 'Bagikan' (Share) di Safari, lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
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
    setRole(newRole);
    localStorage.setItem("sim_tpq_logged_role", newRole);
    setActiveTab("dashboard");
    toast.info(`Peran beralih ke: ${newRole}. Hierarki dashboard disesuaikan.`);
  };

  const hasAccessTo = (tabName: string) => {
    if (role === "Viewer") {
      return ["dashboard", "siswa", "guru", "kurikulum", "map", "galeri", "ranking", "alumni", "bi_platform"].includes(tabName);
    }
    if (role === "Pengajar") {
      return ["dashboard", "siswa", "presensi", "raport", "kurikulum", "sertifikat"].includes(tabName);
    }
    if (role === "Admin Kelompok") {
      return ["dashboard", "siswa", "presensi", "raport", "kurikulum", "map", "sarpras", "galeri", "ranking", "keuangan", "inventaris", "sertifikat", "feedback"].includes(tabName);
    }
    return true; // Super Admin & Admin Daerah & Admin Desa see everything
  };

  const renderContent = () => {
    switch (activeTab) {
      case "siswa":
        return <SiswaPanel userRole={role} />;
      case "guru":
        return <GuruPanel userRole={role} />;
      case "presensi":
        return <PresensiPanel userRole={role} />;
      case "raport":
        return <RaportPanel userRole={role} />;
      case "kurikulum":
        return <KurikulumPanel userRole={role} />;
      case "map":
        return <MapPanel />;
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
      default:
        if (["keuangan", "inventaris", "sertifikat", "feedback", "ai_assistant", "bi_platform"].includes(activeTab)) {
          return <EnterpriseModuleLoader activeTab={activeTab} role={role} />;
        }
        return renderDashboardBertingkat();
    }
  };

  // 16. Dashboard Realtime Widgets
  const renderDashboardBertingkat = () => {
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
      <div className="space-y-6 text-left">
        {/* Dashboard Kelompok */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-800">Dashboard Kelompok (TPQ)</h2>
            <p className="text-slate-500 text-sm">Agenda belajar mengajar harian, pencatatan absensi, dan reminder materi kurikulum.</p>
          </div>
          <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 px-3 py-1 font-semibold rounded-full text-xs">
            Akses Kelompok TPQ
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
            <span className="text-xs text-slate-400 font-semibold block">Total Santri Kelompok</span>
            <span className="font-display text-3xl font-black text-slate-900">24 Santri</span>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
            <span className="text-xs text-slate-400 font-semibold block">Ustadz Pengajar</span>
            <span className="font-display text-3xl font-black text-slate-900">3 Pengajar</span>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
            <span className="text-xs text-slate-400 font-semibold block">Presensi Hari Ini</span>
            <span className="font-display text-3xl font-black text-emerald-600">23 Hadir</span>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
            <span className="text-xs text-slate-400 font-semibold block">Target Hafalan Semester</span>
            <span className="font-display text-3xl font-black text-indigo-600">Juz 30</span>
          </Card>
        </div>

        {/* Schedule & Announcements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800">Jadwal Kelas Pengajian Hari Ini</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="font-bold text-slate-800 block">Kelas Caberawit (Iqro & Tahsin)</span>
                <span className="text-slate-400">Pukul 15:30 - 17:00 • Ustd. Fatmawati</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="font-bold text-slate-800 block">Kelas Remaja (Hadits & Keorganisasian)</span>
                <span className="text-slate-400">Pukul 19:30 - 21:00 • Ust. Heri Susanto</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800">Pengumuman Kelompok</CardTitle>
            </CardHeader>
            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl text-xs space-y-2">
              <span className="font-bold text-amber-800 block">Pemberitahuan Ujian Munaqosah</span>
              <p className="text-slate-600 leading-relaxed">Diharapkan seluruh santri kelas pra-remaja mempersiapkan hafalan materi target. Ujian lisan akan dilaksanakan serentak tanggal 15 Juli 2026.</p>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      
      {/* 12. Sidebar (Responsive collapsed on mobile view) */}
      <aside className="w-64 bg-slate-950 text-slate-300 border-r border-slate-900 flex flex-col justify-between shrink-0 hidden md:flex text-left">
        <div className="space-y-6 py-6">
          <div className="px-6 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/10 animate-pulse">
              <BookOpen className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="font-display text-base font-bold text-white tracking-tight">PintarYuk</span>
              <span className="block text-[8px] font-bold text-emerald-400 tracking-widest uppercase">SIM TPQ 2026</span>
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
                <Users className="h-4.5 w-4.5" /> Data Generus
              </button>
            )}
            {hasAccessTo("guru") && (
              <button onClick={() => setActiveTab("guru")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "guru" ? "bg-emerald-600 text-white shadow-md" : "hover:bg-slate-900 text-slate-400 hover:text-slate-200"}`}>
                <UserCheck className="h-4.5 w-4.5" /> Mubaligh & Pengurus
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
                <MapPin className="h-4.5 w-4.5" /> Peta Sebaran TPQ
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
              <span className="text-slate-900 text-sm font-bold capitalize">SIM Kelompok Platform</span>
            </div>

            {/* 12. PWA Install & Offline Sync Simulator Indicator */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 cursor-pointer hover:bg-emerald-100 transition-colors" onClick={handleInstallPwa}>
              <Download className="h-3 w-3" /> Pasang PWA
            </div>
            
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase"><Wifi className="h-3.5 w-3.5 text-emerald-500" /> Online (Sync Aktif)</div>
          </div>

          <div className="flex items-center gap-4">
            {/* RBAC Active Role Selector Switcher */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Shield className="h-4 w-4 text-emerald-600 animate-pulse" />
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-transparent text-slate-700 border-none focus:outline-none text-xs font-bold cursor-pointer"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Admin Daerah">Admin Daerah</option>
                <option value="Admin Desa">Admin Desa</option>
                <option value="Admin Kelompok">Admin Kelompok</option>
                <option value="Pengajar">Pengajar</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

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
