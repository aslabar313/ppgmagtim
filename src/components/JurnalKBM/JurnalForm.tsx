import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Upload, Sparkles, Check, CheckCircle2, ShieldCheck, PenTool } from "lucide-react";
import { getGenerus, Generus } from "@/lib/mockData";

interface JurnalFormProps {
  initialRecord: any | null; // null for Create
  onSave: (record: any) => void;
  onClose: () => void;
  userRole: string;
}

export function JurnalForm({ initialRecord, onSave, onClose, userRole }: JurnalFormProps) {
  const isEdit = !!initialRecord;

  // 1. Initial State Definition
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("16:00");
  const [jamSelesai, setJamSelesai] = useState("17:30");
  const [pengajar, setPengajar] = useState("");
  const [kelas, setKelas] = useState("Caberawit B");
  const [kelompok, setKelompok] = useState("TPQ Al-Hikmah 3");
  const [ruangan, setRuangan] = useState("Lantai 1 Masjid");
  const [materi, setMateri] = useState("");
  const [subMateri, setSubMateri] = useState("");
  const [targetPembelajaran, setTargetPembelajaran] = useState("");
  const [metodePembelajaran, setMetodePembelajaran] = useState("Ceramah & Syafahi");
  const [kegiatanPembelajaran, setKegiatanPembelajaran] = useState("");
  const [evaluasi, setEvaluasi] = useState("");
  const [catatanPengajar, setCatatanPengajar] = useState("");
  const [tugas, setTugas] = useState("");
  const [rencanaBerikutnya, setRencanaBerikutnya] = useState("");
  const [status, setStatus] = useState<any>("Draft");
  
  // File Upload State
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoName, setFotoName] = useState<string>("");
  const [docName, setDocName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Digital Signature State
  const [signed, setSigned] = useState(false);
  const [signatureHash, setSignatureHash] = useState("");

  // Student Checklist State
  const [allStudents, setAllStudents] = useState<Generus[]>(() => getGenerus() || []);
  const [studentStatuses, setStudentStatuses] = useState<{ [studentId: string]: "Hadir" | "Izin" | "Sakit" | "Alfa" }>({});
  
  // 2. Load Initial Data or Auto-Save Draft
  useEffect(() => {
    if (isEdit && initialRecord) {
      setTanggal(initialRecord.tanggal || "");
      setJamMulai(initialRecord.jamMulai || "16:00");
      setJamSelesai(initialRecord.jamSelesai || "17:30");
      setPengajar(initialRecord.pengajar || "");
      setKelas(initialRecord.kelas || "Caberawit B");
      setKelompok(initialRecord.kelompok || "");
      setRuangan(initialRecord.ruangan || "Lantai 1 Masjid");
      setMateri(initialRecord.materi || "");
      setSubMateri(initialRecord.subMateri || "");
      setTargetPembelajaran(initialRecord.targetPembelajaran || "");
      setMetodePembelajaran(initialRecord.metodePembelajaran || "Ceramah & Syafahi");
      setKegiatanPembelajaran(initialRecord.kegiatanPembelajaran || "");
      setEvaluasi(initialRecord.evaluasi || "");
      setCatatanPengajar(initialRecord.catatanPengajar || "");
      setTugas(initialRecord.tugas || "");
      setRencanaBerikutnya(initialRecord.rencanaBerikutnya || "");
      setStatus(initialRecord.status || "Draft");
      setFotoBase64(initialRecord.lampiranFoto || null);
      setFotoName(initialRecord.lampiranFotoName || "");
      setDocName(initialRecord.lampiranDokumenName || "");
      setSigned(!!initialRecord.digitalSignaturePengajar);
      setSignatureHash(initialRecord.digitalSignaturePengajar || "");
      
      // Load student attendance
      if (initialRecord.studentAttendanceMap) {
        setStudentStatuses(initialRecord.studentAttendanceMap);
      }
    } else {
      // Set active user as default teacher if role is Pengajar
      if (userRole === "Pengajar") {
        setPengajar("Ust. M. Ridho");
      }
      setTanggal(new Date().toISOString().split("T")[0]);

      // Load draft from localStorage if exists
      const draft = localStorage.getItem("sim_tpq_jurnal_draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setTanggal(parsed.tanggal || new Date().toISOString().split("T")[0]);
          setJamMulai(parsed.jamMulai || "16:00");
          setJamSelesai(parsed.jamSelesai || "17:30");
          setPengajar(parsed.pengajar || "");
          setKelas(parsed.kelas || "Caberawit B");
          setKelompok(parsed.kelompok || "");
          setRuangan(parsed.ruangan || "Lantai 1 Masjid");
          setMateri(parsed.materi || "");
          setSubMateri(parsed.subMateri || "");
          setTargetPembelajaran(parsed.targetPembelajaran || "");
          setMetodePembelajaran(parsed.metodePembelajaran || "Ceramah & Syafahi");
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [isEdit, initialRecord, userRole]);

  // 3. Auto-save draft on fields change
  useEffect(() => {
    if (!isEdit) {
      const timer = setTimeout(() => {
        const draftPayload = {
          tanggal, jamMulai, jamSelesai, pengajar, kelas, kelompok, ruangan, materi, subMateri, targetPembelajaran, metodePembelajaran
        };
        localStorage.setItem("sim_tpq_jurnal_draft", JSON.stringify(draftPayload));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tanggal, jamMulai, jamSelesai, pengajar, kelas, kelompok, ruangan, materi, subMateri, targetPembelajaran, metodePembelajaran, isEdit]);

  // Filter students based on selected kelompok/kelas for attendance checklist
  const activeStudents = allStudents.filter(g => g.namaKelompok === kelompok);

  // Initialize student statuses if not yet set
  useEffect(() => {
    if (activeStudents.length > 0) {
      const initialMap: any = { ...studentStatuses };
      let changed = false;
      activeStudents.forEach(s => {
        if (!initialMap[s.id]) {
          initialMap[s.id] = "Hadir";
          changed = true;
        }
      });
      if (changed) {
        setStudentStatuses(initialMap);
      }
    }
  }, [activeStudents]);

  const toggleStudentStatus = (studentId: string, status: "Hadir" | "Izin" | "Sakit" | "Alfa") => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Calculations for count
  const presentCount = Object.keys(studentStatuses).filter(id => activeStudents.some(s => s.id === id) && studentStatuses[id] === "Hadir").length;
  const permissionCount = Object.keys(studentStatuses).filter(id => activeStudents.some(s => s.id === id) && studentStatuses[id] === "Izin").length;
  const sickCount = Object.keys(studentStatuses).filter(id => activeStudents.some(s => s.id === id) && studentStatuses[id] === "Sakit").length;
  const absentCount = Object.keys(studentStatuses).filter(id => activeStudents.some(s => s.id === id) && studentStatuses[id] === "Alfa").length;

  // File processing helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'foto' | 'doc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file melebihi batas 10MB!");
      return;
    }

    if (type === 'foto') {
      if (!file.type.startsWith("image/")) {
        toast.error("File pendukung harus berupa gambar!");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFotoBase64(evt.target?.result as string);
        setFotoName(file.name);
      };
      reader.readAsDataURL(file);
    } else {
      setDocName(file.name);
    }
    toast.success(`Berkas "${file.name}" berhasil diunggah.`);
  };

  const simulateSignature = () => {
    if (!pengajar.trim()) {
      toast.error("Silakan isi nama pengajar terlebih dahulu!");
      return;
    }
    if (signed) {
      setSigned(false);
      setSignatureHash("");
      toast.info("Tanda tangan digital dihapus.");
    } else {
      const hash = `SECURE-SIG-${pengajar.replace(/\s+/g, "-").toUpperCase()}-${Date.now().toString(16)}`;
      setSigned(true);
      setSignatureHash(hash);
      toast.success("Dokumen berhasil ditandatangani secara digital!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tanggal || !pengajar || !materi || !targetPembelajaran) {
      toast.error("Harap isi seluruh field utama wajib (Tanggal, Pengajar, Materi, Target Pembelajaran)!");
      return;
    }

    if (!signed && status === "Dikirim") {
      toast.error("Harap tandatangani jurnal secara digital sebelum mengirimkan laporan!");
      return;
    }

    const payload = {
      id: isEdit ? initialRecord.id : "jr-" + Date.now(),
      nomorJurnal: isEdit ? initialRecord.nomorJurnal : `JR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      tanggal,
      jamMulai,
      jamSelesai,
      pengajar,
      kelas,
      kelompok,
      ruangan,
      materi,
      subMateri,
      targetPembelajaran,
      metodePembelajaran,
      santriHadirCount: presentCount,
      santriIzinCount: permissionCount,
      santriSakitCount: sickCount,
      santriAlfaCount: absentCount,
      studentAttendanceMap: studentStatuses,
      kegiatanPembelajaran,
      evaluasi,
      catatanPengajar,
      tugas,
      rencanaBerikutnya,
      lampiranFoto: fotoBase64,
      lampiranFotoName: fotoName,
      lampiranDokumenName: docName,
      status: status,
      digitalSignaturePengajar: signatureHash,
      version: isEdit ? (initialRecord.version || 1) + 1 : 1,
      history: isEdit 
        ? [...(initialRecord.history || []), { timestamp: new Date().toLocaleString(), action: `Jurnal diperbarui (v${(initialRecord.version || 1) + 1})`, user: pengajar }]
        : [{ timestamp: new Date().toLocaleString(), action: "Jurnal Dibuat (Draft)", user: pengajar }]
    };

    // Remove draft from localstorage on successful save
    if (status !== "Draft") {
      localStorage.removeItem("sim_tpq_jurnal_draft");
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-lg font-black text-slate-800">
            {isEdit ? `Edit Jurnal KBM: ${initialRecord.nomorJurnal}` : "Buat Jurnal KBM Baru"}
          </h3>
          <p className="text-slate-400 text-xs font-semibold">
            {isEdit ? "Perbarui informasi kegiatan mengajar." : "Catat data target KBM harian."}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-slate-100 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-xs font-bold text-slate-700">
        
        {/* Kolom 1: Detail Pertemuan */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Tanggal Pertemuan <span className="text-rose-500">*</span></label>
              <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="rounded-xl h-10 text-xs" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label>Mulai</label>
                <Input type="time" value={jamMulai} onChange={e => setJamMulai(e.target.value)} className="rounded-xl h-10 text-xs" />
              </div>
              <div className="space-y-1">
                <label>Selesai</label>
                <Input type="time" value={jamSelesai} onChange={e => setJamSelesai(e.target.value)} className="rounded-xl h-10 text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Nama Pengajar <span className="text-rose-500">*</span></label>
              <Input placeholder="Nama Ust / Usth..." value={pengajar} onChange={e => setPengajar(e.target.value)} className="rounded-xl h-10 text-xs" required />
            </div>
            <div className="space-y-1">
              <label>Ruangan Kelas</label>
              <Input value={ruangan} onChange={e => setRuangan(e.target.value)} className="rounded-xl h-10 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Kategori Kelas</label>
              <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs h-10 focus:outline-none">
                <option value="Caberawit A">Caberawit A (PAUD/TK)</option>
                <option value="Caberawit B">Caberawit B (SD Kelas 1-3)</option>
                <option value="Caberawit C">Caberawit C (SD Kelas 4-6)</option>
                <option value="Muda-mudi A">Muda-mudi A (SMP)</option>
                <option value="Muda-mudi B">Muda-mudi B (SMA/Remaja)</option>
                <option value="Dewasa A">Dewasa A (Umum)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label>Kelompok TPQ</label>
              <select value={kelompok} onChange={e => setKelompok(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs h-10 focus:outline-none">
                <option value="TPQ Al-Hikmah 1">TPQ Al-Hikmah 1</option>
                <option value="TPQ Al-Hikmah 2">TPQ Al-Hikmah 2</option>
                <option value="TPQ Al-Hikmah 3">TPQ Al-Hikmah 3</option>
                <option value="TPQ Al-Hikmah 4">TPQ Al-Hikmah 4</option>
                <option value="TPQ Al-Hikmah 5">TPQ Al-Hikmah 5</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label>Materi Utama <span className="text-rose-500">*</span></label>
            <Input placeholder="Misal: Al-Qur'an, Hadits, Akhlak..." value={materi} onChange={e => setMateri(e.target.value)} className="rounded-xl h-10 text-xs" required />
          </div>

          <div className="space-y-1">
            <label>Sub Materi / Bab</label>
            <Input placeholder="Misal: Surat Al-Mulk ayat 1-10..." value={subMateri} onChange={e => setSubMateri(e.target.value)} className="rounded-xl h-10 text-xs" />
          </div>

          <div className="space-y-1">
            <label>Target Capaian Pembelajaran <span className="text-rose-500">*</span></label>
            <textarea placeholder="Target capaian materi santri..." value={targetPembelajaran} onChange={e => setTargetPembelajaran(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none min-h-[70px] font-semibold" required />
          </div>

          <div className="space-y-1">
            <label>Metode Pembelajaran</label>
            <Input placeholder="Misal: Halaqah, Sorogan, Talaqqi..." value={metodePembelajaran} onChange={e => setMetodePembelajaran(e.target.value)} className="rounded-xl h-10 text-xs" />
          </div>
        </div>

        {/* Kolom 2: Absensi Santri & Catatan KBM */}
        <div className="space-y-4 flex flex-col justify-between">
          
          {/* Absensi Santri Checklist */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-55">
            <h4 className="font-extrabold text-slate-800 text-xs mb-3 flex items-center justify-between">
              <span>Checklist Kehadiran Santri</span>
              <Badge variant="outline" className="bg-white text-[10px] py-0.5 px-2 font-bold text-indigo-700 border-indigo-200">
                Hadir: {presentCount} / {activeStudents.length}
              </Badge>
            </h4>
            
            <div className="max-h-[160px] overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2.5 bg-white">
              {activeStudents.length > 0 ? (
                activeStudents.map(student => {
                  const currentStatus = studentStatuses[student.id] || "Hadir";
                  return (
                    <div key={student.id} className="flex justify-between items-center text-[11px] hover:bg-slate-50 p-1.5 rounded-lg transition-all">
                      <span className="font-bold text-slate-700 truncate max-w-[150px]">{student.namaLengkap}</span>
                      
                      <div className="flex gap-1">
                        {["Hadir", "Izin", "Sakit", "Alfa"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => toggleStudentStatus(student.id, st as any)}
                            className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] transition-all border ${
                              currentStatus === st
                                ? st === "Hadir" ? "bg-emerald-600 border-emerald-600 text-white" :
                                  st === "Izin" ? "bg-amber-500 border-amber-500 text-white" :
                                  st === "Sakit" ? "bg-indigo-500 border-indigo-500 text-white" :
                                  "bg-rose-500 border-rose-500 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {st[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 font-semibold">
                  Pilih Kelompok TPQ untuk meload daftar kehadiran santri.
                </div>
              )}
            </div>
            
            <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400">
              <span>Sakit: <strong className="text-slate-700">{sickCount}</strong></span>
              <span>Izin: <strong className="text-slate-700">{permissionCount}</strong></span>
              <span>Alfa: <strong className="text-rose-600">{absentCount}</strong></span>
            </div>
          </div>

          <div className="space-y-1">
            <label>Ulasan Kegiatan & Evaluasi</label>
            <textarea placeholder="Kegiatan belajar mengajar dan evaluasi kelas hari ini..." value={kegiatanPembelajaran} onChange={e => setKegiatanPembelajaran(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none min-h-[80px] font-semibold" />
          </div>

          <div className="space-y-1">
            <label>Tugas / PR</label>
            <Input placeholder="Tugas lanjutan di rumah..." value={tugas} onChange={e => setTugas(e.target.value)} className="rounded-xl h-10 text-xs" />
          </div>

          <div className="space-y-1">
            <label>Rencana Pertemuan Berikutnya</label>
            <Input placeholder="Target bahasan minggu depan..." value={rencanaBerikutnya} onChange={e => setRencanaBerikutnya(e.target.value)} className="rounded-xl h-10 text-xs" />
          </div>
        </div>
      </div>

      {/* File upload, signature and Status settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-xs font-bold text-slate-700 border-t border-slate-100 pt-6">
        
        {/* Upload Column */}
        <div className="space-y-3">
          <label>Lampiran Dokumentasi KBM</label>
          <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'foto')} className="hidden" accept="image/*" />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer relative h-[110px]"
          >
            {fotoBase64 ? (
              <div className="relative w-full h-full">
                <img src={fotoBase64} alt="Upload Preview" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFotoBase64(null); setFotoName(""); }}
                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow hover:bg-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-600 font-bold">Unggah Foto (Maks 10MB)</span>
                <span className="text-[8px] text-slate-400 font-medium">Klik atau drop gambar</span>
              </>
            )}
          </div>
        </div>

        {/* Digital Signature Column */}
        <div className="space-y-3">
          <label>Tanda Tangan Digital Pengajar</label>
          <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center h-[110px] relative overflow-hidden">
            {signed ? (
              <div className="flex flex-col items-center text-center space-y-1">
                <ShieldCheck className="h-8 w-8 text-emerald-600 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-700">TERTANDA SECARA DIGITAL</span>
                <span className="text-[7px] font-mono text-slate-450 block truncate max-w-[170px]">{signatureHash}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-1">
                <PenTool className="h-7 w-7 text-slate-400" />
                <span className="text-[9px] text-slate-400 font-semibold">Tanda Tangan Belum Dibubuhkan</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={simulateSignature}
              className={`absolute bottom-2 right-2 rounded-xl p-1.5 border text-[9px] font-black shadow-sm transition-all ${
                signed ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {signed ? "Batal TTD" : "Bubuhkan TTD"}
            </button>
          </div>
        </div>

        {/* Status Setting Column */}
        <div className="space-y-3">
          <label>Status Pengiriman Dokumen</label>
          <div className="bg-slate-55 border border-slate-200/80 rounded-2xl p-4 h-[110px] flex flex-col justify-center gap-2">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs h-10 focus:outline-none font-bold"
            >
              <option value="Draft">Draft (Simpan Lokal)</option>
              <option value="Menunggu Review">Kirim (Ajukan ke Koordinator)</option>
              {userRole !== "Pengajar" && (
                <>
                  <option value="Disetujui">Setujui (Approve)</option>
                  <option value="Direvisi">Tolak & Minta Revisi</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              )}
            </select>
            <span className="text-[9px] text-slate-450 font-semibold leading-relaxed">
              *Draft dapat disimpan otomatis secara lokal. Kirim untuk memublikasikan data.
            </span>
          </div>
        </div>

      </div>

      {/* Action Submit Buttons */}
      <div className="flex justify-end gap-3.5 border-t border-slate-100 pt-5">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 hover:bg-slate-50 font-bold text-xs h-11 px-6">
          Batal
        </Button>
        
        <Button 
          type="submit" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-11 px-8 shadow-md transition-all active:scale-[0.98]"
        >
          {isEdit ? "Simpan Perubahan" : "Buat Jurnal Baru"}
        </Button>
      </div>
    </form>
  );
}
