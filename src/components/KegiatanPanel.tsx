import React, { useState } from "react";
import { getKegiatan, saveKegiatan, Kegiatan } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, Target } from "lucide-react";
import { toast } from "sonner";

export function KegiatanPanel() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>(getKegiatan());
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formTanggal, setFormTanggal] = useState("");
  const [formWaktu, setFormWaktu] = useState("");
  const [formLokasi, setFormLokasi] = useState("");
  const [formSasaran, setFormSasaran] = useState<string[]>([]);
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formStatus, setFormStatus] = useState<any>("Terjadwal");

  const sasaranOptions = ["Caberawit", "Pra-Remaja", "Remaja", "Muda-Mudi", "Guru", "Orang Tua"];

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentId("");
    setFormNama("");
    setFormTanggal("");
    setFormWaktu("");
    setFormLokasi("");
    setFormSasaran([]);
    setFormDeskripsi("");
    setFormStatus("Terjadwal");
    setIsOpen(true);
  };

  const handleOpenEdit = (k: Kegiatan) => {
    setIsEdit(true);
    setCurrentId(k.id);
    setFormNama(k.nama);
    setFormTanggal(k.tanggal);
    setFormWaktu(k.waktu);
    setFormLokasi(k.lokasi);
    setFormSasaran(k.kategoriSasaran);
    setFormDeskripsi(k.deskripsi);
    setFormStatus(k.status);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    const confirm = window.confirm("Apakah Anda yakin ingin menghapus agenda kegiatan ini?");
    if (confirm) {
      const updated = kegiatan.filter(k => k.id !== id);
      setKegiatan(updated);
      saveKegiatan(updated);
      toast.success("Kegiatan berhasil dihapus!");
    }
  };

  const toggleSasaran = (option: string) => {
    if (formSasaran.includes(option)) {
      setFormSasaran(formSasaran.filter(s => s !== option));
    } else {
      setFormSasaran([...formSasaran, option]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formTanggal || !formLokasi || formSasaran.length === 0) {
      toast.error("Harap isi semua kolom utama dan minimal 1 sasaran!");
      return;
    }

    if (isEdit) {
      const updated = kegiatan.map(k => {
        if (k.id === currentId) {
          return {
            ...k,
            nama: formNama,
            tanggal: formTanggal,
            waktu: formWaktu,
            lokasi: formLokasi,
            kategoriSasaran: formSasaran,
            deskripsi: formDeskripsi,
            status: formStatus
          };
        }
        return k;
      });
      setKegiatan(updated);
      saveKegiatan(updated);
      toast.success("Agenda kegiatan berhasil diperbarui!");
    } else {
      const newKegiatan: Kegiatan = {
        id: "k-" + Date.now(),
        nama: formNama,
        tanggal: formTanggal,
        waktu: formWaktu,
        lokasi: formLokasi,
        kategoriSasaran: formSasaran,
        deskripsi: formDeskripsi,
        status: formStatus
      };
      const updated = [...kegiatan, newKegiatan];
      setKegiatan(updated);
      saveKegiatan(updated);
      toast.success("Kegiatan baru berhasil ditambahkan!");
    }
    setIsOpen(false);
  };

  const filteredKegiatan = kegiatan.filter(k => {
    const matchesSearch = k.nama.toLowerCase().includes(search.toLowerCase()) || 
                          k.lokasi.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "Semua" || k.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Manajemen Agenda Kegiatan</h2>
          <p className="text-slate-500 text-sm">Jadwalkan kegiatan kajian, camping, asrama, lomba, dan monitoring pembinaan.</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold gap-2 py-3">
          <Plus className="h-4.5 w-4.5" /> Tambah Agenda
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama agenda atau tempat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-3"
            />
          </div>
          <div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 w-full sm:w-[180px]"
            >
              <option value="Semua">Semua Status</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Kegiatan List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredKegiatan.length > 0 ? (
          filteredKegiatan.map((k) => (
            <Card key={k.id} className="bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge className={`font-semibold rounded-full ${
                    k.status === "Berjalan" ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" :
                    k.status === "Selesai" ? "bg-slate-100 text-slate-600 border-slate-200" :
                    "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}>
                    {k.status}
                  </Badge>
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {k.tanggal}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-slate-900 leading-snug">{k.nama}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{k.deskripsi}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {k.kategoriSasaran.map((sasaran, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {sasaran}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="max-w-[150px] truncate">{k.lokasi}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleOpenEdit(k)} variant="outline" size="sm" className="gap-1 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-xl font-semibold">
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                  <Button onClick={() => handleDelete(k.id)} variant="ghost" size="sm" className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs rounded-xl font-semibold">
                    <Trash2 className="h-3 w-3" /> Hapus
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Tidak ada agenda kegiatan ditemukan
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-slate-900">
              {isEdit ? "Ubah Agenda Kegiatan" : "Tambah Agenda Baru"}
            </DialogTitle>
            <DialogDescription>
              Detail jadwal kegiatan pembinaan untuk kalender operasional pengurus.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Kegiatan</label>
              <Input
                required
                placeholder="Masukkan nama kegiatan..."
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tanggal Pelaksanaan</label>
                <Input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Waktu (Jam)</label>
                <Input
                  required
                  placeholder="Contoh: 08:00 - Selesai"
                  value={formWaktu}
                  onChange={(e) => setFormWaktu(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Lokasi / Tempat</label>
              <Input
                required
                placeholder="Contoh: Masjid Al-Ubudiyah Takeran"
                value={formLokasi}
                onChange={(e) => setFormLokasi(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Sasaran Peserta (Dapat memilih lebih dari satu)</label>
              <div className="flex flex-wrap gap-2">
                {sasaranOptions.map((option) => {
                  const isChecked = formSasaran.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleSasaran(option)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                        isChecked
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                <option value="Terjadwal">Terjadwal</option>
                <option value="Berjalan">Berjalan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Deskripsi Ringkas</label>
              <textarea
                placeholder="Tulis ringkasan atau detail penting kegiatan di sini..."
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none h-24"
              />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold mt-4">
              {isEdit ? "Simpan Perubahan" : "Terbitkan Agenda"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
