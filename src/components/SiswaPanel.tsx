import React, { useState } from "react";
import { getGenerus, saveGenerus, getKelompok, getDocuments, saveDocuments, Generus, Kelompok, DocumentRecord, getUserDetails } from "@/lib/mockData";
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

function mapHeaders(headers: string[]): { [key: string]: number } {
  const mapping: { [key: string]: number } = {};
  headers.forEach((h, index) => {
    const clean = h.trim().toLowerCase();
    if (clean.includes("nama") && (clean.includes("lengkap") || clean.includes("siswa") || clean.includes("santri") || (!clean.includes("orang") && !clean.includes("tua") && !clean.includes("wali") && !clean.includes("ortu")))) {
      mapping.namaLengkap = index;
    } else if (clean.includes("nis")) {
      mapping.nisInternal = index;
    } else if (clean.includes("kelamin") || clean.includes("gender") || clean === "jk") {
      mapping.jenisKelamin = index;
    } else if (clean.includes("usia") || clean.includes("umur")) {
      mapping.usia = index;
    } else if (clean.includes("lahir") || clean.includes("tgl")) {
      mapping.tanggalLahir = index;
    } else if (clean.includes("alamat")) {
      mapping.alamat = index;
    } else if (clean.includes("orang") || clean.includes("tua") || clean.includes("wali") || clean.includes("ortu")) {
      if (clean.includes("wa") || clean.includes("whatsapp") || clean.includes("telepon") || clean.includes("hp") || clean.includes("no")) {
        mapping.whatsappOrangTua = index;
      } else {
        mapping.namaOrangTua = index;
      }
    } else if (clean.includes("wa") || clean.includes("whatsapp") || clean.includes("telepon") || clean.includes("hp") || clean.includes("no")) {
      mapping.whatsappOrangTua = index;
    } else if (clean.includes("kelompok")) {
      mapping.namaKelompok = index;
    } else if (clean.includes("catatan") || clean.includes("keterangan") || clean.includes("note")) {
      mapping.catatan = index;
    }
  });
  return mapping;
}

interface SiswaPanelProps {
  userRole: string;
}

