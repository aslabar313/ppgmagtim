import React, { useState } from "react";
import { getRaport, saveRaport, getGenerus, Raport, Generus, getKelompok, Kelompok, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, FileText, Printer, Save, Award, Star, PenTool, Check, Sparkles, Settings 
} from "lucide-react";
import { toast } from "sonner";

interface RaportPanelProps {
  userRole: string;
}

export function RaportPanel({ userRole }: RaportPanelProps) {
  const [raports, setRaports] = useState<Raport[]>(getRaport());
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
      if (userRole === "Admin Desa") return k.desa === userScope;
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") return k.namaKelompok === userScope;
      return true;
    })
    .map(k => k.namaKelompok);

  const filteredGenerusList = generusList.filter(g => allowedKelompoks.includes(g.namaKelompok));
  
  const [selectedGenId, setSelectedGenId] = useState(filteredGenerusList[0]?.id || "");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");

  // Subject labels state
  const [lblTahsin, setLblTahsin] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_tahsin") || "Tahsin Al-Qur'an (Makhraj)";
    }
    return "Tahsin Al-Qur'an (Makhraj)";
  });
  const [lblTahfidz, setLblTahfidz] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_tahfidz") || "Tahfidz (Hafalan Surat)";
    }
    return "Tahfidz (Hafalan Surat)";
  });
  const [lblDoa, setLblDoa] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_doaHarian") || "Hafalan Doa Harian";
    }
    return "Hafalan Doa Harian";
  });
  const [lblIbadah, setLblIbadah] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_ibadah") || "Praktik Ibadah";
    }
    return "Praktik Ibadah";
  });
  const [lblAkhlak, setLblAkhlak] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_akhlak") || "Akhlakul Karimah";
    }
    return "Akhlakul Karimah";
  });
  const [lblKeaktifan, setLblKeaktifan] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_keaktifan") || "Keaktifan Kelas";
    }
    return "Keaktifan Kelas";
  });
  const [lblKedisiplinan, setLblKedisiplinan] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_subject_kedisiplinan") || "Kedisiplinan Absensi";
    }
    return "Kedisiplinan Absensi";
  });

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const loggedUser = typeof window !== "undefined" ? localStorage.getItem("sim_tpq_logged_user") : null;
  const isAldi = loggedUser === "superadminaldi";
  const [aldiConfirmCode, setAldiConfirmCode] = useState("");

  // Form states
  const [valTahsin, setValTahsin] = useState(80);
  const [valTahfidz, setValTahfidz] = useState(80);
  const [valDoa, setValDoa] = useState(80);
  const [valAkhlak, setValAkhlak] = useState(85);
  const [valIbadah, setValIbadah] = useState(80);
  const [valKeaktifan, setValKeaktifan] = useState(85);
  const [valKedisiplinan, setValKedisiplinan] = useState(80);
  const [valCatatan, setValCatatan] = useState("");
  
  // Ttd state
  const [hasSignature, setHasSignature] = useState(false);

  // AI OCR Raport State
  const [raportOcrScanning, setRaportOcrScanning] = useState(false);

  const isReadOnly = userRole === "Viewer";

  const selectedGenerus = filteredGenerusList.find(g => g.id === selectedGenId);
  const activeRaport = raports.find(
    r => r.generusId === selectedGenId && r.semester === semester && r.tahunAjaran === tahunAjaran
  );

  // Load values if raport exists
  React.useEffect(() => {
    if (activeRaport) {
      setValTahsin(activeRaport.tahsin);
      setValTahfidz(activeRaport.tahfidz);
      setValDoa(activeRaport.doaHarian);
      setValAkhlak(activeRaport.akhlak);
      setValIbadah(activeRaport.ibadah);
      setValKeaktifan(activeRaport.keaktifan);
      setValKedisiplinan(activeRaport.kedisiplinan);
      setValCatatan(activeRaport.catatanPengajar);
      setHasSignature(!!activeRaport.ttdDigital);
    } else {
      // Default reset
      setValTahsin(75);
      setValTahfidz(75);
      setValDoa(75);
      setValAkhlak(75);
      setValIbadah(75);
      setValKeaktifan(75);
      setValKedisiplinan(75);
      setValCatatan("");
      setHasSignature(false);
    }
  }, [selectedGenId, semester, tahunAjaran, activeRaport]);

  // Calculate scores
  const scoreAverage = Math.round(
    (valTahsin + valTahfidz + valDoa + valAkhlak + valIbadah + valKeaktifan + valKedisiplinan) / 7
  );

  const getPredicate = (score: number) => {
    if (score >= 86) return "Istimewa (A)";
    if (score >= 76) return "Sangat Baik (B)";
    if (score >= 65) return "Baik (C)";
    if (score >= 50) return "Cukup (D)";
    return "Perlu Bimbingan (E)";
  };

  const handleSaveRaport = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (!selectedGenerus) return;

    const newRaport: Raport = {
      id: activeRaport?.id || "r-" + Date.now(),
      generusId: selectedGenerus.id,
      namaLengkap: selectedGenerus.namaLengkap,
      namaKelompok: selectedGenerus.namaKelompok,
      semester,
      tahunAjaran,
      tahsin: valTahsin,
      tahfidz: valTahfidz,
      doaHarian: valDoa,
      akhlak: valAkhlak,
      ibadah: valIbadah,
      keaktifan: valKeaktifan,
      kedisiplinan: valKedisiplinan,
      catatanPengajar: valCatatan,
      ttdDigital: hasSignature ? "signature_placeholder_path" : ""
    };

    let updated: Raport[] = [];
    if (activeRaport) {
      updated = raports.map(r => r.id === activeRaport.id ? newRaport : r);
    } else {
      updated = [...raports, newRaport];
    }

    setRaports(updated);
    saveRaport(updated);
    toast.success(`Raport semester ${semester} untuk ${selectedGenerus.namaLengkap} berhasil disimpan!`);
  };

  const handleExportPDF = () => {
    toast.success("Raport berhasil diekspor ke PDF!");
  };

  const handleRaportOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    setRaportOcrScanning(true);
    toast.info("AI sedang memindai berkas foto lembar nilai fisik (OCR)...");

    setTimeout(() => {
      // Mock grade data extraction
      setValTahsin(92);
      setValTahfidz(88);
      setValDoa(90);
      setValAkhlak(95);
      setValIbadah(88);
      setValKeaktifan(90);
      setValKedisiplinan(92);
      setValCatatan("Prestasi tahfidz sangat baik, pertahankan kelancaran tahsin.");
      
      setRaportOcrScanning(false);
      toast.success("AI OCR Raport Sukses! Nilai kompetensi santri berhasil diisi otomatis.");
    }, 2000);
  };

  const handlePrint = () => {
    toast.success("Membuka dialog print raport...");
    window.print();
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Raport Kurikulum Santri</h2>
          <p className="text-slate-500 text-sm">Evaluasi hasil belajar per-semester berdasarkan materi target.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Roster */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800">Daftar Generus</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {filteredGenerusList.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGenId(g.id)}
                className={`w-full p-4 text-left transition-colors flex items-center justify-between ${
                  selectedGenId === g.id ? "bg-emerald-50/50 border-r-4 border-emerald-600" : "hover:bg-slate-50/50"
                }`}
              >
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{g.namaLengkap}</h4>
                  <span className="text-[10px] text-slate-400 block font-semibold">{g.nisInternal}</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold uppercase rounded-full">
                  {raports.some(r => r.generusId === g.id) ? "Terisi" : "Kosong"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right Column: Score Sheet */}
        {selectedGenerus ? (
          <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            {/* Score Sheet Header */}
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display text-lg font-bold text-slate-900">{selectedGenerus.namaLengkap}</CardTitle>
                <CardDescription className="text-xs font-semibold">{selectedGenerus.namaKelompok}</CardDescription>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value) as 1 | 2)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-xs focus:outline-none font-bold"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>

                <select
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-xs focus:outline-none font-bold"
                >
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>

                <div className="relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9 px-3 flex items-center gap-1.5 cursor-pointer font-bold text-xs shadow-sm transition-all">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-450 animate-pulse" /> Pindai Lembar Nilai (AI)
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleRaportOcr}
                    disabled={raportOcrScanning}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                {userRole === "Super Admin" && (
                  <Button
                    onClick={() => setIsConfigOpen(true)}
                    variant="outline"
                    className="rounded-xl border-slate-200 hover:bg-slate-100 font-semibold text-xs h-9 gap-1.5"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500" /> Konfigurasi Mapel
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Score inputs grid */}
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score inputs */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">Nilai Kompetensi</h3>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblTahsin}</span>
                      <span className="font-bold text-emerald-600">{valTahsin}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valTahsin} onChange={(e) => setValTahsin(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblTahfidz}</span>
                      <span className="font-bold text-emerald-600">{valTahfidz}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valTahfidz} onChange={(e) => setValTahfidz(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblDoa}</span>
                      <span className="font-bold text-emerald-600">{valDoa}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valDoa} onChange={(e) => setValDoa(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblIbadah}</span>
                      <span className="font-bold text-emerald-600">{valIbadah}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valIbadah} onChange={(e) => setValIbadah(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>
                </div>

                {/* Behavior score inputs */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">Karakter & Kedisiplinan</h3>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblAkhlak}</span>
                      <span className="font-bold text-emerald-600">{valAkhlak}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valAkhlak} onChange={(e) => setValAkhlak(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblKeaktifan}</span>
                      <span className="font-bold text-emerald-600">{valKeaktifan}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valKeaktifan} onChange={(e) => setValKeaktifan(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{lblKedisiplinan}</span>
                      <span className="font-bold text-emerald-600">{valKedisiplinan}</span>
                    </div>
                    <input type="range" min="0" max="100" value={valKedisiplinan} onChange={(e) => setValKedisiplinan(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                  </div>
                </div>
              </div>

              {/* Evaluasi summary */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl grid grid-cols-2 gap-4 text-center items-center">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">Rata-rata Nilai</span>
                  <span className="font-display text-4xl font-black text-slate-900">{scoreAverage}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">Predikat Kelulusan</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-4 py-1.5 text-xs rounded-full mt-1.5">
                    {getPredicate(scoreAverage)}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-700">Catatan Tambahan Pengajar</label>
                <Input
                  placeholder="Tulis pesan motivasi atau catatan khusus pengajar..."
                  value={valCatatan}
                  onChange={(e) => setValCatatan(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              {/* Ttd Digital Simulator */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-700">Tanda Tangan Digital Pengajar</label>
                <div className="border border-dashed border-slate-200 rounded-2xl h-24 max-w-sm flex items-center justify-center bg-slate-50 relative group">
                  {hasSignature ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                      <Check className="h-4 w-4" /> Tanda Tangan Tersimpan
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setHasSignature(true)}
                      className="text-slate-400 hover:text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <PenTool className="h-4 w-4" /> Bubuhkan Tanda Tangan Cepat
                    </button>
                  )}
                  {hasSignature && (
                    <button 
                      type="button" 
                      onClick={() => setHasSignature(false)}
                      className="absolute top-2 right-2 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6 justify-end">
                <Button onClick={handlePrint} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs py-2.5 px-4">
                  <Printer className="h-4 w-4 text-slate-600" /> Cetak
                </Button>
                <Button onClick={handleExportPDF} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50 font-semibold rounded-xl text-xs py-2.5 px-4">
                  <FileText className="h-4 w-4 text-rose-600" /> Unduh PDF
                </Button>
                {!isReadOnly && (
                  <Button onClick={handleSaveRaport} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-2 py-2.5 px-6 shadow-sm text-xs">
                    <Save className="h-4 w-4" /> Simpan Nilai Raport
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="lg:col-span-8 py-12 text-center text-slate-400 font-medium">
            Tidak ada santri yang terpilih.
          </div>
        )}
      </div>

      {/* Subject Configuration Dialog (Super Admin only) */}
      <Dialog open={isConfigOpen} onOpenChange={(open) => {
        setIsConfigOpen(open);
        if (!open) {
          setAldiConfirmCode("");
        }
      }}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900 text-left">
              Konfigurasi Mata Pelajaran Raport
            </DialogTitle>
            <DialogDescription className="text-left text-xs">
              Sesuaikan nama mata pelajaran yang dijadikan indikator nilai kompetensi, karakter, dan kedisiplinan santri.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-3 text-left">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indikator Nilai Kompetensi</span>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kompetensi 1 (e.g. Tahsin)</label>
                  <Input value={lblTahsin} onChange={(e) => setLblTahsin(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kompetensi 2 (e.g. Tahfidz)</label>
                  <Input value={lblTahfidz} onChange={(e) => setLblTahfidz(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kompetensi 3 (e.g. Doa Harian)</label>
                  <Input value={lblDoa} onChange={(e) => setLblDoa(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kompetensi 4 (e.g. Ibadah)</label>
                  <Input value={lblIbadah} onChange={(e) => setLblIbadah(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indikator Karakter & Kedisiplinan</span>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Karakter (e.g. Akhlak)</label>
                  <Input value={lblAkhlak} onChange={(e) => setLblAkhlak(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kedisiplinan 1 (e.g. Keaktifan)</label>
                  <Input value={lblKeaktifan} onChange={(e) => setLblKeaktifan(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Kedisiplinan 2 (e.g. Absensi)</label>
                  <Input value={lblKedisiplinan} onChange={(e) => setLblKedisiplinan(e.target.value)} className="rounded-xl border-slate-200 text-xs h-9" />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Otorisasi & Persetujuan Aldi</span>
              
              {isAldi ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check className="h-4 w-4" /> Persetujuan Terverifikasi
                  </div>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Anda masuk sebagai <strong>superadminaldi</strong>. Perubahan ini disetujui secara otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Settings className="h-4 w-4 text-amber-600 animate-spin" /> Otorisasi superadminaldi Diperlukan
                    </div>
                    <p className="text-slate-500 text-[10px] leading-relaxed">
                      Perubahan mapel raport harus disetujui oleh <strong>superadminaldi</strong>. Masukkan kode otorisasi untuk menyimpan.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-650">Kode Konfirmasi (dari superadminaldi)</label>
                    <Input 
                      type="password"
                      placeholder="Masukkan kode konfirmasi..." 
                      value={aldiConfirmCode} 
                      onChange={(e) => setAldiConfirmCode(e.target.value)} 
                      className="rounded-xl border-slate-200 text-xs h-9 font-mono" 
                    />
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={() => {
                const isValidConfirm = isAldi || 
                  ["ALDI354", "ALDI-SETUJU", "SUPERADMINALDI"].includes(aldiConfirmCode.trim().toUpperCase());

                if (!isValidConfirm) {
                  toast.error("Gagal Menyimpan: Kode konfirmasi dari superadminaldi tidak valid!");
                  return;
                }

                localStorage.setItem("sim_tpq_subject_tahsin", lblTahsin);
                localStorage.setItem("sim_tpq_subject_tahfidz", lblTahfidz);
                localStorage.setItem("sim_tpq_subject_doaHarian", lblDoa);
                localStorage.setItem("sim_tpq_subject_ibadah", lblIbadah);
                localStorage.setItem("sim_tpq_subject_akhlak", lblAkhlak);
                localStorage.setItem("sim_tpq_subject_keaktifan", lblKeaktifan);
                localStorage.setItem("sim_tpq_subject_kedisiplinan", lblKedisiplinan);
                
                // Simpan log konfirmasi persetujuan agar tidak bisa diubah tanpa Aldi
                localStorage.setItem("sim_tpq_subject_confirmed_by", "superadminaldi");
                localStorage.setItem("sim_tpq_subject_confirmed_at", new Date().toISOString());
                localStorage.setItem("sim_tpq_subject_confirmed_method", isAldi ? "Direct (Aldi Logged In)" : "Authorization Code");

                setIsConfigOpen(false);
                setAldiConfirmCode("");
                toast.success("Konfigurasi mapel berhasil diperbarui atas persetujuan superadminaldi!");
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 text-xs font-bold shadow-sm"
            >
              Simpan Konfigurasi Mapel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
