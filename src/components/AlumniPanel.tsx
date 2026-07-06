import React, { useState } from "react";
import { getAlumni, saveAlumni, Alumni } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, FileSpreadsheet, Trash2, Milestone } from "lucide-react";
import { toast } from "sonner";

interface AlumniPanelProps {
  userRole: string;
}

export function AlumniPanel({ userRole }: AlumniPanelProps) {
  const [alumniList, setAlumniList] = useState<Alumni[]>(getAlumni());
  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("Semua");

  const isReadOnly = userRole === "Viewer";

  const handleDelete = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const confirm = window.confirm("Apakah Anda yakin ingin menghapus data arsip alumni ini?");
    if (confirm) {
      const updated = alumniList.filter(a => a.id !== id);
      setAlumniList(updated);
      saveAlumni(updated);
      toast.success("Data alumni terhapus!");
    }
  };

  const handlePrintAlumni = (a: Alumni) => {
    toast.success(`Mempersiapkan kartu kelulusan alumni: ${a.namaLengkap}...`);
    window.print();
  };

  const filteredAlumni = alumniList.filter(a => {
    const matchesSearch = a.namaLengkap.toLowerCase().includes(search.toLowerCase()) || 
                          a.nisInternal.toLowerCase().includes(search.toLowerCase());
    const matchesTahun = tahunFilter === "Semua" || String(a.tahunLulus) === tahunFilter;
    return matchesSearch && matchesTahun;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Arsip Alumni Generus</h2>
          <p className="text-slate-500 text-sm">Database historis santri generus yang telah menyelesaikan jenjang pembinaan Kelompok.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => toast.success("Mengekspor data alumni ke Excel...")} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Ekspor Excel Alumni
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan nama atau NIS alumni..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={tahunFilter}
              onChange={(e) => setTahunFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[150px] font-bold"
            >
              <option value="Semua">Semua Tahun</option>
              <option value="2025">Lulus 2025</option>
              <option value="2024">Lulus 2024</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table listing */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">NIS</th>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">JK</th>
                <th className="px-6 py-4">Kelompok Asal</th>
                <th className="px-6 py-4">Tahun Lulus</th>
                <th className="px-6 py-4">Nilai Kelulusan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlumni.length > 0 ? (
                filteredAlumni.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{a.nisInternal}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{a.namaLengkap}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{a.jenisKelamin}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">{a.tpqAsal}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-semibold rounded-full bg-slate-50 text-slate-600 text-xs">
                        Tahun {a.tahunLulus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{a.nilaiTerakhir} (Rata-rata)</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                      <Button onClick={() => handlePrintAlumni(a)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!isReadOnly && (
                        <Button onClick={() => handleDelete(a.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada data alumni terarsipkan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
