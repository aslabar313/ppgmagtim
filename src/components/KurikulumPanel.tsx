import React, { useState } from "react";
import { getKurikulum, saveKurikulum, Kurikulum } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, Calendar, Video, FileText, Check, Plus, Upload, Play, Award, ShieldAlert, Trash2, Sparkles 
} from "lucide-react";
import { toast } from "sonner";

interface KurikulumPanelProps {
  userRole: string;
}

export function KurikulumPanel({ userRole }: KurikulumPanelProps) {
  const isReadOnly = userRole === "Viewer";
  const isSuperAdmin = userRole === "Super Admin";

  // Dynamic calendar events state
  const [calendarEvents, setCalendarEvents] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sim_tpq_calendar");
      if (stored) return JSON.parse(stored);
    }
    return [
      { id: "cal-1", type: "Ujian", title: "Ujian Lisan Hadits Dasar Semester Ganjil", date: "2026-07-15", scope: "Daerah Magetan" },
      { id: "cal-2", type: "Wisuda", title: "Wisuda Tahfidz Quran Juz 30 & Hadits", date: "2026-08-02", scope: "Kecamatan Takeran" },
      { id: "cal-3", type: "Libur", title: "Libur Semester Ganjil Pengajian", date: "2026-07-20 s/d 2026-07-25", scope: "Semua TPQ" },
      { id: "cal-4", type: "Kegiatan Daerah", title: "Raker Pengurus Daerah SIM TPQ", date: "2026-07-10", scope: "Magetan Center" }
    ];
  });

  // AI Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<"kurikulum" | "kalender">("kurikulum");
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [importedItems, setImportedItems] = useState<any[]>([]);

  // Calendar form states
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [formCalTitle, setFormCalTitle] = useState("");
  const [formCalType, setFormCalType] = useState("Ujian");
  const [formCalDate, setFormCalDate] = useState("");
  const [formCalScope, setFormCalScope] = useState("Semua TPQ");

  const [activeSubTab, setActiveSubTab] = useState<"kurikulum" | "kalender_akademik" | "kalender_karakter">("kurikulum");
  const [materiList, setMateriList] = useState<Kurikulum[]>(getKurikulum());

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [formMateri, setFormMateri] = useState("");
  const [formKategori, setFormKategori] = useState<any>("Al-Qur'an");
  const [formSemester, setFormSemester] = useState<1 | 2>(1);
  const [formTarget, setFormTarget] = useState("");
  const [formSubMateri, setFormSubMateri] = useState("");

  const handleToggleChecklist = (id: string) => {
    if (!isSuperAdmin) {
      toast.error("Hanya akun Super Admin yang diizinkan memutakhirkan progres checklist kurikulum!");
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
    if (!isSuperAdmin) {
      toast.error("Akses Ditolak! Hanya Super Admin yang bisa menambah materi.");
      return;
    }
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

  // Calendar Event operations
  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.error("Akses Ditolak! Hanya Super Admin yang bisa menambah agenda kalender.");
      return;
    }
    if (!formCalTitle || !formCalDate) {
      toast.error("Harap isi semua kolom wajib!");
      return;
    }
    const newEvent = {
      id: "cal-" + Date.now(),
      type: formCalType,
      title: formCalTitle,
      date: formCalDate,
      scope: formCalScope
    };
    const updated = [...calendarEvents, newEvent];
    setCalendarEvents(updated);
    localStorage.setItem("sim_tpq_calendar", JSON.stringify(updated));
    toast.success("Agenda kegiatan akademik berhasil ditambahkan!");
    setIsCalOpen(false);
    setFormCalTitle("");
    setFormCalDate("");
  };

  const handleDeleteCalendarEvent = (id: string) => {
    if (!isSuperAdmin) {
      toast.error("Hanya Super Admin yang dapat menghapus agenda kalender!");
      return;
    }
    const updated = calendarEvents.filter((item) => item.id !== id);
    setCalendarEvents(updated);
    localStorage.setItem("sim_tpq_calendar", JSON.stringify(updated));
    toast.success("Agenda kegiatan akademik berhasil dihapus!");
  };

  // AI Import simulation logic
  const handleRunAiAnalysis = () => {
    setImporting(true);
    setImportStep(1); // Reading file
    toast.info("AI sedang membaca metadata berkas...");

    setTimeout(() => {
      setImportStep(2); // AI analyzing structure
      toast.info("AI sedang menganalisis materi dan memetakan jadwal...");
      
      setTimeout(() => {
        setImportStep(3); // Mapping competencies
        
        setTimeout(() => {
          if (importType === "kurikulum") {
            const extracted: Kurikulum[] = [
              {
                id: "cur-ai-" + Date.now() + 1,
                materi: "Hafalan Juz 30 (Al-Mulk s/d An-Nas)",
                kategori: "Al-Qur'an",
                semester: 1,
                target: "Hafal lancar tartil dengan tajwid benar",
                subMateri: "Surat Al-Mulk, Al-Qalam, Al-Haqqah, Al-Ma'arij",
                checklistPenyelesaian: false,
                progress: 0
              },
              {
                id: "cur-ai-" + Date.now() + 2,
                materi: "Hadits Kebersihan & Kerukunan",
                kategori: "Hadits",
                semester: 1,
                target: "Lancar membaca lafadz hadits dan terjemahannya",
                subMateri: "Hadits riwayat At-Thabrani dan Muslim",
                checklistPenyelesaian: false,
                progress: 0
              },
              {
                id: "cur-ai-" + Date.now() + 3,
                materi: "Kemuliaan Orang Tua (Birrul Walidain)",
                kategori: "Karakter",
                semester: 2,
                target: "Penerapan praktis bakti sosial keluarga",
                subMateri: "Adab berbicara lembut, membantu pekerjaan rumah",
                checklistPenyelesaian: false,
                progress: 0
              }
            ];
            setImportedItems(extracted);
          } else {
            const extracted = [
              {
                id: "cal-ai-" + Date.now() + 1,
                type: "Ujian",
                title: "Ujian Tulis Hadits Arbain Semester Ganjil",
                date: "2026-07-28",
                scope: "Daerah Magetan"
              },
              {
                id: "cal-ai-" + Date.now() + 2,
                type: "Pelatihan",
                title: "Bimbingan Teknis Guru TPQ Magetan Timur",
                date: "2026-08-15",
                scope: "Magetan Center"
              }
            ];
            setImportedItems(extracted);
          }
          setImporting(false);
          setImportStep(4); // Display result
          toast.success("AI berhasil membaca dan menganalisis berkas!");
        }, 1500);
      }, 1500);
    }, 1500);
  };

  const handleConfirmImport = () => {
    if (importType === "kurikulum") {
      const updated = [...materiList, ...importedItems];
      setMateriList(updated);
      saveKurikulum(updated);
    } else {
      const updated = [...calendarEvents, ...importedItems];
      setCalendarEvents(updated);
      localStorage.setItem("sim_tpq_calendar", JSON.stringify(updated));
    }
    setIsImportOpen(false);
    setImportedItems([]);
    setImportStep(0);
    toast.success(`Berhasil mengimpor ${importedItems.length} data valid baru melalui AI!`);
  };

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
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setIsImportOpen(true)} variant="outline" className="border-slate-200 hover:bg-slate-50 rounded-xl font-semibold gap-2 py-3 text-xs shadow-sm h-10">
              <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" /> Impor Berkas (AI)
            </Button>
            {activeSubTab === "kurikulum" && (
              <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-3 text-xs shadow-sm h-10">
                <Plus className="h-4.5 w-4.5" /> Tambah Target Kurikulum
              </Button>
            )}
            {activeSubTab === "kalender_akademik" && (
              <Button onClick={() => setIsCalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold gap-2 py-3 text-xs shadow-sm h-10">
                <Plus className="h-4.5 w-4.5" /> Tambah Agenda
              </Button>
            )}
          </div>
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
              <div key={item.id || idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                      <Badge variant="outline" className="text-[9px] font-bold rounded-full">{item.type}</Badge>
                      <span>Ruang Lingkup: {item.scope}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 justify-between sm:justify-end w-full sm:w-auto">
                  <div className="font-mono text-xs font-bold text-indigo-600">
                    {item.date}
                  </div>
                  {isSuperAdmin && (
                    <Button 
                      onClick={() => handleDeleteCalendarEvent(item.id)} 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-xl shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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

      {/* Add Calendar Event Dialog */}
      <Dialog open={isCalOpen} onOpenChange={setIsCalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900">Tambah Agenda Kalender Akademik</DialogTitle>
            <DialogDescription>Tambahkan agenda kegiatan pengujian, wisuda, atau rapat koordinasi wilayah Magetan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCalendarEvent} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nama Agenda Kegiatan *</label>
              <Input
                required
                placeholder="Contoh: Ujian Lisan Semester Genap..."
                value={formCalTitle}
                onChange={(e) => setFormCalTitle(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tipe Kegiatan</label>
                <select
                  value={formCalType}
                  onChange={(e) => setFormCalType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="Ujian">Ujian</option>
                  <option value="Wisuda">Wisuda</option>
                  <option value="Libur">Libur</option>
                  <option value="Kegiatan Daerah">Kegiatan Daerah</option>
                  <option value="Pelatihan">Pelatihan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ruang Lingkup</label>
                <select
                  value={formCalScope}
                  onChange={(e) => setFormCalScope(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="Semua TPQ">Semua TPQ</option>
                  <option value="Daerah Magetan">Daerah Magetan</option>
                  <option value="Kecamatan Takeran">Kecamatan Takeran</option>
                  <option value="Kecamatan Karas">Kecamatan Karas</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tanggal Pelaksanaan *</label>
              <Input
                required
                type="text"
                placeholder="Contoh: 2026-07-15 atau 2026-07-20 s/d 2026-07-25"
                value={formCalDate}
                onChange={(e) => setFormCalDate(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Tambahkan Agenda Kegiatan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Excel / PDF Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-purple-650 animate-pulse" /> Asisten AI Impor Kurikulum & Jadwal
            </DialogTitle>
            <DialogDescription>
              Unggah berkas PDF rencana pembelajaran atau Excel jadwal akademik, AI akan menganalisis dan memasukkannya ke database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Jenis Data yang Diimpor</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
              >
                <option value="kurikulum">Target Pengajaran Kurikulum</option>
                <option value="kalender">Agenda Kalender Akademik</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[140px] text-center relative group">
              {importStep === 0 && (
                <>
                  <Upload className="h-8 w-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-700">Pilih berkas PDF atau Excel</span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ukuran berkas maksimum 5MB (.pdf, .xlsx, .xls)</span>
                  <input 
                    type="file" 
                    accept=".pdf,.xlsx,.xls" 
                    onChange={handleRunAiAnalysis} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </>
              )}

              {importing && (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full border-4 border-t-purple-600 border-purple-100 animate-spin" />
                  <span className="text-xs font-bold text-purple-700 animate-pulse">
                    {importStep === 1 ? "Membaca berkas PDF/Excel..." :
                     importStep === 2 ? "AI menganalisis struktur tabel..." :
                     "Memetakan data ke format valid..."}
                  </span>
                </div>
              )}

              {importStep === 4 && (
                <div className="space-y-2 text-center w-full">
                  <Award className="h-8 w-8 text-emerald-600 mx-auto" />
                  <span className="text-xs font-bold text-slate-900 block">AI Berhasil Menganalisis Berkas!</span>
                  <div className="max-h-[120px] overflow-y-auto border border-slate-100 rounded-xl bg-white p-3 text-[10px] space-y-1.5 text-left text-slate-500 font-medium">
                    {importType === "kurikulum" ? (
                      importedItems.map((item: any, idx: number) => (
                        <div key={idx} className="border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                          <strong>[{item.kategori}]</strong> {item.materi} - Sem. {item.semester}
                        </div>
                      ))
                    ) : (
                      importedItems.map((item: any, idx: number) => (
                        <div key={idx} className="border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                          <strong>[{item.type}]</strong> {item.title} ({item.date})
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {importStep === 4 && (
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setImportStep(0);
                    setImportedItems([]);
                  }} 
                  variant="outline" 
                  className="flex-1 rounded-xl text-xs font-semibold"
                >
                  Ulangi
                </Button>
                <Button 
                  onClick={handleConfirmImport} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Konfirmasi & Simpan
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
