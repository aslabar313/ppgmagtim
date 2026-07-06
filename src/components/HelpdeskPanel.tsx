import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  LifeBuoy, Search, Plus, MessageSquare, AlertCircle, 
  CheckCircle, Clock, FileText, Send, User 
} from "lucide-react";
import { toast } from "sonner";

interface HelpdeskPanelProps {
  userRole: string;
}

export function HelpdeskPanel({ userRole }: HelpdeskPanelProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Semua");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  
  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("IT");
  const [formPriority, setFormPriority] = useState("High");
  const [formDesc, setFormDesc] = useState("");
  const [commentText, setCommentText] = useState("");

  const isReadOnly = userRole === "Viewer";

  // Mock Tickets Database
  const [tickets, setTickets] = useState<any[]>([
    { id: "tck-1", judul: "Aplikasi SIM TPQ Luring Lambat", kategori: "IT", priority: "High", status: "On Progress", tgl: "2026-07-06", pengirim: "Admin Kelompok 2", desc: "Aplikasi membutuhkan waktu memuat modul presensi sekitar 5 detik pada perangkat tablet Android versi lama.", logs: [{ user: "Admin Kelompok 2", text: "Mohon optimasi ukuran bundle javascript", date: "2026-07-06" }] },
    { id: "tck-2", judul: "Kebocoran Atap Masjid TPQ Kelompok 4", kategori: "Sarana", priority: "Critical", status: "Open", tgl: "2026-07-05", pengirim: "Admin Kelompok 4", desc: "Atap sebelah kanan masjid bocor saat hujan lebat, mengganggu kegiatan belajar tahfidz santri sore hari.", logs: [] },
    { id: "tck-3", judul: "Kesalahan Input Nilai Raport Santri Ahmad", kategori: "Administrasi", priority: "Medium", status: "Resolved", tgl: "2026-07-04", pengirim: "Ust. Ali", desc: "Terdapat typo nilai tahsin Ahmad Bagus tertukar dengan santri lain. Mohon dibukakan akses edit.", logs: [{ user: "Super Admin", text: "Akses penyuntingan raport telah dibuka kembali selama 24 jam.", date: "2026-07-04" }] }
  ]);

  const handleResolve = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setTickets(tickets.map(t => t.id === id ? { ...t, status: "Resolved" } : t));
    toast.success("Tiket bantuan telah ditandai Selesai (Resolved)!");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTicketId) return;

    setTickets(tickets.map(t => {
      if (t.id === activeTicketId) {
        return {
          ...t,
          logs: [...t.logs, { user: userRole, text: commentText, date: new Date().toISOString().split("T")[0] }]
        };
      }
      return t;
    }));

    setCommentText("");
    toast.success("Tanggapan bantuan dikirim!");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    const newTicket = {
      id: "tck-" + Date.now(),
      judul: formTitle,
      kategori: formCategory,
      priority: formPriority,
      status: "Open",
      tgl: new Date().toISOString().split("T")[0],
      pengirim: userRole,
      desc: formDesc,
      logs: []
    };

    setTickets([newTicket, ...tickets]);
    toast.success("Tiket pengaduan sukses dikirim ke antrean divisi bantuan!");
    setCreateOpen(false);
    setFormTitle("");
    setFormDesc("");
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.judul.toLowerCase().includes(search.toLowerCase()) || 
                          t.pengirim.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "Semua" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Helpdesk & Tiket Pengaduan</h2>
          <p className="text-slate-500 text-sm">Saluran pusat pengaduan masalah fasilitas sarana, permohonan bantuan administrasi IT, dan konsultasi operasional.</p>
        </div>

        {!isReadOnly && (
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-2 py-3 text-xs shadow-sm">
            <LifeBuoy className="h-4.5 w-4.5" /> Kirim Tiket Pengaduan
          </Button>
        )}
      </div>

      {/* Search and priority filters */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan judul tiket atau nama pengirim..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[160px] font-bold"
            >
              <option value="Semua">Semua Prioritas</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Grid and Chat window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ticket List roster */}
        <Card className="lg:col-span-7 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((t) => (
              <div 
                key={t.id} 
                onClick={() => setActiveTicketId(t.id)}
                className={`p-5 text-left transition-colors cursor-pointer flex items-center justify-between ${
                  activeTicketId === t.id ? "bg-emerald-50/40 border-r-4 border-emerald-600" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-bold rounded-full">{t.kategori}</Badge>
                    <Badge className={`font-extrabold text-[8px] rounded-full ${
                      t.priority === "Critical" ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse" :
                      t.priority === "High" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}>
                      {t.priority}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">{t.judul}</h4>
                  <span className="text-[9px] text-slate-400 font-mono font-bold block">{t.pengirim} • {t.tgl}</span>
                </div>

                <Badge className={`font-semibold rounded-full text-[10px] shrink-0 ${
                  t.status === "Resolved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}>
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected Ticket Conversation Window */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-sm rounded-3xl p-6 self-stretch flex flex-col justify-between text-left">
          {activeTicket ? (
            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-display text-sm font-extrabold text-slate-900 leading-snug">{activeTicket.judul}</h3>
                    <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 block">{activeTicket.pengirim} • {activeTicket.kategori}</span>
                  </div>
                  {activeTicket.status !== "Resolved" && !isReadOnly && (
                    <Button onClick={() => handleResolve(activeTicket.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-1 px-3 rounded-lg h-8">
                      Mark Resolved
                    </Button>
                  )}
                </div>

                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl text-xs text-slate-600 leading-relaxed font-medium">
                  {activeTicket.desc}
                </div>

                {/* Log list conversation */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Riwayat Solusi & Komentar</span>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {activeTicket.logs.map((log: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {log.user}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{log.date}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {activeTicket.status !== "Resolved" && (
                <form onSubmit={handleAddComment} className="flex gap-2 border-t border-slate-100 pt-4 mt-4">
                  <Input
                    placeholder="Tulis balasan solusi teknis..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs py-2 flex-grow"
                  />
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold py-2 px-4 text-xs shrink-0">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium my-auto">
              Pilih salah satu tiket di sebelah kiri untuk melihat percakapan solusi bantuan.
            </div>
          )}
        </Card>
      </div>

      {/* Ticket Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-slate-900 flex items-center gap-1.5"><LifeBuoy className="h-5.5 w-5.5 text-emerald-600" /> Kirim Tiket Pengaduan</DialogTitle>
            <DialogDescription>Laporkan keluhan fasilitas sarana atau bantuan teknis sistem informasi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4 pt-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Subjek / Masalah Singkat *</label>
              <Input
                required
                placeholder="Contoh: Kerusakan Lampu Ruang Kelas TPQ..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="rounded-xl border-slate-200 text-slate-900 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Aduan *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                <option value="IT">IT & Aplikasi</option>
                <option value="Sarana">Sarana Prasarana Fisik</option>
                <option value="Pengajar">Tenaga Pengajar / Kurikulum</option>
                <option value="Administrasi">Administrasi & Surat Menyurat</option>
                <option value="Keuangan">Masalah Keuangan & SPP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Prioritas Dampak *</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
              >
                <option value="Low">Low (Tidak mendesak)</option>
                <option value="Medium">Medium (Biasa)</option>
                <option value="High">High (Mendesak)</option>
                <option value="Critical">Critical (Sangat mendesak/Mengganggu KBM)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Deskripsi Lengkap *</label>
              <textarea
                required
                placeholder="Tuliskan kronologi dan rincian masalah yang terjadi secara jelas..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:outline-none h-24"
              />
            </div>

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold mt-4">
              Kirim Tiket Aduan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
