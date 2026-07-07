import React, { useState } from "react";
import { 
  getMubalighSetempat, saveMubalighSetempat,
  getMubalighTugasan, saveMubalighTugasan,
  getPengurus, savePengurus,
  getKelompok, MubalighSetempat, MubalighTugasan, Pengurus, Kelompok, getUserDetails 
} from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Shield, UserCheck, Users, Compass } from "lucide-react";
import { toast } from "sonner";

interface GuruPanelProps {
  userRole: string;
}

export function GuruPanel({ userRole }: GuruPanelProps) {
  const [subTab, setSubTab] = useState<"setempat" | "tugasan" | "pengurus_harian" | "pengurus_ppg">("setempat");
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
  
  // Data lists
  const [mSetempat, setMSetempat] = useState<MubalighSetempat[]>(getMubalighSetempat());
  const [mTugasan, setMTugasan] = useState<MubalighTugasan[]>(getMubalighTugasan());
  const [pengurus, setPengurus] = useState<Pengurus[]>(getPengurus());

  // Filters & Search
  const [search, setSearch] = useState("");

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState("");
  
  // Dynamic Form inputs based on active tab
  const [formNama, setFormNama] = useState("");
  const [formKelompok, setFormKelompok] = useState(allowedKelompoks[0] || "");
  const [formGender, setFormGender] = useState<"Laki-laki" | "Perempuan">("Laki-laki");
  const [formUsia, setFormUsia] = useState(25);
  const [formOrangTua, setFormOrangTua] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formStatus, setFormStatus] = useState<any>("Aktif");
  // Mubaligh Tugasan specifics
  const [formAsalDaerah, setFormAsalDaerah] = useState("");
  const [formMasaTugasan, setFormMasaTugasan] = useState("");
  // Pengurus specifics
  const [formDapukan, setFormDapukan] = useState("");
  const [formTingkat, setFormTingkat] = useState<"Daerah" | "Desa" | "Kelompok">("Kelompok");

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setIsEdit(false);
    setCurrentId("");
    setFormNama("");
    setFormKelompok(allowedKelompoks[0] || "");
    setFormGender("Laki-laki");
    setFormUsia(25);
    setFormOrangTua("");
    setFormWa("");
    setFormStatus("Aktif");
    setFormAsalDaerah("");
    setFormMasaTugasan("");
    setFormDapukan("");
    setFormTingkat("Kelompok");
    setIsOpen(true);
  };

  const handleOpenEdit = (data: any) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setIsEdit(true);
    setCurrentId(data.id);
    setFormNama(data.nama);
    setFormKelompok(data.kelompok || data.asalKelompok || "");
    setFormGender(data.jenisKelamin || "Laki-laki");
    setFormUsia(data.usia || 25);
    setFormOrangTua(data.namaOrangTua || "");
    setFormWa(data.whatsapp || "");
    setFormStatus(data.status || "Aktif");
    setFormAsalDaerah(data.asalDaerah || "");
    setFormMasaTugasan(data.masaTugasan || "");
    setFormDapukan(data.dapukan || "");
    setFormTingkat(data.tingkat || "Kelompok");
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const confirm = window.confirm("Apakah Anda yakin ingin menghapus data ini?");
    if (confirm) {
      if (subTab === "setempat") {
        const updated = mSetempat.filter(x => x.id !== id);
        setMSetempat(updated);
        saveMubalighSetempat(updated);
      } else if (subTab === "tugasan") {
        const updated = mTugasan.filter(x => x.id !== id);
        setMTugasan(updated);
        saveMubalighTugasan(updated);
      } else {
        const updated = pengurus.filter(x => x.id !== id);
        setPengurus(updated);
        savePengurus(updated);
      }
      toast.success("Data berhasil dihapus!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama || !formWa) {
      toast.error("Harap isi nama dan nomor WhatsApp!");
      return;
    }

    if (subTab === "setempat") {
      if (isEdit) {
        const updated = mSetempat.map(x => x.id === currentId ? { ...x, nama: formNama, kelompok: formKelompok, jenisKelamin: formGender, usia: Number(formUsia), namaOrangTua: formOrangTua, whatsapp: formWa, status: formStatus } : x);
        setMSetempat(updated);
        saveMubalighSetempat(updated);
        toast.success("Mubaligh Setempat berhasil diperbarui!");
      } else {
        const newItem: MubalighSetempat = { id: "ms-" + Date.now(), foto: "", nama: formNama, kelompok: formKelompok, jenisKelamin: formGender, usia: Number(formUsia), namaOrangTua: formOrangTua, whatsapp: formWa, status: formStatus };
        const updated = [...mSetempat, newItem];
        setMSetempat(updated);
        saveMubalighSetempat(updated);
        toast.success("Mubaligh Setempat berhasil ditambahkan!");
      }
    } else if (subTab === "tugasan") {
      if (isEdit) {
        const updated = mTugasan.map(x => x.id === currentId ? { ...x, nama: formNama, kelompok: formKelompok, jenisKelamin: formGender, usia: Number(formUsia), namaOrangTua: formOrangTua, asalDaerah: formAsalDaerah, whatsapp: formWa, masaTugasan: formMasaTugasan, status: formStatus } : x);
        setMTugasan(updated);
        saveMubalighTugasan(updated);
        toast.success("Mubaligh Tugasan berhasil diperbarui!");
      } else {
        const newItem: MubalighTugasan = { id: "mt-" + Date.now(), foto: "", nama: formNama, kelompok: formKelompok, jenisKelamin: formGender, usia: Number(formUsia), namaOrangTua: formOrangTua, asalDaerah: formAsalDaerah, whatsapp: formWa, masaTugasan: formMasaTugasan, status: formStatus };
        const updated = [...mTugasan, newItem];
        setMTugasan(updated);
        saveMubalighTugasan(updated);
        toast.success("Mubaligh Tugasan berhasil ditambahkan!");
      }
    } else {
      const cat = subTab === "pengurus_harian" ? "Harian" : "PPG";
      if (isEdit) {
        const updated = pengurus.map(x => x.id === currentId ? { ...x, nama: formNama, asalKelompok: formKelompok, dapukan: formDapukan, whatsapp: formWa, tingkat: formTingkat } : x);
        setPengurus(updated);
        savePengurus(updated);
        toast.success("Data Pengurus berhasil diperbarui!");
      } else {
        const newItem: Pengurus = { id: "p-" + Date.now(), nama: formNama, asalKelompok: formKelompok, dapukan: formDapukan, whatsapp: formWa, foto: "", tingkat: formTingkat, kategori: cat };
        const updated = [...pengurus, newItem];
        setPengurus(updated);
        savePengurus(updated);
        toast.success("Pengurus baru berhasil ditambahkan!");
      }
    }
    setIsOpen(false);
  };

  const getFilteredData = () => {
    const query = search.toLowerCase();
    if (subTab === "setempat") {
      return mSetempat.filter(x => 
        allowedKelompoks.includes(x.kelompok) && 
        (x.nama.toLowerCase().includes(query) || x.kelompok.toLowerCase().includes(query))
      );
    } else if (subTab === "tugasan") {
      return mTugasan.filter(x => 
        allowedKelompoks.includes(x.kelompok) && 
        (x.nama.toLowerCase().includes(query) || x.kelompok.toLowerCase().includes(query) || x.asalDaerah.toLowerCase().includes(query))
      );
    } else if (subTab === "pengurus_harian") {
      return pengurus.filter(x => 
        x.kategori === "Harian" && 
        (x.tingkat === "Daerah" || 
         (x.tingkat === "Desa" && (userRole === "Super Admin" || userRole === "Admin Daerah" || allowedKelompoks.includes(x.asalKelompok))) ||
         (x.tingkat === "Kelompok" && allowedKelompoks.includes(x.asalKelompok))) &&
        (x.nama.toLowerCase().includes(query) || x.dapukan.toLowerCase().includes(query))
      );
    } else {
      return pengurus.filter(x => 
        x.kategori === "PPG" && 
        (x.tingkat === "Daerah" || 
         (x.tingkat === "Desa" && (userRole === "Super Admin" || userRole === "Admin Daerah" || allowedKelompoks.includes(x.asalKelompok))) ||
         (x.tingkat === "Kelompok" && allowedKelompoks.includes(x.asalKelompok))) &&
        (x.nama.toLowerCase().includes(query) || x.dapukan.toLowerCase().includes(query))
      );
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Manajemen Pengajar & Pengurus</h2>
          <p className="text-slate-500 text-sm">Kelola data dewan guru, mubaligh tugasan luar kota, pengurus harian serta struktural PPG.</p>
        </div>
        {!isReadOnly && (
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-3 text-xs">
            <Plus className="h-4.5 w-4.5" /> Tambah Anggota
          </Button>
        )}
      </div>

      {/* Roster tab navigation */}
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit">
        <button onClick={() => { setSubTab("setempat"); setSearch(""); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === "setempat" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Mubaligh Setempat
        </button>
        <button onClick={() => { setSubTab("tugasan"); setSearch(""); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === "tugasan" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Mubaligh Tugasan
        </button>
        <button onClick={() => { setSubTab("pengurus_harian"); setSearch(""); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === "pengurus_harian" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Pengurus Harian
        </button>
        <button onClick={() => { setSubTab("pengurus_ppg"); setSearch(""); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === "pengurus_ppg" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Pengurus PPG
        </button>
      </div>

      {/* Search Filter bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan nama, penugasan kelompok, asal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Renders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getFilteredData().length > 0 ? (
          getFilteredData().map((item: any) => (
            <Card key={item.id} className="bg-white border border-slate-200 hover:border-slate-350 shadow-sm rounded-3xl overflow-hidden flex flex-col justify-between group transition-all">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-slate-900">{item.nama}</h3>
                    {item.role && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-full font-bold text-[10px] mt-1">{item.role}</Badge>}
                    {item.dapukan && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-full font-bold text-[10px] mt-1">{item.dapukan}</Badge>}
                  </div>
                  <Badge className={`font-semibold rounded-full text-[10px] ${
                    item.status === "Aktif" || !item.status ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {item.status || "Aktif"}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 pt-3 text-slate-600">
                  {subTab === "setempat" && (
                    <>
                      <div className="flex justify-between"><span>Tugas Kelompok:</span><span className="font-bold text-slate-800">{item.kelompok}</span></div>
                      <div className="flex justify-between"><span>Nama Orang Tua:</span><span className="font-semibold text-slate-700">{item.namaOrangTua}</span></div>
                    </>
                  )}
                  {subTab === "tugasan" && (
                    <>
                      <div className="flex justify-between"><span>Asal Daerah:</span><span className="font-bold text-emerald-600">{item.asalDaerah}</span></div>
                      <div className="flex justify-between"><span>Masa Tugasan:</span><span className="font-semibold text-slate-700">{item.masaTugasan}</span></div>
                      <div className="flex justify-between"><span>Tugas Kelompok:</span><span className="font-bold text-slate-800">{item.kelompok}</span></div>
                    </>
                  )}
                  {(subTab === "pengurus_harian" || subTab === "pengurus_ppg") && (
                    <>
                      <div className="flex justify-between"><span>Tingkat Jabatan:</span><Badge variant="outline" className="text-[10px] font-bold px-2 rounded-full">{item.tingkat}</Badge></div>
                      <div className="flex justify-between"><span>Asal Kelompok:</span><span className="font-bold text-slate-800">{item.asalKelompok}</span></div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-slate-50 pt-2 text-xs">
                    <span>No. WhatsApp:</span>
                    <span className="font-bold text-indigo-600">{item.whatsapp || item.whatsappOrangTua}</span>
                  </div>
                </div>
              </div>

              {!isReadOnly && (
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
                  <Button onClick={() => handleOpenEdit(item)} variant="outline" size="sm" className="gap-1.5 border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-xl font-semibold px-3 py-1">
                    <Edit2 className="h-3 w-3" /> Edit
                  </Button>
                  <Button onClick={() => handleDelete(item.id)} variant="ghost" size="sm" className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs rounded-xl font-semibold px-3 py-1">
                    <Trash2 className="h-3 w-3" /> Hapus
                  </Button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
            Tidak ada data pengajar/pengurus ditemukan
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-slate-900">
              {isEdit ? "Modifikasi Keanggotaan" : "Tambah Anggota Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi data detail personil pembina sesuai bidang penugasannya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nama Lengkap & Gelar *</label>
              <Input
                required
                placeholder="Nama Lengkap..."
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tugas Kelompok / Asal Kelompok *</label>
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

            {/* Mubaligh Setempat & Tugasan specifics */}
            {(subTab === "setempat" || subTab === "tugasan") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nama Orang Tua</label>
                <Input
                  placeholder="Nama Orang Tua..."
                  value={formOrangTua}
                  onChange={(e) => setFormOrangTua(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>
            )}

            {/* Tugasan Specifics */}
            {subTab === "tugasan" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Asal Daerah *</label>
                  <Input
                    required={subTab === "tugasan"}
                    placeholder="Contoh: Kediri, Madiun"
                    value={formAsalDaerah}
                    onChange={(e) => setFormAsalDaerah(e.target.value)}
                    className="rounded-xl border-slate-200 text-slate-900 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Masa Tugasan *</label>
                  <Input
                    required={subTab === "tugasan"}
                    placeholder="Contoh: 1 Tahun"
                    value={formMasaTugasan}
                    onChange={(e) => setFormMasaTugasan(e.target.value)}
                    className="rounded-xl border-slate-200 text-slate-900 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Pengurus specifics */}
            {(subTab === "pengurus_harian" || subTab === "pengurus_ppg") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Dapukan (Jabatan) *</label>
                  <Input
                    required
                    placeholder="Contoh: Ketua, Sekretaris..."
                    value={formDapukan}
                    onChange={(e) => setFormDapukan(e.target.value)}
                    className="rounded-xl border-slate-200 text-slate-900 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tingkat Struktur *</label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                  >
                    <option value="Daerah">Daerah (Kabupaten)</option>
                    <option value="Desa">Desa (Kecamatan)</option>
                    <option value="Kelompok">Kelompok (TPQ)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-700">No. WhatsApp Aktif *</label>
                <Input
                  required
                  placeholder="Contoh: 0812xxxxxxxx"
                  value={formWa}
                  onChange={(e) => setFormWa(e.target.value)}
                  className="rounded-xl border-slate-200 text-slate-900 text-sm"
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Simpan Data Personil
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
