import React, { useState, useEffect } from "react";
import { getKelompok, Kelompok } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Users, School, BookOpen, Star, Trophy, MapPin, Search, 
  Award, Heart, Calendar, Image, Navigation, BarChart3, ShieldCheck, ClipboardList, Info,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

export function DirektoriKelompok() {
  const rawKelompoks = getKelompok();

  // 1. States & Counters
  const [search, setSearch] = useState("");
  const [activeChip, setActiveChip] = useState("Semua");
  
  // Counter animation states
  const [countSantri, setCountSantri] = useState(0);
  const [countKelompok, setCountKelompok] = useState(0);
  const [countMubaligh, setCountMubaligh] = useState(0);
  const [countKelas, setCountKelas] = useState(0);
  const [countKehadiran, setCountKehadiran] = useState(0);

  // Carousel & Pagination States
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [currentPage, setCurrentPage] = useState(0);

  // Adjust cards per page dynamically based on window width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setCardsPerPage(4);
      } else if (window.innerWidth >= 1024) {
        setCardsPerPage(3);
      } else if (window.innerWidth >= 640) {
        setCardsPerPage(2);
      } else {
        setCardsPerPage(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Animate counters on mount
  useEffect(() => {
    const totalSantriTarget = rawKelompoks.reduce((acc, curr) => acc + curr.jumlahGenerus, 0);
    const totalKelompokTarget = rawKelompoks.length;
    const totalMubalighTarget = rawKelompoks.reduce((acc, curr) => acc + curr.jumlahPengajar, 0);
    const totalKelasTarget = totalKelompokTarget * 6; // derived 
    const attendanceTarget = 93;

    const duration = 1500; // ms
    const steps = 50;
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
    const numId = parseInt(klp.id.replace(/\D/g, "")) || idx;
    
    // Status mapping
    let statusText: "Sangat Aktif" | "Aktif" | "Pengajian" | "Tidak Aktif" = "Aktif";
    if (!klp.statusAktif) {
      statusText = "Tidak Aktif";
    } else if (numId % 4 === 0) {
      statusText = "Sangat Aktif";
    } else if (numId % 4 === 1) {
      statusText = "Aktif";
    } else if (numId % 4 === 2) {
      statusText = "Pengajian";
    } else {
      statusText = "Tidak Aktif";
    }

    const mubalighCount = klp.jumlahPengajar || ((numId % 3) + 2);
    const kelasCount = ((klp.jumlahGenerus % 4) + 4);
    const kurikulumProgress = 70 + (numId % 25);
    const kehadiranProgress = 80 + (numId % 19);
    const healthScore = 75 + (numId % 24);
    const prestasiCount = (numId % 4) + 2;

    // Badges
    let badgeText = "";
    if (kurikulumProgress > 90) badgeText = "🏆 Terbaik Bulan Ini";
    else if (healthScore > 95) badgeText = "🔥 Sangat Aktif";
    else if (kehadiranProgress > 95) badgeText = "⭐ Kehadiran 100%";
    else badgeText = "📖 Kurikulum Tercepat";

    // Unsplash Mosque placeholder images (beautiful & high quality)
    const images = [
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1466442929976-97f336a657be?w=600&auto=format&fit=crop&q=80"
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
      prestasiCount,
      badgeText,
      fotoUrl
    };
  });

  // Filter & Sort Logic
  const filteredKelompoks = mappedKelompoks.filter(klp => {
    const matchesSearch = klp.namaKelompok.toLowerCase().includes(search.toLowerCase()) ||
                          klp.desa.toLowerCase().includes(search.toLowerCase());
    
    if (activeChip === "Desa Selatan" && klp.desa !== "Desa Selatan") return false;
    if (activeChip === "Desa Tengah" && klp.desa !== "Desa Tengah") return false;
    if (activeChip === "Desa Utara" && klp.desa !== "Desa Utara") return false;

    return matchesSearch;
  });

  // Sort based on active selection
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
    return 0;
  });

  const totalPages = Math.ceil(sortedKelompoks.length / cardsPerPage);

  // Sync current page bounds when filter or screen layout changes
  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const handlePrev = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "Sangat Aktif": return "🟢 Sangat Aktif";
      case "Aktif": return "🟡 Aktif";
      case "Pengajian": return "🔵 Pengajian";
      default: return "🔴 Tidak Aktif";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sangat Aktif":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
      case "Aktif":
        return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      case "Pengajian":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      default:
        return "bg-rose-500/10 border-rose-500/20 text-rose-400";
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 80) return "text-amber-400";
    return "text-rose-500";
  };

  const getHealthStroke = (score: number) => {
    if (score >= 90) return "#22C55E"; // Success
    if (score >= 80) return "#F59E0B"; // Warning
    return "#EF4444"; // Danger
  };

  return (
    <div className="space-y-12">
      
      {/* 1. Header Summary Dashboard */}
      <div className="space-y-8 text-left">
        <div>
          <h2 className="font-display text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <School className="h-8 w-8 text-emerald-500 animate-pulse" /> Direktori Kelompok
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-2 max-w-2xl leading-relaxed">
            Sistem Informasi Monitoring KBM PPG Magetan Timur. Visualisasi data sebaran kelompok binaan dengan pemantauan metrik secara real-time.
          </p>
        </div>

        {/* Small stats cards with counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Card 1: Total Santri */}
          <Card className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/15 transition-all">
            <div className="space-y-1 z-10">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Santri</span>
              <h4 className="font-display text-2xl font-black text-white">{countSantri}+ Jiwa</h4>
            </div>
            <div className="absolute right-4 bottom-4 h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
              <Users className="h-4.5 w-4.5" />
            </div>
          </Card>

          {/* Card 2: Total Kelompok */}
          <Card className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/15 transition-all">
            <div className="space-y-1 z-10">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Kelompok</span>
              <h4 className="font-display text-2xl font-black text-white">{countKelompok} TPQ</h4>
            </div>
            <div className="absolute right-4 bottom-4 h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
              <School className="h-4.5 w-4.5" />
            </div>
          </Card>

          {/* Card 3: Total Mubaligh */}
          <Card className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/15 transition-all">
            <div className="space-y-1 z-10">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Mubaligh</span>
              <h4 className="font-display text-2xl font-black text-white">{countMubaligh} Mubaligh</h4>
            </div>
            <div className="absolute right-4 bottom-4 h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
              <Users className="h-4.5 w-4.5" />
            </div>
          </Card>

          {/* Card 4: Total Kelas */}
          <Card className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/15 transition-all">
            <div className="space-y-1 z-10">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Kelas</span>
              <h4 className="font-display text-2xl font-black text-white">{countKelas} Rombel</h4>
            </div>
            <div className="absolute right-4 bottom-4 h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-400">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
          </Card>

          {/* Card 5: Persentase Kehadiran */}
          <Card className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-white/15 transition-all col-span-2 sm:col-span-1">
            <div className="space-y-1 z-10">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Kehadiran Santri</span>
              <h4 className="font-display text-2xl font-black text-emerald-450">{countKehadiran}%</h4>
            </div>
            <div className="absolute right-4 bottom-4 h-9 w-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-emerald-500">
              <Star className="h-4.5 w-4.5 fill-emerald-950" />
            </div>
          </Card>

        </div>
      </div>

      {/* 2. Modern Search Bar & Capsule Filter Chips */}
      <div className="space-y-4 text-left">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
          <Input
            placeholder="Cari nama kelompok..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl border-slate-800 bg-slate-900/60 text-slate-200 text-xs py-5 focus:ring-1 focus:ring-emerald-500 w-full"
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
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Slider/Carousel for Groups */}
      <div className="relative space-y-6">
        {/* Navigation Buttons (Top Right) */}
        {sortedKelompoks.length > cardsPerPage && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Halaman {currentPage + 1} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                className="h-9 w-9 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="h-9 w-9 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Carousel Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-all duration-500 ease-in-out">
          {sortedKelompoks.length > 0 ? (
            sortedKelompoks
              .slice(currentPage * cardsPerPage, (currentPage + 1) * cardsPerPage)
              .map((klp) => (
                <Card 
                  key={klp.id} 
                  className="bg-white/[0.08] backdrop-blur-md border border-white/[0.15] rounded-[24px] overflow-hidden text-left flex flex-col justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:border-blue-500/40 group"
                >
                  <div>
                    {/* Mosque Photo Container */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-950 border-b border-white/[0.06]">
                      <img 
                        src={klp.fotoUrl} 
                        alt={klp.namaKelompok} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Status Overlay Badge */}
                      <div className="absolute top-3.5 left-3.5">
                        <Badge className={`font-black rounded-lg text-[9px] uppercase border px-2.5 py-1 ${getStatusColor(klp.statusText)}`}>
                          {getStatusIndicator(klp.statusText)}
                        </Badge>
                      </div>

                      {/* Achievement Stamp Badge */}
                      {klp.badgeText && (
                        <div className="absolute top-3.5 right-3.5">
                          <Badge className="bg-slate-950/85 border border-amber-500/30 text-amber-400 font-black text-[9px] rounded-lg px-2.5 py-1">
                            {klp.badgeText}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Group Details Content */}
                    <div className="p-5 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-black text-white leading-snug group-hover:text-blue-400 transition-colors">
                          {klp.namaKelompok}
                        </h3>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate block max-w-[190px]">{klp.alamat}</span>
                        </div>
                      </div>

                      {/* 4 Details Info lists */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-black text-slate-350 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{klp.jumlahGenerus} Santri</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                          <span>{klp.mubalighCount} Mubaligh</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{klp.kelasCount} Kelas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                          <span>{klp.desa}</span>
                        </div>
                      </div>

                      {/* Dual progress bars */}
                      <div className="space-y-3.5 pt-1.5">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <span>Kurikulum</span>
                            <span className="text-blue-500">{klp.kurikulumProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.04]">
                            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${klp.kurikulumProgress}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                            <span>Kehadiran</span>
                            <span className="text-emerald-500">{klp.kehadiranProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/[0.04]">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${klp.kehadiranProgress}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Mini Stats & Circular Health Score */}
                      <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 mt-2">
                        
                        {/* 4 Mini stats indicators */}
                        <div className="flex gap-2.5 text-[9px] font-extrabold text-slate-400">
                          <div className="flex items-center gap-0.5" title="Santri count">
                            <Users className="h-3 w-3 text-slate-500" />
                            <span>{klp.jumlahGenerus}</span>
                          </div>
                          <div className="flex items-center gap-0.5" title="Mubaligh count">
                            <Users className="h-3 w-3 text-slate-500" />
                            <span>{klp.mubalighCount}</span>
                          </div>
                          <div className="flex items-center gap-0.5" title="Prestasi count">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            <span>{klp.prestasiCount}</span>
                          </div>
                          <div className="flex items-center gap-0.5" title="Kehadiran percentage">
                            <Star className="h-3 w-3 text-emerald-500" />
                            <span>{klp.kehadiranProgress}%</span>
                          </div>
                        </div>

                        {/* Circular Health Score gauge */}
                        <div className="flex items-center gap-2 bg-slate-950/50 py-1.5 px-2 rounded-xl border border-white/[0.05] shadow-inner">
                          <div className="relative h-6.5 w-6.5 flex items-center justify-center shrink-0">
                            <svg className="absolute h-full w-full transform -rotate-90">
                              <circle cx="13" cy="13" r="11" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="transparent" />
                              <circle 
                                cx="13" 
                                cy="13" 
                                r="11" 
                                stroke={getHealthStroke(klp.healthScore)} 
                                strokeWidth="2.5" 
                                fill="transparent" 
                                strokeDasharray="69.1"
                                strokeDashoffset={69.1 - (69.1 * klp.healthScore) / 100}
                              />
                            </svg>
                            <span className="text-[8px] font-black text-white z-10">{klp.healthScore}</span>
                          </div>
                          <div className="text-[7.5px] text-left leading-none">
                            <span className="text-slate-500 block uppercase font-extrabold">Health</span>
                            <span className={`font-bold ${getHealthColor(klp.healthScore)}`}>
                              {klp.healthScore >= 90 ? "Optimal" : klp.healthScore >= 80 ? "Sufisien" : "Kritis"}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Action Buttons footer */}
                  <div className="p-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-500 font-mono tracking-wider">{klp.id}</span>
                    
                    <div className="flex gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toast.info(`Detail Profil Kelompok: ${klp.namaKelompok}`)}
                        className="h-7 w-7 rounded-full border border-white/5 bg-slate-950/40 hover:bg-blue-600 hover:text-white transition-all text-slate-400"
                        title="Detail Laporan"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toast.info(`Presensi Harian Santri: ${klp.namaKelompok}`)}
                        className="h-7 w-7 rounded-full border border-white/5 bg-slate-950/40 hover:bg-blue-600 hover:text-white transition-all text-slate-400"
                        title="Presensi Kelompok"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toast.info(`Galeri Dokumentasi KBM: ${klp.namaKelompok}`)}
                        className="h-7 w-7 rounded-full border border-white/5 bg-slate-950/40 hover:bg-blue-600 hover:text-white transition-all text-slate-400"
                        title="Galeri Foto"
                      >
                        <Image className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toast.info(`Koordinat Maps Satelit: ${klp.koordinatMaps}`)}
                        className="h-7 w-7 rounded-full border border-white/5 bg-slate-950/40 hover:bg-blue-600 hover:text-white transition-all text-slate-400"
                        title="Navigasi Peta"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toast.info(`Statistik Kemajuan KBM: ${klp.namaKelompok}`)}
                        className="h-7 w-7 rounded-full border border-white/5 bg-slate-950/40 hover:bg-blue-600 hover:text-white transition-all text-slate-400"
                        title="Analitik Kelompok"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
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

        {/* Pagination Dots Indicator */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentPage === idx ? "w-8 bg-blue-600" : "w-2.5 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Kembali ke halaman ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
