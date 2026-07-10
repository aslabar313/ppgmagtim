import React, { useState, useEffect } from "react";
import { getPresensi, savePresensi, getGenerus, getKelompok, Presensi, Generus, Kelompok, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Calendar, UserCheck, QrCode, Upload, FileSpreadsheet, 
  Check, X, AlertTriangle, Play, Award, Sparkles, Search, Download,
  Users, GraduationCap, ShieldAlert, CheckCircle2, CircleDot
} from "lucide-react";
import { toast } from "sonner";

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

function mapPresensiHeaders(headers: string[]): { [key: string]: number } {
  const mapping: { [key: string]: number } = {};
  headers.forEach((h, index) => {
    const clean = h.trim().toLowerCase();
    if (clean.includes("nis")) {
      mapping.nisInternal = index;
    } else if (clean.includes("nama") || clean.includes("santri") || clean.includes("siswa")) {
      mapping.namaLengkap = index;
    } else if (clean.includes("tanggal") || clean.includes("tgl") || clean === "date") {
      mapping.tanggal = index;
    } else if (clean.includes("status") || clean.includes("hadir") || clean.includes("absen") || clean.includes("kehadiran")) {
      mapping.statusKehadiran = index;
    }
  });
  return mapping;
}

interface PresensiPanelProps {
  userRole: string;
}

