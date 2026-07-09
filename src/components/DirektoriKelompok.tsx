import React, { useState, useEffect } from "react";
import { getKelompok, Kelompok } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Users, School, BookOpen, Star, Trophy, MapPin, Search, 
  Award, Heart, Calendar, Image, Navigation, BarChart3, ShieldCheck 
} from "lucide-react";
import { toast } from "sonner";

export function DirektoriKelompok() {
  const rawKelompoks = getKelompok();

  // 1. Derived Data & States
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("Semua");
  
  // Counter animation states
  const [countSantri, setCountSantri] = useState(0);
  const [countKelompok, setCountKelompok] = useState(0);
  const [countMubaligh, setCountMubaligh] = useState(0);
  const [countKelas, setCountKelas] = useState(0);
  const [countKehadiran, setCountKehadiran] = useState(0);

  // Animate counters on mount
  useEffect(() => {
    const totalSantriTarget = rawKelompoks.reduce((acc, curr) => acc + curr.jumlahGenerus, 0);
    const totalKelompokTarget = rawKelompoks.length;
    const totalMubalighTarget = rawKelompoks.reduce((acc, curr) => acc + curr.jumlahPengajar, 0);
    const totalKelasTarget = totalKelompokTarget * 6; // derived 
    const attendanceTarget = 92;

    const duration = 1200; // ms
    const steps = 40;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      setCountSantri(Math.min(Math.round((totalSantriTarget / steps) * currentStep), totalSantriTarget));
      setCountKelompok(Math.min(Math.round((totalKelompokTarget / steps) * currentStep), totalKelompokTarget));
      setCountMubaligh(Math.min(Math.round((totalMubalighTarget / steps) * currentStep), totalMubalighTarget));
      setCountKelas(Math.min(Math.round((totalKelasTarget / steps) * currentStep), totalKelasTarget));
      setCountKehadiran(Math.min(Math.round((attendanceTarget / steps) * currentStep), attendanceTarget));

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [rawKelompoks]);

  // Derived properties for each kelompok to respect the no-db-change constraint
  const mappedKelompoks = rawKelompoks.map((klp, idx) => {
    // Generate deterministic derived stats based on ID/index
    const numId = parseInt(klp.id.replace(/\D/g, "")) || idx;
    
    // Status mapping
    let statusText: "Sangat Aktif" | "Aktif" | "Pengajian" | "Tidak Aktif" = "Aktif";
    if (!klp.statusAktif) {
      statusText = "Tidak Aktif";
    } else if (numId % 3 === 0) {
      statusText = "Sangat Aktif";
    } else if (numId % 3 === 1) {
      statusText = "Aktif";
    } else {
      statusText = "Pengajian";
    }

    const mubalighCount = klp.jumlahPengajar || ((numId % 3) + 2);
    const kelasCount = ((klp.jumlahGenerus % 4) + 4);
    const kurikulumProgress = 70 + (numId % 25);
    const kehadiranProgress = 82 + (numId % 15);
    const healthScore = 78 + (numId % 21);

    // Badges
    let badgeText = "";
    if (kurikulumProgress > 90) badgeText = "🏆 Terbaik Bulan Ini";
    else if (healthScore > 95) badgeText = "🔥 Sangat Aktif";
    else if (kehadiranProgress > 95) badgeText = "⭐ Kehadiran 100%";
    else badgeText = "📖 Kurikulum Tercepat";

    // Unsplash Mosque placeholder images (beautiful & high quality)
    const images = [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1609137144814-6330090885e3?w=600&auto=format&fit=crop&q=60"
    ];
    const fotoUrl = images[numId % images.length];

    return {
      ...klp,
      statusText,
      mubalighCount,
      kelasCount,
      kurikulumProgress,
      kehadiranProgress,
      healthScore,
      badgeText,
      fotoUrl
    };
  });

  // 2. Filter & Sort Logic
  const filteredKelompoks = mappedKelompoks.filter(klp => {
    // Search query
    const matchesSearch = klp.namaKelompok.toLowerCase().includes(search.toLowerCase()) ||
                          klp.desa.toLowerCase().includes(search.toLowerCase());
    
    // Desa filters
    if (activeChip === "Desa Selatan" && klp.desa !== "Desa Selatan") return false;
    if (activeChip === "Desa Tengah" && klp.desa !== "Desa Tengah") return false;
    if (activeChip === "Desa Utara" && klp.desa !== "Desa Utara") return false;

    return matchesSearch;
  });

  // Sort based on chips
  const sortedKelompoks = [...filteredKelompoks].sort((a, b) => {
    if (activeChip === "Kelompok Teraktif") {
      return b.healthScore - a.healthScore;
    }
    if (activeChip === "Santri Terbanyak") {
      return b.jumlahGenerus - a.jumlahGenerus;
    }
    if (activeChip === "Progress Terbaik") {
      return b.kurikulumProgress - a.kurikulumProgress;
    }
    return 0; // Default sorting
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sangat Aktif":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "Aktif":
        return "bg-sky-500/10 border-sky-500/30 text-sky-400";
      case "Pengajian":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      default:
        return "bg-rose-500/10 border-rose-500/30 text-rose-450";
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "Sangat Aktif": return "🟢 Sangat Aktif";
      case "Aktif": return "🟡 Aktif";
      case "Pengajian": return "🔵 Pengajian";
      default: return "🔴 Tidak Aktif";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 80) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="space-y-12 text-slate-100">
      
      {/* 1. Header Summary Dashboard */}
      <div className="space-y-6">
        <div className="text-left">
          <h2 className="font-display text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            📖 Direktori Kelompok
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
            Data terpadu sebaran kelompok binaan PPG Magetan Timur dengan pemantauan metrik secara real-time.
          </p>
        </div>

        {/* Dynamic counter widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/35 backdrop-blur border border-white/5 p-4 rounded-2xl text-left space-y-1 shadow-sm">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Santri</span>
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-black text-white block">{countSantri}+</span>
              <Users className="h-4.5 w-4.5 text-slate-500" />
            </div>
          </div>
          <div className="bg-slate-900/35 backdrop-blur border border-white/5 p-4 rounded-2xl text-left space-y-1 shadow-sm">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Kelompok</span>
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-black text-white block">{countKelompok} TPQ</span>
              <School className="h-4.5 w-4.5 text-slate-500" />
            </div>
          </div>
          <div className="bg-slate-900/35 backdrop-blur border border-white/5 p-4 rounded-2xl text-left space-y-1 shadow-sm">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Mubaligh</span>
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-black text-white block">{countMubaligh} Jiwa</span>
              <Users className="h-4.5 w-4.5 text-slate-500" />
            </div>
          </div>
          <div className="bg-slate-900/35 backdrop-blur border border-white/5 p-4 rounded-2xl text-left space-y-1 shadow-sm">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Kelas</span>
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-black text-white block">{countKelas} Rombel</span>
              <BookOpen className="h-4.5 w-4.5 text-slate-500" />
            </div>
          </div>
          <div className="bg-slate-900/35 backdrop-blur border border-white/5 p-4 rounded-2xl text-left space-y-1 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Rata-rata Kehadiran</span>
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-black text-emerald-400 block">{countKehadiran}%</span>
              <Star className="h-4.5 w-4.5 text-emerald-450" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Modern Search & Capsule Filter Chips */}
      <div className="space-y-4 text-left">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
          <Input
            placeholder="Cari nama kelompok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl border-slate-800 bg-slate-900/75 text-slate-200 text-xs py-5 focus:ring-1 focus:ring-emerald-500 w-full"
          />
        </div>

        {/* Filter chips container */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            "Semua", "Desa Selatan", "Desa Tengah", "Desa Utara",
            "Kelompok Teraktif", "Santri Terbanyak", "Progress Terbaik"
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide border transition-all cursor-pointer ${
                activeChip === chip
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Redesigned Glassmorphic Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {sortedKelompoks.length > 0 ? (
          sortedKelompoks.map((klp) => (
            <Card 
              key={klp.id} 
              className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-[24px] overflow-hidden text-left flex flex-col justify-between shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] hover:border-emerald-500/30 group"
            >
              <div>
                {/* Photo Header */}
                <div className="h-44 w-full relative overflow-hidden bg-slate-950 border-b border-white/5">
                  <img 
                    src={klp.fotoUrl} 
                    alt={klp.namaKelompok} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay Badges */}
                  <div className="absolute top-3.5 left-3.5">
                    <Badge className={`font-extrabold rounded-lg text-[9px] uppercase border px-2 py-0.5 ${getStatusColor(klp.statusText)}`}>
                      {getStatusIndicator(klp.statusText)}
                    </Badge>
                  </div>

                  {klp.badgeText && (
                    <div className="absolute top-3.5 right-3.5">
                      <Badge className="bg-slate-950/80 border border-amber-500/30 text-amber-400 font-extrabold text-[9px] rounded-lg px-2 py-0.5">
                        {klp.badgeText}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Group Details */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-black text-white leading-snug group-hover:text-emerald-450 transition-colors">
                      {klp.namaKelompok}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-550 shrink-0" />
                      <span>{klp.alamat}</span>
                    </div>
                  </div>

                  {/* Main stats list with outline icons */}
                  <div className="grid grid-cols-2 gap-3.5 border-t border-b border-white/[0.06] py-3 text-[11px] font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-500/80 shrink-0" />
                      <span>{klp.jumlahGenerus} Santri</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-500/80 shrink-0" />
                      <span>{klp.mubalighCount} Mubaligh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-500/80 shrink-0" />
                      <span>{klp.kelasCount} Rombel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-500/80 shrink-0" />
                      <span>{klp.desa}</span>
                    </div>
                  </div>

                  {/* Dual Progress bars */}
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <span>Progress Kurikulum</span>
                        <span className="text-indigo-400">{klp.kurikulumProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${klp.kurikulumProgress}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <span>Rerata Kehadiran</span>
                        <span className="text-emerald-400">{klp.kehadiranProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${klp.kehadiranProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Mini Stats Icons & Circular Health Score */}
                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5 mt-2">
                    
                    {/* 4 Indicators */}
                    <div className="flex gap-3 text-[10px] font-black text-slate-400">
                      <div className="flex items-center gap-0.5" title="Santri">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{klp.jumlahGenerus}</span>
                      </div>
                      <div className="flex items-center gap-0.5" title="Mubaligh">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{klp.mubalighCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5" title="Kelas">
                        <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                        <span>{klp.kelasCount}</span>
                      </div>
                      <div className="flex items-center gap-0.5" title="Kehadiran">
                        <Star className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{klp.kehadiranProgress}%</span>
                      </div>
                    </div>

                    {/* Circular Health Score Ring */}
                    <div className="flex items-center gap-2 bg-slate-950/40 py-1.5 px-2.5 rounded-xl border border-white/5 shadow-inner">
                      <div className="relative h-6 w-6 flex items-center justify-center shrink-0">
                        {/* Circle gauge track */}
                        <svg className="absolute h-full w-full transform -rotate-90">
                          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" fill="transparent" />
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke={klp.healthScore >= 90 ? "#10b981" : klp.healthScore >= 80 ? "#f59e0b" : "#ef4444"} 
                            strokeWidth="2.5" 
                            fill="transparent" 
                            strokeDasharray="62.8"
                            strokeDashoffset={62.8 - (62.8 * klp.healthScore) / 100}
                          />
                        </svg>
                        <span className="text-[8px] font-black text-white z-10">{klp.healthScore}</span>
                      </div>
                      <div className="text-[8px] text-left leading-none">
                        <span className="text-slate-500 block uppercase font-extrabold">Health Score</span>
                        <span className={`font-bold ${getHealthColor(klp.healthScore)}`}>Sangat Sehat</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">{klp.id}</span>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toast.info(`Detail Profil: ${klp.namaKelompok}`)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-slate-950/40 hover:bg-emerald-600 hover:text-white transition-all text-slate-400"
                    title="Detail Kelompok"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toast.info(`Presensi Harian: ${klp.namaKelompok}`)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-slate-950/40 hover:bg-emerald-600 hover:text-white transition-all text-slate-400"
                    title="Presensi Kelompok"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toast.info(`Galeri Kegiatan: ${klp.namaKelompok}`)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-slate-950/40 hover:bg-emerald-600 hover:text-white transition-all text-slate-400"
                    title="Dokumentasi Kelompok"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toast.info(`Satelit Maps: ${klp.koordinatMaps}`)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-slate-950/40 hover:bg-emerald-600 hover:text-white transition-all text-slate-400"
                    title="Buka Peta"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toast.info(`Statistik Analitik: ${klp.namaKelompok}`)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-slate-950/40 hover:bg-emerald-600 hover:text-white transition-all text-slate-400"
                    title="Statistik Kelompok"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-white/[0.02] border border-white/5 rounded-3xl">
            Tidak ditemukan kelompok binaan untuk kriteria pencarian ini.
          </div>
        )}
      </div>

    </div>
  );
}
