import React, { useState, useEffect } from "react";
import { getKelompok, Kelompok, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Wallet, Coins, Search, FileSpreadsheet, Printer, Edit, Plus, Save, 
  ChevronRight, Calendar, ArrowUpRight, CheckCircle2, Filter, RefreshCw,
  ShieldCheck, Lock, AlertCircle, Info, Eye, Clock, CalendarDays, Download
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

const MINGGU_LIST = [
  { key: "minggu1", label: "Minggu ke-1 (Sabtu I)" },
  { key: "minggu2", label: "Minggu ke-2 (Sabtu II)" },
  { key: "minggu3", label: "Minggu ke-3 (Sabtu III)" },
  { key: "minggu4", label: "Minggu ke-4 (Sabtu IV)" },
  { key: "minggu5", label: "Minggu ke-5 (Sabtu V)" }
] as const;

export function PendanaanPanel({ userRole }: PendanaanPanelProps) {
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  const [activeSubCategory, setActiveSubCategory] = useState<"dana_ppg" | "siar_siar">("dana_ppg");
  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [selectedBulan, setSelectedBulan] = useState<keyof SiarSiarRecord["bulan"]>("juli");

  // User scope check (Kelompok or Desa scope)
  const [userScope, setUserScope] = useState(() => {
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

  // Re-sync scope when role or localStorage changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loggedUser = localStorage.getItem("sim_tpq_logged_user");
      if (loggedUser) {
        const details = getUserDetails(loggedUser);
        if (details && (details.level === "kelompok" || details.level === "desa")) {
          setUserScope(details.scope);
          return;
        }
      }
      setUserScope(localStorage.getItem("sim_tpq_active_scope") || "Semua");
    }
  }, [userRole]);

  // Determine allowed kelompoks by RBAC rules
  const allowedKelompoks = kelompokList
    .filter(k => {
      if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
      if (userRole === "Admin Desa") return k.desa === userScope;
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") return k.namaKelompok === userScope;
      return true;
    })
    .map(k => k.namaKelompok);

  const isReadOnly = userRole === "Viewer";

  // Check specific row edit authorization
  const canEditRecord = (namaKelompok: string, desa: string): boolean => {
    if (isReadOnly) return false;
    if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
    if (userRole === "Admin Desa") return desa === userScope || allowedKelompoks.includes(namaKelompok);
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") return namaKelompok === userScope;
    return true;
  };

  // Initial Data Dana PPG
  const [danaPPGList, setDanaPPGList] = useState<DanaPPGRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_tpq_dana_ppg");
      if (stored) return JSON.parse(stored);
    }
    
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

  // Initial Data Siar-siar
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

  // Full Row Editing Modals
  const [editingDanaPPG, setEditingDanaPPG] = useState<DanaPPGRecord | null>(null);
  const [editingSiarSiar, setEditingSiarSiar] = useState<{ record: SiarSiarRecord; bulanKey: keyof SiarSiarRecord["bulan"] } | null>(null);

  // Quick Action Input Modals
  const [quickPPGOpen, setQuickPPGOpen] = useState(false);
  const [quickSiarOpen, setQuickSiarOpen] = useState(false);

  // Quick Input Form States
  const [targetKelompokName, setTargetKelompokName] = useState(() => allowedKelompoks[0] || "Kelompok Karas");
  const [inputMonthPPG, setInputMonthPPG] = useState<keyof DanaPPGRecord["bulanan"]>("juli");
  const [inputNominalPPG, setInputNominalPPG] = useState<number>(0);

  const [inputSiarMonth, setInputSiarMonth] = useState<keyof SiarSiarRecord["bulan"]>("juli");
  const [inputSiarWeek, setInputSiarWeek] = useState<keyof WeeklySiarSiar>("minggu4");
  const [inputNominalSiar, setInputNominalSiar] = useState<number>(0);

  // Sync default targetKelompokName when allowedKelompoks changes
  useEffect(() => {
    if (allowedKelompoks.length > 0 && !allowedKelompoks.includes(targetKelompokName)) {
      setTargetKelompokName(allowedKelompoks[0]);
    }
  }, [userRole, userScope]);

  // Unique Desas list for filter dropdown
  const desas = Array.from(new Set(kelompokList.map(k => k.desa)));

  // Filtered Dana PPG list
  const filteredDanaPPG = danaPPGList.filter(item => {
    if (!allowedKelompoks.includes(item.namaKelompok)) return false;
    const matchesDesa = desaFilter === "Semua" || item.desa === desaFilter;
    const matchesSearch = item.namaKelompok.toLowerCase().includes(search.toLowerCase()) ||
                          item.desa.toLowerCase().includes(search.toLowerCase());
    return matchesDesa && matchesSearch;
  });

  // Filtered Siar-siar list
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
    return (weekly.minggu1 || 0) + (weekly.minggu2 || 0) + (weekly.minggu3 || 0) + (weekly.minggu4 || 0) + (weekly.minggu5 || 0);
  };

  const calculateTotalSiarSiarTahunanKelompok = (item: SiarSiarRecord) => {
    return Object.values(item.bulan).reduce((acc, weekly) => acc + calculateTotalSiarSiarBulan(weekly), 0);
  };

  const totalSiarSiarGrand = filteredSiarSiar.reduce((acc, item) => acc + calculateTotalSiarSiarTahunanKelompok(item), 0);
  const totalSiarSiarBulanTerpilih = filteredSiarSiar.reduce((acc, item) => acc + calculateTotalSiarSiarBulan(item.bulan[selectedBulan]), 0);

  // DOWNLOAD LOGIC DANA PPG (CSV / EXCEL FORMATTED)
  const downloadDanaPPGReport = () => {
    const headers = [
      "No", "Desa", "Nama Kelompok", 
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember", 
      "Total Dana PPG (Rp)"
    ];

    const rows = filteredDanaPPG.map((item, idx) => [
      idx + 1,
      `"${item.desa}"`,
      `"${item.namaKelompok}"`,
      item.bulanan.januari,
      item.bulanan.februari,
      item.bulanan.maret,
      item.bulanan.april,
      item.bulanan.mei,
      item.bulanan.juni,
      item.bulanan.juli,
      item.bulanan.agustus,
      item.bulanan.september,
      item.bulanan.oktober,
      item.bulanan.november,
      item.bulanan.desember,
      calculateTotalDanaPPGKelompok(item)
    ]);

    const totalRow = [
      "TOTAL KESELURUHAN", "-", "-",
      ...BULAN_LIST.map(b => filteredDanaPPG.reduce((sum, item) => sum + item.bulanan[b.key], 0)),
      totalDanaPPGGrand
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(",")), totalRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Dana_PPG_Magetan_Timur_${desaFilter === "Semua" ? "All_Desa" : desaFilter}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File Laporan Dana PPG (Excel/CSV) berhasil di-download!");
  };

  // DOWNLOAD LOGIC SIAR-SIAR (CSV / EXCEL FORMATTED)
  const downloadSiarSiarReport = () => {
    const bulanLabel = BULAN_LIST.find(b => b.key === selectedBulan)?.label || selectedBulan;
    const headers = [
      "No", "Desa", "Nama Kelompok", 
      `Minggu 1 (Sabtu I - ${bulanLabel})`, 
      `Minggu 2 (Sabtu II - ${bulanLabel})`, 
      `Minggu 3 (Sabtu III - ${bulanLabel})`, 
      `Minggu 4 (Sabtu IV - ${bulanLabel})`, 
      `Minggu 5 (Sabtu V - ${bulanLabel})`, 
      `Total Bulan ${bulanLabel} (Rp)`, 
      "Total Setahun (Jan-Des)"
    ];

    const rows = filteredSiarSiar.map((item, idx) => {
      const weekly = item.bulan[selectedBulan] || { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 };
      const totBulan = calculateTotalSiarSiarBulan(weekly);
      const totTahunan = calculateTotalSiarSiarTahunanKelompok(item);

      return [
        idx + 1,
        `"${item.desa}"`,
        `"${item.namaKelompok}"`,
        weekly.minggu1,
        weekly.minggu2,
        weekly.minggu3,
        weekly.minggu4,
        weekly.minggu5,
        totBulan,
        totTahunan
      ];
    });

    const sumM1 = filteredSiarSiar.reduce((acc, r) => acc + (r.bulan[selectedBulan]?.minggu1 || 0), 0);
    const sumM2 = filteredSiarSiar.reduce((acc, r) => acc + (r.bulan[selectedBulan]?.minggu2 || 0), 0);
    const sumM3 = filteredSiarSiar.reduce((acc, r) => acc + (r.bulan[selectedBulan]?.minggu3 || 0), 0);
    const sumM4 = filteredSiarSiar.reduce((acc, r) => acc + (r.bulan[selectedBulan]?.minggu4 || 0), 0);
    const sumM5 = filteredSiarSiar.reduce((acc, r) => acc + (r.bulan[selectedBulan]?.minggu5 || 0), 0);

    const totalRow = [
      "TOTAL KESELURUHAN", "-", "-",
      sumM1, sumM2, sumM3, sumM4, sumM5,
      totalSiarSiarBulanTerpilih,
      totalSiarSiarGrand
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(",")), totalRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Siar_Siar_Bulan_${bulanLabel}_Magetan_Timur_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`File Laporan Siar-siar Bulan ${bulanLabel} (Excel/CSV) berhasil di-download!`);
  };

  // Save Dana PPG full row
  const handleSaveDanaPPG = (updated: DanaPPGRecord) => {
    if (!canEditRecord(updated.namaKelompok, updated.desa)) {
      toast.error(`Akses ditolak: Otoritas Anda (${userRole}) tidak diizinkan mengubah data kelompok ${updated.namaKelompok}!`);
      return;
    }

    const newList = danaPPGList.map(item => item.id === updated.id ? updated : item);
    setDanaPPGList(newList);
    localStorage.setItem("sim_tpq_dana_ppg", JSON.stringify(newList));
    setEditingDanaPPG(null);
    toast.success(`Data Dana PPG ${updated.namaKelompok} (${updated.desa}) berhasil disimpan secara akurat!`);
  };

  // Save Siar-siar full row
  const handleSaveSiarSiar = (updatedRecord: SiarSiarRecord) => {
    if (!canEditRecord(updatedRecord.namaKelompok, updatedRecord.desa)) {
      toast.error(`Akses ditolak: Otoritas Anda (${userRole}) tidak diizinkan mengubah data kelompok ${updatedRecord.namaKelompok}!`);
      return;
    }

    const newList = siarSiarList.map(item => item.id === updatedRecord.id ? updatedRecord : item);
    setSiarSiarList(newList);
    localStorage.setItem("sim_tpq_siar_siar", JSON.stringify(newList));
    setEditingSiarSiar(null);
    toast.success(`Data Siar-siar ${updatedRecord.namaKelompok} (${updatedRecord.desa}) berhasil disimpan secara akurat!`);
  };

  // Submit Quick Laporan Dana PPG (1x per bulan)
  const handleQuickSubmitPPG = (e: React.FormEvent) => {
    e.preventDefault();
    const record = danaPPGList.find(d => d.namaKelompok === targetKelompokName);
    if (!record) {
      toast.error("Kelompok target tidak ditemukan!");
      return;
    }
    if (!canEditRecord(record.namaKelompok, record.desa)) {
      toast.error(`Akses ditolak untuk kelompok ${record.namaKelompok}!`);
      return;
    }

    const updatedBulanan = { ...record.bulanan, [inputMonthPPG]: inputNominalPPG };
    const updatedRecord = { ...record, bulanan: updatedBulanan };

    const newList = danaPPGList.map(d => d.id === record.id ? updatedRecord : d);
    setDanaPPGList(newList);
    localStorage.setItem("sim_tpq_dana_ppg", JSON.stringify(newList));
    setQuickPPGOpen(false);
    setInputNominalPPG(0);
    toast.success(`Laporan Dana PPG Bulan ${BULAN_LIST.find(b => b.key === inputMonthPPG)?.label} untuk ${record.namaKelompok} berhasil diinput (Rp ${inputNominalPPG.toLocaleString("id-ID")})!`);
  };

  // Submit Quick Laporan Siar-siar (1x per minggu / Sabtu)
  const handleQuickSubmitSiar = (e: React.FormEvent) => {
    e.preventDefault();
    const record = siarSiarList.find(s => s.namaKelompok === targetKelompokName);
    if (!record) {
      toast.error("Kelompok target tidak ditemukan!");
      return;
    }
    if (!canEditRecord(record.namaKelompok, record.desa)) {
      toast.error(`Akses ditolak untuk kelompok ${record.namaKelompok}!`);
      return;
    }

    const currentWeekly = record.bulan[inputSiarMonth] || { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 };
    const updatedWeekly = { ...currentWeekly, [inputSiarWeek]: inputNominalSiar };
    const updatedBulan = { ...record.bulan, [inputSiarMonth]: updatedWeekly };
    const updatedRecord = { ...record, bulan: updatedBulan };

    const newList = siarSiarList.map(s => s.id === record.id ? updatedRecord : s);
    setSiarSiarList(newList);
    localStorage.setItem("sim_tpq_siar_siar", JSON.stringify(newList));
    setQuickSiarOpen(false);
    setInputNominalSiar(0);
    toast.success(`Laporan Siar-siar ${MINGGU_LIST.find(m => m.key === inputSiarWeek)?.label} Bulan ${BULAN_LIST.find(b => b.key === inputSiarMonth)?.label} untuk ${record.namaKelompok} berhasil diinput (Rp ${inputNominalSiar.toLocaleString("id-ID")})!`);
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header Title & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-slate-800">Fitur Pendanaan Wilayah</h2>
            <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-bold rounded-full text-xs">
              PPG MAGETAN TIMUR
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manajemen, download laporan, dan rekapitulasi perolehan Dana PPG (Bulanan) & Siar-siar (Mingguan / Sabtu).
          </p>
        </div>

        {/* Action Buttons: Quick Inputs & Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <>
              <Button 
                onClick={() => setQuickPPGOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-2.5 px-3.5 gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Plus className="h-4 w-4" /> Input Dana PPG (1x / Bulan)
              </Button>

              <Button 
                onClick={() => setQuickSiarOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl py-2.5 px-3.5 gap-1.5 shadow-md shadow-amber-600/20"
              >
                <CalendarDays className="h-4 w-4" /> Input Siar-siar (Sabtu)
              </Button>
            </>
          )}

          <Button 
            onClick={activeSubCategory === "dana_ppg" ? downloadDanaPPGReport : downloadSiarSiarReport}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl py-2.5 px-3.5 gap-1.5 shadow-md"
          >
            <Download className="h-4 w-4 text-emerald-400" /> 
            Download {activeSubCategory === "dana_ppg" ? "Dana PPG" : `Siar-siar (${BULAN_LIST.find(b => b.key === selectedBulan)?.label})`}
          </Button>

          <Button 
            onClick={() => {
              window.print();
            }} 
            variant="outline" 
            className="gap-1.5 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2.5 px-3"
          >
            <Printer className="h-4 w-4 text-slate-600" /> Cetak
          </Button>
        </div>
      </div>

      {/* RBAC Scope & Input Rules Banner */}
      <div className={`p-4 rounded-2xl border text-xs font-semibold flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm ${
        userRole === "Super Admin" || userRole === "Admin Daerah"
          ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
          : userRole === "Admin Desa"
          ? "bg-blue-50/80 border-blue-200 text-blue-900"
          : userRole === "Admin Kelompok" || userRole === "Pengajar"
          ? "bg-amber-50/80 border-amber-200 text-amber-900"
          : "bg-slate-100 border-slate-200 text-slate-700"
      }`}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className={`h-5 w-5 shrink-0 ${
            userRole === "Super Admin" || userRole === "Admin Daerah"
              ? "text-emerald-600"
              : userRole === "Admin Desa"
              ? "text-blue-600"
              : userRole === "Admin Kelompok" || userRole === "Pengajar"
              ? "text-amber-600"
              : "text-slate-500"
          }`} />
          <div>
            <span className="font-bold block">
              Aturan Otoritas Laporan ({userRole}): <span className="font-black uppercase">{userScope}</span>
            </span>
            <span className="text-[11px] opacity-90 block mt-0.5">
              📅 <strong>Rule Pengisian</strong>: 1. <b>Dana PPG</b> diisi 1x dalam 1 Bulan. 2. <b>Siar-siar</b> diisi 1x seminggu (Rutin setiap hari Sabtu).
              {userRole === "Admin Kelompok" && ` (Anda berwenang khusus mengisi kelompok ${userScope}).`}
              {userRole === "Admin Desa" && ` (Anda dapat meninjau & mengelola kelompok se-Desa ${userScope}).`}
              {(userRole === "Super Admin" || userRole === "Admin Daerah") && " (Anda berhak memantau & meninjau seluruh Daerah)."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`font-bold px-3 py-1 rounded-xl text-[10px] ${
            userRole === "Super Admin" || userRole === "Admin Daerah"
              ? "bg-emerald-600 text-white"
              : userRole === "Admin Desa"
              ? "bg-blue-600 text-white"
              : userRole === "Admin Kelompok" || userRole === "Pengajar"
              ? "bg-amber-600 text-white"
              : "bg-slate-700 text-white"
          }`}>
            Scope: {userScope}
          </Badge>
        </div>
      </div>

      {/* Sub-Category Nav Tabs & Direct Download Shortcuts */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-200/60">
        <div className="flex flex-wrap gap-2">
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
              1x / Bulan
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
              Sabtu (Mingguan)
            </Badge>
          </button>
        </div>

        {/* Dedicated Download Buttons per Category */}
        <div className="flex items-center gap-2">
          <Button
            onClick={downloadDanaPPGReport}
            variant="outline"
            size="sm"
            className="rounded-xl border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs gap-1.5 py-1.5 px-3"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" /> Download Laporan Dana PPG (Excel)
          </Button>

          <Button
            onClick={downloadSiarSiarReport}
            variant="outline"
            size="sm"
            className="rounded-xl border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs gap-1.5 py-1.5 px-3"
          >
            <Download className="h-3.5 w-3.5 text-amber-600" /> Download Laporan Siar-siar (Excel)
          </Button>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {activeSubCategory === "dana_ppg" ? (
          <>
            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-emerald-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Total Dana PPG Terkumpul</span>
                <span className="font-display text-2xl font-black text-emerald-600">Rp {totalDanaPPGGrand.toLocaleString("id-ID")}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Akumulasi Tahun 2026 ({filteredDanaPPG.length} Kelompok)</span>
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
                  <CheckCircle2 className="h-3.5 w-3.5" /> Laporan Bulanan Terbuka
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-purple-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Scope Kelompok Terbuka</span>
                <span className="font-display text-2xl font-black text-slate-900">{filteredDanaPPG.length} Kelompok</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Sesuai Otoritas Peran {userRole}</span>
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
                <span className="text-[10px] text-slate-400 font-semibold block">Pengisian Rutin Setiap Sabtu</span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
                <CalendarDays className="h-6 w-6" />
              </div>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between hover:border-indigo-200 transition-colors">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Kelompok Terbuka</span>
                <span className="font-display text-2xl font-black text-indigo-600">{filteredSiarSiar.length} Kelompok</span>
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
            {userRole === "Super Admin" || userRole === "Admin Daerah" ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Desa:</span>
                <select
                  value={desaFilter}
                  onChange={(e) => setDesaFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-800 px-3 py-2 text-xs focus:outline-none h-10 font-bold cursor-pointer"
                >
                  <option value="Semua">Semua Desa (4 Wilayah)</option>
                  {desas.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {activeSubCategory === "siar_siar" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Pilih Bulan:</span>
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
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-base font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Format Data Perolehan Dana PPG Bulanan (Format: No . Desa . Nama Kelompok . Perolehan Bulan)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Pengisian wajib diisi 1x dalam 1 bulan oleh Admin Kelompok.
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={downloadDanaPPGReport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Laporan Dana PPG (Excel)
              </Button>
            </div>
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
                  {!isReadOnly && <th className="px-4 py-3.5 text-center w-20">Input / Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDanaPPG.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="text-center py-8 text-slate-400 font-bold">
                      Tidak ada data Dana PPG yang sesuai dengan filter/akses Anda.
                    </td>
                  </tr>
                ) : (
                  filteredDanaPPG.map((row, index) => {
                    const totalKelompok = calculateTotalDanaPPGKelompok(row);
                    const editable = canEditRecord(row.namaKelompok, row.desa);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{row.desa}</td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                          {row.namaKelompok}
                          {row.namaKelompok === userScope && (
                            <Badge className="bg-amber-100 text-amber-900 border-none font-bold text-[9px] px-1.5 py-0.5">
                              Kelompok Anda
                            </Badge>
                          )}
                        </td>
                        
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
                            {editable ? (
                              <Button
                                onClick={() => setEditingDanaPPG({ ...row })}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg"
                                title="Input / Edit Laporan Dana PPG"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic flex items-center justify-center gap-1">
                                <Lock className="h-3 w-3 text-slate-300" /> Kunci
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Summary Row */}
              <tfoot className="bg-slate-100 font-extrabold text-slate-800 text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-wider">
                    Total Keseluruhan Dana PPG ({filteredDanaPPG.length} Kelompok):
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
                Format Data Perolehan Siar-siar Kelompok (Format: No . Desa . Nama Kelompok . Minggu ke 1 - Minggu ke 5)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Pengisian wajib rutin diisi seminggu sekali pada hari Sabtu oleh Admin Kelompok.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={downloadSiarSiarReport}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl py-2 px-4 gap-1.5 shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Laporan Siar-siar ({BULAN_LIST.find(b => b.key === selectedBulan)?.label})
              </Button>

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
                    Perolehan Siar-siar Bulan {BULAN_LIST.find(b => b.key === selectedBulan)?.label} (Rutinitas Setiap Sabtu)
                  </th>
                  <th className="px-4 py-3.5 text-right bg-teal-50/70 text-teal-900 font-bold" rowSpan={2}>Total Bulan Ini</th>
                  <th className="px-4 py-3.5 text-right bg-slate-200/60 text-slate-900 font-bold" rowSpan={2}>Total Setahun (Jan-Des)</th>
                  {!isReadOnly && <th className="px-4 py-3.5 text-center w-20" rowSpan={2}>Input / Edit</th>}
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
                {filteredSiarSiar.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-slate-400 font-bold">
                      Tidak ada data Siar-siar yang sesuai dengan filter/akses Anda.
                    </td>
                  </tr>
                ) : (
                  filteredSiarSiar.map((row, index) => {
                    const weeklyData = row.bulan[selectedBulan] || { minggu1: 0, minggu2: 0, minggu3: 0, minggu4: 0, minggu5: 0 };
                    const totalBulan = calculateTotalSiarSiarBulan(weeklyData);
                    const totalTahunan = calculateTotalSiarSiarTahunanKelompok(row);
                    const editable = canEditRecord(row.namaKelompok, row.desa);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{row.desa}</td>
                        <td className="px-4 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                          {row.namaKelompok}
                          {row.namaKelompok === userScope && (
                            <Badge className="bg-amber-100 text-amber-900 border-none font-bold text-[9px] px-1.5 py-0.5">
                              Kelompok Anda
                            </Badge>
                          )}
                        </td>
                        
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
                            {editable ? (
                              <Button
                                onClick={() => setEditingSiarSiar({ record: { ...row }, bulanKey: selectedBulan })}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg"
                                title="Input / Edit Laporan Siar-siar Minggu Ini"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic flex items-center justify-center gap-1">
                                <Lock className="h-3 w-3 text-slate-300" /> Kunci
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Total Summary Row */}
              <tfoot className="bg-slate-100 font-extrabold text-slate-800 text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-wider">
                    Total Siar-siar Bulan {BULAN_LIST.find(b => b.key === selectedBulan)?.label}:
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + (row.bulan[selectedBulan]?.minggu1 || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + (row.bulan[selectedBulan]?.minggu2 || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + (row.bulan[selectedBulan]?.minggu3 || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + (row.bulan[selectedBulan]?.minggu4 || 0), 0).toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-4 text-right font-mono">
                    Rp {filteredSiarSiar.reduce((acc, row) => acc + (row.bulan[selectedBulan]?.minggu5 || 0), 0).toLocaleString("id-ID")}
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
      {/* QUICK MODAL 1: INPUT LAPORAN DANA PPG (1X / BULAN) */}
      {/* ========================================================================= */}
      {quickPPGOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  Form Laporan Dana PPG Bulanan
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Aturan: Laporan diisi 1x setiap 1 bulan.
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">
                Bulanan
              </Badge>
            </div>

            <form onSubmit={handleQuickSubmitPPG} className="space-y-4">
              {/* Select Kelompok Target */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Kelompok</label>
                <select
                  value={targetKelompokName}
                  onChange={(e) => setTargetKelompokName(e.target.value)}
                  disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 px-3 py-2.5 text-xs font-bold focus:ring-emerald-500"
                >
                  {allowedKelompoks.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Select Bulan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Bulan Laporan</label>
                <select
                  value={inputMonthPPG}
                  onChange={(e) => setInputMonthPPG(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-xs font-bold focus:ring-emerald-500 cursor-pointer"
                >
                  {BULAN_LIST.map((b) => (
                    <option key={b.key} value={b.key}>Bulan {b.label}</option>
                  ))}
                </select>
              </div>

              {/* Input Nominal */}
              <div className="space-y-1 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <label>Nominal Perolehan Dana PPG (Rp)</label>
                  <span className="font-mono text-emerald-700 font-extrabold">
                    Rp {inputNominalPPG.toLocaleString("id-ID")}
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  required
                  placeholder="Masukkan nominal perolehan..."
                  value={inputNominalPPG === 0 ? "" : inputNominalPPG}
                  onChange={(e) => setInputNominalPPG(Math.max(0, Number(e.target.value) || 0))}
                  className="rounded-xl font-mono text-sm border-slate-200 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setQuickPPGOpen(false)}
                  variant="outline"
                  className="rounded-xl border-slate-200 font-semibold text-xs py-2 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-5 gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Save className="h-4 w-4" /> Simpan Laporan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MODAL 2: INPUT LAPORAN SIAR-SIAR (1X / MINGGU - HARI SABTU) */}
      {/* ========================================================================= */}
      {quickSiarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-scale-up text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-600" />
                  Form Laporan Siar-siar Mingguan
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Aturan: Laporan diisi 1x seminggu (Rutin hari Sabtu).
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-900 border-none font-bold text-[10px]">
                Hari Sabtu
              </Badge>
            </div>

            <form onSubmit={handleQuickSubmitSiar} className="space-y-4">
              {/* Select Kelompok Target */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Kelompok</label>
                <select
                  value={targetKelompokName}
                  onChange={(e) => setTargetKelompokName(e.target.value)}
                  disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 px-3 py-2.5 text-xs font-bold focus:ring-amber-500"
                >
                  {allowedKelompoks.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Select Bulan & Minggu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Bulan Laporan</label>
                  <select
                    value={inputSiarMonth}
                    onChange={(e) => setInputSiarMonth(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-xs font-bold focus:ring-amber-500 cursor-pointer"
                  >
                    {BULAN_LIST.map((b) => (
                      <option key={b.key} value={b.key}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Minggu Ke (Sabtu)</label>
                  <select
                    value={inputSiarWeek}
                    onChange={(e) => setInputSiarWeek(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2.5 text-xs font-bold focus:ring-amber-500 cursor-pointer"
                  >
                    {MINGGU_LIST.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Nominal */}
              <div className="space-y-1 bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <label>Nominal Siar-siar Sabtu Ini (Rp)</label>
                  <span className="font-mono text-amber-700 font-extrabold">
                    Rp {inputNominalSiar.toLocaleString("id-ID")}
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  required
                  placeholder="Masukkan perolehan Siar-siar..."
                  value={inputNominalSiar === 0 ? "" : inputNominalSiar}
                  onChange={(e) => setInputNominalSiar(Math.max(0, Number(e.target.value) || 0))}
                  className="rounded-xl font-mono text-sm border-slate-200 focus:ring-amber-500 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setQuickSiarOpen(false)}
                  variant="outline"
                  className="rounded-xl border-slate-200 font-semibold text-xs py-2 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 gap-1.5 shadow-md shadow-amber-600/20"
                >
                  <Save className="h-4 w-4" /> Simpan Laporan Sabtu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FULL EDIT DANA PPG */}
      {/* ========================================================================= */}
      {editingDanaPPG && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto animate-scale-up text-left">
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
              {BULAN_LIST.map((b) => {
                const currentVal = editingDanaPPG.bulanan[b.key] || 0;
                return (
                  <div key={b.key} className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <label className="capitalize">Perolehan Bulan {b.label}</label>
                      <span className="font-mono text-emerald-700 font-extrabold text-[11px]">
                        Rp {currentVal.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={currentVal === 0 ? "" : currentVal}
                      placeholder="Masukkan nominal (Rp)..."
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setEditingDanaPPG({
                          ...editingDanaPPG,
                          bulanan: {
                            ...editingDanaPPG.bulanan,
                            [b.key]: val
                          }
                        });
                      }}
                      className="rounded-xl font-mono text-sm border-slate-200 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Total Perolehan Dana PPG: <span className="font-mono text-emerald-700 font-black text-sm">Rp {calculateTotalDanaPPGKelompok(editingDanaPPG).toLocaleString("id-ID")}</span>
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
      {/* MODAL FULL EDIT SIAR-SIAR */}
      {/* ========================================================================= */}
      {editingSiarSiar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 animate-scale-up text-left">
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
                Bulan {BULAN_LIST.find(b => b.key === editingSiarSiar.bulanKey)?.label}
              </Badge>
            </div>

            <div className="space-y-3">
              {(["minggu1", "minggu2", "minggu3", "minggu4", "minggu5"] as const).map((mKey, idx) => {
                const currentVal = editingSiarSiar.record.bulan[editingSiarSiar.bulanKey][mKey] || 0;
                return (
                  <div key={mKey} className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Minggu ke {idx + 1} (Pengisian Sabtu)
                      </label>
                      <span className="font-mono text-[11px] text-amber-700 font-bold block">
                        Rp {currentVal.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={currentVal === 0 ? "" : currentVal}
                      placeholder="Nominal Rp..."
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
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
                      className="rounded-xl font-mono text-sm border-slate-200 focus:ring-amber-500 max-w-[200px] bg-white"
                    />
                  </div>
                );
              })}
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
