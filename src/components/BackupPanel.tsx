import React, { useState } from "react";
import { getBackups, saveBackups, BackupRecord } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, RefreshCw, Download, Trash2, ArrowUpCircle, ShieldAlert 
} from "lucide-react";
import { toast } from "sonner";

interface BackupPanelProps {
  userRole: string;
}

export function BackupPanel({ userRole }: BackupPanelProps) {
  const [backups, setBackups] = useState<BackupRecord[]>(getBackups());
  const [schedule, setSchedule] = useState("Mingguan");
  const [backingUp, setBackingUp] = useState(false);

  const isReadOnly = userRole === "Viewer";

  const handleBackupNow = () => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    setBackingUp(true);
    toast.info("Menyiapkan pencadangan basis data...");

    setTimeout(() => {
      const date = new Date();
      const formattedDate = date.toISOString().replace("T", " ").substring(0, 16);
      const filename = `sim_tpq_backup_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}_${String(date.getDate()).padStart(2, "0")}.sql`;
      
      const newBackup: BackupRecord = {
        id: "b-" + Date.now(),
        namaFile: filename,
        ukuran: "5.0 MB",
        tanggal: formattedDate,
        status: "Berhasil"
      };

      const updated = [newBackup, ...backups];
      setBackups(updated);
      saveBackups(updated);
      setBackingUp(false);
      toast.success("Pencadangan basis data terenkripsi sukses diselesaikan!");
    }, 1500);
  };

  const handleRestore = (nama: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }

    const confirm = window.confirm(`Apakah Anda yakin ingin melakukan RESTORE database menggunakan file "${nama}"? Semua data aktif saat ini akan diganti.`);
    if (confirm) {
      toast.info("Menghentikan koneksi database aktif & memuat data cadangan...");
      setTimeout(() => {
        toast.success("Restorasi database berhasil diselesaikan! Halaman dimuat ulang.");
        window.location.reload();
      }, 1500);
    }
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) {
      toast.error("Akun Anda hanya memiliki hak akses lihat (Viewer)!");
      return;
    }
    const updated = backups.filter(b => b.id !== id);
    setBackups(updated);
    saveBackups(updated);
    toast.success("Berkas cadangan berhasil dihapus!");
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Backup & Restore Database</h2>
          <p className="text-slate-500 text-sm">Amankan data monitoring dengan melakukan cadangan manual atau otomatis harian/mingguan.</p>
        </div>

        {!isReadOnly && (
          <Button 
            disabled={backingUp} 
            onClick={handleBackupNow} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-2 py-3 text-xs shadow-sm"
          >
            <Database className="h-4.5 w-4.5" /> {backingUp ? "Sedang Memproses..." : "Backup Database Sekarang"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Schedule settings */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 text-left">
          <h3 className="font-display text-base font-bold text-slate-800 flex items-center gap-1.5"><ShieldAlert className="h-5 w-5 text-amber-500" /> Jadwal Cadangan</h3>
          
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-semibold block">Frekuensi Pencadangan Otomatis</span>
            <select
              value={schedule}
              onChange={(e) => {
                setSchedule(e.target.value);
                toast.success(`Jadwal pencadangan otomatis diubah ke: ${e.target.value}`);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 font-bold"
            >
              <option value="Manual">Hanya Manual</option>
              <option value="Harian">Harian (Setiap pukul 00:00)</option>
              <option value="Mingguan">Mingguan (Hari Minggu)</option>
              <option value="Bulanan">Bulanan (Tanggal 1)</option>
            </select>
          </div>

          <div className="text-[10px] text-slate-400 leading-relaxed font-semibold">
            * Seluruh cadangan dienkripsi dengan standar AES-256 dan disimpan dalam penyimpanan cloud sekunder secara aman.
          </div>
        </Card>

        {/* Backups List */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden self-stretch">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nama Berkas Cadangan</th>
                  <th className="px-6 py-4">Ukuran</th>
                  <th className="px-6 py-4">Waktu Backup</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-900 font-bold">{b.namaFile}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">{b.ukuran}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">{b.tanggal}</td>
                    <td className="px-6 py-4">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-full text-[10px]">
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-1">
                      <Button onClick={() => handleRestore(b.namaFile)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg" title="Restore Data">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => toast.success("Mengunduh berkas cadangan...")} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg" title="Unduh File">
                        <Download className="h-4 w-4" />
                      </Button>
                      {!isReadOnly && (
                        <Button onClick={() => handleDelete(b.id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg" title="Hapus File">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
