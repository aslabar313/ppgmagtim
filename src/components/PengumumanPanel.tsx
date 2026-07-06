import React, { useState } from "react";
import { getAnnouncements, saveAnnouncements, getKelompok, Announcement, Kelompok } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Plus, Mail, MessageSquare, Bell, Calendar, Eye, Send } from "lucide-react";
import { toast } from "sonner";

interface PengumumanPanelProps {
  userRole: string;
}

export function PengumumanPanel({ userRole }: PengumumanPanelProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(getAnnouncements());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [formJudul, setFormJudul] = useState("");
  const [formKonten, setFormKonten] = useState("");
  const [formTarget, setFormTarget] = useState("Semua");
  const [formMetode, setFormMetode] = useState<string[]>(["Dalam Aplikasi"]);

  const isReadOnly = userRole === "Viewer";

  const toggleMetode = (m: string) => {
    if (formMetode.includes(m)) {
      setFormMetode(formMetode.filter(x => x !== m));
    } else {
      setFormMetode([...formMetode, m]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (!formJudul || !formKonten) {
      toast.error("Harap isi seluruh field wajib!");
      return;
    }

    const newItem: Announcement = {
      id: "ann-" + Date.now(),
      judul: formJudul,
      konten: formKonten,
      sasaranTarget: formTarget,
      tanggal: new Date().toISOString().split("T")[0],
      metode: formMetode,
      statusKirim: "Terkirim",
      jumlahDibaca: 0
    };

    const updated = [newItem, ...announcements];
    setAnnouncements(updated);
    saveAnnouncements(updated);
    toast.success("Pengumuman terpusat berhasil diterbitkan!");
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    saveAnnouncements(updated);
    toast.success("Pengumuman berhasil diarsipkan!");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Pengumuman Terpusat</h2>
          <p className="text-slate-500 text-sm">Buat pengumuman daerah terarah untuk dibagikan ke dewan pengajar, wali murid, atau kelompok tertentu.</p>
        </div>

        {!isReadOnly && (
          <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-2 py-3 text-xs shadow-sm">
            <Megaphone className="h-4.5 w-4.5" /> Buat Pengumuman
          </Button>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((item) => (
          <Card key={item.id} className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden text-left flex flex-col justify-between hover:border-slate-350 transition-all p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold rounded-full text-[10px]">
                  Target: {item.sasaranTarget}
                </Badge>
                <span className="text-slate-300 text-xs font-semibold">•</span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {item.tanggal}</span>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4 text-slate-300" /> Dibaca {item.jumlahDibaca} Pengguna</span>
                {!isReadOnly && (
                  <button onClick={() => handleDelete(item.id)} className="text-rose-600 hover:text-rose-700 transition-colors text-xs font-bold">
                    Arsipkan
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-base font-extrabold text-slate-900 leading-snug">{item.judul}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.konten}</p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-bold uppercase items-center">
              <span>Saluran Distribusi:</span>
              <div className="flex gap-2">
                {item.metode.map((m, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[9px] font-extrabold rounded-full px-2">
                    {m === "Dalam Aplikasi" && <Bell className="h-3 w-3 text-indigo-500 mr-1 shrink-0 inline" />}
                    {m === "WhatsApp" && <MessageSquare className="h-3 w-3 text-emerald-500 mr-1 shrink-0 inline" />}
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900">Buat Pengumuman Baru</DialogTitle>
            <DialogDescription>Siarkan maklumat penting koordinasi daerah dengan target terarah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Judul Pengumuman *</label>
              <Input
                required
                placeholder="Masukkan judul pengumuman..."
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Sasaran Penerima *</label>
              <select
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                <option value="Semua">Semua Wilayah (Pengurus & Santri)</option>
                <option value="Pengajar">Seluruh Dewan Guru / Pengajar</option>
                <option value="Wali Murid">Seluruh Orang Tua / Wali Murid</option>
                <option value="Desa Kiringan">Wilayah Desa Kiringan</option>
                <option value="TPQ Kelompok 1">Unit TPQ Kelompok 1 saja</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Saluran Pengiriman</label>
              <div className="flex gap-2">
                {["Dalam Aplikasi", "WhatsApp", "Push Notification"].map(m => {
                  const isChecked = formMetode.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMetode(m)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${
                        isChecked 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Isi Pengumuman *</label>
              <textarea
                required
                placeholder="Tulis pesan pengumuman daerah di sini..."
                value={formKonten}
                onChange={(e) => setFormKonten(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none h-24"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Siarkan Pengumuman <Send className="h-4 w-4 ml-1 inline" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
