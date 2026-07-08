import React, { useState, useEffect } from "react";
import { getPresensi, savePresensi, getGenerus, getKelompok, Presensi, Generus, Kelompok, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Calendar, UserCheck, QrCode, Upload, FileSpreadsheet, 
  Check, X, AlertTriangle, Play, Award, Sparkles, Search 
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
  const [presensiList, setPresensiList] = useState<Presensi[]>(getPresensi());
  const [generusList] = useState<Generus[]>(getGenerus());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());

  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
      const loggedUser = localStorage.getItem("sim_tpq_logged_user");
      if (loggedUser) {
        const details = getUserDetails(loggedUser);
        if (details) {
          if (details.level === "kelompok" || details.level === "desa") {
            return details.scope;
          }
        }
      }
      return localStorage.getItem("sim_tpq_active_scope") || "Semua";
    }
    return "Semua";
  });

  const allowedKelompoks = kelompokList
    .filter(k => {
      if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
      if (userRole === "Admin Desa") {
        if (userScope === "Semua" || userScope === "Daerah Magetan Timur") return true;
        return k.desa === userScope;
      }
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
        if (userScope === "Semua" || userScope === "Daerah Magetan Timur" || userScope.includes("Desa")) return true;
        return k.namaKelompok === userScope;
      }
      return true;
    })
    .map(k => k.namaKelompok);

  const [selectedKelompok, setSelectedKelompok] = useState(allowedKelompoks[0] || "");
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMode, setAttendanceMode] = useState<"log" | "input">("log");

  const [qrSimOpen, setQrSimOpen] = useState(false);
  const [simName, setSimName] = useState(generusList[0]?.namaLengkap || "");

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
        p => p.generusId === row.generusId && p.tanggal === row.tanggal
      );

      const presensiData: Presensi = {
        id: existingIndex > -1 ? updatedList[existingIndex].id : "pr-csv-" + Date.now() + Math.random().toString(36).substr(2, 5),
        generusId: row.generusId,
        namaLengkap: row.namaLengkap,
        namaKelompok: row.namaKelompok,
        tanggal: row.tanggal,
        statusKehadiran: row.statusKehadiran
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

  // Search & Filters for Log
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterLogKelompok, setFilterLogKelompok] = useState("Semua");
  const [filterLogStatus, setFilterLogStatus] = useState("Semua");
  const [filterLogDate, setFilterLogDate] = useState("");

  // Calculate quick stats (filtered by allowed scope and active filters)
  const filteredLogsList = presensiList.filter(p => {
    // 1. Tenant/Scope check
    if (!p.namaKelompok || !allowedKelompoks.includes(p.namaKelompok)) return false;

    // 2. Search query (student name)
    if (searchLogQuery && (!p.namaLengkap || !p.namaLengkap.toLowerCase().includes(searchLogQuery.toLowerCase()))) return false;

    // 3. Kelompok filter
    if (filterLogKelompok !== "Semua" && p.namaKelompok !== filterLogKelompok) return false;

    // 4. Status filter
    if (filterLogStatus !== "Semua" && p.statusKehadiran !== filterLogStatus) return false;

    // 5. Date filter
    if (filterLogDate && p.tanggal !== filterLogDate) return false;

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

    // Check if already logged for this date
    const existingIndex = presensiList.findIndex(
      p => p.generusId === gen.id && p.tanggal === activeDate
    );

    let updated = [...presensiList];
    if (existingIndex > -1) {
      updated[existingIndex].statusKehadiran = status;
    } else {
      updated.push({
        id: "pr-" + Date.now() + Math.random(),
        generusId: gen.id,
        namaLengkap: gen.namaLengkap,
        namaKelompok: gen.namaKelompok,
        tanggal: activeDate,
        statusKehadiran: status
      });
    }

    setPresensiList(updated);
    savePresensi(updated);
    toast.success(`Absensi ${gen.namaLengkap} dicatat sebagai ${status}!`);
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

    // Add attendance
    const newLog: Presensi = {
      id: "pr-qr-" + Date.now(),
      generusId: gen.id,
      namaLengkap: gen.namaLengkap,
      namaKelompok: gen.namaKelompok,
      tanggal: new Date().toISOString().split("T")[0],
      statusKehadiran: "Hadir"
    };

    const updated = [...presensiList, newLog];
    setPresensiList(updated);
    savePresensi(updated);

    toast.success(`ABSENSI SCANNER: ${gen.namaLengkap} terdeteksi dan tercatat HADIR!`);
    setQrSimOpen(false);
  };

  const csvTemplateHeaders = "NIS,Nama Lengkap,Tanggal,Status Kehadiran";
  const csvTemplateRow = "NIS-2026001,Muhammad Rizky,2026-07-07,Hadir";
  const csvTemplateUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplateHeaders + "\n" + csvTemplateRow + "\n")}`;

  const handlePresensiOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    setOcrScanning(true);
    toast.info("AI sedang menganalisis foto lembar absensi kertas (OCR)...");

    setTimeout(() => {
      const targetGroupStudents = generusList.filter(g => g.namaKelompok === selectedKelompok);
      if (targetGroupStudents.length === 0) {
        toast.error("Tidak ada santri terdaftar di kelompok terpilih untuk pemindaian.");
        setOcrScanning(false);
        return;
      }

      let updated = [...presensiList];
      
      targetGroupStudents.forEach((student, index) => {
        // Mocking: index 1 is Izin, index 3 is Sakit, others are Hadir
        const status: "Hadir" | "Izin" | "Sakit" | "Alfa" = index === 1 ? "Izin" : index === 3 ? "Sakit" : "Hadir";
        
        const existingIndex = updated.findIndex(
          p => p.generusId === student.id && p.tanggal === activeDate
        );

        if (existingIndex > -1) {
          updated[existingIndex].statusKehadiran = status;
        } else {
          updated.push({
            id: "pr-ocr-" + Date.now() + index,
            generusId: student.id,
            namaLengkap: student.namaLengkap,
            namaKelompok: student.namaKelompok,
            tanggal: activeDate,
            statusKehadiran: status
          });
        }
      });

      setPresensiList(updated);
      savePresensi(updated);
      setOcrScanning(false);
      toast.success(`AI OCR Absensi Sukses! Kehadiran ${targetGroupStudents.length} santri di ${selectedKelompok} berhasil diperbarui dari foto.`);
    }, 2000);
  };

  // Filter students by selected kelompok
  const studentsInKelompok = generusList.filter(g => g.namaKelompok === selectedKelompok);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Presensi & Kehadiran</h2>
          <p className="text-slate-500 text-sm">Monitor dan catat absensi harian santri secara cepat atau via scanner QR.</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <Upload className="h-4 w-4 text-emerald-600" /> Impor Excel/CSV Absensi
          </Button>
          {!isReadOnly && (
            <Dialog open={qrSimOpen} onOpenChange={setQrSimOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-2 px-4 shadow-sm text-xs">
                  <QrCode className="h-4 w-4" /> QR Attendance Simulator
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl font-bold text-slate-900 text-center">QR Scanner Simulator</DialogTitle>
                  <DialogDescription className="text-center text-slate-500">
                    Simulasikan pemindaian kartu identitas QR Code santri untuk pencatatan otomatis instan.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4 flex flex-col items-center">
                  <div className="h-32 w-32 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-500 animate-pulse relative">
                    <QrCode className="h-16 w-16" />
                    <div className="absolute inset-x-0 h-1 bg-emerald-500 top-1/2 -translate-y-1/2 shadow shadow-emerald-400" />
                  </div>
                  <div className="w-full space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-700">Pilih Santri yang memindai kartu</label>
                    <select
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                    >
                      {generusList.filter(g => allowedKelompoks.includes(g.namaKelompok)).map(g => (
                        <option key={g.id} value={g.namaLengkap}>{g.namaLengkap} ({g.namaKelompok})</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleQrScanSimulate} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-2">
                    Simulasikan Pemindaian Kartu
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats and Mode Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">Rata-rata Kehadiran</span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-slate-900">{attendanceRate}%</span>
              <span className="text-emerald-500 text-xs font-bold flex items-center gap-0.5"><Award className="h-3.5 w-3.5" /> Sangat Baik</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">Total Absensi Tercatat</span>
            <span className="font-display text-3xl font-black text-slate-900">{totalLogs} Data</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-center">
          <div className="flex gap-2">
            <Button onClick={() => setAttendanceMode("log")} variant={attendanceMode === "log" ? "default" : "outline"} className={`flex-1 rounded-xl text-xs font-bold ${attendanceMode === "log" ? "bg-emerald-600 text-white" : "border-slate-200 text-slate-600"}`}>
              Riwayat Absensi
            </Button>
            <Button onClick={() => setAttendanceMode("input")} variant={attendanceMode === "input" ? "default" : "outline"} className={`flex-1 rounded-xl text-xs font-bold ${attendanceMode === "input" ? "bg-emerald-600 text-white" : "border-slate-200 text-slate-600"}`}>
              Input Absensi
            </Button>
          </div>
        </Card>
      </div>

      {attendanceMode === "input" ? (
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden text-left">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
            <div>
              <CardTitle className="font-display text-lg font-bold text-slate-900">Input Cepat Kehadiran Harian</CardTitle>
              <span className="text-xs text-slate-500 font-semibold">Tentukan tanggal dan kelompok, lalu ubah status siswa.</span>
            </div>
            
             <div className="flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 font-bold"
              />
              <select
                value={selectedKelompok}
                onChange={(e) => setSelectedKelompok(e.target.value)}
                disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 font-bold disabled:bg-slate-50 disabled:text-slate-500"
              >
                {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
                  <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                ))}
              </select>
              
              <div className="relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-3.5 flex items-center gap-1.5 cursor-pointer font-bold text-xs shadow-sm transition-all">
                <Sparkles className="h-4 w-4 text-emerald-450 animate-pulse" /> Pindai Absensi Fisik (AI)
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePresensiOcr}
                  disabled={ocrScanning}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {studentsInKelompok.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {studentsInKelompok.map((student) => {
                  const currentLog = presensiList.find(
                    p => p.generusId === student.id && p.tanggal === activeDate
                  );
                  const currentStatus = currentLog ? currentLog.statusKehadiran : null;

                  return (
                    <div key={student.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 text-sm">{student.namaLengkap}</h4>
                        <span className="font-mono text-xs text-slate-400 block font-semibold">{student.nisInternal}</span>
                      </div>
                      
                      <div className="flex gap-2.5">
                        <Button 
                          onClick={() => handleMarkAttendance(student, "Hadir")} 
                          className={`rounded-xl px-4 py-2 font-bold text-xs ${
                            currentStatus === "Hadir" ? "bg-emerald-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Hadir
                        </Button>
                        <Button 
                          onClick={() => handleMarkAttendance(student, "Izin")} 
                          className={`rounded-xl px-4 py-2 font-bold text-xs ${
                            currentStatus === "Izin" ? "bg-amber-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Izin
                        </Button>
                        <Button 
                          onClick={() => handleMarkAttendance(student, "Sakit")} 
                          className={`rounded-xl px-4 py-2 font-bold text-xs ${
                            currentStatus === "Sakit" ? "bg-indigo-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Sakit
                        </Button>
                        <Button 
                          onClick={() => handleMarkAttendance(student, "Alfa")} 
                          className={`rounded-xl px-4 py-2 font-bold text-xs ${
                            currentStatus === "Alfa" ? "bg-rose-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Alfa
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-medium">
                Belum ada data Generus terdaftar di kelompok ini.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Advanced Log Filters */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 text-left space-y-1 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Santri</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Nama santri..."
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200 text-slate-900 text-xs h-10"
                  />
                </div>
              </div>

              <div className="w-full sm:w-[180px] text-left space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kelompok TPQ</label>
                <select
                  value={filterLogKelompok}
                  onChange={(e) => setFilterLogKelompok(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-750 px-3 py-2 text-xs focus:outline-none h-10 font-bold"
                >
                  <option value="Semua">Semua Kelompok</option>
                  {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
                    <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-[130px] text-left space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status Kehadiran</label>
                <select
                  value={filterLogStatus}
                  onChange={(e) => setFilterLogStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-750 px-3 py-2 text-xs focus:outline-none h-10 font-bold"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alfa">Alfa</option>
                </select>
              </div>

              <div className="w-full sm:w-[140px] text-left space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Tanggal</label>
                <Input
                  type="date"
                  value={filterLogDate}
                  onChange={(e) => setFilterLogDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-xs h-10 w-full"
                />
              </div>

              <div className="flex gap-2 w-full lg:w-auto shrink-0">
                <Button 
                  onClick={() => toast.success("Mengekspor rekap absensi ke berkas Excel...")}
                  variant="outline" 
                  className="flex-grow sm:flex-grow-0 rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs h-10 px-4"
                >
                  Excel
                </Button>
                <Button 
                  onClick={() => window.print()}
                  className="flex-grow sm:flex-grow-0 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs h-10 px-4"
                >
                  Cetak PDF
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Filter Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] text-emerald-600 font-bold block uppercase tracking-wider">Hadir</span>
              <span className="font-display text-xl font-black text-emerald-800">{filteredLogsList.filter(p => p.statusKehadiran === "Hadir").length}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] text-amber-600 font-bold block uppercase tracking-wider">Izin</span>
              <span className="font-display text-xl font-black text-amber-800">{filteredLogsList.filter(p => p.statusKehadiran === "Izin").length}</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] text-indigo-600 font-bold block uppercase tracking-wider">Sakit</span>
              <span className="font-display text-xl font-black text-indigo-800">{filteredLogsList.filter(p => p.statusKehadiran === "Sakit").length}</span>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-left">
              <span className="text-[9px] text-rose-600 font-bold block uppercase tracking-wider">Alfa</span>
              <span className="font-display text-xl font-black text-rose-800">{filteredLogsList.filter(p => p.statusKehadiran === "Alfa").length}</span>
            </div>
          </div>

          {/* Table Card */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Nama Lengkap</th>
                    <th className="px-6 py-4">Kelompok</th>
                    <th className="px-6 py-4">Tanggal Absen</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogsList.length > 0 ? (
                    filteredLogsList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-900">{p.namaLengkap}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">{p.namaKelompok}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-slate-450">{p.tanggal}</td>
                        <td className="px-6 py-4">
                          <Badge className={`font-semibold rounded-full ${
                            p.statusKehadiran === "Hadir" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            p.statusKehadiran === "Izin" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            p.statusKehadiran === "Sakit" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                            "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {p.statusKehadiran}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                        Belum ada riwayat absensi tercatat untuk filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-2xl p-6 text-left flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <Upload className="h-5 w-5 text-emerald-600" /> Impor Presensi Santri
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah file CSV untuk mengimpor data kehadiran santri secara massal.
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
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <span className="text-xs font-bold text-slate-700">Pilih File CSV</span>
                <span className="text-[10px] text-slate-400 mt-1">atau seret file ke sini</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Petunjuk Penggunaan:</span>
                <ol className="text-[10px] text-slate-500 space-y-1 list-decimal pl-4 font-medium">
                  <li>Kolom minimal yang harus ada: <strong>NIS</strong> atau <strong>Nama Lengkap</strong>.</li>
                  <li>Kolom opsional lainnya: Tanggal (YYYY-MM-DD), Status Kehadiran (Hadir, Izin, Sakit, Alfa).</li>
                  <li>Jika kolom Tanggal kosong, sistem otomatis menggunakan tanggal aktif saat ini (<strong>{activeDate}</strong>).</li>
                  <li>Status kehadiran default adalah <strong>Hadir</strong> jika tidak ditentukan.</li>
                </ol>
                <div className="pt-2">
                  <a
                    href={csvTemplateUri}
                    download="templat_import_presensi.csv"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-500"
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
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
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
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.statusKehadiran === "Hadir" ? "bg-emerald-50 text-emerald-700" :
                              row.statusKehadiran === "Izin" ? "bg-amber-50 text-amber-700" :
                              row.statusKehadiran === "Sakit" ? "bg-indigo-50 text-indigo-750" :
                              "bg-rose-50 text-rose-700"
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold py-2 px-4 text-xs"
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
