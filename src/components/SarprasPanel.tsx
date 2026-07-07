import React, { useState } from "react";
import { getSarpras, saveSarpras, Sarpras, getKelompok, Kelompok } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Building, Wrench, ShieldAlert, Check, HelpCircle, Star, Save, ClipboardList 
} from "lucide-react";
import { toast } from "sonner";

interface SarprasPanelProps {
  userRole: string;
}

export function SarprasPanel({ userRole }: SarprasPanelProps) {
  const [allSarpras, setAllSarpras] = useState<Sarpras[]>(getSarpras());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());

  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
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

  const sarprasRecords = allSarpras.filter(s => allowedKelompoks.includes(s.namaKelompok));
  const [selectedRecordId, setSelectedRecordId] = useState(sarprasRecords[0]?.id || "");

  const activeRecord = sarprasRecords.find(s => s.id === selectedRecordId);

  const isReadOnly = userRole === "Viewer";

  const handleToggleFacility = (field: keyof Omit<Sarpras, "id" | "kelompokId" | "namaKelompok" | "fotoKondisi" | "catatan" | "statusLayak" | "skorSarpras">) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (!activeRecord) return;

    // Toggle field
    const nextVal = !activeRecord[field];
    
    // Recalculate score (15 checklist items total)
    const checklistFields: (keyof Omit<Sarpras, "id" | "kelompokId" | "namaKelompok" | "fotoKondisi" | "catatan" | "statusLayak" | "skorSarpras">)[] = [
      "gedung", "meja", "kursi", "karpet", "papanTulis", "alquran", "iqro", 
      "soundSystem", "kipas", "lcd", "toilet", "tempatWudhu", "lampu", "internet", "kebersihan"
    ];

    const trueCount = checklistFields.reduce((acc, f) => {
      if (f === field) return acc + (nextVal ? 1 : 0);
      return acc + (activeRecord[f] ? 1 : 0);
    }, 0);

    const calculatedScore = Math.round((trueCount / 15) * 100);
    const calculatedLayak = calculatedScore >= 60; // Auto layak if score >= 60%

    const updated = allSarpras.map(r => {
      if (r.id === activeRecord.id) {
        return {
          ...r,
          [field]: nextVal,
          skorSarpras: calculatedScore,
          statusLayak: calculatedLayak
        };
      }
      return r;
    });

    setAllSarpras(updated);
    saveSarpras(updated);
  };

  const handleSaveNotes = (catatanText: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    if (!activeRecord) return;

    const updated = allSarpras.map(r => {
      if (r.id === activeRecord.id) {
        return {
          ...r,
          catatan: catatanText
        };
      }
      return r;
    });

    setAllSarpras(updated);
    saveSarpras(updated);
    toast.success("Catatan kondisi sarpras berhasil diperbarui!");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Sarana & Prasarana</h2>
          <p className="text-slate-500 text-sm">Monitor kelayakan fasilitas dan skor sarpras di seluruh 32 unit TPQ binaan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left list */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800">Daftar TPQ</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {sarprasRecords.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedRecordId(s.id)}
                className={`w-full p-4 text-left transition-colors flex items-center justify-between ${
                  selectedRecordId === s.id ? "bg-emerald-50/50 border-r-4 border-emerald-600" : "hover:bg-slate-50/50"
                }`}
              >
                <div className="max-w-[180px] truncate">
                  <h4 className="font-bold text-slate-900 text-xs truncate">{s.namaKelompok}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Skor Sarpras: {s.skorSarpras}</span>
                </div>
                <Badge className={`text-[9px] font-bold uppercase rounded-full ${
                  s.statusLayak ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}>
                  {s.statusLayak ? "Layak" : "Kurang Layak"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right Audit Check */}
        {activeRecord ? (
          <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div>
                <CardTitle className="font-display text-lg font-bold text-slate-900">{activeRecord.namaKelompok}</CardTitle>
                <CardDescription className="text-xs">Ubah checklist kelayakan prasarana di bawah untuk mengubah kalkulasi skor.</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Skor Audit</span>
                  <span className="font-display text-3xl font-black text-slate-900">{activeRecord.skorSarpras}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Status</span>
                  <Badge className={`text-[10px] font-bold px-3 py-1 rounded-full mt-1 ${
                    activeRecord.statusLayak ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {activeRecord.statusLayak ? "Layak Beroperasi" : "Tidak Layak"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Facility checklist grid */}
              <div className="space-y-4">
                <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="h-4.5 w-4.5" /> Checklist Audit Fasilitas (15 Parameter)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Gedung / Ruang Belajar", field: "gedung" },
                    { label: "Meja Belajar Santri", field: "meja" },
                    { label: "Kursi Pengajar", field: "kursi" },
                    { label: "Karpet / Alas Lantai", field: "karpet" },
                    { label: "Papan Tulis Kelas", field: "papanTulis" },
                    { label: "Kecukupan Al-Qur'an", field: "alquran" },
                    { label: "Kecukupan Buku Iqro", field: "iqro" },
                    { label: "Sound System / Speaker", field: "soundSystem" },
                    { label: "Kipas Angin / AC", field: "kipas" },
                    { label: "Proyektor / Layar LCD", field: "lcd" },
                    { label: "Ketersediaan Toilet", field: "toilet" },
                    { label: "Tempat Wudhu Air Mengalir", field: "tempatWudhu" },
                    { label: "Penerangan / Lampu", field: "lampu" },
                    { label: "Akses Internet / WiFi", field: "internet" },
                    { label: "Kebersihan & Kenyamanan", field: "kebersihan" }
                  ].map((item, idx) => {
                    const isChecked = activeRecord[item.field as keyof Sarpras];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleFacility(item.field as any)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all text-left ${
                          isChecked 
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-800" 
                            : "bg-white border-slate-100 hover:bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span>{item.label}</span>
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 border ${
                          isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isChecked && <Check className="h-2.5 w-2.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2 border-t border-slate-100 pt-6">
                <label className="text-xs font-bold text-slate-700 block">Temuan Audit & Catatan Perbaikan</label>
                <div className="flex gap-2">
                  <Input
                    defaultValue={activeRecord.catatan}
                    placeholder="Tulis saran perbaikan sarpras untuk pengurus kelompok..."
                    className="rounded-xl border-slate-200 text-slate-900 text-sm flex-grow"
                    id={`notes-${activeRecord.id}`}
                  />
                  {!isReadOnly && (
                    <Button 
                      onClick={() => {
                        const input = document.getElementById(`notes-${activeRecord.id}`) as HTMLInputElement;
                        handleSaveNotes(input?.value || "");
                      }} 
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold py-2.5 px-4 text-xs shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="h-4 w-4" /> Simpan Catatan
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="lg:col-span-8 py-12 text-center text-slate-400 font-medium">
            Tidak ada data sarpras terpilih.
          </div>
        )}
      </div>
    </div>
  );
}
