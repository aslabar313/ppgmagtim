import React, { useState } from "react";
import { getKurikulum, saveKurikulum, Kurikulum } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, Calendar, Video, FileText, Check, Plus, Upload, Play, Award, ShieldAlert 
} from "lucide-react";
import { toast } from "sonner";

interface KurikulumPanelProps {
  userRole: string;
}

export function KurikulumPanel({ userRole }: KurikulumPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"kurikulum" | "kalender_akademik" | "kalender_karakter">("kurikulum");
  const [materiList, setMateriList] = useState<Kurikulum[]>(getKurikulum());

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [formMateri, setFormMateri] = useState("");
  const [formKategori, setFormKategori] = useState<any>("Al-Qur'an");
  const [formSemester, setFormSemester] = useState<1 | 2>(1);
  const [formTarget, setFormTarget] = useState("");
  const [formSubMateri, setFormSubMateri] = useState("");

  const isReadOnly = userRole === "Viewer";

  const handleToggleChecklist = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const updated = materiList.map(m => {
      if (m.id === id) {
        const nextVal = !m.checklistPenyelesaian;
        return {
          ...m,
          checklistPenyelesaian: nextVal,
          progress: nextVal ? 100 : 0
        };
      }
      return m;
    });
    setMateriList(updated);
    saveKurikulum(updated);
    toast.success("Progress kurikulum diperbarui!");
  };

  const handleAddMateri = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMateri || !formTarget) {
      toast.error("Harap lengkapi isian form!");
      return;
    }

    const newItem: Kurikulum = {
      id: "cur-" + Date.now(),
      materi: formMateri,
      kategori: formKategori,
      semester: Number(formSemester) as 1 | 2,
      target: formTarget,
      subMateri: formSubMateri,
      checklistPenyelesaian: false,
      progress: 0
    };

    const updated = [...materiList, newItem];
    setMateriList(updated);
    saveKurikulum(updated);
    toast.success("Materi kurikulum baru berhasil ditambahkan!");
    setIsOpen(false);
  };

  // Mock Academic calendar data
  const calendarEvents = [
    { type: "Ujian", title: "Ujian Lisan Hadits Dasar Semester Ganjil", date: "2026-07-15", scope: "Daerah Magetan" },
    { type: "Wisuda", title: "Wisuda Tahfidz Quran Juz 30 & Hadits", date: "2026-08-02", scope: "Kecamatan Takeran" },
    { type: "Libur", title: "Libur Semester Ganjil Pengajian", date: "2026-07-20 s/d 2026-07-25", scope: "Semua TPQ" },
    { type: "Kegiatan Daerah", title: "Raker Pengurus Daerah SIM TPQ", date: "2026-07-10", scope: "Magetan Center" }
  ];

  // Mock Character Targets
  const characterTargets = [
    { target: "Saling menghargai sesama santri (Rukun & Kompak)", type: "Mingguan", check: true },
    { target: "Membiasakan 5 Kata Kunci (Salam, Minta Maaf, Tolong, Terima Kasih, Permisi)", type: "Mingguan", check: false },
    { target: "Disiplin merapikan barang dan sandal sebelum masuk masjid", type: "Bulanan", check: true },
    { target: "Kemandirian mencuci peralatan sholat sendiri", type: "Bulanan", check: false }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Kurikulum & Kalender Akademik</h2>
          <p className="text-slate-500 text-sm">Kelola materi target pengajaran santri dan jadwal kegiatan akademik daerah.</p>
        </div>
        {activeSubTab === "kurikulum" && !isReadOnly && (
          <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-3 text-xs shadow-sm">
            <Plus className="h-4.5 w-4.5" /> Tambah Target Kurikulum
          </Button>
        )}
      </div>

      {/* Sub tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit">
        <button onClick={() => setActiveSubTab("kurikulum")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "kurikulum" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Target Kurikulum
        </button>
        <button onClick={() => setActiveSubTab("kalender_akademik")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "kalender_akademik" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Kalender Akademik
        </button>
        <button onClick={() => setActiveSubTab("kalender_karakter")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "kalender_karakter" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Kalender Karakter (Target)
        </button>
      </div>

      {activeSubTab === "kurikulum" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {materiList.map((m) => (
            <Card key={m.id} className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden text-left flex flex-col justify-between group hover:border-slate-350 transition-all">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge className={`font-semibold rounded-full text-[10px] ${
                    m.kategori === "Al-Qur'an" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    m.kategori === "Hadits" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    "bg-purple-50 text-purple-700 border-purple-100"
                  }`}>
                    {m.kategori}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase rounded-full">
                    Sem. {m.semester}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="font-display text-base font-extrabold text-slate-900 leading-snug">{m.materi}</h4>
                  <p className="text-xs text-slate-500 font-bold">Target: {m.target}</p>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-700 block">Sub Materi:</span>
                  <p className="leading-relaxed text-slate-500">{m.subMateri}</p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Progres Pengajaran</span>
                    <span>{m.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all" style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => toast.info("Simulator modul diunduh!")}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => toast.info("Membuka video panduan...")}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  onClick={() => handleToggleChecklist(m.id)}
                  className={`rounded-xl px-4 py-2 font-bold text-[10px] uppercase shadow-sm flex items-center gap-1.5 ${
                    m.checklistPenyelesaian 
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                      : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-600"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> {m.checklistPenyelesaian ? "Tuntas" : "Tandai Tuntas"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeSubTab === "kalender_akademik" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {calendarEvents.map((item, idx) => (
              <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                      <Badge variant="outline" className="text-[9px] font-bold rounded-full">{item.type}</Badge>
                      <span>Ruang Lingkup: {item.scope}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-bold text-indigo-600">
                  {item.date}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeSubTab === "kalender_karakter" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="font-display text-base font-bold text-slate-800">Target Karakter & Tabiat Luhur Bulanan</CardTitle>
            <CardDescription className="text-xs">Evaluasi pembiasaan akhlak mulia dan ketrampilan hidup mandiri santri.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {characterTargets.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${
                    item.check ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"
                  }`}>
                    {item.check && <Check className="h-3 w-3" />}
                  </div>
                  <span className={`text-xs font-bold text-left ${item.check ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {item.target}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[9px] font-bold rounded-full">{item.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900">Tambah Target Kurikulum Baru</DialogTitle>
            <DialogDescription>Tambahkan modul target pengajaran pengajian baru di wilayah Magetan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMateri} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nama Materi Target *</label>
              <Input
                required
                placeholder="Contoh: Juz 30 / Hadits Pilihan..."
                value={formMateri}
                onChange={(e) => setFormMateri(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kategori</label>
                <select
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="Al-Qur'an">Al-Qur'an</option>
                  <option value="Hadits">Hadits</option>
                  <option value="Karakter">Karakter</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Semester</label>
                <select
                  value={formSemester}
                  onChange={(e) => setFormSemester(Number(e.target.value) as 1 | 2)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Pencapaian *</label>
              <Input
                required
                placeholder="Contoh: Hafal Lancar Tajwid..."
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Sub Bab / Surat Pilihan</label>
              <Input
                placeholder="Contoh: An-Naba, An-Naziat..."
                value={formSubMateri}
                onChange={(e) => setFormSubMateri(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Tambahkan Materi Kurikulum
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
