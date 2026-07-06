import React, { useState } from "react";
import { getGenerus, Generus } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileCheck, Printer, Download, Search, ShieldCheck, 
  QrCode, User, Edit3, Settings 
} from "lucide-react";
import { toast } from "sonner";

export function SertifikatPanel() {
  const [generusList] = useState<Generus[]>(getGenerus());
  const [selectedStudentId, setSelectedStudentId] = useState(generusList[0]?.id || "");
  const [certType, setCertType] = useState("Kelulusan Munaqosah");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const activeStudent = generusList.find(g => g.id === selectedStudentId);
  const certNumber = `CERT-PPG-${new Date().getFullYear()}-${selectedStudentId.substring(0, 4).toUpperCase()}`;

  const handlePrint = () => {
    toast.success("Mempersiapkan cetak sertifikat...");
    window.print();
  };

  const handleDownload = () => {
    toast.success("Mengunduh berkas sertifikat PDF...");
  };

  const handleVerifyQR = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success("E-Certificate Verified! Ditandatangani secara digital oleh Ketua Dewan Pembina PPG Daerah Magetan Timur.");
    }, 1000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Generator Sertifikat & E-Signature</h2>
          <p className="text-slate-500 text-sm">Terbitkan piagam penghargaan dan sertifikat kelulusan munaqosah santri secara otomatis dan terverifikasi digital.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Controls */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-5 text-left self-stretch flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Settings className="h-4.5 w-4.5 text-slate-500" /> Parameter Sertifikat</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Pilih Nama Santri (Generus)</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
              >
                {generusList.map(g => (
                  <option key={g.id} value={g.id}>{g.namaLengkap} ({g.nisInternal})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Kategori Piagam / Sertifikat</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm focus:outline-none h-10 font-bold"
              >
                <option value="Kelulusan Munaqosah">Kelulusan Munaqosah</option>
                <option value="Juara Lomba Tahfidz">Juara Lomba Tahfidz</option>
                <option value="Santri Teladan Akhlak">Santri Teladan Akhlak</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">Nomor Sertifikat Registrasi</label>
              <Input
                readOnly
                value={certNumber}
                className="rounded-xl border-slate-200 text-slate-500 text-xs bg-slate-50 font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Button onClick={handlePrint} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-1.5">
              <Printer className="h-4 w-4" /> Cetak Piagam Sekarang
            </Button>
            <Button onClick={handleDownload} variant="outline" className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-1.5">
              <Download className="h-4 w-4" /> Unduh Dokumen (PDF)
            </Button>
          </div>
        </Card>

        {/* Certificate Designer Preview */}
        <Card className="lg:col-span-7 bg-slate-100 border-slate-200 shadow-sm rounded-3xl p-6 overflow-hidden relative flex flex-col justify-center items-center min-h-[380px]">
          {activeStudent && (
            <div className="bg-white border-8 border-slate-250 p-8 w-full max-w-lg shadow-md rounded-xl relative text-center space-y-6 aspect-[1.4] flex flex-col justify-between self-center">
              {/* Gold border accents */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-slate-300 pointer-events-none" />

              <div className="space-y-1">
                <span className="font-display text-[9px] font-black text-amber-600 tracking-widest uppercase">Piagam Penghargaan</span>
                <h4 className="font-serif text-lg font-bold text-slate-800 tracking-wide">{certType}</h4>
                <span className="text-[8px] text-slate-400 font-mono">{certNumber}</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-450 italic">Diberikan Kepada:</span>
                <h2 className="font-serif text-xl font-bold text-slate-900 border-b border-slate-200 pb-1 max-w-xs mx-auto">{activeStudent.namaLengkap}</h2>
                <p className="text-[9px] text-slate-500 leading-normal max-w-xs mx-auto">
                  Atas prestasi dan kelulusan evaluasi materi target pembelajaran yang diselenggarakan oleh PPG Daerah Magetan Timur Center.
                </p>
              </div>

              <div className="flex justify-between items-end text-left px-4">
                {/* Verification QR */}
                <div className="flex flex-col items-center space-y-1 cursor-pointer group" onClick={handleVerifyQR}>
                  <div className="bg-slate-50 p-1 border border-slate-200 rounded group-hover:bg-slate-100 transition-colors">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><ShieldCheck className="h-2 w-2 text-emerald-500" /> Verifikasi QR</span>
                </div>

                {/* E-Signature */}
                <div className="flex flex-col items-center space-y-1 text-center">
                  <div className="h-6 w-24 relative flex items-center justify-center">
                    {/* Signed watermark */}
                    <span className="font-serif text-[10px] text-indigo-500/80 font-bold rotate-[-6deg] border border-indigo-400/50 px-1 rounded uppercase">E-Signed</span>
                  </div>
                  <span className="text-[9px] text-slate-800 font-bold border-t border-slate-200 pt-0.5 w-24 block">H. Joko Susilo</span>
                  <span className="text-[7px] text-slate-400 block leading-tight">Ketua Dewan Pembina</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
