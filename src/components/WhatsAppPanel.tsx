import React, { useState } from "react";
import { getWaTemplates, saveWaTemplates, getKelompok, getGenerus, WaTemplate, Kelompok, Generus, getUserDetails } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, Send, CheckCircle, Clock, Users, Play, RefreshCw, FileText, Variable 
} from "lucide-react";
import { toast } from "sonner";

interface WhatsAppPanelProps {
  userRole: string;
}

export function WhatsAppPanel({ userRole }: WhatsAppPanelProps) {
  const [templates, setTemplates] = useState<WaTemplate[]>(getWaTemplates());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  const [generusList] = useState<Generus[]>(getGenerus());

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

  const [activeSubTab, setActiveSubTab] = useState<"broadcast" | "templates" | "logs">("broadcast");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [selectedKelompok, setSelectedKelompok] = useState(allowedKelompoks[0] || "");

  React.useEffect(() => {
    if (allowedKelompoks.length > 0 && !allowedKelompoks.includes(selectedKelompok)) {
      setSelectedKelompok(allowedKelompoks[0]);
    }
  }, [allowedKelompoks, selectedKelompok]);

  const [targetRole, setTargetRole] = useState<"Orang Tua" | "Pengajar" | "Pengurus">("Orang Tua");

  // Template editor states
  const [editingTemplateId, setEditingTemplateId] = useState(templates[0]?.id || "");
  const [editPesan, setEditPesan] = useState(templates[0]?.pesan || "");

  // Mock Logs state
  const [logs, setLogs] = useState<any[]>([
    { id: "log-1", penerima: "Bambang Siswanto (Orang Tua)", nomor: "081234567890", pesan: "Assalamu'alaikum Wr. Wb. Yth Orang Tua dari Ahmad Bagus Pratama, menginfokan bahwa putra/putri anda hari ini tercatat: Hadir dalam kegiatan mengaji...", tanggal: "2026-07-06 13:10", status: "Terkirim" },
    { id: "log-2", penerima: "Sugeng Riyadi (Orang Tua)", nomor: "081398765432", pesan: "Assalamu'alaikum Wr. Wb. Yth Orang Tua dari Siti Rahmawati, menginfokan bahwa putra/putri anda hari ini tercatat: Izin dalam kegiatan mengaji...", tanggal: "2026-07-06 13:12", status: "Terkirim" }
  ]);

  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const isReadOnly = userRole === "Viewer";

  const handleSaveTemplate = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const updated = templates.map(t => {
      if (t.id === editingTemplateId) {
        return { ...t, pesan: editPesan };
      }
      return t;
    });
    setTemplates(updated);
    saveWaTemplates(updated);
    toast.success("Template pesan berhasil diperbarui!");
  };

  const handleSelectEditTemplate = (id: string) => {
    setEditingTemplateId(id);
    const chosen = templates.find(t => t.id === id);
    setEditPesan(chosen ? chosen.pesan : "");
  };

  // Compile Dynamic message preview
  const getCompiledPreview = () => {
    if (!activeTemplate) return "";
    let sampleNama = "Ahmad Bagus";
    let sampleStatus = "Hadir";
    let sampleDate = new Date().toISOString().split("T")[0];
    
    // Replace variables
    let msg = activeTemplate.pesan
      .replace(/{Nama}/g, sampleNama)
      .replace(/{Status}/g, sampleStatus)
      .replace(/{Kelompok}/g, selectedKelompok)
      .replace(/{Tanggal}/g, sampleDate)
      .replace(/{Semester}/g, "1")
      .replace(/{Deadline}/g, "2026-07-20")
      .replace(/{NamaKegiatan}/g, "Pengajian Akbar")
      .replace(/{Sasaran}/g, "Muda-Mudi")
      .replace(/{Waktu}/g, "08:00 - Selesai")
      .replace(/{Tempat}/g, "Masjid Al-Ubudiyah Takeran");
    return msg;
  };

  // Simulate sending broadcast messages
  const handleSendBroadcast = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    const compiledMsg = getCompiledPreview();
    const students = generusList.filter(g => g.namaKelompok === selectedKelompok);
    if (students.length === 0 && targetRole === "Orang Tua") {
      toast.error("Tidak ada data penerima untuk kelompok TPQ terpilih!");
      return;
    }

    toast.info("Sedang memproses antrean pesan WhatsApp...");
    
    setTimeout(() => {
      // Create new logs
      const newLogs = students.map((s, idx) => ({
        id: `log-${Date.now()}-${idx}`,
        penerima: `${s.namaOrangTua} (Orang Tua ${s.namaLengkap})`,
        nomor: s.whatsappOrangTua,
        pesan: compiledMsg.replace(/Ahmad Bagus/g, s.namaLengkap),
        tanggal: new Date().toISOString().replace("T", " ").substring(0, 16),
        status: "Terkirim"
      }));

      const updatedLogs = [...newLogs, ...logs];
      setLogs(updatedLogs);
      toast.success(`Siaran WhatsApp sukses dikirim ke ${students.length} penerima!`);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">WhatsApp Center</h2>
          <p className="text-slate-500 text-sm">Gerbang notifikasi otomatis WhatsApp untuk absensi harian dan pengingat raport orang tua.</p>
        </div>
      </div>

      {/* Navigation sub-tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit">
        <button onClick={() => setActiveSubTab("broadcast")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "broadcast" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Siaran WhatsApp (Broadcast)
        </button>
        <button onClick={() => setActiveSubTab("templates")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "templates" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Kelola Template Pesan
        </button>
        <button onClick={() => setActiveSubTab("logs")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "logs" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Riwayat Pengiriman (Log)
        </button>
      </div>

      {activeSubTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Controls */}
          <Card className="lg:col-span-6 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
            <h3 className="font-display text-base font-bold text-slate-800 flex items-center gap-1.5"><Variable className="h-4.5 w-4.5 text-emerald-600" /> Pengaturan Siaran</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pilih Sasaran Kelompok TPQ</label>
                <select
                  value={selectedKelompok}
                  onChange={(e) => setSelectedKelompok(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
                >
                  {kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => (
                    <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pilih Template Pesan</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Penerima</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10"
                >
                  <option value="Orang Tua">Orang Tua Santri (Wali)</option>
                  <option value="Pengajar">Ust / Ustd Pengajar</option>
                  <option value="Pengurus">Pengurus Organisasi</option>
                </select>
              </div>
            </div>

            {!isReadOnly && (
              <Button onClick={handleSendBroadcast} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10">
                <Send className="h-4.5 w-4.5" /> Kirim Siaran WhatsApp Sekarang
              </Button>
            )}
          </Card>

          {/* Compiled message preview */}
          <Card className="lg:col-span-6 bg-slate-900 text-white border-slate-800 shadow-sm rounded-3xl overflow-hidden self-stretch flex flex-col">
            <CardHeader className="bg-slate-950 border-b border-slate-800/50 p-4">
              <CardTitle className="font-display text-sm font-bold flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-emerald-500 animate-pulse" /> Pratinjau Tampilan WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col justify-between">
              {/* WhatsApp UI Wrapper */}
              <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl relative shadow-inner text-xs max-w-sm mx-auto w-full text-slate-300 select-all font-mono whitespace-pre-wrap text-left">
                <div className="absolute top-2 left-2 text-[9px] text-slate-500 font-bold uppercase">Pesan Masuk</div>
                <p className="mt-4 leading-relaxed">{getCompiledPreview()}</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-6 text-center">Variabel otomatis `{`{Nama}`}`, `{`{Status}`}` dll. diganti secara dinamis berdasarkan data siswa ketika dikirim.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSubTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          {/* Template Roster */}
          <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800">Template Pesan</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectEditTemplate(t.id)}
                  className={`w-full p-4 text-left transition-colors flex items-center justify-between ${
                    editingTemplateId === t.id ? "bg-emerald-50/50 border-r-4 border-emerald-600" : "hover:bg-slate-50/50"
                  }`}
                >
                  <span className="font-bold text-slate-900 text-xs">{t.nama}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-800">Edit Konten Template</h3>
            
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-500">Pesan WhatsApp (Mendukung Markdown WhatsApp: *bold* / _italic_)</label>
              <textarea
                value={editPesan}
                onChange={(e) => setEditPesan(e.target.value)}
                className="w-full h-48 rounded-2xl border border-slate-200 bg-white text-slate-900 p-4 text-sm focus:outline-none leading-relaxed font-mono"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block">Variabel yang Didukung:</span>
              <code>{`{Nama}`}</code> (Nama Santri), <code>{`{Status}`}</code> (Hadir/Izin/dll), <code>{`{Kelompok}`}</code> (Nama TPQ), <code>{`{Tanggal}`}</code> (Tanggal Absen), <code>{`{Semester}`}</code> (Semester Aktif), <code>{`{NamaKegiatan}`}</code> (Nama Agenda).
            </div>

            {!isReadOnly && (
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveTemplate} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold py-2.5 px-6 shadow-sm text-xs">
                  Simpan Template Pesan
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeSubTab === "logs" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Penerima</th>
                  <th className="px-6 py-4">No. WA</th>
                  <th className="px-6 py-4">Isi Pesan Siaran</th>
                  <th className="px-6 py-4">Waktu Kirim</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900 text-xs">{log.penerima}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{log.nomor}</td>
                    <td className="px-6 py-4 text-xs max-w-[280px] truncate text-slate-500">{log.pesan}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.tanggal}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-full text-[10px] flex items-center gap-1 max-w-fit">
                        <CheckCircle className="h-3 w-3" /> {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
