import React, { useState, useMemo } from "react";
import { getAgendaBulanan, saveAgendaBulanan, AgendaBulananPPG, getKelompok } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, Filter, Plus, 
  Search, Target, TrendingUp, FileText, Edit2, Trash2, Download,
  BarChart3, Layers, Building2, UserCheck, ChevronRight, CheckSquare, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";

interface MonevAgendaBulananPanelProps {
  userRole: string;
}

const KATEGORI_COLORS: Record<string, string> = {
  "Kurikulum": "#10b981",
  "Pembinaan Mubaligh": "#6366f1",
  "Musyawarah 5 Unsur": "#f59e0b",
  "Evaluasi": "#ec4899",
  "KBM Caberawit": "#06b6d4",
  "Muda-Mudi": "#8b5cf6",
  "Lainnya": "#64748b"
};

export function MonevAgendaBulananPanel({ userRole }: MonevAgendaBulananPanelProps) {
  const [agendaList, setAgendaList] = useState<AgendaBulananPPG[]>(() => getAgendaBulanan());
  const kelompoks = useMemo(() => getKelompok(), []);
  const isReadOnly = userRole === "Viewer";

  // Filter States
  const [selectedBulan, setSelectedBulan] = useState<string>("2026-10");
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");
  const [selectedStatus, setSelectedStatus] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog Form State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formJudul, setFormJudul] = useState("");
  const [formBulan, setFormBulan] = useState("2026-10");
  const [formKategori, setFormKategori] = useState<AgendaBulananPPG["kategori"]>("Kurikulum");
  const [formTingkat, setFormTingkat] = useState<AgendaBulananPPG["tingkat"]>("Daerah");
  const [formDesa, setFormDesa] = useState("Semua");
  const [formTanggalMulai, setFormTanggalMulai] = useState("");
  const [formTanggalSelesai, setFormTanggalSelesai] = useState("");
  const [formPJ, setFormPJ] = useState("");
  const [formTargetKet, setFormTargetKet] = useState("");
  const [formTargetPersen, setFormTargetPersen] = useState<number>(100);
  const [formRealisasiPersen, setFormRealisasiPersen] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<AgendaBulananPPG["status"]>("Sedang Berjalan");
  const [formCatatan, setFormCatatan] = useState("");
  const [formKendala, setFormKendala] = useState("");
  const [formTindakLanjut, setFormTindakLanjut] = useState("");

  // Filtered List
  const filteredAgenda = useMemo(() => {
    return agendaList.filter(item => {
      if (selectedBulan && selectedBulan !== "Semua" && item.bulan !== selectedBulan) return false;
      if (selectedKategori !== "Semua" && item.kategori !== selectedKategori) return false;
      if (selectedStatus !== "Semua" && item.status !== selectedStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.judulAgenda.toLowerCase().includes(query);
        const matchPJ = item.penanggungJawab.toLowerCase().includes(query);
        const matchKet = (item.catatanEvaluasi || "").toLowerCase().includes(query);
        if (!matchTitle && !matchPJ && !matchKet) return false;
      }
      return true;
    });
  }, [agendaList, selectedBulan, selectedKategori, selectedStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAgenda.length;
    const selesai = filteredAgenda.filter(a => a.status === "Selesai").length;
    const berjalan = filteredAgenda.filter(a => a.status === "Sedang Berjalan").length;
    const belum = filteredAgenda.filter(a => a.status === "Belum Dimulai").length;
    const perhatian = filteredAgenda.filter(a => a.status === "Perlu Perhatian" || a.status === "Ditunda").length;
    
    const avgRealisasi = total > 0 
      ? Math.round(filteredAgenda.reduce((acc, curr) => acc + curr.realisasiPersen, 0) / total)
      : 0;

    return { total, selesai, berjalan, belum, perhatian, avgRealisasi };
  }, [filteredAgenda]);

  // Chart Data
  const chartKategoriData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAgenda.forEach(item => {
      map[item.kategori] = (map[item.kategori] || 0) + 1;
    });
    return Object.keys(map).map(k => ({ name: k, count: map[k] }));
  }, [filteredAgenda]);

  const chartProgressData = useMemo(() => {
    return filteredAgenda.slice(0, 6).map(item => ({
      name: item.judulAgenda.length > 20 ? item.judulAgenda.substring(0, 20) + "..." : item.judulAgenda,
      Target: item.targetPersen,
      Realisasi: item.realisasiPersen
    }));
  }, [filteredAgenda]);

  // Reset & Open Create Form
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormJudul("");
    setFormBulan(selectedBulan === "Semua" ? "2026-10" : selectedBulan);
    setFormKategori("Kurikulum");
    setFormTingkat("Daerah");
    setFormDesa("Semua");
    setFormTanggalMulai(new Date().toISOString().split("T")[0]);
    setFormTanggalSelesai(new Date().toISOString().split("T")[0]);
    setFormPJ("");
    setFormTargetKet("");
    setFormTargetPersen(100);
    setFormRealisasiPersen(0);
    setFormStatus("Sedang Berjalan");
    setFormCatatan("");
    setFormKendala("");
    setFormTindakLanjut("");
    setDialogOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (item: AgendaBulananPPG) => {
    setEditingId(item.id);
    setFormJudul(item.judulAgenda);
    setFormBulan(item.bulan);
    setFormKategori(item.kategori);
    setFormTingkat(item.tingkat);
    setFormDesa(item.desa || "Semua");
    setFormTanggalMulai(item.tanggalMulai);
    setFormTanggalSelesai(item.tanggalSelesai);
    setFormPJ(item.penanggungJawab);
    setFormTargetKet(item.targetKetercapaian);
    setFormTargetPersen(item.targetPersen);
    setFormRealisasiPersen(item.realisasiPersen);
    setFormStatus(item.status);
    setFormCatatan(item.catatanEvaluasi || "");
    setFormKendala(item.kendala || "");
    setFormTindakLanjut(item.tindakLanjut || "");
    setDialogOpen(true);
  };

  // Save or Update
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul || !formPJ || !formTargetKet) {
      toast.error("Harap isi Judul Agenda, Penanggung Jawab, dan Deskripsi Target!");
      return;
    }

    const now = new Date().toISOString();
    let updatedList: AgendaBulananPPG[];

    if (editingId) {
      updatedList = agendaList.map(a => {
        if (a.id === editingId) {
          return {
            ...a,
            judulAgenda: formJudul,
            bulan: formBulan,
            kategori: formKategori,
            tingkat: formTingkat,
            desa: formDesa,
            tanggalMulai: formTanggalMulai,
            tanggalSelesai: formTanggalSelesai,
            penanggungJawab: formPJ,
            targetKetercapaian: formTargetKet,
            targetPersen: Number(formTargetPersen),
            realisasiPersen: Number(formRealisasiPersen),
            status: formStatus,
            catatanEvaluasi: formCatatan,
            kendala: formKendala,
            tindakLanjut: formTindakLanjut,
            updatedAt: now,
          };
        }
        return a;
      });
      toast.success("Agenda bulanan PPG berhasil diperbarui!");
    } else {
      const newItem: AgendaBulananPPG = {
        id: "ag-" + Date.now(),
        judulAgenda: formJudul,
        bulan: formBulan,
        kategori: formKategori,
        tingkat: formTingkat,
        desa: formDesa,
        tanggalMulai: formTanggalMulai,
        tanggalSelesai: formTanggalSelesai,
        penanggungJawab: formPJ,
        targetKetercapaian: formTargetKet,
        targetPersen: Number(formTargetPersen),
        realisasiPersen: Number(formRealisasiPersen),
        status: formStatus,
        catatanEvaluasi: formCatatan,
        kendala: formKendala,
        tindakLanjut: formTindakLanjut,
        createdAt: now,
        updatedAt: now,
      };
      updatedList = [newItem, ...agendaList];
      toast.success("Agenda bulanan PPG baru berhasil ditambahkan!");
    }

    setAgendaList(updatedList);
    saveAgendaBulanan(updatedList);
    setDialogOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (id: string, judul: string) => {
    if (confirm(`Hapus agenda "${judul}"?`)) {
      const updated = agendaList.filter(a => a.id !== id);
      setAgendaList(updated);
      saveAgendaBulanan(updated);
      toast.success("Agenda berhasil dihapus.");
    }
  };

  // Quick Export to CSV
  const handleExportCSV = () => {
    if (filteredAgenda.length === 0) {
      toast.error("Tidak ada data untuk diekspor!");
      return;
    }
    const headers = ["ID", "Bulan", "Judul Agenda", "Kategori", "Tingkat", "Penanggung Jawab", "Target Deskripsi", "Target (%)", "Realisasi (%)", "Status", "Catatan Evaluasi"];
    const rows = filteredAgenda.map(a => [
      a.id,
      a.bulan,
      `"${a.judulAgenda.replace(/"/g, '""')}"`,
      a.kategori,
      a.tingkat,
      `"${a.penanggungJawab.replace(/"/g, '""')}"`,
      `"${a.targetKetercapaian.replace(/"/g, '""')}"`,
      a.targetPersen,
      a.realisasiPersen,
      a.status,
      `"${(a.catatanEvaluasi || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monev_Agenda_Bulanan_PPG_${selectedBulan}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan Agenda Bulanan PPG berhasil diunduh (CSV).");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Modul 1 PPG Magetan Timur
            </span>
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            Monev Agenda Bulanan PPG
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Pusat pemantauan target program kerja bulanan PPG di tingkat Daerah, Desa, dan TPQ Kelompok. Memastikan seluruh kurikulum, pembinaan, dan musyawarah terealisasi tepat waktu.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border-white/20 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Ekspor CSV
          </Button>

          {!isReadOnly && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAdd}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Agenda
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="rounded-2xl border-slate-100 shadow-sm p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Agenda</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[10px] text-slate-500 font-medium">Bulan {selectedBulan}</span>
        </Card>

        <Card className="rounded-2xl border-emerald-100 shadow-sm p-4 bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.selesai}</div>
          <span className="text-[10px] text-emerald-600 font-bold">
            {stats.total > 0 ? `${Math.round((stats.selesai / stats.total) * 100)}% dari target` : "0%"}
          </span>
        </Card>

        <Card className="rounded-2xl border-indigo-100 shadow-sm p-4 bg-indigo-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Berjalan</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{stats.berjalan}</div>
          <span className="text-[10px] text-indigo-600 font-medium">Sedang proses</span>
        </Card>

        <Card className="rounded-2xl border-amber-100 shadow-sm p-4 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Perhatian / Tunda</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.perhatian}</div>
          <span className="text-[10px] text-amber-600 font-medium">Perlu tindak lanjut</span>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm p-4 bg-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rata-rata Capaian</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.avgRealisasi}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${stats.avgRealisasi}%` }} />
          </div>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Progress Comparison Bar Chart */}
        <Card className="lg:col-span-8 rounded-3xl border-slate-100 shadow-sm p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">Ketercapaian Target vs Realisasi Agenda</h4>
              <p className="text-[11px] text-slate-400">Perbandingan persentase realisasi program kerja bulanan</p>
            </div>
            <Badge variant="outline" className="text-slate-500 text-[10px]">Persentase (%)</Badge>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                <ChartTooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                />
                <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Breakdown */}
        <Card className="lg:col-span-4 rounded-3xl border-slate-100 shadow-sm p-5 bg-white flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-800">Distribusi Kategori Agenda</h4>
            <p className="text-[11px] text-slate-400 mb-4">Fokus bidang kegiatan yang dimonitor</p>
            <div className="space-y-2.5">
              {chartKategoriData.map((item, idx) => {
                const color = KATEGORI_COLORS[item.name] || "#64748b";
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-500 font-semibold">{item.count} agenda ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Standar Evaluasi PPG:</span>
            <strong className="text-emerald-600 font-bold">Target Minimal 80%</strong>
          </div>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card className="rounded-3xl border-slate-100 shadow-sm p-4 bg-white">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Bulan Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl h-10 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="2026-10">Oktober 2026</option>
                <option value="2026-11">November 2026</option>
                <option value="2026-12">Desember 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="Semua">Semua Bulan</option>
              </select>
            </div>

            {/* Kategori Filter */}
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl h-10 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Kurikulum">Kurikulum</option>
              <option value="Pembinaan Mubaligh">Pembinaan Mubaligh</option>
              <option value="Musyawarah 5 Unsur">Musyawarah 5 Unsur</option>
              <option value="Evaluasi">Evaluasi</option>
              <option value="KBM Caberawit">KBM Caberawit</option>
              <option value="Muda-Mudi">Muda-Mudi</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl h-10 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Sedang Berjalan">Sedang Berjalan</option>
              <option value="Selesai">Selesai</option>
              <option value="Belum Dimulai">Belum Dimulai</option>
              <option value="Perlu Perhatian">Perlu Perhatian</option>
              <option value="Ditunda">Ditunda</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari agenda / penanggung jawab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none h-10"
            />
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Daftar Agenda & Target Bulanan</h3>
            <p className="text-xs text-slate-400">
              Menampilkan {filteredAgenda.length} dari total {agendaList.length} agenda kegiatan
            </p>
          </div>
        </div>

        {filteredAgenda.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Agenda & Bidang</th>
                  <th className="px-5 py-3.5">Tingkat & Sasaran</th>
                  <th className="px-5 py-3.5">Target Ketercapaian</th>
                  <th className="px-5 py-3.5">Progres Realisasi</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgenda.map((agenda) => {
                  const statusColors: Record<string, string> = {
                    "Selesai": "bg-emerald-100 text-emerald-800 border-emerald-200",
                    "Sedang Berjalan": "bg-indigo-100 text-indigo-800 border-indigo-200",
                    "Belum Dimulai": "bg-slate-100 text-slate-700 border-slate-200",
                    "Perlu Perhatian": "bg-amber-100 text-amber-800 border-amber-200",
                    "Ditunda": "bg-rose-100 text-rose-800 border-rose-200",
                  };

                  return (
                    <tr key={agenda.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Title & Info */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 text-xs block leading-snug">
                            {agenda.judulAgenda}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className="text-[9px] font-bold"
                              style={{ borderColor: KATEGORI_COLORS[agenda.kategori] || "#94a3b8", color: KATEGORI_COLORS[agenda.kategori] || "#64748b" }}
                            >
                              {agenda.kategori}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {agenda.tanggalMulai} s/d {agenda.tanggalSelesai}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-bold">
                            Tingkat {agenda.tingkat}
                          </Badge>
                          <span className="text-[10px] text-slate-500 block font-medium">
                            PJ: {agenda.penanggungJawab}
                          </span>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-slate-700 text-xs font-semibold leading-relaxed">
                          {agenda.targetKetercapaian}
                        </p>
                        {agenda.catatanEvaluasi && (
                          <p className="text-[10px] text-emerald-700 bg-emerald-50/70 p-1.5 rounded-lg mt-1.5 border border-emerald-100">
                            <strong>Evaluasi:</strong> {agenda.catatanEvaluasi}
                          </p>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td className="px-5 py-4 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-black text-slate-800">{agenda.realisasiPersen}%</span>
                            <span className="text-slate-400">Target {agenda.targetPersen}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                agenda.realisasiPersen >= agenda.targetPersen 
                                  ? "bg-emerald-500" 
                                  : agenda.realisasiPersen >= 50 
                                  ? "bg-indigo-500" 
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(100, agenda.realisasiPersen)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Badge className={`${statusColors[agenda.status] || "bg-slate-100 text-slate-800"} text-[10px] font-extrabold`}>
                          {agenda.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap space-x-1">
                        {!isReadOnly && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(agenda)}
                              className="h-8 text-[11px] px-2.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteItem(agenda.id, agenda.judulAgenda)}
                              className="h-8 text-[11px] px-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300" />
            <h5 className="font-bold text-slate-700 text-sm">Tidak ada agenda bulanan yang cocok</h5>
            <p className="text-xs text-slate-400">Ubah filter bulan, kategori, atau tambahkan agenda baru.</p>
          </div>
        )}
      </Card>

      {/* Modal Dialog Form Tambah / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              {editingId ? "Edit Agenda Bulanan PPG" : "Tambah Agenda Bulanan PPG"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Formulir pencatatan target kerja & monitoring program pembinaan bulanan PPG.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Judul Agenda / Program Kerja</label>
              <input
                type="text"
                required
                placeholder="Contoh: Monev Ketercapaian Kurikulum Tahfidz Kelas 3"
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Periode Bulan</label>
                <input
                  type="month"
                  required
                  value={formBulan}
                  onChange={(e) => setFormBulan(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                >
                  <option value="Kurikulum">Kurikulum</option>
                  <option value="Pembinaan Mubaligh">Pembinaan Mubaligh</option>
                  <option value="Musyawarah 5 Unsur">Musyawarah 5 Unsur</option>
                  <option value="Evaluasi">Evaluasi</option>
                  <option value="KBM Caberawit">KBM Caberawit</option>
                  <option value="Muda-Mudi">Muda-Mudi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tingkat Sasaran</label>
                <select
                  value={formTingkat}
                  onChange={(e) => setFormTingkat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                >
                  <option value="Daerah">Tingkat Daerah</option>
                  <option value="Desa">Tingkat Desa</option>
                  <option value="Kelompok">Tingkat TPQ Kelompok</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={formTanggalMulai}
                  onChange={(e) => setFormTanggalMulai(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={formTanggalSelesai}
                  onChange={(e) => setFormTanggalSelesai(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Penanggung Jawab / Biro</label>
              <input
                type="text"
                required
                placeholder="Contoh: Biro Kurikulum PPG / Ust. Ahmad"
                value={formPJ}
                onChange={(e) => setFormPJ(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Ketercapaian (Deskriptif)</label>
              <textarea
                rows={2}
                required
                placeholder="Deskripsikan target yang ingin dicapai..."
                value={formTargetKet}
                onChange={(e) => setFormTargetKet(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formTargetPersen}
                  onChange={(e) => setFormTargetPersen(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Realisasi (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formRealisasiPersen}
                  onChange={(e) => setFormRealisasiPersen(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold cursor-pointer"
                >
                  <option value="Sedang Berjalan">Sedang Berjalan</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Belum Dimulai">Belum Dimulai</option>
                  <option value="Perlu Perhatian">Perlu Perhatian</option>
                  <option value="Ditunda">Ditunda</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Evaluasi / Ketercapaian</label>
              <textarea
                rows={2}
                placeholder="Catatan hasil monitoring dan evaluasi..."
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kendala yang Ditemui</label>
                <input
                  type="text"
                  placeholder="Kendala di lapangan..."
                  value={formKendala}
                  onChange={(e) => setFormKendala(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rencana Tindak Lanjut</label>
                <input
                  type="text"
                  placeholder="Solusi atau langkah lanjutan..."
                  value={formTindakLanjut}
                  onChange={(e) => setFormTindakLanjut(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                {editingId ? "Simpan Perubahan" : "Simpan Agenda"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