export function SiswaPanel({ userRole }: SiswaPanelProps) {
  const [generusList, setGenerusList] = useState<Generus[]>(getGenerus());
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
  
  // AI OCR Scanner state
  const [scanning, setScanning] = useState(false);
  
  // Search & Filters
  const [search, setSearch] = useState("");
  const [kelompokFilter, setKelompokFilter] = useState("Semua");
  const [genderFilter, setGenderFilter] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [subDbTab, setSubDbTab] = useState<"Caberawit" | "Muda-Mudi" | "Jama'ah Dewasa">("Caberawit");

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
  const [formKelompok, setFormKelompok] = useState(allowedKelompoks[0] || "");
  const [formStatus, setFormStatus] = useState(true);
  const [formCatatan, setFormCatatan] = useState("");
  const [formKategori, setFormKategori] = useState<"Caberawit" | "Muda-Mudi" | "Jama'ah Dewasa">("Caberawit");

  // QR & Document Viewer State
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedGenerus, setSelectedGenerus] = useState<Generus | null>(null);
  const [studentTab, setStudentTab] = useState<"qr" | "docs">("qr");
  const [studentDocs, setStudentDocs] = useState<DocumentRecord[]>(getDocuments());
  const [docCategory, setDocCategory] = useState<"KK" | "Akta Kelahiran" | "KTP">("KK");

  // Import CSV states
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importValidation, setImportValidation] = useState<{ [key: number]: string[] }>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing'>('idle');
  const [updateExisting, setUpdateExisting] = useState(true);

  // Check RBAC Permissions
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

        const mapping = mapHeaders(headers);
        
        if (mapping.namaLengkap === undefined && mapping.nisInternal === undefined) {
          toast.error("Kolom 'Nama Lengkap' atau 'NIS' tidak ditemukan dalam file CSV.");
          setImportStatus('idle');
          return;
        }

        const parsedRows: any[] = [];
        const validationMap: { [key: number]: string[] } = {};

        rows.forEach((row, index) => {
          const rawNama = mapping.namaLengkap !== undefined ? row[mapping.namaLengkap]?.trim() : "";
          const rawNis = mapping.nisInternal !== undefined ? row[mapping.nisInternal]?.trim() : "";
          const rawGender = mapping.jenisKelamin !== undefined ? row[mapping.jenisKelamin]?.trim() : "";
          const rawUsia = mapping.usia !== undefined ? row[mapping.usia]?.trim() : "";
          const rawTglLahir = mapping.tanggalLahir !== undefined ? row[mapping.tanggalLahir]?.trim() : "";
          const rawAlamat = mapping.alamat !== undefined ? row[mapping.alamat]?.trim() : "";
          const rawOrangTua = mapping.namaOrangTua !== undefined ? row[mapping.namaOrangTua]?.trim() : "";
          const rawWaOrangTua = mapping.whatsappOrangTua !== undefined ? row[mapping.whatsappOrangTua]?.trim() : "";
          const rawKelompok = mapping.namaKelompok !== undefined ? row[mapping.namaKelompok]?.trim() : "";
          const rawCatatan = mapping.catatan !== undefined ? row[mapping.catatan]?.trim() : "";

          const namaLengkap = rawNama || "Santri Tanpa Nama";
          const nisInternal = rawNis || `NIS-TEMP-${Date.now()}-${Math.floor(Math.random() * 1005)}`;
          
          let jenisKelamin: "Laki-laki" | "Perempuan" = "Laki-laki";
          const gLower = rawGender.toLowerCase();
          if (gLower === "perempuan" || gLower === "p" || gLower === "female") {
            jenisKelamin = "Perempuan";
          }

          const usia = Number(rawUsia) || 10;
          const tanggalLahir = /^\d{4}-\d{2}-\d{2}$/.test(rawTglLahir) ? rawTglLahir : "2016-01-01";
          const alamat = rawAlamat || "-";
          const namaOrangTua = rawOrangTua || "-";
          const whatsappOrangTua = rawWaOrangTua.replace(/[^0-9]/g, "") || "081200000000";
          const namaKelompok = rawKelompok || (allowedKelompoks[0] || "");
          const catatan = rawCatatan || "";

          const errors: string[] = [];

          if (!rawNama) {
            errors.push("Nama Lengkap tidak boleh kosong");
          }
          if (!rawNis) {
            errors.push("NIS tidak boleh kosong (menggunakan NIS otomatis sementara)");
          }
          if (rawKelompok && !allowedKelompoks.includes(namaKelompok)) {
            errors.push(`Kelompok '${namaKelompok}' tidak sesuai dengan hak akses Anda (${userScope})`);
          }
          
          const isExisting = generusList.some(g => g.nisInternal === nisInternal);
          if (isExisting) {
            errors.push(`NIS '${nisInternal}' sudah terdaftar (akan diperbarui jika dicentang)`);
          }

          parsedRows.push({
            id: isExisting ? (generusList.find(g => g.nisInternal === nisInternal)?.id || "g-" + Date.now() + index) : "g-" + Date.now() + index,
            namaLengkap,
            nisInternal,
            jenisKelamin,
            usia,
            tanggalLahir,
            alamat,
            namaOrangTua,
            whatsappOrangTua,
            namaKelompok,
            statusAktif: true,
            catatan,
            isExisting
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
    const updatedList = [...generusList];

    importRows.forEach((row, idx) => {
      const errors = importValidation[idx] || [];
      const hasFatalError = errors.some(err => !err.includes("sudah terdaftar") && !err.includes("menggunakan NIS otomatis"));
      if (hasFatalError) return;

      const generusData: Generus = {
        id: row.id,
        foto: "",
        namaLengkap: row.namaLengkap,
        nisInternal: row.nisInternal,
        jenisKelamin: row.jenisKelamin,
        usia: row.usia,
        tanggalLahir: row.tanggalLahir,
        alamat: row.alamat,
        namaOrangTua: row.namaOrangTua,
        whatsappOrangTua: row.whatsappOrangTua,
        namaKelompok: row.namaKelompok,
        statusAktif: row.statusAktif,
        catatan: row.catatan,
        qrCode: `QR-${row.namaLengkap.replace(/\s+/g, "-")}`
      };

      const existingIndex = updatedList.findIndex(g => g.id === row.id);
      if (existingIndex > -1) {
        if (updateExisting) {
          updatedList[existingIndex] = generusData;
          countUpdated++;
        }
      } else {
        updatedList.push(generusData);
        countNew++;
      }
    });

    if (countNew === 0 && countUpdated === 0) {
      toast.info("Tidak ada data baru yang diimpor.");
      setImportOpen(false);
      return;
    }

    setGenerusList(updatedList);
    saveGenerus(updatedList);
    toast.success(`Impor data berhasil! ${countNew} santri baru ditambahkan dan ${countUpdated} data santri diperbarui.`);
    setImportOpen(false);
    
    setImportStatus('idle');
    setImportRows([]);
    setImportValidation({});
  };

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
    setFormKelompok(allowedKelompoks[0] || "");
    setFormStatus(true);
    setFormCatatan("");
    setFormKategori("Caberawit");
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
    setFormKategori(g.kategori || (g.usia < 13 ? "Caberawit" : g.usia <= 22 ? "Muda-Mudi" : "Jama'ah Dewasa"));
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
            catatan: validated.catatan,
            kategori: formKategori
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
        qrCode: `QR-${validated.namaLengkap.replace(/\s+/g, "-")}`,
        kategori: formKategori
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

  const csvTemplateHeaders = "NIS,Nama Lengkap,Jenis Kelamin,Usia,Tanggal Lahir,Kelompok Binaan,Nama Orang Tua,WhatsApp Orang Tua,Alamat,Catatan";
  const csvTemplateRow = "NIS-010,Muhammad Rizky,Laki-laki,12,2014-08-15,Kelompok 1,Ahmad Yani,081234567890,Ds. Karas RT 02 RW 01 Magetan,Santri teladan";
  const csvTemplateUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplateHeaders + "\n" + csvTemplateRow + "\n")}`;

  const filteredGenerus = generusList.filter(g => {
    // Scope check: must belong to allowed kelompoks
    if (!allowedKelompoks.includes(g.namaKelompok)) return false;

    // Sub-Database filter
    const computedCategory = g.kategori || (g.usia < 13 ? "Caberawit" : g.usia <= 22 ? "Muda-Mudi" : "Jama'ah Dewasa");
    if (computedCategory !== subDbTab) return false;

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
          <h2 className="font-display text-2xl font-bold text-slate-800">Database Jama'ah & Generus</h2>
          <p className="text-slate-500 text-sm">Lihat, cari, dan kelola database Caberawit, Muda-Mudi, dan Jama'ah Dewasa sewilayah.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <Upload className="h-4 w-4 text-emerald-600" /> Impor Excel/CSV
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
              <UserPlus className="h-4 w-4" /> Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Sub Database Selector Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200/60 max-w-2xl w-full">
        {(["Caberawit", "Muda-Mudi", "Jama'ah Dewasa"] as const).map((tab) => {
          const count = generusList.filter(g => {
            if (!allowedKelompoks.includes(g.namaKelompok)) return false;
            const category = g.kategori || (g.usia < 13 ? "Caberawit" : g.usia <= 22 ? "Muda-Mudi" : "Jama'ah Dewasa");
            return category === tab;
          }).length;
          
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setSubDbTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                subDbTab === tab
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/40"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
              }`}
            >
              {tab === "Caberawit" && "👦 Caberawit"}
              {tab === "Muda-Mudi" && "🧑 Muda-Mudi"}
              {tab === "Jama'ah Dewasa" && "🧔 Dewasa"}
              <Badge className="bg-slate-200 text-slate-700 font-bold border-none px-2 py-0.5 rounded-full hover:bg-slate-200 text-[10px]">
                {count}
              </Badge>
            </button>
          );
        })}
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
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none max-w-[180px] font-semibold"
            >
              <option value="Semua">Semua Kelompok ({allowedKelompoks.length})</option>
              {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
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
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormUsia(val);
                    if (val < 13) setFormKategori("Caberawit");
                    else if (val <= 22) setFormKategori("Muda-Mudi");
                    else setFormKategori("Jama'ah Dewasa");
                  }}
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
                <label className="text-xs font-bold text-slate-700">Kelompok Binaan *</label>
                <select
                  value={formKelompok}
                  onChange={(e) => setFormKelompok(e.target.value)}
                  disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 disabled:bg-slate-50 disabled:text-slate-500 font-bold"
                >
                  {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
                    <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Sub Database / Kategori *</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
                >
                  <option value="Caberawit">👦 Caberawit (Anak-Anak)</option>
                  <option value="Muda-Mudi">🧑 Muda-Mudi (Remaja/Youth)</option>
                  <option value="Jama'ah Dewasa">🧔 Jama'ah Dewasa (Adult)</option>
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

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-2xl p-6 text-left flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <Upload className="h-5 w-5 text-emerald-600" /> Impor Data Generus
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah file CSV untuk mengimpor data santri secara massal ke dalam sistem.
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
                  <li>Kolom minimal yang harus ada: <strong>Nama Lengkap</strong> dan <strong>NIS</strong>.</li>
                  <li>Kolom opsional lainnya: Jenis Kelamin, Usia, Tanggal Lahir, Kelompok, Orang Tua, No WhatsApp, Alamat, Catatan.</li>
                  <li>Gunakan format tanggal <strong>YYYY-MM-DD</strong> (contoh: 2016-05-12).</li>
                  <li>Untuk kelancaran, Anda dapat mengunduh templat di bawah ini.</li>
                </ol>
                <div className="pt-2">
                  <a
                    href={csvTemplateUri}
                    download="templat_import_generus.csv"
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
                <span className="text-xs font-bold text-slate-700">Preview Data ({importRows.length} Baris)</span>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded border-slate-350 text-emerald-600 mr-1.5"
                    />
                    Perbarui data jika NIS sudah ada
                  </label>
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                      <th className="p-2">NIS</th>
                      <th className="p-2">Nama Lengkap</th>
                      <th className="p-2">Kelompok</th>
                      <th className="p-2">Gender</th>
                      <th className="p-2">Wali</th>
                      <th className="p-2">Status / Peringatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((row, idx) => {
                      const errors = importValidation[idx] || [];
                      const hasErrors = errors.length > 0;
                      
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 font-semibold text-slate-800">
                          <td className="p-2 font-mono">{row.nisInternal}</td>
                          <td className="p-2">{row.namaLengkap}</td>
                          <td className="p-2">{row.namaKelompok}</td>
                          <td className="p-2">{row.jenisKelamin}</td>
                          <td className="p-2">{row.namaOrangTua}</td>
                          <td className="p-2">
                            {hasErrors ? (
                              <div className="space-y-0.5">
                                {errors.map((err, eIdx) => {
                                  const isWarning = err.includes("sudah terdaftar") || err.includes("menggunakan NIS otomatis");
                                  return (
                                    <span key={eIdx} className={`block text-[9px] ${isWarning ? "text-amber-600 font-semibold" : "text-rose-600 font-bold"}`}>
                                      • {err}
                                    </span>
                                  );
                                })}
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
                    const hasFatalError = errors.some(err => !err.includes("sudah terdaftar") && !err.includes("menggunakan NIS otomatis"));
                    if (hasFatalError) return false;
                    if (row.isExisting && !updateExisting) return false;
                    return true;
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
