import React, { useState } from "react";
import { getPresensi, savePresensi, getGenerus, getKelompok, Presensi, Generus, Kelompok } from "@/lib/mockData";
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

interface PresensiPanelProps {
  userRole: string;
}

export function PresensiPanel({ userRole }: PresensiPanelProps) {
  const [presensiList, setPresensiList] = useState<Presensi[]>(getPresensi());
  const [generusList] = useState<Generus[]>(getGenerus());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());

  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
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

  const [selectedKelompok, setSelectedKelompok] = useState(allowedKelompoks[0] || "");
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMode, setAttendanceMode] = useState<"log" | "input">("log");

  const [qrSimOpen, setQrSimOpen] = useState(false);
  const [simName, setSimName] = useState(generusList[0]?.namaLengkap || "");
  
  // AI OCR Presensi Scanner
  const [ocrScanning, setOcrScanning] = useState(false);

  const isReadOnly = userRole === "Viewer";

  // Search & Filters for Log
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterLogKelompok, setFilterLogKelompok] = useState("Semua");
  const [filterLogStatus, setFilterLogStatus] = useState("Semua");
  const [filterLogDate, setFilterLogDate] = useState("");

  // Calculate quick stats (filtered by allowed scope and active filters)
  const filteredLogsList = presensiList.filter(p => {
    // 1. Tenant/Scope check
    if (!allowedKelompoks.includes(p.namaKelompok)) return false;

    // 2. Search query (student name)
    if (searchLogQuery && !p.namaLengkap.toLowerCase().includes(searchLogQuery.toLowerCase())) return false;

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

  const handleImportExcel = () => {
    toast.success("Excel diimpor! Berhasil memasukkan 15 data absensi.");
  };

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
          <Button onClick={handleImportExcel} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <Upload className="h-4 w-4 text-emerald-600" /> Impor Excel Absensi
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
    </div>
  );
}
