import React, { useState } from "react";
import { getKelompok, Kelompok } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Wrench, Search, Plus, Calendar, QrCode, ClipboardList, 
  ArrowLeftRight, Trash2, ShieldCheck, Printer
} from "lucide-react";
import { toast } from "sonner";

interface InventarisPanelProps {
  userRole: string;
}

export function InventarisPanel({ userRole }: InventarisPanelProps) {
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  
  const [search, setSearch] = useState("");
  const [condFilter, setCondFilter] = useState("Semua");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const isReadOnly = userRole === "Viewer";

  // Mock Assets Database
  const [assets, setAssets] = useState<any[]>([
    { id: "ast-1", kode: "AST-TKR-001", nama: "Proyektor Epson X41", kategori: "Proyektor", lokasi: "Ruang Utama", kelompok: kelompokList[0]?.namaKelompok, tglBeli: "2024-05-10", harga: 5500000, kondisi: "Layak Pakai", foto: "" },
    { id: "ast-2", kode: "AST-TKR-002", nama: "Karpet Sajadah Bulu", kategori: "Karpet", lokasi: "Masjid Utama", kelompok: kelompokList[0]?.namaKelompok, tglBeli: "2025-02-12", harga: 1200000, kondisi: "Layak Pakai", foto: "" },
    { id: "ast-3", kode: "AST-KWD-003", nama: "Sound System Portable Baretone", kategori: "Sound System", lokasi: "Gudang Alat", kelompok: kelompokList[1]?.namaKelompok, tglBeli: "2023-11-20", harga: 3800000, kondisi: "Perlu Perawatan", foto: "" },
    { id: "ast-4", kode: "AST-SKM-004", nama: "Laptop ASUS Core i3", kategori: "Laptop", lokasi: "Sekretariat", kelompok: kelompokList[2]?.namaKelompok, tglBeli: "2024-09-05", harga: 6800000, kondisi: "Rusak", foto: "" }
  ]);

  // Checkout/Peminjaman Mock log
  const [loanLogs, setLoanLogs] = useState<any[]>([
    { id: "ln-1", aset: "Proyektor Epson X41", peminjam: "Ust. Heri Susanto", tglPinjam: "2026-07-06", tglKembali: "2026-07-06", status: "Sudah Dikembalikan" }
  ]);

  const handleMaintenance = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setAssets(assets.map(a => a.id === id ? { ...a, kondisi: "Layak Pakai" } : a));
    toast.success("Perawatan aset selesai dilakukan! Kondisi diperbarui ke Layak Pakai.");
  };

  const handleCheckout = (asetNama: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const newLog = {
      id: "ln-" + Date.now(),
      aset: asetNama,
      peminjam: userRole === "Super Admin" ? "Admin Daerah" : "Ust. Pengajar",
      tglPinjam: new Date().toISOString().split("T")[0],
      tglKembali: "-",
      status: "Dipinjam"
    };
    setLoanLogs([newLog, ...loanLogs]);
    toast.success(`Aset "${asetNama}" berhasil dipinjam!`);
  };

  const handleReturn = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setLoanLogs(loanLogs.map(l => l.id === id ? { ...l, status: "Sudah Dikembalikan", tglKembali: new Date().toISOString().split("T")[0] } : l));
    toast.success("Aset berhasil dikembalikan ke inventaris!");
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.nama.toLowerCase().includes(search.toLowerCase()) || 
                          a.kode.toLowerCase().includes(search.toLowerCase());
    const matchesCond = condFilter === "Semua" || a.kondisi === condFilter;
    return matchesSearch && matchesCond;
  });

  const activeAsset = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Manajemen Inventaris & Aset</h2>
          <p className="text-slate-500 text-sm">Registrasi kepemilikan aset sarana TPQ sewilayah, riwayat pemeliharaan, serta log sirkulasi peminjaman alat.</p>
        </div>
      </div>

      {/* Filters and search */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan kode asset atau nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={condFilter}
              onChange={(e) => setCondFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[160px] font-bold"
            >
              <option value="Semua">Semua Kondisi</option>
              <option value="Layak Pakai">Layak Pakai</option>
              <option value="Perlu Perawatan">Perlu Perawatan</option>
              <option value="Rusak">Rusak</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Asset Grid Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((a) => (
          <Card key={a.id} className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col justify-between hover:border-slate-350 transition-all text-left">
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 font-bold tracking-wider">{a.kode}</span>
                  <h3 className="font-display text-sm font-extrabold text-slate-900 leading-snug">{a.nama}</h3>
                </div>
                <Badge className={`font-bold rounded-full text-[10px] ${
                  a.kondisi === "Layak Pakai" ? "bg-emerald-50 text-emerald-700" :
                  a.kondisi === "Perlu Perawatan" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                }`}>
                  {a.kondisi}
                </Badge>
              </div>

              <div className="space-y-1 text-xs font-semibold text-slate-500">
                <div>Kategori: <span className="text-slate-800 font-bold">{a.kategori}</span></div>
                <div>Lokasi: <span className="text-slate-800">{a.lokasi}</span></div>
                <div className="truncate">TPQ: <span className="text-slate-800">{a.kelompok}</span></div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setSelectedAssetId(a.id)} variant="outline" className="p-2 border-slate-200 rounded-lg hover:bg-slate-50 h-8 w-8 text-slate-400 hover:text-slate-700" title="Tampilkan Barcode QR">
                  <QrCode className="h-4 w-4" />
                </Button>
                {a.kondisi !== "Layak Pakai" && (
                  <Button onClick={() => handleMaintenance(a.id)} className="h-8 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl px-3 text-[10px] font-bold gap-1">
                    <Wrench className="h-3 w-3" /> Selesai Perawatan
                  </Button>
                )}
                {a.kondisi === "Layak Pakai" && (
                  <Button onClick={() => handleCheckout(a.nama)} className="h-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3 text-[10px] font-bold gap-1">
                    <ArrowLeftRight className="h-3 w-3" /> Pinjam Aset
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Circulation Loan Logs */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left space-y-4">
        <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><ClipboardList className="h-4.5 w-4.5 text-indigo-500" /> Log Peminjaman & Sirkulasi Aset</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="text-[10px] uppercase bg-slate-50 text-slate-400 border-b border-slate-200 font-extrabold">
              <tr>
                <th className="px-4 py-3">Nama Aset</th>
                <th className="px-4 py-3">Peminjam</th>
                <th className="px-4 py-3">Pinjam</th>
                <th className="px-4 py-3">Kembali</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loanLogs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50 font-medium">
                  <td className="px-4 py-3 font-bold text-slate-900">{l.aset}</td>
                  <td className="px-4 py-3 text-slate-600">{l.peminjam}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 font-bold">{l.tglPinjam}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 font-bold">{l.tglKembali}</td>
                  <td className="px-4 py-3">
                    <Badge className={`font-bold rounded-full text-[9px] ${
                      l.status === "Sudah Dikembalikan" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse"
                    }`}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.status === "Dipinjam" && (
                      <Button onClick={() => handleReturn(l.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] py-1 px-2.5 rounded-lg h-7">
                        Kembalikan
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Asset QR Dialog */}
      <Dialog open={selectedAssetId !== null} onOpenChange={() => setSelectedAssetId(null)}>
        <DialogContent className="sm:max-w-[320px] rounded-2xl text-center p-6 space-y-4">
          {activeAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-sm font-bold text-slate-800">Cetak Label QR Aset</DialogTitle>
                <DialogDescription className="text-slate-400 text-xs">Tempelkan barcode QR ini pada inventaris fisik.</DialogDescription>
              </DialogHeader>

              <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-fit mx-auto shadow-inner flex flex-col items-center space-y-2">
                <div className="bg-slate-100 h-32 w-32 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200/50">
                  <QrCode className="h-20 w-20 text-slate-850" />
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 tracking-widest">{activeAsset.kode}</span>
                <span className="text-[10px] text-slate-500 font-bold truncate max-w-[180px]">{activeAsset.nama}</span>
              </div>

              <Button onClick={() => {
                toast.success("Mempersiapkan dokumen cetak label QR Aset...");
                window.print();
              }} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                <Printer className="h-4 w-4" /> Cetak Label Aset
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
