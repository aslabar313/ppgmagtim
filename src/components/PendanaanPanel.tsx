import React, { useState, useEffect } from "react";
import { getKelompok, Kelompok, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Wallet, Coins, Search, FileSpreadsheet, Printer, Edit, Plus, Save, 
  ChevronRight, Calendar, ArrowUpRight, CheckCircle2, Filter, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface PendanaanPanelProps {
  userRole: string;
}

export interface DanaPPGRecord {
  id: string;
  no: number;
  desa: string;
  namaKelompok: string;
  bulanan: {
    januari: number;
    februari: number;
    maret: number;
    april: number;
    mei: number;
    juni: number;
    juli: number;
    agustus: number;
    september: number;
    oktober: number;
    november: number;
    desember: number;
  };
}

export interface WeeklySiarSiar {
  minggu1: number;
  minggu2: number;
  minggu3: number;
  minggu4: number;
  minggu5: number;
}

export interface SiarSiarRecord {
  id: string;
  no: number;
  desa: string;
  namaKelompok: string;
  bulan: {
    januari: WeeklySiarSiar;
    februari: WeeklySiarSiar;
    maret: WeeklySiarSiar;
    april: WeeklySiarSiar;
    mei: WeeklySiarSiar;
    juni: WeeklySiarSiar;
    juli: WeeklySiarSiar;
    agustus: WeeklySiarSiar;
    september: WeeklySiarSiar;
    oktober: WeeklySiarSiar;
    november: WeeklySiarSiar;
    desember: WeeklySiarSiar;
  };
}

const BULAN_LIST = [
  { key: "januari", label: "Januari" },
  { key: "februari", label: "Februari" },
  { key: "maret", label: "Maret" },
  { key: "april", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Juni" },
  { key: "juli", label: "Juli" },
  { key: "agustus", label: "Agustus" },
  { key: "september", label: "September" },
  { key: "oktober", label: "Oktober" },
  { key: "november", label: "November" },
  { key: "desember", label: "Desember" }
] as const;

export function PendanaanPanel({ userRole }: PendanaanPanelProps) {
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  const [activeSubCategory, setActiveSubCategory] = useState<"dana_ppg" | "siar_siar">("dana_ppg");
  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [selectedBulan, setSelectedBulan] = useState<keyof SiarSiarRecord["bulan"]>("juli");

  // User scope check
  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
      const loggedUser = localStorage.getItem("sim_tpq_logged_user");
      if (loggedUser) {
        const details = getUserDetails(loggedUser);
        if (details && (details.level === "kelompok" || details.level === "desa")) {
          return details.scope;
        }
      }
      return localStorage.getItem("sim_tpq_active_scope") || "Semua";
    }
    return "Semua";
  });

  const allowedKelompoks = kelompokList
    .filter(k => {
      if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
      if (userRole === "Admin Desa") return k.desa === userScope;
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") return k.namaKelompok === userScope;
      return true;
    })
    .map(k => k.namaKelompok);

  const isReadOnly = userRole === "Viewer";

  // Initial Mock Data Dana PPG
  const [danaPPGList, setDanaPPGList] = useState<DanaPPGRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_tpq_dana_ppg");
      if (stored) return JSON.parse(stored);
    }
    
    // Generate initial records from kelompokList
    const initial: DanaPPGRecord[] = getKelompok().map((k, idx) => ({
      id: `dppg-${k.id}`,
      no: idx + 1,
      desa: k.desa,
      namaKelompok: k.namaKelompok,
      bulanan: {
        januari: 1500000 + (idx * 150000),
        februari: 1600000 + (idx * 120000),
        maret: 1750000 + (idx * 200000),
        april: 1400000 + (idx * 100000),
        mei: 1800000 + (idx * 180000),
        juni: 1900000 + (idx * 210000),
        juli: 2000000 + (idx * 250000),
        agustus: 0,
        september: 0,
        oktober: 0,
        november: 0,
        desember: 0
      }
    }));
    return initial;
  });

  // Initial Mock Data Siar-siar
  const [siarSiarList, setSiarSiarList] = useState<SiarSiarRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_tpq_siar_siar");
      if (stored) return JSON.parse(stored);
    }

    const defaultWeekly = (base: number): WeeklySiarSiar => ({
      minggu1: base + 50000,
      minggu2: base + 75000,
      minggu3: base + 60000,
      minggu4: base + 80000,
      minggu5: base + 40000
    });

    const initial: SiarSiarRecord[] = getKelompok().map((k, idx) => {
      const baseVal = 200000 + (idx * 30000);
      return {
        id: `siar-${k.id}`,
        no: idx + 1,
        desa: k.desa,
        namaKelompok: k.namaKelompok,
        bulan: {
          januari: defaultWeekly(baseVal),
          februari: defaultWeekly(baseVal + 10000),
          maret: defaultWeekly(baseVal + 15000),
          april: defaultWeekly(baseVal + 5000),
          mei: defaultWeekly(baseVal + 20000),
          juni: defaultWeekly(baseVal + 25000),
          juli: defaultWeekly(baseVal + 30000),
          agustus: { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
          september: { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
          oktober: { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
          november: { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 },
          desember: { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 }
        }
      };
    });
    return initial;
  });

  // Modal State for Editing Dana PPG
  const [editingDanaPPG, setEditingDanaPPG] = useState<DanaPPGRecord | null>(null);

  // Modal State for Editing Siar-siar
  const [editingSiarSiar, setEditingSiarSiar] = useState<{ record: SiarSiarRecord; bulanKey: keyof SiarSiarRecord["bulan"] } | null>(null);

  // Save Dana PPG changes
  const handleSaveDanaPPG = (updated: DanaPPGRecord) => {
    const newList = danaPPGList.map(item => item.id === updated.id ? updated : item);
    setDanaPPGList(newList);
    localStorage.setItem("sim_tpq_dana_ppg", JSON.stringify(newList));
    setEditingDanaPPG(null);
    toast.success(`Data Dana PPG ${updated.namaKelompok} (${updated.desa}) berhasil diperbarui!`);
  };

  // Save Siar-siar changes
  const handleSaveSiarSiar = (updatedRecord: SiarSiarRecord) => {
    const newList = siarSiarList.map(item => item.id === updatedRecord.id ? updatedRecord : item);
    setSiarSiarList(newList);
    localStorage.setItem("sim_tpq_siar_siar", JSON.stringify(newList));
    setEditingSiarSiar(null);
    toast.success(`Data Siar-siar ${updatedRecord.namaKelompok} (${updatedRecord.desa}) berhasil diperbarui!`);
  };

  // Filtered lists
  const desas = Array.from(new Set(kelompokList.map(k => k.desa)));

  const filteredDanaPPG = danaPPGList.filter(item => {
    if (!allowedKelompoks.includes(item.namaKelompok)) return false;
    const matchesDesa = desaFilter === "Semua" || item.desa === desaFilter;
    const matchesSearch = item.namaKelompok.toLowerCase().includes(search.toLowerCase()) ||
                          item.desa.toLowerCase().includes(search.toLowerCase());
    return matchesDesa && matchesSearch;
  });

  const filteredSiarSiar = siarSiarList.filter(item => {
    if (!allowedKelompoks.includes(item.namaKelompok)) return false;
    const matchesDesa = desaFilter === "Semua" || item.desa === desaFilter;
    const matchesSearch = item.namaKelompok.toLowerCase().includes(search.toLowerCase()) ||
                          item.desa.toLowerCase().includes(search.toLowerCase());
    return matchesDesa && matchesSearch;
  });

  // Calculate totals Dana PPG
  const calculateTotalDanaPPGKelompok = (item: DanaPPGRecord) => {
    return Object.values(item.bulanan).reduce((a, b) => a + b, 0);
  };

  const totalDanaPPGGrand = filteredDanaPPG.reduce((acc, item) => acc + calculateTotalDanaPPGKelompok(item), 0);
  const totalDanaPPGBulanIni = filteredDanaPPG.reduce((acc, item) => acc + item.bulanan.juli, 0);

  // Calculate totals Siar-siar
  const calculateTotalSiarSiarBulan = (weekly: WeeklySiarSiar) => {
    return weekly.minggu1 + weekly.minggu2 + weekly.minggu3 + weekly.minggu4 + weekly.minggu5;
  };

  const calculateTotalSiarSiarTahunanKelompok = (item: SiarSiarRecord) => {
    return Object.values(item.bulan).reduce((acc, weekly) => acc + calculateTotalSiarSiarBulan(weekly), 0);
  };

  const totalSiarSiarGrand = filteredSiarSiar.reduce((acc, item) => acc + calculateTotalSiarSiarTahunanKelompok(item), 0);
  const totalSiarSiarBulanTerpilih = filteredSiarSiar.reduce((acc, item) => acc + calculateTotalSiarSiarBulan(item.bulan[selectedBulan]), 0);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header Title & Quick Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-slate-800">Fitur Pendanaan Wilayah</h2>
            <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-bold rounded-full text-xs">
              PPG MAGETAN TIMUR
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen dan rekapitulasi perolehan Dana PPG dan Siar-siar bulanan & mingguan per kelompok dan desa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              toast.success("Mengekspor rekapitulasi data pendanaan ke Excel...");
            }} 
            variant="outline" 
            className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Ekspor Rekap Excel
          </Button>
          <Button 
            onClick={() => {
              window.print();
            }} 
            variant="outline" 
            className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3"
          >
            <Printer className="h-4 w-4 text-slate-600" /> Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Sub-Category Nav Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-2 max-w-fit shadow-sm border border-slate-200/60">
        <button 
          onClick={() => setActiveSubCategory("dana_ppg")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeSubCategory === "dana_ppg" 
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
          }`}
        >
          <Wallet className="h-4 w-4" /> 
          <span>1. Dana PPG</span>
          <Badge className={`ml-1 text-[10px] font-black rounded-full ${
            activeSubCategory === "dana_ppg" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            Bulanan
          </Badge>
        </button>

        <button 
          onClick={() => setActiveSubCategory("siar_siar")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeSubCategory === "siar_siar" 
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" 
              : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
          }`}
        >
          <Coins className="h-4 w-4" /> 
          <span>2. Siar-siar</span>
          <Badge className={`ml-1 text-[10px] font-black rounded-full ${
            activeSubCategory === "siar_siar" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            Mingguan (M1-M5)
          </Badge>
        </button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {activeSubCategory === "dana_ppg" ? (
          <>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-emerald-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Dana PPG Terkumpul</span>
                <span className="font-display text-2xl font-black text-emerald-600">Rp {totalDanaPPGGrand.toLocaleString("id-ID")}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Akumulasi Tahun 2026</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                <Wallet className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-blue-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Perolehan Bulan Ini (Juli)</span>
                <span className="font-display text-2xl font-black text-blue-600">Rp {totalDanaPPGBulanIni.toLocaleString("id-ID")}</span>
                <span className="text-[10px] text-emerald-600 font-bold block flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Stabil & Terbuka
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-purple-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Kelompok Binaan</span>
                <span className="font-display text-2xl font-black text-slate-900">{filteredDanaPPG.length}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Tercatat aktif di 4 Desa</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-amber-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Siar-siar Terkumpul</span>
                <span className="font-display text-2xl font-black text-amber-600">Rp {totalSiarSiarGrand.toLocaleString("id-ID")}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Akumulasi M1 - M5 Tahun 2026</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                <Coins className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-teal-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Siar-siar Bulan {BULAN_LIST.find(b => b.key === selectedBulan)?.label}</span>
                <span className="font-display text-2xl font-black text-teal-600">Rp {totalSiarSiarBulanTerpilih.toLocaleString("id-ID")}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Total 5 Minggu Bulan Terpilih</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-indigo-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Desa Terdaftar</span>
                <span className="font-display text-2xl font-black text-indigo-600">{desas.length} Desa</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Wilayah Magetan Timur</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Filter className="h-6 w-6" />
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan desa atau nama kelompok..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-slate-200 text-slate-900 text-sm py-5 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Desa:</span>
              <select
                value={desaFilter}
                onChange={(e) => setDesaFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white text-slate-800 px-3 py-2 text-xs focus:outline-none h-10 font-bold cursor-pointer"
              >
                <option value="Semua">Semua Desa</option>
                {desas.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {activeSubCategory === "siar_siar" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Bulan View:</span>
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value as any)}
                  className="rounded-xl border border-emerald-300 bg-emerald-50/50 text-emerald-800 px-3 py-2 text-xs focus:outline-none h-10 font-black cursor-pointer"
                >
                  {BULAN_LIST.map((b) => (
                    <option key={b.key} value={b.key}>Bulan {b.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SUB-KATEGORI 1: DANA PPG TABLE */}
      {/* ========================================================================= */}
      {activeSubCategory === "dana_ppg" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display text-base font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Format Data Perolehan Dana PPG Bulanan
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Format: No | Desa | Nama Kelompok | Perolehan Dana PPG Bulan (Januari - Desember)
              </CardDescription>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold px-3 py-1">
              Tahun 2026
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-center w-12">No</th>
                  <th className="px-4 py-3.5">Desa</th>
                  <th className="px-4 py-3.5">Nama Kelompok</th>
                  {BULAN_LIST.map((b) => (
                    <th key={b.key} className="px-3 py-3.5 text-right font-mono">{b.label}</th>
                  ))}
                  <th className="px-4 py-3.5 text-right bg-emerald-50/70 text-emerald-900 font-bold">Total Dana PPG</th>
                  {!isReadOnly && <th className="px-4 py-3.5 text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDanaPPG.map((row, index) => {
                  const totalKelompok = calculateTotalDanaPPGKelompok(row);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{row.desa}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{row.namaKelompok}</td>
                      
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.januari.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.februari.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.maret.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.april.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.mei.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.juni.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {row.bulanan.juli.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-400">Rp {row.bulanan.agustus.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-400">Rp {row.bulanan.september.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-400">Rp {row.bulanan.oktober.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-400">Rp {row.bulanan.november.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-400">Rp {row.bulanan.desember.toLocaleString("id-ID")}</td>

                      <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/50">
                        Rp {totalKelompok.toLocaleString("id-ID")}
                      </td>

                      {!isReadOnly && (
                        <td className="px-4 py-3.5 text-center">
                          <Button
                            onClick={() => setEditingDanaPPG({ ...row })}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg"
                            title="Edit Dana PPG"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Summary Row */}
              <tfoot className="bg-slate-100 font-extrabold text-slate-800 text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-wider">
                    Total Keseluruhan Dana PPG:
                  </td>
                  {BULAN_LIST.map((b) => {
                    const sumMonth = filteredDanaPPG.reduce((sum, item) => sum + item.bulanan[b.key], 0);
                    return (
                      <td key={b.key} className="px-3 py-4 text-right font-mono">
                        Rp {sumMonth.toLocaleString("id-ID")}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-right font-mono text-emerald-800 bg-emerald-100/70 text-sm font-black">
                    Rp {totalDanaPPGGrand.toLocaleString("id-ID")}
                  </td>
                  {!isReadOnly && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-KATEGORI 2: SIAR-SIAR TABLE */}
      {/* ========================================================================= */}
      {activeSubCategory === "siar_siar" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-600" />
                Format Data Perolehan Siar-siar (Minggu 1 s/d Minggu 5)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Format: No | Desa | Nama Kelompok | Bulan ({BULAN_LIST.find(b => b.key === selectedBulan)?.label}): Minggu ke 1, Minggu ke 2, Minggu ke 3, Minggu ke 4, Minggu ke 5
              </CardDescription>
            </div>

            {/* Quick Month Switcher Chips */}
            <div className="flex flex-wrap gap-1">
              {BULAN_LIST.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setSelectedBulan(b.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    selectedBulan === b.key
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-center w-12" rowSpan={2}>No</th>
                  <th className="px-4 py-3.5" rowSpan={2}>Desa</th>
                  <th className="px-4 py-3.5" rowSpan={2}>Nama Kelompok</th>
                  <th colSpan={5} className="px-4 py-2 text-center bg-amber-50/70 text-amber-900 font-black border-b border-amber-200">
                    Perolehan Siar-siar Bulan {BULAN_LIST.find(b => b.key === selectedBulan)?.label}
                  </th>
                  <th className="px-4 py-3.5 text-right bg-teal-50/70 text-teal-900 font-bold" rowSpan={2}>Total Bulan Ini</th>
                  <th className="px-4 py-3.5 text-right bg-slate-200/60 text-slate-900 font-bold" rowSpan={2}>Total Setahun (Jan-Des)</th>
                  {!isReadOnly && <th className="px-4 py-3.5 text-center w-20" rowSpan={2}>Aksi</th>}
                </tr>
                <tr className="bg-amber-50/40 text-amber-950 font-bold text-[10px]">
                  <th className="px-3 py-2 text-right">Minggu ke 1</th>
                  <th className="px-3 py-2 text-right">Minggu ke 2</th>
                  <th className="px-3 py-2 text-right">Minggu ke 3</th>
                  <th className="px-3 py-2 text-right">Minggu ke 4</th>
                  <th className="px-3 py-2 text-right">Minggu ke 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSiarSiar.map((row, index) => {
                  const weeklyData = row.bulan[selectedBulan];
                  const totalBulan = calculateTotalSiarSiarBulan(weeklyData);
                  const totalTahunan = calculateTotalSiarSiarTahunanKelompok(row);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{row.desa}</td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{row.namaKelompok}</td>
                      
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {weeklyData.minggu1.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {weeklyData.minggu2.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {weeklyData.minggu3.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {weeklyData.minggu4.toLocaleString("id-ID")}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-slate-700">Rp {weeklyData.minggu5.toLocaleString("id-ID")}</td>

                      <td className="px-4 py-3.5 text-right font-mono font-black text-teal-700 bg-teal-50/40">
                        Rp {totalBulan.toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900 bg-slate-50">
                        Rp {totalTahunan.toLocaleString("id-ID")}
                      </td>

                      {!isReadOnly && (
                        <td className="px-4 py-3.5 text-center">
                          <Button
                            onClick={() => setEditingSiarSiar({ record: { ...row }, bulanKey: selectedBulan })}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg"
                            title="Edit Siar-siar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Summary Row */}
              <tfoot className="bg-slate-100 font-extrabold text-slate-800 text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-wider">
                    Total Siar-siar Bulan {BULAN_LIST.find(b => b.key === selectedBulan)?.label}:
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + row.bulan[selectedBulan].minggu1, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + row.bulan[selectedBulan].minggu2, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + row.bulan[selectedBulan].minggu3, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + row.bulan[selectedBulan].minggu4, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + row.bulan[selectedBulan].minggu5, 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-teal-800 bg-teal-100/80 text-sm font-black">
                    Rp {totalSiarSiarBulanTerpilih.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-amber-900 bg-amber-100/70 text-sm font-black">
                    Rp {totalSiarSiarGrand.toLocaleString("id-ID")}
                  </td>
                  {!isReadOnly && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT DANA PPG */}
      {/* ========================================================================= */}
      {editingDanaPPG && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800">
                  Input / Edit Perolehan Dana PPG
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Kelompok: <span className="text-emerald-700 font-bold">{editingDanaPPG.namaKelompok}</span> ({editingDanaPPG.desa})
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold">
                No. {editingDanaPPG.no}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BULAN_LIST.map((b) => (
                <div key={b.key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 capitalize">
                    Perolehan Bulan {b.label} (Rp)
                  </label>
                  <Input
                    type="number"
                    value={editingDanaPPG.bulanan[b.key]}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setEditingDanaPPG({
                        ...editingDanaPPG,
                        bulanan: {
                          ...editingDanaPPG.bulanan,
                          [b.key]: val
                        }
                      });
                    }}
                    className="rounded-xl font-mono text-sm border-slate-200 focus:ring-emerald-500"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Total Perolehan: <span className="font-mono text-emerald-700 font-black text-sm">Rp {calculateTotalDanaPPGKelompok(editingDanaPPG).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditingDanaPPG(null)}
                  variant="outline"
                  className="rounded-xl border-slate-200 font-semibold text-xs py-2 px-4"
                >
                  Batal
                </Button>
                <Button
                  onClick={() => handleSaveDanaPPG(editingDanaPPG)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Save className="h-4 w-4" /> Simpan Dana PPG
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT SIAR-SIAR */}
      {/* ========================================================================= */}
      {editingSiarSiar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800">
                  Input / Edit Siar-siar (Minggu 1 - 5)
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Kelompok: <span className="text-amber-700 font-bold">{editingSiarSiar.record.namaKelompok}</span> ({editingSiarSiar.record.desa})
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-900 border-none font-bold capitalize">
                {editingSiarSiar.bulanKey}
              </Badge>
            </div>

            <div className="space-y-3">
              {(["minggu1", "minggu2", "minggu3", "minggu4", "minggu5"] as const).map((mKey, idx) => (
                <div key={mKey} className="flex items-center justify-between gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-700 w-32">
                    Minggu ke {idx + 1} (Rp)
                  </label>
                  <Input
                    type="number"
                    value={editingSiarSiar.record.bulan[editingSiarSiar.bulanKey][mKey]}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      const currentWeekly = editingSiarSiar.record.bulan[editingSiarSiar.bulanKey];
                      setEditingSiarSiar({
                        ...editingSiarSiar,
                        record: {
                          ...editingSiarSiar.record,
                          bulan: {
                            ...editingSiarSiar.record.bulan,
                            [editingSiarSiar.bulanKey]: {
                              ...currentWeekly,
                              [mKey]: val
                            }
                          }
                        }
                      });
                    }}
                    className="rounded-xl font-mono text-sm border-slate-200 focus:ring-amber-500 max-w-[220px]"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Total Bulan {editingSiarSiar.bulanKey}: <span className="font-mono text-amber-700 font-black text-sm">Rp {calculateTotalSiarSiarBulan(editingSiarSiar.record.bulan[editingSiarSiar.bulanKey]).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditingSiarSiar(null)}
                  variant="outline"
                  className="rounded-xl border-slate-200 font-semibold text-xs py-2 px-4"
                >
                  Batal
                </Button>
                <Button
                  onClick={() => handleSaveSiarSiar(editingSiarSiar.record)}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 gap-1.5 shadow-md shadow-amber-600/20"
                >
                  <Save className="h-4 w-4" /> Simpan Siar-siar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
