import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, Printer, Download, Calendar, User, BookOpen, Clock, 
  MapPin, ShieldCheck, PenTool, CheckCircle, AlertTriangle, QrCode 
} from "lucide-react";
import { toast } from "sonner";

interface JurnalDetailProps {
  record: any;
  onClose: () => void;
  onApprove?: (recordId: string, comments: string, action: "Disetujui" | "Direvisi" | "Ditolak") => void;
  userRole: string;
}

export function JurnalDetail({ record, onClose, onApprove, userRole }: JurnalDetailProps) {
  const [commentText, setCommentText] = useState("");
  const isKoordinator = userRole === "Koordinator" || userRole === "Super Admin" || userRole === "Admin Daerah";

  const handleAction = (action: "Disetujui" | "Direvisi" | "Ditolak") => {
    if (onApprove) {
      onApprove(record.id, commentText, action);
      setCommentText("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disetujui":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold px-3 py-1 rounded-full text-xs">✓ Disetujui</Badge>;
      case "Menunggu Review":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-extrabold px-3 py-1 rounded-full text-xs animate-pulse">⏰ Menunggu Review</Badge>;
      case "Direvisi":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-extrabold px-3 py-1 rounded-full text-xs">↺ Direvisi</Badge>;
      case "Ditolak":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-extrabold px-3 py-1 rounded-full text-xs">✗ Ditolak</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-500 border-slate-200 font-extrabold px-3 py-1 rounded-full text-xs">Draft</Badge>;
    }
  };

  // Generate QR content or hash mockup
  const qrHash = `https://sim-tpq.magetan.go.id/verify/jurnal/${record.nomorJurnal}`;

  return (
    <div className="space-y-6">
      
      {/* Detail Panel Controls */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
        <div className="flex gap-2">
          <Button 
            onClick={() => window.print()} 
            variant="outline" 
            className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl"
          >
            <Printer className="h-4 w-4 text-slate-500" /> Cetak Laporan
          </Button>
          <Button 
            onClick={() => toast.success("Mengekspor laporan jurnal ke format PDF...")} 
            variant="outline" 
            className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl"
          >
            <Download className="h-4 w-4 text-emerald-600" /> Unduh PDF
          </Button>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-slate-100 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Report Document - Optimized for Printing */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm relative print:border-none print:shadow-none text-left print:p-0">
        
        {/* Decorative Stamp watermark */}
        <div className="absolute top-8 right-8 z-0 print:top-4 print:right-4">
          {getStatusBadge(record.status)}
        </div>

        {/* Header Laporan */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-6 gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md border border-blue-500">
              <BookOpen className="h-7 w-7" />
            </div>
            <div className="space-y-0.5 text-left">
              <h3 className="font-display text-lg font-black text-slate-900 leading-none">PintarYuk SIM Kelompok</h3>
              <p className="text-slate-400 text-xs font-semibold">Sistem Informasi Monitoring KBM Pengajian Daerah</p>
              <p className="text-[10px] text-slate-400 font-bold">Magetan Timur, Jawa Timur</p>
            </div>
          </div>
          
          <div className="text-left sm:text-right space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">Laporan Jurnal KBM</span>
            <h4 className="font-mono text-base font-black text-slate-900 leading-none">{record.nomorJurnal}</h4>
            <span className="text-[10px] text-slate-400 font-semibold block">Versi Dokumen: v{record.version || 1}</span>
          </div>
        </div>

        {/* 4 Metadata Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 text-xs font-semibold text-slate-500">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Calendar className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Tanggal</span>
              <span className="text-slate-800 font-bold">{record.tanggal}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <User className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Pengajar</span>
              <span className="text-slate-800 font-bold truncate block max-w-[120px]">{record.pengajar}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <Clock className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Waktu / Durasi</span>
              <span className="text-slate-800 font-bold">{record.jamMulai} - {record.jamSelesai}</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
            <MapPin className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            <div>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Kelas / Ruangan</span>
              <span className="text-slate-800 font-bold truncate block max-w-[120px]">{record.kelas} ({record.ruangan})</span>
            </div>
          </div>
        </div>

        {/* Content Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs leading-relaxed text-slate-650">
          
          {/* Kolom Kiri: Detail Pembelajaran */}
          <div className="md:col-span-8 space-y-6">
            
            <div className="space-y-1.5 text-left">
              <h5 className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">01. Silabus Pembelajaran</h5>
              <div className="border border-slate-150 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                <div>
                  <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Materi Pokok:</span>
                  <p className="font-extrabold text-slate-800 text-sm">{record.materi}</p>
                </div>
                {record.subMateri && (
                  <div>
                    <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Sub-Materi / Ayat / Bab:</span>
                    <p className="font-bold text-slate-800">{record.subMateri}</p>
                  </div>
                )}
                <div>
                  <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Target Capaian Pembelajaran:</span>
                  <p className="font-medium text-slate-600">{record.targetPembelajaran}</p>
                </div>
                {record.metodePembelajaran && (
                  <div>
                    <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Metode Pembelajaran:</span>
                    <p className="font-bold text-slate-600">{record.metodePembelajaran}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <h5 className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">02. Kegiatan KBM & Evaluasi</h5>
              <div className="border border-slate-150 rounded-2xl p-4 space-y-3 bg-white">
                <div>
                  <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Laporan Aktivitas Belajar:</span>
                  <p className="font-medium text-slate-650 whitespace-pre-wrap">{record.kegiatanPembelajaran || "-"}</p>
                </div>
                {record.evaluasi && (
                  <div>
                    <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Hasil Evaluasi / Catatan Khusus:</span>
                    <p className="font-medium text-slate-650">{record.evaluasi}</p>
                  </div>
                )}
                {record.tugas && (
                  <div>
                    <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Tugas Kelanjutan (PR):</span>
                    <p className="font-bold text-indigo-700 bg-indigo-50/50 py-1.5 px-3 rounded-lg border border-indigo-100 inline-block">{record.tugas}</p>
                  </div>
                )}
                {record.rencanaBerikutnya && (
                  <div>
                    <span className="font-extrabold text-slate-700 block text-[10px] uppercase">Rencana Bahasan KBM Berikutnya:</span>
                    <p className="font-medium text-slate-650 italic">"{record.rencanaBerikutnya}"</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Kolom Kanan: Absensi & Verifikasi */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Rekap Absensi */}
            <div className="space-y-1.5 text-left">
              <h5 className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">03. Rekap Absensi Santri</h5>
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/60">
                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                    <span className="text-emerald-700 font-extrabold block">Hadir</span>
                    <span className="font-display text-lg font-black text-emerald-800">{record.santriHadirCount || 0}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                    <span className="text-amber-700 font-extrabold block">Izin</span>
                    <span className="font-display text-lg font-black text-amber-800">{record.santriIzinCount || 0}</span>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl">
                    <span className="text-indigo-700 font-extrabold block">Sakit</span>
                    <span className="font-display text-lg font-black text-indigo-800">{record.santriSakitCount || 0}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                    <span className="text-rose-700 font-extrabold block">Alfa</span>
                    <span className="font-display text-lg font-black text-rose-800">{record.santriAlfaCount || 0}</span>
                  </div>
                </div>

                <div className="text-[10px] font-extrabold text-slate-400 text-center pt-1">
                  Total Terdaftar: {(record.santriHadirCount || 0) + (record.santriIzinCount || 0) + (record.santriSakitCount || 0) + (record.santriAlfaCount || 0)} Santri
                </div>
              </div>
            </div>

            {/* Lampiran Foto */}
            {record.lampiranFoto && (
              <div className="space-y-1.5 text-left">
                <h5 className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">04. Foto Dokumentasi KBM</h5>
                <div className="border border-slate-200 rounded-2xl p-2 bg-white">
                  <img src={record.lampiranFoto} alt="Dokumentasi KBM" className="w-full h-32 object-cover rounded-xl border border-slate-100 shadow-sm" />
                  <span className="text-[9px] text-slate-400 font-semibold block text-center mt-1 truncate">{record.lampiranFotoName || "kegiatan_kbm.jpg"}</span>
                </div>
              </div>
            )}

            {/* QR Code Verification */}
            <div className="space-y-1.5 text-left print:hidden">
              <h5 className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">05. QR Code Verifikasi</h5>
              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                <div className="h-20 w-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-800 shadow-sm">
                  <QrCode className="h-14 w-14 text-slate-900" />
                </div>
                <span className="text-[8px] text-slate-400 font-semibold text-center leading-relaxed">
                  Scan QR untuk memverifikasi keaslian dokumen Jurnal KBM di portal SIM Kelompok.
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Tanda Tangan & Persetujuan Dokumen */}
        <div className="border-t border-slate-200 pt-6 grid grid-cols-2 gap-8 text-[11px] font-semibold text-slate-400">
          
          {/* TTD Pengajar */}
          <div className="space-y-2 text-left">
            <span>Dibuat Oleh (Pengajar):</span>
            <div className="min-h-[70px] border border-slate-200 bg-slate-50/50 rounded-xl p-3 flex flex-col items-start justify-center relative">
              {record.digitalSignaturePengajar ? (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px]">
                    <ShieldCheck className="h-4 w-4" /> SECURE DIGITAL SIGNATURE
                  </div>
                  <span className="font-mono text-[7px] text-slate-450 block truncate max-w-[200px] mt-0.5">{record.digitalSignaturePengajar}</span>
                  <span className="text-[9px] text-slate-700 font-bold mt-1 block">{record.pengajar}</span>
                </>
              ) : (
                <span className="text-[9px] text-slate-400 italic">Belum ditandatangani</span>
              )}
            </div>
          </div>

          {/* TTD Koordinator */}
          <div className="space-y-2 text-left">
            <span>Disetujui Oleh (Koordinator):</span>
            <div className="min-h-[70px] border border-slate-200 bg-slate-50/50 rounded-xl p-3 flex flex-col items-start justify-center relative">
              {record.status === "Disetujui" ? (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px]">
                    <ShieldCheck className="h-4 w-4" /> APPROVED BY COORDINATOR
                  </div>
                  <span className="font-mono text-[7px] text-slate-450 block truncate max-w-[200px] mt-0.5">
                    {record.digitalSignatureKoordinator || `APPROVED-SECURE-SIG-${Date.now().toString(16).toUpperCase()}`}
                  </span>
                  <span className="text-[9px] text-slate-700 font-bold mt-1 block">Ust. Koordinator Bidang KBM</span>
                </>
              ) : record.status === "Direvisi" ? (
                <div className="flex items-center gap-1 text-blue-750 font-bold text-[9px]">
                  <AlertTriangle className="h-3.5 w-3.5" /> REVISI: {record.komentarKoordinator || "Butuh klarifikasi"}
                </div>
              ) : record.status === "Ditolak" ? (
                <div className="flex items-center gap-1 text-rose-700 font-bold text-[9px]">
                  <X className="h-3.5 w-3.5" /> DITOLAK
                </div>
              ) : (
                <span className="text-[9px] text-slate-450 italic">Menunggu verifikasi koordinator</span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Coordinator Approval workflow Actions Panel */}
      {isKoordinator && record.status === "Menunggu Review" && (
        <Card className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-left print:hidden shadow-sm">
          <h4 className="font-display text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">Panel Persetujuan (Koordinator / Admin)</h4>
          <div className="space-y-3">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Tulis umpan balik, catatan revisi, atau saran di sini..."
              className="w-full rounded-xl border border-slate-250 bg-white px-3.5 py-2.5 text-xs focus:outline-none min-h-[60px] font-semibold text-slate-800"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                onClick={() => handleAction("Direvisi")}
                variant="outline"
                className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs h-9 px-4"
              >
                Minta Revisi
              </Button>
              <Button
                onClick={() => handleAction("Ditolak")}
                variant="outline"
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs h-9 px-4"
              >
                Tolak Jurnal
              </Button>
              <Button
                onClick={() => handleAction("Disetujui")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-9 px-6 shadow-sm"
              >
                Setujui Jurnal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Coordinator comments history if exists */}
      {record.komentarKoordinator && record.status !== "Menunggu Review" && (
        <Card className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left print:hidden">
          <span className="text-[9px] font-extrabold uppercase text-amber-700 block tracking-wider mb-1">Catatan Koreksi Koordinator:</span>
          <p className="text-xs font-semibold text-amber-900">"{record.komentarKoordinator}"</p>
        </Card>
      )}
    </div>
  );
}
