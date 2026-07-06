import React, { useState } from "react";
import { getKelompok, getGenerus, Kelompok, Generus } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  DollarSign, FileSpreadsheet, Printer, ArrowDownRight, ArrowUpRight, 
  Send, Upload, Search, Heart, RefreshCw, Calendar 
} from "lucide-react";
import { toast } from "sonner";

interface KeuanganPanelProps {
  userRole: string;
}

export function KeuanganPanel({ userRole }: KeuanganPanelProps) {
  const [generus] = useState<Generus[]>(getGenerus());
  const [kelompokList] = useState<Kelompok[]>(getKelompok());

  const [activeSubTab, setActiveSubTab] = useState<"transaksi" | "spp" | "donatur">("transaksi");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");

  const isReadOnly = userRole === "Viewer";

  // Mock Transactions Database
  const [transactions, setTransactions] = useState<any[]>([
    { id: "tx-1", tanggal: "2026-07-06", nama: "Ahmad Bagus Pratama", kategori: "SPP", tipe: "Pemasukan", jumlah: 150000, metode: "Transfer Bank", status: "Lunas", bukti: "bukti_ahmad.png" },
    { id: "tx-2", tanggal: "2026-07-06", nama: "H. Joko Susilo", kategori: "Donasi", tipe: "Pemasukan", jumlah: 1000000, metode: "Transfer Bank", status: "Lunas", bukti: "bukti_joko.png" },
    { id: "tx-3", tanggal: "2026-07-05", nama: "Usth. Fatmawati", kategori: "Kas Desa", tipe: "Pengeluaran", jumlah: 350000, metode: "Manual", status: "Lunas", bukti: "" },
    { id: "tx-4", tanggal: "2026-07-04", nama: "Siti Rahmawati", kategori: "SPP", tipe: "Pemasukan", jumlah: 150000, metode: "Digital", status: "Menunggu Verifikasi", bukti: "bukti_siti.jpg" }
  ]);

  // SPP Arrears Mock database
  const sppList = [
    { id: "spp-1", nama: "Muhammad Zaki", kelompok: kelompokList[2]?.namaKelompok, nominal: 150000, tunggakan: 1, kontak: "085712345678" },
    { id: "spp-2", nama: "Rizky Ramadhan", kelompok: kelompokList[4]?.namaKelompok, nominal: 150000, tunggakan: 2, kontak: "089988776655" }
  ];

  const topDonatur = [
    { nama: "H. Joko Susilo", total: "Rp 5.500.000", status: "Donatur Tetap" },
    { nama: "Budi Utomo", total: "Rp 3.200.000", status: "Donatur Tetap" },
    { nama: "Agus Suprianto", total: "Rp 1.500.000", status: "Donatur Sukarela" }
  ];

  const chartData = [
    { name: "Jan", Pemasukan: 12000000, Pengeluaran: 8500000 },
    { name: "Feb", Pemasukan: 14000000, Pengeluaran: 9000000 },
    { name: "Mar", Pemasukan: 15500000, Pengeluaran: 10000000 },
    { name: "Apr", Pemasukan: 11000000, Pengeluaran: 9500000 },
    { name: "Mei", Pemasukan: 18000000, Pengeluaran: 12000000 },
    { name: "Jun", Pemasukan: 22000000, Pengeluaran: 11000000 }
  ];

  // Calculated widgets totals
  const totalIn = transactions.filter(t => t.tipe === "Pemasukan").reduce((acc, t) => acc + t.jumlah, 0);
  const totalOut = transactions.filter(t => t.tipe === "Pengeluaran").reduce((acc, t) => acc + t.jumlah, 0);
  const saldo = totalIn - totalOut;

  const handleVerify = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: "Lunas" } : t));
    toast.success("Pembayaran digital sukses diverifikasi!");
  };

  const handleReminder = (name: string, nominal: number) => {
    toast.success(`WhatsApp reminder tagihan Rp ${nominal.toLocaleString("id-ID")} berhasil terkirim ke Orang Tua ${name}!`);
  };

  const filteredTrans = transactions.filter(t => {
    const matchesSearch = t.nama.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === "Semua" || t.kategori === catFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Manajemen Keuangan Platform</h2>
          <p className="text-slate-500 text-sm">Kelola SPP bulanan santri, infaq kas pembangunan, donasi eksternal, dan pengeluaran operasional.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => toast.success("Mengekspor data keuangan ke Excel...")} variant="outline" className="gap-2 border-slate-200 hover:bg-slate-100 font-semibold rounded-xl text-xs py-2 px-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Ekspor Laporan Kas
          </Button>
        </div>
      </div>

      {/* Financial Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Total Pemasukan</span>
            <span className="font-display text-2xl font-black text-emerald-600">Rp {totalIn.toLocaleString("id-ID")}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Total Pengeluaran</span>
            <span className="font-display text-2xl font-black text-rose-600">Rp {totalOut.toLocaleString("id-ID")}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Sisa Saldo Kas</span>
            <span className="font-display text-2xl font-black text-blue-600">Rp {saldo.toLocaleString("id-ID")}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Navigation sub-tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1 max-w-fit">
        <button onClick={() => setActiveSubTab("transaksi")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "transaksi" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Roster Transaksi
        </button>
        <button onClick={() => setActiveSubTab("spp")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "spp" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Tunggakan SPP (Wali Santri)
        </button>
        <button onClick={() => setActiveSubTab("donatur")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === "donatur" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:bg-slate-200/50"}`}>
          Top Donatur & Arus Kas
        </button>
      </div>

      {activeSubTab === "transaksi" && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cari berdasarkan nama penyetor/pembayar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
                />
              </div>
              <div>
                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[160px] font-bold"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="SPP">SPP</option>
                  <option value="Donasi">Donasi</option>
                  <option value="Infaq">Infaq</option>
                  <option value="Kas Desa">Kas Desa</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Penyetor / Keterangan</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Jumlah</th>
                    <th className="px-6 py-4">Metode</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTrans.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{t.tanggal}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{t.nama}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.kategori}</td>
                      <td className={`px-6 py-4 font-black ${
                        t.tipe === "Pemasukan" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        Rp {t.jumlah.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">{t.metode}</td>
                      <td className="px-6 py-4">
                        <Badge className={`font-bold rounded-full text-[10px] ${
                          t.status === "Lunas" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        {t.status === "Menunggu Verifikasi" && (
                          <Button onClick={() => handleVerify(t.id)} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] py-1 px-2 rounded-lg">
                            Verifikasi
                          </Button>
                        )}
                        <Button onClick={() => {
                          toast.success(`Mencetak kwitansi pembayaran ${t.nama}...`);
                          window.print();
                        }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeSubTab === "spp" && (
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Santri</th>
                  <th className="px-6 py-4">Kelompok TPQ</th>
                  <th className="px-6 py-4">Tunggakan SPP</th>
                  <th className="px-6 py-4">Total Tagihan</th>
                  <th className="px-6 py-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sppList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900">{s.nama}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-450">{s.kelompok}</td>
                    <td className="px-6 py-4 text-xs text-rose-600 font-bold">{s.tunggakan} Bulan</td>
                    <td className="px-6 py-4 font-black text-rose-600">Rp {(s.nominal * s.tunggakan).toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-right">
                      {!isReadOnly && (
                        <Button onClick={() => handleReminder(s.nama, s.nominal * s.tunggakan)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl py-2 px-4 gap-1 shadow-sm">
                          <Send className="h-3.5 w-3.5" /> Kirim WA Reminder
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeSubTab === "donatur" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
          <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-sm font-bold text-slate-800">Tren Pemasukan vs Pengeluaran Bulanan</CardTitle>
            </CardHeader>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Heart className="h-4.5 w-4.5 text-rose-500" /> Donatur Tetap & Sukarela</h3>
            <div className="space-y-3">
              {topDonatur.map((d, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">{d.nama}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{d.status}</span>
                  </div>
                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-extrabold">{d.total}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