export function PresensiPanel({ userRole }: PresensiPanelProps) {
  const [presensiList, setPresensiList] = useState<Presensi[]>(() => getPresensi() || []);
  const [generusList] = useState<Generus[]>(() => getGenerus() || []);
  const [kelompokList] = useState<Kelompok[]>(() => getKelompok() || []);

  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
      const loggedUser = localStorage.getItem("sim_tpq_logged_user");
      if (loggedUser) {
        const details = getUserDetails(loggedUser);
        if (details && details.scope) {
          if (details.level === "kelompok" || details.level === "desa") {
            return details.scope;
          }
        }
      }
      return localStorage.getItem("sim_tpq_active_scope") || "Semua";
    }
    return "Semua";
  });

  const allowedKelompoks = (kelompokList || [])
    .filter(k => {
      if (!k) return false;
      if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
      if (userRole === "Admin Desa") {
        if (!userScope || userScope === "Semua" || userScope === "Daerah Magetan Timur") return true;
        return k.desa === userScope;
      }
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
        if (!userScope || userScope === "Semua" || userScope === "Daerah Magetan Timur" || (typeof userScope === "string" && userScope.includes("Desa"))) return true;
        return k.namaKelompok === userScope;
      }
      return true;
    })
    .map(k => k.namaKelompok);

  const [selectedKelompok, setSelectedKelompok] = useState(allowedKelompoks[0] || "");
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMode, setAttendanceMode] = useState<"log" | "input">("log");
  const [activeCategory, setActiveCategory] = useState<"Semua" | "Caberawit" | "Muda-Mudi" | "Jama'ah Dewasa">("Semua");
  const [jenisPengajian, setJenisPengajian] = useState("Sambung Kelompok");
  const [searchQuery, setSearchQuery] = useState("");

  const [qrSimOpen, setQrSimOpen] = useState(false);
  const [simName, setSimName] = useState((generusList && generusList[0]?.namaLengkap) || "");

  // Synchronize selectedKelompok when allowedKelompoks list changes
  useEffect(() => {
    if (allowedKelompoks.length > 0 && (!selectedKelompok || !allowedKelompoks.includes(selectedKelompok))) {
      setSelectedKelompok(allowedKelompoks[0]);
    }
  }, [allowedKelompoks, selectedKelompok]);

  // Synchronize simName for QR scanner when allowed students change
  useEffect(() => {
    const allowedStudents = generusList.filter(g => allowedKelompoks.includes(g.namaKelompok));
    if (allowedStudents.length > 0 && (!simName || !allowedStudents.some(s => s.namaLengkap === simName))) {
      setSimName(allowedStudents[0].namaLengkap);
    }
  }, [allowedKelompoks, generusList, simName]);
  
  // AI OCR Presensi Scanner
  const [ocrScanning, setOcrScanning] = useState(false);

  // CSV Import States for Presensi
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importValidation, setImportValidation] = useState<{ [key: number]: string[] }>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing'>('idle');

  const isReadOnly = userRole === "Viewer";

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('parsing');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const csvData = parseCSV(text);
        if (csvData.length < 2) {
          toast.error("File CSV kosong atau tidak memiliki baris data.");
          setImportStatus('idle');
          return;
        }

        const headers = csvData[0];
        const rows = csvData.slice(1).filter(r => r.length > 0 && r.some(cell => cell.trim() !== ''));

        const mapping = mapPresensiHeaders(headers);
        
        if (mapping.nisInternal === undefined && mapping.namaLengkap === undefined) {
          toast.error("Kolom 'NIS' atau 'Nama Lengkap' tidak ditemukan dalam file CSV.");
          setImportStatus('idle');
          return;
        }

        const parsedRows: any[] = [];
        const validationMap: { [key: number]: string[] } = {};

        rows.forEach((row, index) => {
          const rawNis = mapping.nisInternal !== undefined ? row[mapping.nisInternal]?.trim() : "";
          const rawNama = mapping.namaLengkap !== undefined ? row[mapping.namaLengkap]?.trim() : "";
          const rawTanggal = mapping.tanggal !== undefined ? row[mapping.tanggal]?.trim() : "";
          const rawStatus = mapping.statusKehadiran !== undefined ? row[mapping.statusKehadiran]?.trim() : "";

          const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(rawTanggal) ? rawTanggal : activeDate;
          
          let statusKehadiran: "Hadir" | "Izin" | "Sakit" | "Alfa" = "Hadir";
          const statusLower = rawStatus.toLowerCase();
          if (statusLower.includes("izin") || statusLower === "i") statusKehadiran = "Izin";
          else if (statusLower.includes("sakit") || statusLower === "s") statusKehadiran = "Sakit";
          else if (statusLower.includes("alfa") || statusLower === "a" || statusLower.includes("tanpa keterangan")) statusKehadiran = "Alfa";

          const errors: string[] = [];

          let student = generusList.find(g => g.nisInternal === rawNis);
          if (!student && rawNama) {
            student = generusList.find(g => g.namaLengkap.toLowerCase() === rawNama.toLowerCase());
          }

          if (!student) {
            errors.push(`Santri dengan NIS '${rawNis}' atau Nama '${rawNama}' tidak ditemukan di database.`);
          } else {
            if (!allowedKelompoks.includes(student.namaKelompok)) {
              errors.push(`Santri '${student.namaLengkap}' berada di kelompok '${student.namaKelompok}' di luar hak akses Anda.`);
            }
          }

          parsedRows.push({
            generusId: student ? student.id : "",
            namaLengkap: student ? student.namaLengkap : (rawNama || "Tidak Diketahui"),
            namaKelompok: student ? student.namaKelompok : "Tidak Diketahui",
            tanggal,
            statusKehadiran,
            isValid: !!student && allowedKelompoks.includes(student.namaKelompok),
            nisInternal: rawNis || (student ? student.nisInternal : "")
          });

          if (errors.length > 0) {
            validationMap[index] = errors;
          }
        });

        setImportRows(parsedRows);
        setImportValidation(validationMap);
        setImportStatus('ready');
      } catch (err) {
        console.error(err);
        toast.error("Gagal membaca file CSV. Pastikan format file benar.");
        setImportStatus('idle');
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    let countNew = 0;
    let countUpdated = 0;
    const updatedList = [...presensiList];

    importRows.forEach((row) => {
      if (!row.isValid) return;

      const existingIndex = updatedList.findIndex(
        p => p.generusId === row.generusId && p.tanggal === row.tanggal && (!p.jenisPengajian || p.jenisPengajian === jenisPengajian)
      );

      const presensiData: Presensi = {
        id: existingIndex > -1 ? updatedList[existingIndex].id : "pr-csv-" + Date.now() + Math.random().toString(36).substr(2, 5),
        generusId: row.generusId,
        namaLengkap: row.namaLengkap,
        namaKelompok: row.namaKelompok,
        tanggal: row.tanggal,
        statusKehadiran: row.statusKehadiran,
        jenisPengajian: jenisPengajian
      };

      if (existingIndex > -1) {
        updatedList[existingIndex] = presensiData;
        countUpdated++;
      } else {
        updatedList.push(presensiData);
        countNew++;
      }
    });

    if (countNew === 0 && countUpdated === 0) {
      toast.info("Tidak ada data presensi yang diimpor.");
      setImportOpen(false);
      return;
    }

    setPresensiList(updatedList);
    savePresensi(updatedList);
    toast.success(`Impor presensi berhasil! ${countNew} data baru dicatat dan ${countUpdated} data diperbarui.`);
    setImportOpen(false);

    setImportStatus('idle');
    setImportRows([]);
    setImportValidation({});
  };

  // Filters for Log & Input
  const studentsInKelompok = generusList.filter(g => g.namaKelompok === selectedKelompok);
  
  const caberawitCount = studentsInKelompok.filter(g => g.kategori === "Caberawit").length;
  const mudamudiCount = studentsInKelompok.filter(g => g.kategori === "Muda-Mudi").length;
  const dewasaCount = studentsInKelompok.filter(g => g.kategori === "Jama'ah Dewasa").length;

  const studentsToDisplay = studentsInKelompok.filter(g => {
    const matchesSearch = !searchQuery || g.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) || g.nisInternal.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });



  // Filtered log lists
  const filteredLogsList = (presensiList || []).filter(p => {
    if (!p) return false;
    if (!p.namaKelompok || !allowedKelompoks.includes(p.namaKelompok)) return false;

    // Filter by student category
    const student = generusList.find(g => g.id === p.generusId);
    if (!student) return false;
    
    if (activeCategory !== "Semua" && student.kategori !== activeCategory) return false;

    if (searchQuery && (!p.namaLengkap || !p.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (selectedKelompok && p.namaKelompok !== selectedKelompok) return false;
    if (activeDate && p.tanggal !== activeDate) return false;
    if (p.jenisPengajian && p.jenisPengajian !== jenisPengajian) return false;

    return true;
  });

  const totalLogs = filteredLogsList.length;
  const totalHadir = filteredLogsList.filter(p => p.statusKehadiran === "Hadir").length;
  const attendanceRate = totalLogs > 0 ? Math.round((totalHadir / totalLogs) * 100) : 0;

  // Handle single attendance click
  const handleMarkAttendance = (gen: Generus, status: "Hadir" | "Izin" | "Sakit" | "Alfa") => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    const existingIndex = presensiList.findIndex(
      p => p.generusId === gen.id && p.tanggal === activeDate
    );

    let updated = [...presensiList];
    const presensiData: Presensi = {
      id: existingIndex > -1 ? updated[existingIndex].id : "pr-" + Date.now() + Math.random(),
      generusId: gen.id,
      namaLengkap: gen.namaLengkap,
      namaKelompok: gen.namaKelompok,
      tanggal: activeDate,
      statusKehadiran: status,
      jenisPengajian: jenisPengajian
    };

    if (existingIndex > -1) {
      updated[existingIndex] = presensiData;
    } else {
      updated.push(presensiData);
    }

    setPresensiList(updated);
    savePresensi(updated);
    toast.success(`Absensi ${gen.namaLengkap} dicatat sebagai ${status}!`);
  };

  // Mark all filtered students as present
  const handleMarkAllPresent = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (studentsToDisplay.length === 0) return;

    let updated = [...presensiList];
    studentsToDisplay.forEach((student) => {
      const existingIndex = updated.findIndex(
        p => p.generusId === student.id && p.tanggal === activeDate
      );
      const presensiData: Presensi = {
        id: existingIndex > -1 ? updated[existingIndex].id : "pr-" + Date.now() + Math.random(),
        generusId: student.id,
        namaLengkap: student.namaLengkap,
        namaKelompok: student.namaKelompok,
        tanggal: activeDate,
        statusKehadiran: "Hadir",
        jenisPengajian: jenisPengajian
      };

      if (existingIndex > -1) {
        updated[existingIndex] = presensiData;
      } else {
        updated.push(presensiData);
      }
    });

    setPresensiList(updated);
    savePresensi(updated);
    toast.success(`Semua (${studentsToDisplay.length}) santri ditandai Hadir.`);
  };

  // Simulate QR Code scanning
  const handleQrScanSimulate = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    const gen = generusList.find(g => g.namaLengkap === simName);
    if (!gen) {
      toast.error("Santri tidak ditemukan!");
      return;
    }

    const targetDate = new Date().toISOString().split("T")[0];
    const newLog: Presensi = {
      id: "pr-qr-" + Date.now(),
      generusId: gen.id,
      namaLengkap: gen.namaLengkap,
      namaKelompok: gen.namaKelompok,
      tanggal: targetDate,
      statusKehadiran: "Hadir",
      jenisPengajian: jenisPengajian
    };

    const existingIndex = presensiList.findIndex(
      p => p.generusId === gen.id && p.tanggal === targetDate && (!p.jenisPengajian || p.jenisPengajian === jenisPengajian)
    );

    let updated = [...presensiList];
    if (existingIndex > -1) {
      updated[existingIndex] = { ...newLog, id: updated[existingIndex].id };
    } else {
      updated.push(newLog);
    }
    setPresensiList(updated);
    savePresensi(updated);

    toast.success(`ABSENSI SCANNER: ${gen.namaLengkap} terdeteksi dan tercatat HADIR!`);
    setQrSimOpen(false);
  };

  const handlePresensiOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    setOcrScanning(true);
    toast.info("AI sedang memindai berkas absensi dengan teknologi OCR...");

    setTimeout(() => {
      const targetGroupStudents = generusList.filter(g => g.namaKelompok === selectedKelompok);
      if (targetGroupStudents.length === 0) {
        toast.error("Tidak ada data murid di kelompok ini.");
        setOcrScanning(false);
        return;
      }

      let updated = [...presensiList];
      targetGroupStudents.forEach((student, index) => {
        const status: "Hadir" | "Izin" | "Sakit" | "Alfa" = index === 1 ? "Izin" : index === 3 ? "Sakit" : "Hadir";
        
        const existingIndex = updated.findIndex(
          p => p.generusId === student.id && p.tanggal === activeDate && (!p.jenisPengajian || p.jenisPengajian === jenisPengajian)
        );

        if (existingIndex > -1) {
          updated[existingIndex].statusKehadiran = status;
          updated[existingIndex].jenisPengajian = jenisPengajian;
        } else {
          updated.push({
            id: "pr-ocr-" + Date.now() + index,
            generusId: student.id,
            namaLengkap: student.namaLengkap,
            namaKelompok: student.namaKelompok,
            tanggal: activeDate,
            statusKehadiran: status,
            jenisPengajian: jenisPengajian
          });
        }
      });

      setPresensiList(updated);
      savePresensi(updated);
      setOcrScanning(false);
      toast.success(`AI OCR Absensi berhasil memindai ${targetGroupStudents.length} santri.`);
    }, 2000);
  };

  const getCategoryBadge = (kategori?: string) => {
    if (kategori === "Caberawit") {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100/50 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full">Pengajian Caberawit</Badge>;
    }
    if (kategori === "Muda-Mudi") {
      return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-250 hover:bg-indigo-100/50 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full">Pengajian Muda-mudi</Badge>;
    }
    if (kategori === "Jama'ah Dewasa") {
      return <Badge className="bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-100/50 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full">Sambung Kelompok</Badge>;
    }
    return null;
  };

  const csvTemplateHeaders = "NIS,Nama Lengkap,Tanggal,Status Kehadiran";
  const csvTemplateRow = "NIS-2026001,Muhammad Rizky,2026-07-07,Hadir";
  const csvTemplateUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplateHeaders + "\n" + csvTemplateRow + "\n")}`;

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Controls: Futuristic Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="font-display text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-emerald-600" /> Presensi PPG MAGETAN TIMUR CENTER
          </h2>
          <p className="text-slate-500 text-xs font-semibold">
            Pencatatan kehadiran harian generus dengan klasifikasi Pengajian Caberawit, Pengajian Muda-mudi, dan Sambung Kelompok.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 font-bold rounded-xl text-xs py-2 h-10 px-3 bg-white">
            <Upload className="h-4 w-4 text-emerald-600" /> Impor CSV
          </Button>
          
          {!isReadOnly && (
            <Dialog open={qrSimOpen} onOpenChange={setQrSimOpen}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold gap-2 py-2 h-10 px-4 shadow-sm text-xs transition-all active:scale-[0.98]">
                  <QrCode className="h-4 w-4 text-emerald-500" /> QR Scanner
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-3xl border-slate-100 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-black text-slate-900 text-center">QR Attendance Scanner</DialogTitle>
                  <DialogDescription className="text-center text-xs text-slate-400 font-semibold">
                    Dekatkan kartu identitas santri ke kamera untuk memindai kehadiran secara otomatis.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4 flex flex-col items-center">
                  <div className="h-36 w-36 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-500 animate-pulse relative shadow-inner">
                    <QrCode className="h-20 w-20" />
                    <div className="absolute inset-x-0 h-0.5 bg-emerald-500 top-1/2 -translate-y-1/2 shadow shadow-emerald-450 animate-bounce" />
                  </div>
                  <div className="w-full space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Santri (Simulasi)</label>
                    <select
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white text-slate-750 px-3 py-2 text-xs focus:outline-none h-10 font-bold"
                    >
                      {generusList.filter(g => allowedKelompoks.includes(g.namaKelompok)).map(g => (
                        <option key={g.id} value={g.namaLengkap}>{g.namaLengkap} ({g.kategori})</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleQrScanSimulate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold text-xs mt-2 transition-all active:scale-[0.98]">
                    Konfirmasi Hasil Pemindaian
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Unified Presensi Stats Card */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-white border-slate-200/80 shadow-sm rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-200 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-50/30 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">Statistik Kehadiran Aktif</span>
              <h3 className="font-display text-2xl font-black text-slate-800 uppercase">{jenisPengajian}</h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold flex-wrap">
                <span>Kelompok: <strong className="text-slate-700">{selectedKelompok}</strong></span>
                <span>•</span>
                <span>Tanggal: <strong className="text-slate-700">{activeDate}</strong></span>
                <span>•</span>
                <span>Persentase Kehadiran: <strong className="text-emerald-600 font-bold">{
                  filteredLogsList.length > 0 ? Math.round((filteredLogsList.filter(p => p.statusKehadiran === "Hadir").length / filteredLogsList.length) * 100) : 0
                }%</strong></span>
              </div>
            </div>
            
            {/* Unified Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full lg:w-auto shrink-0">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">Total Murid</span>
                <span className="font-display text-lg font-black text-slate-800">{studentsInKelompok.length}</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-emerald-600 font-extrabold block uppercase tracking-wider">Hadir</span>
                <span className="font-display text-lg font-black text-emerald-800">{filteredLogsList.filter(p => p.statusKehadiran === "Hadir").length}</span>
              </div>
              <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-amber-600 font-extrabold block uppercase tracking-wider">Izin</span>
                <span className="font-display text-lg font-black text-emerald-850">{filteredLogsList.filter(p => p.statusKehadiran === "Izin").length}</span>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-indigo-600 font-extrabold block uppercase tracking-wider">Sakit</span>
                <span className="font-display text-lg font-black text-slate-800">{filteredLogsList.filter(p => p.statusKehadiran === "Sakit").length}</span>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-3 text-center min-w-[90px]">
                <span className="text-[9px] text-rose-600 font-extrabold block uppercase tracking-wider">Alfa</span>
                <span className="font-display text-lg font-black text-rose-800">{filteredLogsList.filter(p => p.statusKehadiran === "Alfa").length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Container Card: Controls & Filtering */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden text-left">
        
        {/* Sub Header / Filters */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            
            {/* View Mode Toggle */}
            <div className="bg-slate-200/75 p-1.5 rounded-2xl flex gap-1.5 max-w-fit shadow-inner">
              <button 
                onClick={() => setAttendanceMode("log")} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  attendanceMode === "log" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-850"
                }`}
              >
                Riwayat Absensi
              </button>
              <button 
                onClick={() => setAttendanceMode("input")} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  attendanceMode === "input" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-850"
                }`}
              >
                Input Absensi
              </button>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm h-11 w-[160px]">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="bg-transparent text-slate-850 text-xs font-bold focus:outline-none w-full cursor-pointer"
              />
            </div>

            {/* Kelompok Selector */}
            <select
              value={selectedKelompok}
              onChange={(e) => setSelectedKelompok(e.target.value)}
              disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
              className="rounded-2xl border border-slate-200 bg-white text-slate-850 px-3 py-2 text-xs font-bold focus:outline-none h-11 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 w-full sm:w-auto"
            >
              {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
                <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
              ))}
            </select>

            {/* Jenis Pengajian Selector */}
            <select
              value={jenisPengajian}
              onChange={(e) => setJenisPengajian(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white text-slate-850 px-3 py-2 text-xs font-bold focus:outline-none h-11 shadow-sm w-full sm:w-auto cursor-pointer"
            >
              <optgroup label="Tingkat Kelompok">
                <option value="Sambung Kelompok">Sambung Kelompok</option>
                <option value="Pengajian Caberawit">Pengajian Caberawit</option>
                <option value="Pengajian Muda-mudi">Pengajian Muda-mudi</option>
                <option value="Sambung Caberawit">Sambung Caberawit</option>
                <option value="Sambung Muda-mudi">Sambung Muda-mudi</option>
                <option value="Musyawaroh 5 Unsur">Musyawaroh 5 Unsur</option>
                <option value="Pengajian Ibu-ibu Kelompok">Pengajian Ibu-ibu Kelompok</option>
              </optgroup>
              <optgroup label="Tingkat Desa">
                <option value="Pengajian Umum Desa">Pengajian Umum Desa</option>
                <option value="Pengajian Muda-mudi Desa">Pengajian Muda-mudi Desa</option>
                <option value="Pengajian Caberawit Desa">Pengajian Caberawit Desa</option>
                <option value="Pengajian Ibu-ibu Desa">Pengajian Ibu-ibu Desa</option>
                <option value="Musawaroh PPG Desa">Musawaroh PPG Desa</option>
              </optgroup>
              <optgroup label="Tingkat Daerah">
                <option value="Pengajian Umum Daerah">Pengajian Umum Daerah</option>
                <option value="Pengajian Muda-mudi Daerah">Pengajian Muda-mudi Daerah</option>
                <option value="Pengajian Ibu-ibu Daerah">Pengajian Ibu-ibu Daerah</option>
              </optgroup>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full xl:w-auto">
            
            {/* Search input */}
            <div className="relative flex-grow sm:w-[220px]">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama / NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-2xl border-slate-200 text-slate-800 text-xs h-11 shadow-sm focus-visible:ring-emerald-500 w-full bg-white"
              />
            </div>

            {/* AI OCR File Input */}
            {attendanceMode === "input" && (
              <div className="relative overflow-hidden bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-4 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-xs shadow-md transition-all active:scale-[0.98]">
                <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" /> Pindai Kertas (AI)
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePresensiOcr}
                  disabled={ocrScanning}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Unified Activity Info Banner */}
        <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              Absensi Kegiatan: <span className="text-emerald-600 font-extrabold uppercase">{jenisPengajian}</span>
            </span>
          </div>
          <div className="text-xs font-bold text-slate-450">
            Total Murid: <span className="text-slate-700 font-extrabold">{studentsInKelompok.length} Orang</span>
          </div>
        </div>

        {/* Content Viewport */}
        <CardContent className="p-6">
          
          {/* Mode 1: Input Absensi */}
          {attendanceMode === "input" ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-wrap gap-2">
                <span className="text-[11px] font-bold text-slate-450 text-left">
                  Menampilkan <strong className="text-slate-700">{studentsToDisplay.length}</strong> santri di kelompok <strong className="text-slate-700">{selectedKelompok}</strong>
                </span>
                
                {studentsToDisplay.length > 0 && !isReadOnly && (
                  <Button 
                    onClick={handleMarkAllPresent}
                    variant="outline"
                    className="rounded-xl border-emerald-250 hover:bg-emerald-50 hover:text-emerald-700 font-bold text-xs h-9 px-3 bg-white text-emerald-600 gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Tandai Hadir Semua
                  </Button>
                )}
              </div>

              {ocrScanning && (
                <div className="flex gap-3 text-xs text-slate-450 font-bold items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI OCR sedang mengekstrak lembar kehadiran santri...</span>
                </div>
              )}

              {studentsToDisplay.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {studentsToDisplay.map((student) => {
                    const currentLog = presensiList.find(
                      p => p.generusId === student.id && p.tanggal === activeDate && (!p.jenisPengajian || p.jenisPengajian === jenisPengajian)
                    );
                    const currentStatus = currentLog ? currentLog.statusKehadiran : null;

                    return (
                      <div key={student.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 px-2 rounded-xl transition-all">
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 text-sm leading-none">{student.namaLengkap}</h4>
                            {getCategoryBadge(student.kategori)}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 block font-semibold leading-none">{student.nisInternal}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          <button 
                            onClick={() => handleMarkAttendance(student, "Hadir")} 
                            className={`rounded-xl px-4 py-2 font-bold text-xs h-9 shadow-sm transition-all border ${
                              currentStatus === "Hadir" 
                                ? "bg-emerald-600 text-white border-emerald-600 scale-[1.02]" 
                                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            Hadir
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student, "Izin")} 
                            className={`rounded-xl px-4 py-2 font-bold text-xs h-9 shadow-sm transition-all border ${
                              currentStatus === "Izin" 
                                ? "bg-amber-500 text-white border-amber-500 scale-[1.02]" 
                                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            Izin
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student, "Sakit")} 
                            className={`rounded-xl px-4 py-2 font-bold text-xs h-9 shadow-sm transition-all border ${
                              currentStatus === "Sakit" 
                                ? "bg-indigo-500 text-white border-indigo-500 scale-[1.02]" 
                                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            Sakit
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student, "Alfa")} 
                            className={`rounded-xl px-4 py-2 font-bold text-xs h-9 shadow-sm transition-all border ${
                              currentStatus === "Alfa" 
                                ? "bg-rose-50 text-white border-rose-500 scale-[1.02]" 
                                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            Alfa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 font-bold border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center gap-1.5">
                  <CircleDot className="h-6 w-6 text-slate-350" />
                  <span>Belum ada data murid terdaftar dalam kategori ini.</span>
                </div>
              )}
            </div>
          ) : (
            // Mode 2: Riwayat Absensi
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100 flex-wrap gap-3">
                <span className="text-[11px] font-bold text-slate-450 text-left">
                  Tercatat <strong className="text-slate-700">{filteredLogsList.length}</strong> log kehadiran untuk tanggal <strong className="text-slate-700">{activeDate}</strong>
                </span>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => toast.success("Mengekspor rekap absensi ke berkas Excel...")}
                    variant="outline" 
                    className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 bg-white text-slate-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" /> Ekspor Excel
                  </Button>
                  <Button 
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-9 px-3.5 flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-450" /> Cetak PDF
                  </Button>
                </div>
              </div>

              {/* Grid counts specific to this date */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-3 text-left">
                  <span className="text-[9px] text-emerald-600 font-extrabold block uppercase tracking-wider">Hadir</span>
                  <span className="font-display text-xl font-black text-emerald-800">{filteredLogsList.filter(p => p.statusKehadiran === "Hadir").length}</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-3 text-left">
                  <span className="text-[9px] text-amber-600 font-extrabold block uppercase tracking-wider">Izin</span>
                  <span className="font-display text-xl font-black text-amber-800">{filteredLogsList.filter(p => p.statusKehadiran === "Izin").length}</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3 text-left">
                  <span className="text-[9px] text-indigo-600 font-extrabold block uppercase tracking-wider">Sakit</span>
                  <span className="font-display text-xl font-black text-indigo-800">{filteredLogsList.filter(p => p.statusKehadiran === "Sakit").length}</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-3 text-left">
                  <span className="text-[9px] text-rose-600 font-extrabold block uppercase tracking-wider">Alfa / Bolos</span>
                  <span className="font-display text-xl font-black text-rose-800">{filteredLogsList.filter(p => p.statusKehadiran === "Alfa").length}</span>
                </div>
              </div>

              {/* Main Log Table */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-700">
                    <thead className="text-[10px] uppercase bg-slate-50 text-slate-450 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="px-6 py-4">Nama Lengkap</th>
                        <th className="px-6 py-4">Jenis Pengajian</th>
                        <th className="px-6 py-4">Kelompok TPQ</th>
                        <th className="px-6 py-4">Tanggal</th>
                        <th className="px-6 py-4">Status Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogsList.length > 0 ? (
                        filteredLogsList.map((p) => {
                          const student = generusList.find(g => g.id === p.generusId);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-extrabold text-slate-800">{p.namaLengkap}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700">{p.jenisPengajian || student?.kategori || "Sambung Kelompok"}</td>
                              <td className="px-6 py-4 text-xs font-semibold text-slate-500">{p.namaKelompok}</td>
                              <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">{p.tanggal}</td>
                              <td className="px-6 py-4">
                                <Badge className={`font-bold rounded-full text-[10px] px-2.5 py-0.5 border ${
                                  p.statusKehadiran === "Hadir" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  p.statusKehadiran === "Izin" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  p.statusKehadiran === "Sakit" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {p.statusKehadiran}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold">
                            Tidak ditemukan log absensi untuk kategori/tanggal terpilih.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-3xl p-6 text-left flex flex-col space-y-4 max-h-[90vh] overflow-y-auto border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-black text-slate-900 flex items-center gap-1.5">
              <Upload className="h-5 w-5 text-emerald-600" /> Impor Rekap Presensi Santri
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-semibold">
              Ekstrak berkas CSV eksternal untuk memperbarui presensi secara massal di database.
            </DialogDescription>
          </DialogHeader>

          {importStatus === 'idle' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleImportFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-10 w-10 text-slate-350 mb-3" />
                <span className="text-xs font-bold text-slate-700">Pilih File CSV</span>
                <span className="text-[10px] text-slate-400 mt-1">atau seret file ke sini</span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-650 uppercase block">Panduan Format Kolom:</span>
                <ol className="text-[10px] text-slate-500 space-y-1 list-decimal pl-4 font-semibold">
                  <li>Kolom minimal yang harus ada: <strong>NIS</strong> atau <strong>Nama Lengkap</strong>.</li>
                  <li>Kolom opsional lainnya: Tanggal (YYYY-MM-DD), Status Kehadiran (Hadir, Izin, Sakit, Alfa).</li>
                  <li>Jika kolom Tanggal kosong, sistem otomatis menggunakan tanggal aktif saat ini (<strong>{activeDate}</strong>).</li>
                  <li>Status kehadiran default adalah <strong>Hadir</strong> jika tidak ditentukan.</li>
                </ol>
                <div className="pt-2">
                  <a
                    href={csvTemplateUri}
                    download="templat_import_presensi.csv"
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 hover:text-emerald-500"
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh Templat CSV
                  </a>
                </div>
              </div>
            </div>
          )}

          {importStatus === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-600">Sedang membaca dan menganalisis file CSV...</span>
            </div>
          )}

          {importStatus === 'ready' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Preview Absensi ({importRows.length} Baris)</span>
              </div>

              {/* Preview table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto shadow-sm">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                      <th className="p-2">NIS</th>
                      <th className="p-2">Nama Lengkap</th>
                      <th className="p-2">Kelompok</th>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Keterangan / Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const errors = importValidation[idx] || [];
                      const hasErrors = errors.length > 0;
                      
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 font-semibold text-slate-800">
                          <td className="p-2 font-mono">{row.nisInternal || "-"}</td>
                          <td className="p-2">{row.namaLengkap}</td>
                          <td className="p-2">{row.namaKelompok}</td>
                          <td className="p-2 font-mono">{row.tanggal}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              row.statusKehadiran === "Hadir" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                              row.statusKehadiran === "Izin" ? "bg-amber-50 text-amber-700 border-amber-250" :
                              row.statusKehadiran === "Sakit" ? "bg-indigo-50 text-indigo-750 border-indigo-250" :
                              "bg-rose-50 text-rose-750 border-rose-250"
                            }`}>
                              {row.statusKehadiran}
                            </span>
                          </td>
                          <td className="p-2">
                            {hasErrors ? (
                              <div className="space-y-0.5">
                                {errors.map((err, eIdx) => (
                                  <span key={eIdx} className="block text-[9px] text-rose-600 font-bold">
                                    • {err}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-bold">✓ Valid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportStatus('idle');
                    setImportRows([]);
                    setImportValidation({});
                  }}
                  className="rounded-xl text-xs py-2 px-3 border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 bg-white"
                >
                  Pilih File Lain
                </Button>
                <Button
                  onClick={executeImport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold py-2 px-4 text-xs shadow-sm transition-all"
                >
                  Konfirmasi Impor ({importRows.filter((row, idx) => {
                    const errors = importValidation[idx] || [];
                    const hasFatalError = errors.length > 0;
                    return !hasFatalError;
                  }).length} Data)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
