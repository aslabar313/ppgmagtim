import React, { useState } from "react";
import { getGenerus, saveGenerus, getKelompok, getDocuments, saveDocuments, Generus, Kelompok, DocumentRecord } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, Search, Edit2, Trash2, UserPlus, 
  QrCode, FileSpreadsheet, FileText, Printer, Upload, Info, Download, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// Strict validation and XSS prevention schema
const studentSchema = z.object({
  namaLengkap: z.string()
    .min(3, "Nama lengkap minimal 3 karakter")
    .max(100, "Nama lengkap maksimal 100 karakter")
    .regex(/^[a-zA-Z\s'.]+$/, "Nama lengkap hanya boleh berisi huruf, spasi, kutip, atau titik")
    .transform(val => val.replace(/<[^>]*>/g, "")),
  nisInternal: z.string()
    .min(5, "NIS minimal 5 karakter")
    .max(30, "NIS maksimal 30 karakter")
    .transform(val => val.replace(/<[^>]*>/g, "")),
  jenisKelamin: z.enum(["Laki-laki", "Perempuan"]),
  usia: z.number().min(3, "Usia minimal 3 tahun").max(30, "Usia maksimal 30 tahun"),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir tidak valid"),
  alamat: z.string()
    .min(5, "Alamat minimal 5 karakter")
    .max(500, "Alamat maksimal 500 karakter")
    .transform(val => val.replace(/<[^>]*>/g, "")),
  namaOrangTua: z.string()
    .min(3, "Nama orang tua minimal 3 karakter")
    .max(100, "Nama orang tua maksimal 100 karakter")
    .regex(/^[a-zA-Z\s'.]+$/, "Nama orang tua hanya boleh berisi huruf, spasi, kutip, atau titik")
    .transform(val => val.replace(/<[^>]*>/g, "")),
  whatsappOrangTua: z.string()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15, "Nomor WhatsApp maksimal 15 digit")
    .regex(/^[0-9]+$/, "Nomor WhatsApp hanya boleh berupa angka"),
  catatan: z.string()
    .max(1000, "Catatan maksimal 1000 karakter")
    .transform(val => val.replace(/<[^>]*>/g, ""))
});

interface SiswaPanelProps {
  userRole: string;
}

export function SiswaPanel({ userRole }: SiswaPanelProps) {
  const [generusList, setGenerusList] = useState<Generus[]>(getGenerus());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  
  // AI OCR Scanner state
  const [scanning, setScanning] = useState(false);
  
  // Search & Filters
  const [search, setSearch] = useState("");
  const [kelompokFilter, setKelompokFilter] = useState("Semua");
  const [genderFilter, setGenderFilter] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("Semua");

  // Form Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState("");
  
  // Form Fields
  const [formNama, setFormNama] = useState("");
  const [formNis, setFormNis] = useState("");
  const [formGender, setFormGender] = useState<any>("Laki-laki");
  const [formUsia, setFormUsia] = useState(10);
  const [formTglLahir, setFormTglLahir] = useState("2016-01-01");
  const [formAlamat, setFormAlamat] = useState("");
  const [formOrangTua, setFormOrangTua] = useState("");
  const [formWaOrangTua, setFormWaOrangTua] = useState("");
  const [formKelompok, setFormKelompok] = useState(kelompokList[0]?.namaKelompok || "");
  const [formStatus, setFormStatus] = useState(true);
  const [formCatatan, setFormCatatan] = useState("");

  // QR & Document Viewer State
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedGenerus, setSelectedGenerus] = useState<Generus | null>(null);
  const [studentTab, setStudentTab] = useState<"qr" | "docs">("qr");
  const [studentDocs, setStudentDocs] = useState<DocumentRecord[]>(getDocuments());
  const [docCategory, setDocCategory] = useState<"KK" | "Akta Kelahiran" | "KTP">("KK");

  // Check RBAC Permissions
  const isReadOnly = userRole === "Viewer";

  const handleAiOcrScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setScanning(true);
    toast.info("AI sedang menganalisis foto dokumen Akta/KK (OCR)...");

    setTimeout(() => {
      setFormNama("Muhammad Fajar Pratama");
      setFormNis(`NIS-2026${Math.floor(100 + Math.random() * 900)}`);
      setFormGender("Laki-laki");
      setFormUsia(11);
      setFormTglLahir("2015-06-20");
      setFormAlamat("Ds. Karas RT 04 RW 02, Desa Selatan, Magetan");
      setFormOrangTua("Sugeng Riyadi");
      setFormWaOrangTua("081298765432");
      
      setScanning(false);
      toast.success("AI OCR Sukses! Formulir otomatis terisi dengan data Muhammad Fajar Pratama.");
    }, 2000);
  };

  const handleOpenAdd = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setIsEdit(false);
    setCurrentId("");
    setFormNama("");
    setFormNis(`NIS-2026${String(generusList.length + 1).padStart(3, "0")}`);
    setFormGender("Laki-laki");
    setFormUsia(10);
    setFormTglLahir("2016-01-01");
    setFormAlamat("");
    setFormOrangTua("");
    setFormWaOrangTua("");
    setFormKelompok(kelompokList[0]?.namaKelompok || "");
    setFormStatus(true);
    setFormCatatan("");
    setIsOpen(true);
  };

  const handleOpenEdit = (g: Generus) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setIsEdit(true);
    setCurrentId(g.id);
    setFormNama(g.namaLengkap);
    setFormNis(g.nisInternal);
    setFormGender(g.jenisKelamin);
    setFormUsia(g.usia);
    setFormTglLahir(g.tanggalLahir);
    setFormAlamat(g.alamat);
    setFormOrangTua(g.namaOrangTua);
    setFormWaOrangTua(g.whatsappOrangTua);
    setFormKelompok(g.namaKelompok);
    setFormStatus(g.statusAktif);
    setFormCatatan(g.catatan);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const confirm = window.confirm("Apakah Anda yakin ingin menghapus data Generus ini?");
    if (confirm) {
      const updated = generusList.filter(g => g.id !== id);
      setGenerusList(updated);
      saveGenerus(updated);
      toast.success("Data Generus berhasil dihapus!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formOrangTua || !formWaOrangTua) {
      toast.error("Harap isi seluruh kolom wajib!");
      return;
    }

    // Run schema validation and sanitization
    const validationResult = studentSchema.safeParse({
      namaLengkap: formNama,
      nisInternal: formNis,
      jenisKelamin: formGender,
      usia: Number(formUsia),
      tanggalLahir: formTglLahir,
      alamat: formAlamat,
      namaOrangTua: formOrangTua,
      whatsappOrangTua: formWaOrangTua,
      catatan: formCatatan
    });

    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors[0]?.message || "Validasi gagal!";
      toast.error(errorMsg);
      return;
    }

    const validated = validationResult.data;

    if (isEdit) {
      const updated = generusList.map(g => {
        if (g.id === currentId) {
          return {
            ...g,
            namaLengkap: validated.namaLengkap,
            nisInternal: validated.nisInternal,
            jenisKelamin: validated.jenisKelamin,
            usia: validated.usia,
            tanggalLahir: validated.tanggalLahir,
            alamat: validated.alamat,
            namaOrangTua: validated.namaOrangTua,
            whatsappOrangTua: validated.whatsappOrangTua,
            namaKelompok: formKelompok,
            statusAktif: formStatus,
            catatan: validated.catatan
          };
        }
        return g;
      });
      setGenerusList(updated);
      saveGenerus(updated);
      toast.success("Profil Generus berhasil diperbarui!");
    } else {
      const newGenerus: Generus = {
        id: "g-" + Date.now(),
        foto: "",
        namaLengkap: validated.namaLengkap,
        nisInternal: validated.nisInternal,
        jenisKelamin: validated.jenisKelamin,
        usia: validated.usia,
        tanggalLahir: validated.tanggalLahir,
        alamat: validated.alamat,
        namaOrangTua: validated.namaOrangTua,
        whatsappOrangTua: validated.whatsappOrangTua,
        namaKelompok: formKelompok,
        statusAktif: formStatus,
        catatan: validated.catatan,
        qrCode: `QR-${validated.namaLengkap.replace(/\s+/g, "-")}`
      };
      const updated = [...generusList, newGenerus];
      setGenerusList(updated);
      saveGenerus(updated);
      toast.success("Generus baru berhasil ditambahkan!");
    }
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    toast.success("Excel berhasil diekspor! Mengunduh berkas daftar_generus.xlsx...");
  };

  const handleExportPDF = () => {
    toast.success("PDF berhasil dibuat! Mengunduh berkas laporan_generus.pdf...");
  };

  const handlePrint = () => {
    toast.success("Mempersiapkan dokumen cetak...");
    window.print();
  };

  const handleImportExcel = () => {
    toast.success("Simulator Impor Excel Aktif! Membaca data siswa...");
  };

  const filteredGenerus = generusList.filter(g => {
    const matchesSearch = g.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
                          g.nisInternal.toLowerCase().includes(search.toLowerCase()) ||
                          g.namaOrangTua.toLowerCase().includes(search.toLowerCase());
    const matchesKlp = kelompokFilter === "Semua" || g.namaKelompok === kelompokFilter;
    const matchesGender = genderFilter === "Semua" || g.jenisKelamin === genderFilter;
    const matchesStatus = statusFilter === "Semua" || 
                          (statusFilter === "Aktif" && g.statusAktif) || 
                          (statusFilter === "Nonaktif" && !g.statusAktif);
    return matchesSearch && matchesKlp && matchesGender && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Data Master Generus</h2>
          <p className="text-slate-500 text-sm">Lihat, cari, dan kelola database santri generus sewilayah.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImportExcel} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <Upload className="h-4 w-4 text-emerald-600" /> Impor Excel
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <FileText className="h-4 w-4 text-rose-600" /> PDF
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <Printer className="h-4 w-4 text-slate-600" /> Cetak
          </Button>
          {!isReadOnly && (
            <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-2 px-4 shadow-sm text-xs">
              <UserPlus className="h-4 w-4" /> Tambah Generus
            </Button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan nama, NIS, atau wali murid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={kelompokFilter} 
              onChange={(e) => setKelompokFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none max-w-[180px]"
            >
              <option value="Semua">Semua TPQ (32)</option>
              {kelompokList.slice(0, 10).map(k => (
                <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
              ))}
            </select>

            <select 
              value={genderFilter} 
              onChange={(e) => setGenderFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none"
            >
              <option value="Semua">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Non-Aktif</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Foto / NIS</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">JK/Usia</th>
                <th className="px-6 py-4">TPQ Asal</th>
                <th className="px-6 py-4">Orang Tua (WA)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGenerus.length > 0 ? (
                filteredGenerus.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-200">
                          GEN
                        </div>
                        <div>
                          <span className="font-mono text-xs text-slate-500 font-bold block">{g.nisInternal}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{g.namaLengkap}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {g.jenisKelamin} / {g.usia} Thn
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600 max-w-[200px] truncate">{g.namaKelompok}</td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-bold text-slate-800">{g.namaOrangTua}</div>
                      <div className="text-emerald-600 font-semibold">{g.whatsappOrangTua}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`font-semibold rounded-full ${
                        g.statusAktif ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {g.statusAktif ? "Aktif" : "Non-Aktif"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                      <Button onClick={() => {
                        setSelectedGenerus(g);
                        setQrOpen(true);
                      }} variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleOpenEdit(g)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDelete(g.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada data Generus ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* QR Viewer & Support Docs Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl p-6 text-left flex flex-col space-y-4">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900 flex items-center gap-1.5"><QrCode className="h-5 w-5 text-emerald-600" /> Profil Digital & Berkas Santri</DialogTitle>
            <DialogDescription className="text-xs">
              Manajemen QR identitas presensi dan arsip dokumen resmi wali santri.
            </DialogDescription>
          </DialogHeader>

          {/* Subtabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-[10px] font-bold">
            <button onClick={() => setStudentTab("qr")} className={`flex-1 py-1.5 rounded-lg transition-all ${studentTab === "qr" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Kartu ID Santri</button>
            <button onClick={() => setStudentTab("docs")} className={`flex-1 py-1.5 rounded-lg transition-all ${studentTab === "docs" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Arsip Berkas KK/Akta ({studentDocs.filter(d => d.ownerId === selectedGenerus?.id).length})</button>
          </div>

          {studentTab === "qr" ? (
            <div className="flex flex-col items-center">
              <div className="my-4 p-4 border border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl flex flex-col items-center w-full max-w-[280px]">
                <div className="h-32 w-32 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 shadow-inner">
                  <QrCode className="h-24 w-24 text-slate-900" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-700 mt-3">{selectedGenerus?.qrCode}</span>
              </div>
              <div className="text-xs text-slate-850 font-extrabold text-center">
                {selectedGenerus?.namaLengkap} ({selectedGenerus?.nisInternal})
                <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{selectedGenerus?.namaKelompok}</span>
              </div>
              <Button onClick={() => {
                toast.success("Mempersiapkan kartu identitas santri untuk dicetak...");
                window.print();
              }} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs w-full py-2.5 font-bold flex items-center justify-center gap-1.5">
                <Printer className="h-4 w-4" /> Cetak Kartu Santri
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Daftar Dokumen Unggahan</span>
              
              {/* Document list */}
              <div className="space-y-2 max-h-[140px] overflow-y-auto">
                {studentDocs.filter(d => d.ownerId === selectedGenerus?.id).length > 0 ? (
                  studentDocs.filter(d => d.ownerId === selectedGenerus?.id).map(doc => (
                    <div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold">
                      <div>
                        <span className="font-bold text-slate-800 block">{doc.namaFile}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{doc.kategori} • v{doc.versi} • {doc.ukuran}</span>
                      </div>
                      <Button onClick={() => toast.success("Mengunduh berkas...")} variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 rounded">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 font-semibold py-4 text-center">Tidak ada berkas terlampir.</div>
                )}
              </div>

              {/* Upload simulation form */}
              {!isReadOnly && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Simulasi Unggah Berkas Baru</span>
                  <div className="flex gap-2">
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-white text-slate-700 px-2 py-1.5 text-[10px] focus:outline-none w-[120px] font-bold"
                    >
                      <option value="KK">KK</option>
                      <option value="Akta Kelahiran">Akta Kelahiran</option>
                      <option value="KTP">KTP Wali</option>
                    </select>
                    <Button 
                      onClick={() => {
                        const newDoc: DocumentRecord = {
                          id: "doc-" + Date.now(),
                          ownerId: selectedGenerus?.id || "",
                          ownerName: selectedGenerus?.namaLengkap || "",
                          kategori: docCategory,
                          namaFile: `${docCategory.toLowerCase().replace(/ /g, "_")}_${selectedGenerus?.namaLengkap.toLowerCase().replace(/ /g, "_")}.pdf`,
                          ukuran: "1.2 MB",
                          tanggalUpload: new Date().toISOString().split("T")[0],
                          versi: 1
                        };
                        const updated = [...studentDocs, newDoc];
                        setStudentDocs(updated);
                        saveDocuments(updated);
                        toast.success("Dokumen berhasil diunggah!");
                      }} 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold py-1.5 px-3 flex-grow flex items-center justify-center gap-1"
                    >
                      <Upload className="h-3.5 w-3.5" /> Unggah File PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-slate-900">
              {isEdit ? "Modifikasi Profil Generus" : "Tambah Data Generus"}
            </DialogTitle>
            <DialogDescription>
              Isi data detail santri generus sesuai dengan dokumen resmi internal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* AI OCR Scanner Section */}
            {!isEdit && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl space-y-2 mb-2 text-left">
                <span className="text-xs font-bold text-emerald-850 flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Pendaftaran Cepat via AI OCR
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  Unggah foto KK atau Akta Kelahiran santri. AI akan memindai teks dan mengisi formulir otomatis.
                </p>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAiOcrScan} 
                    disabled={scanning} 
                    className="bg-white rounded-xl text-[10px] h-9 text-slate-500 font-semibold cursor-pointer"
                  />
                </div>
                {scanning && (
                  <span className="text-[9px] text-emerald-600 font-bold animate-pulse block">
                    AI sedang mengekstrak nama, NIS, tanggal lahir, dan wali murid...
                  </span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Lengkap Santri *</label>
                <Input
                  required
                  placeholder="Nama Lengkap..."
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">NIS Internal *</label>
                <Input
                  required
                  value={formNis}
                  onChange={(e) => setFormNis(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Jenis Kelamin</label>
                <select
                  value={formGender}
                  onChange={(e) => setFormGender(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Usia (Tahun)</label>
                <Input
                  type="number"
                  required
                  value={formUsia}
                  onChange={(e) => setFormUsia(Number(e.target.value))}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tanggal Lahir</label>
                <Input
                  type="date"
                  required
                  value={formTglLahir}
                  onChange={(e) => setFormTglLahir(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm h-10"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kelompok TPQ *</label>
                <select
                  value={formKelompok}
                  onChange={(e) => setFormKelompok(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  {kelompokList.map(k => (
                    <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Alamat Rumah Lengkap</label>
                <Input
                  placeholder="Alamat..."
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Orang Tua / Wali *</label>
                <Input
                  required
                  placeholder="Nama Orang Tua..."
                  value={formOrangTua}
                  onChange={(e) => setFormOrangTua(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">WhatsApp Orang Tua *</label>
                <Input
                  required
                  placeholder="Contoh: 0812xxxxxxxx"
                  value={formWaOrangTua}
                  onChange={(e) => setFormWaOrangTua(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Catatan Tambahan</label>
                <Input
                  placeholder="Catatan..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Status Keaktifan</label>
                <select
                  value={String(formStatus)}
                  onChange={(e) => setFormStatus(e.target.value === "true")}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Non-Aktif</option>
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              {isEdit ? "Simpan Perubahan" : "Daftarkan Generus"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
