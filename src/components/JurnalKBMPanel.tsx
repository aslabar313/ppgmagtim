import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, Search, Download, Printer, Filter, Trash2, Edit2, Eye, 
  ChevronLeft, ChevronRight, BarChart3, ListCollapse, ArrowUpDown, RefreshCw 
} from "lucide-react";

// Sub-component imports
import { JurnalStats } from "./JurnalKBM/JurnalStats";
import { JurnalForm } from "./JurnalKBM/JurnalForm";
import { JurnalDetail } from "./JurnalKBM/JurnalDetail";

interface JurnalKBMPanelProps {
  userRole: string;
}

export function JurnalKBMPanel({ userRole }: JurnalKBMPanelProps) {
  // 1. Database state with seeding
  const [journals, setJournals] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_tpq_journals");
      if (stored) return JSON.parse(stored);
    }
    return [
      {
        id: "jr-1",
        nomorJurnal: "JR-2026-000001",
        tanggal: "2026-07-01",
        jamMulai: "16:00",
        jamSelesai: "17:30",
        pengajar: "Ust. M. Ridho",
        kelas: "Caberawit B",
        kelompok: "TPQ Al-Hikmah 3",
        ruangan: "Lantai 1 Masjid",
        materi: "Juz Amma",
        subMateri: "Surat Al-A'la",
        targetPembelajaran: "Hafal lancar tartil dengan tajwid benar",
        metodePembelajaran: "Ceramah & Talaqqi",
        santriHadirCount: 12,
        santriIzinCount: 1,
        santriSakitCount: 0,
        santriAlfaCount: 0,
        studentAttendanceMap: {},
        kegiatanPembelajaran: "Membaca bersama lalu setoran hafalan mandiri santri satu persatu.",
        evaluasi: "Sebagian besar santri sudah lancar, namun beberapa masih keliru di hukum Mad.",
        tugas: "Ulangi hafalan Al-A'la ayat 1-10 di rumah",
        rencanaBerikutnya: "Melanjutkan Surat Al-Ghasyiyah",
        lampiranFoto: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400",
        lampiranFotoName: "kegiatan_halaqah.jpg",
        status: "Disetujui",
        digitalSignaturePengajar: "SECURE-SIG-UST-M-RIDHO-7A4B9F",
        digitalSignatureKoordinator: "SECURE-SIG-KOORDINATOR-8F2D1A",
        version: 1,
        history: [{ timestamp: "2026-07-01, 17:45", action: "Jurnal Dibuat & Dikirim", user: "Ust. M. Ridho" }]
      },
      {
        id: "jr-2",
        nomorJurnal: "JR-2026-000002",
        tanggal: "2026-07-03",
        jamMulai: "16:00",
        jamSelesai: "17:30",
        pengajar: "Usth. Laila",
        kelas: "Muda-mudi A",
        kelompok: "TPQ Al-Hikmah 4",
        ruangan: "Gazebo Belakang",
        materi: "Hadits Arba'in",
        subMateri: "Hadits 1 (Niat)",
        targetPembelajaran: "Lancar membaca lafadz hadits dan terjemahannya",
        metodePembelajaran: "Sorogan",
        santriHadirCount: 15,
        santriIzinCount: 0,
        santriSakitCount: 1,
        santriAlfaCount: 0,
        studentAttendanceMap: {},
        kegiatanPembelajaran: "Membaca hadits secara bergiliran lalu menghafalkannya secara klasikal.",
        evaluasi: "Santri memahami esensi niat ikhlas, hafalan lafadz cukup lancar.",
        tugas: "Setoran hadits niat di hadapan orang tua",
        rencanaBerikutnya: "Hadits 2 (Islam, Iman, Ihsan)",
        status: "Disetujui",
        digitalSignaturePengajar: "SECURE-SIG-USTH-LAILA-8C5D3E",
        digitalSignatureKoordinator: "SECURE-SIG-KOORDINATOR-8F2D1A",
        version: 1,
        history: [{ timestamp: "2026-07-03, 18:00", action: "Jurnal Dikirim", user: "Usth. Laila" }]
      },
      {
        id: "jr-3",
        nomorJurnal: "JR-2026-000003",
        tanggal: "2026-07-08",
        jamMulai: "16:00",
        jamSelesai: "17:30",
        pengajar: "Ust. M. Ridho",
        kelas: "Caberawit B",
        kelompok: "TPQ Al-Hikmah 3",
        ruangan: "Lantai 1 Masjid",
        materi: "Tajwid",
        subMateri: "Idgham Bighunnah",
        targetPembelajaran: "Mengetahui hukum bacaan nun sukun/tanwin bertemu huruf idgham",
        metodePembelajaran: "Ceramah & Syafahi",
        santriHadirCount: 11,
        santriIzinCount: 2,
        santriSakitCount: 0,
        santriAlfaCount: 0,
        studentAttendanceMap: {},
        kegiatanPembelajaran: "Penjelasan teori dengan papan tulis, lalu latihan melafalkan contoh ayat.",
        evaluasi: "Butuh pengulangan pada cara mendengung (ghunnah) 2 harakat.",
        tugas: "Cari 5 contoh Idgham Bighunnah di Juz 30",
        rencanaBerikutnya: "Idgham Bilaghunnah",
        status: "Menunggu Review",
        digitalSignaturePengajar: "SECURE-SIG-UST-M-RIDHO-9B5F2A",
        version: 1,
        history: [{ timestamp: "2026-07-08, 17:35", action: "Jurnal Diajukan", user: "Ust. M. Ridho" }]
      }
    ];
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("sim_tpq_journals", JSON.stringify(journals));
  }, [journals]);

  // 2. Navigation states
  const [viewMode, setViewMode] = useState<"table" | "form" | "detail" | "stats">("table");
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);

  // 3. Filtering & Search States
  const [search, setSearch] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("Semua");
  const [filterClass, setFilterClass] = useState("Semua");
  const [filterKelompok, setFilterKelompok] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterDate, setFilterDate] = useState("");

  // 4. Table selection & pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState("tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isReadOnly = userRole === "Viewer" || userRole === "Pimpinan";

  // Filter journals list
  const filteredJournals = journals.filter(j => {
    if (!j) return false;
    
    // Role based visibility (Pengajar only sees own journals)
    if (userRole === "Pengajar" && j.pengajar !== "Ust. M. Ridho") return false;

    if (search && !(j.materi.toLowerCase().includes(search.toLowerCase()) || j.nomorJurnal.toLowerCase().includes(search.toLowerCase()) || j.pengajar.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterTeacher !== "Semua" && j.pengajar !== filterTeacher) return false;
    if (filterClass !== "Semua" && j.kelas !== filterClass) return false;
    if (filterKelompok !== "Semua" && j.kelompok !== filterKelompok) return false;
    if (filterStatus !== "Semua" && j.status !== filterStatus) return false;
    if (filterDate && j.tanggal !== filterDate) return false;

    return true;
  });

  // Sort journals
  const sortedJournals = [...filteredJournals].sort((a, b) => {
    let aVal = a[sortField] || "";
    let bVal = b[sortField] || "";
    if (typeof aVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  // Paginated journals
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJournals = sortedJournals.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sortedJournals.length / itemsPerPage) || 1;

  // Sorting Handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedJournals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedJournals.map(j => j.id));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} jurnal KBM terpilih?`);
    if (!confirm) return;

    const updated = journals.filter(j => !selectedIds.includes(j.id));
    setJournals(updated);
    setSelectedIds([]);
    toast.success("Berhasil menghapus jurnal terpilih.");
  };

  // CRUD Operations
  const handleSaveJournal = (payload: any) => {
    if (selectedJournal) {
      // Edit
      setJournals(prev => prev.map(j => j.id === payload.id ? payload : j));
      toast.success(`Jurnal KBM ${payload.nomorJurnal} berhasil diperbarui!`);
    } else {
      // Create
      setJournals(prev => [payload, ...prev]);
      toast.success(`Jurnal KBM ${payload.nomorJurnal} berhasil ditambahkan!`);
    }
    setViewMode("table");
    setSelectedJournal(null);
  };

  const handleDeleteRow = (id: string, nomor: string) => {
    if (isReadOnly) {
      toast.error("Akses Ditolak!");
      return;
    }
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus jurnal KBM ${nomor}?`);
    if (!confirm) return;

    setJournals(prev => prev.filter(j => j.id !== id));
    toast.success(`Jurnal KBM ${nomor} berhasil dihapus.`);
  };

  // Approval handler triggered from Detail Panel
  const handleApproveJournal = (recordId: string, comments: string, action: "Disetujui" | "Direvisi" | "Ditolak") => {
    setJournals(prev => prev.map(j => {
      if (j.id === recordId) {
        return {
          ...j,
          status: action,
          komentarKoordinator: comments,
          digitalSignatureKoordinator: action === "Disetujui" ? `APPROVED-SECURE-SIG-KOORDINATOR-${Date.now().toString(16).toUpperCase()}` : undefined,
          history: [...(j.history || []), { timestamp: new Date().toLocaleString(), action: `Status diperbarui menjadi ${action}`, user: "Ust. Koordinator" }]
        };
      }
      return j;
    }));
    toast.success(`Dokumen jurnal berhasil ditandai sebagai ${action}!`);
    setViewMode("table");
  };

  // Export CSV/Excel
  const handleExportCSV = () => {
    const headers = ["Nomor Jurnal", "Tanggal", "Pengajar", "Kelas", "Kelompok", "Materi", "Status"];
    const rows = filteredJournals.map(j => [
      j.nomorJurnal, j.tanggal, j.pengajar, j.kelas, j.kelompok, j.materi, j.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(",")].concat(rows.map(r => r.map(x => `"${x}"`).join(","))).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_jurnal_kbm_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Dokumen Excel/CSV berhasil diunduh.");
  };

  return (
    <div className="space-y-6">
      
      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden border-b border-slate-100 pb-4">
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
          <button 
            onClick={() => setViewMode("table")} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "table" || viewMode === "form" || viewMode === "detail" 
                ? "bg-white text-emerald-800 shadow-sm" 
                : "text-slate-500 hover:bg-slate-200/50"
            }`}
          >
            <ListCollapse className="h-4 w-4" /> Daftar Jurnal
          </button>
          <button 
            onClick={() => setViewMode("stats")} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "stats" 
                ? "bg-white text-emerald-800 shadow-sm" 
                : "text-slate-500 hover:bg-slate-200/50"
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Dashboard Monev
          </button>
        </div>

        {viewMode === "table" && !isReadOnly && (
          <Button 
            onClick={() => { setSelectedJournal(null); setViewMode("form"); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs h-10 px-4 gap-1.5 shadow-sm active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" /> Tambah Jurnal KBM
          </Button>
        )}
      </div>

      {/* VIEW: Form Add/Edit */}
      {viewMode === "form" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 sm:p-8">
          <JurnalForm 
            initialRecord={selectedJournal}
            onSave={handleSaveJournal}
            onClose={() => { setViewMode("table"); setSelectedJournal(null); }}
            userRole={userRole}
          />
        </Card>
      )}

      {/* VIEW: Detail Report */}
      {viewMode === "detail" && selectedJournal && (
        <JurnalDetail 
          record={selectedJournal}
          onClose={() => { setViewMode("table"); setSelectedJournal(null); }}
          onApprove={handleApproveJournal}
          userRole={userRole}
        />
      )}

      {/* VIEW: Stats/Charts */}
      {viewMode === "stats" && (
        <JurnalStats journals={journals} />
      )}

      {/* VIEW: Table list (Default) */}
      {viewMode === "table" && (
        <div className="space-y-4 print:hidden">
          
          {/* Advanced Search & Filtering panel */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div className="text-left space-y-1 sm:col-span-2">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase">Cari Materi / No / Pengajar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200 text-slate-800 text-xs h-10"
                  />
                </div>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase">Pengajar</label>
                <select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3 py-2 text-xs font-bold focus:outline-none h-10"
                >
                  <option value="Semua">Semua Pengajar</option>
                  <option value="Ust. M. Ridho">Ust. M. Ridho</option>
                  <option value="Usth. Laila">Usth. Laila</option>
                  <option value="Ust. Pengajar">Ust. Pengajar</option>
                </select>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase">Kelas KBM</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3 py-2 text-xs font-bold focus:outline-none h-10"
                >
                  <option value="Semua">Semua Kelas</option>
                  <option value="Caberawit B">Caberawit B</option>
                  <option value="Muda-mudi A">Muda-mudi A</option>
                  <option value="Dewasa A">Dewasa A</option>
                </select>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase">Status Approval</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3 py-2 text-xs font-bold focus:outline-none h-10"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Menunggu Review">Menunggu Review</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Direvisi">Direvisi</option>
                  <option value="Ditolak">Ditolak</option>
                </select>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase">Pilih Tanggal</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-800 text-xs h-10 w-full"
                />
              </div>
            </div>
          </Card>

          {/* Bulk Actions & Excel/PDF export buttons */}
          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 text-left">
                Menampilkan <strong className="text-slate-800">{filteredJournals.length}</strong> jurnal KBM
              </span>
              
              {selectedIds.length > 0 && (
                <Button 
                  onClick={handleBulkDelete}
                  variant="ghost"
                  className="h-8 rounded-lg text-[10px] font-extrabold border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Terpilih ({selectedIds.length})
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleExportCSV}
                variant="outline" 
                className="h-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-bold"
              >
                <Download className="h-4 w-4 mr-1 text-emerald-600" /> Ekspor Excel
              </Button>
              <Button 
                onClick={() => window.print()}
                className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak PDF
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-[10px] uppercase bg-slate-50 text-slate-450 border-b border-slate-200 font-extrabold">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={paginatedJournals.length > 0 && selectedIds.length === paginatedJournals.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("nomorJurnal")}>
                      No Jurnal <ArrowUpDown className="h-3 w-3 inline ml-0.5" />
                    </th>
                    <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("tanggal")}>
                      Tanggal <ArrowUpDown className="h-3 w-3 inline ml-0.5" />
                    </th>
                    <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort("pengajar")}>
                      Pengajar <ArrowUpDown className="h-3 w-3 inline ml-0.5" />
                    </th>
                    <th className="px-6 py-4">Kelas / Kelompok</th>
                    <th className="px-6 py-4">Materi Utama</th>
                    <th className="px-6 py-4">Hadir</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
                  {paginatedJournals.length > 0 ? (
                    paginatedJournals.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(j.id)}
                            onChange={() => handleSelectRow(j.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">{j.nomorJurnal}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-450">{j.tanggal}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-900">{j.pengajar}</td>
                        <td className="px-6 py-4 text-xs">
                          <div>{j.kelas}</div>
                          <div className="text-[10px] text-slate-400">{j.kelompok}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-extrabold text-slate-800">{j.materi}</td>
                        <td className="px-6 py-4 text-xs font-extrabold text-emerald-600">{j.santriHadirCount || 0} Santri</td>
                        <td className="px-6 py-4">
                          <Badge className={`font-bold rounded-full text-[9px] px-2 py-0.5 border ${
                            j.status === "Disetujui" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                            j.status === "Menunggu Review" ? "bg-amber-50 text-amber-700 border-amber-250" :
                            j.status === "Draft" ? "bg-slate-50 text-slate-500 border-slate-200" :
                            j.status === "Direvisi" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {j.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1.5">
                            <Button 
                              onClick={() => { setSelectedJournal(j); setViewMode("detail"); }}
                              variant="ghost" 
                              size="icon" 
                              title="Lihat Detail Laporan"
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!isReadOnly && (
                              <>
                                <Button 
                                  onClick={() => { setSelectedJournal(j); setViewMode("form"); }}
                                  variant="ghost" 
                                  size="icon" 
                                  title="Edit Jurnal"
                                  className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  onClick={() => handleDeleteRow(j.id, j.nomorJurnal)}
                                  variant="ghost" 
                                  size="icon" 
                                  title="Hapus Jurnal"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-bold">
                        Tidak ditemukan jurnal KBM untuk filter pencarian ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-450">
                  Halaman {currentPage} dari {totalPages}
                </span>
                
                <div className="flex gap-2">
                  <Button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    variant="outline" 
                    className="h-8 rounded-lg px-2.5 bg-white border-slate-200 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    variant="outline" 
                    className="h-8 rounded-lg px-2.5 bg-white border-slate-200 disabled:opacity-50 text-slate-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </div>
      )}

    </div>
  );
}
