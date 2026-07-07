import React, { useState, useEffect } from "react";
import { getAuditLogs, AuditLogRecord } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, ShieldAlert, History, Filter, FileSpreadsheet, 
  TrendingUp, Users, Settings, Database, Activity, Calendar
} from "lucide-react";
import { toast } from "sonner";

export function LaporanPerubahanPanel() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [search, setSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState("Semua");
  const [userFilter, setUserFilter] = useState("Semua");

  // Load audit logs on mount and when changes occur in local storage
  useEffect(() => {
    const loadLogs = () => {
      setLogs(getAuditLogs());
    };
    loadLogs();
    // Poll logs every 2 seconds to make the "real-time report" feel alive
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Extract unique features and users for filters
  const uniqueFeatures = Array.from(new Set(logs.map(log => {
    const match = log.aktivitas.match(/fitur\s+(.+)$/i);
    return match ? match[1] : "Sistem";
  })));

  const uniqueUsers = Array.from(new Set(logs.map(log => log.username)));

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase()) || 
                          log.aktivitas.toLowerCase().includes(search.toLowerCase()) || 
                          log.ipAddress.toLowerCase().includes(search.toLowerCase());
    
    const featureName = log.aktivitas.match(/fitur\s+(.+)$/i)?.[1] || "Sistem";
    const matchesFeature = featureFilter === "Semua" || featureName === featureFilter;
    const matchesUser = userFilter === "Semua" || log.username === userFilter;
    
    return matchesSearch && matchesFeature && matchesUser;
  });

  // Calculate statistics
  const totalChanges = logs.length;
  
  // Find most active user
  const userCounts = logs.reduce((acc: any, log) => {
    acc[log.username] = (acc[log.username] || 0) + 1;
    return acc;
  }, {});
  let mostActiveUser = "-";
  let maxUserCount = 0;
  Object.keys(userCounts).forEach(u => {
    if (userCounts[u] > maxUserCount) {
      maxUserCount = userCounts[u];
      mostActiveUser = u;
    }
  });

  // Find most modified feature
  const featureCounts = logs.reduce((acc: any, log) => {
    const feat = log.aktivitas.match(/fitur\s+(.+)$/i)?.[1] || "Sistem";
    acc[feat] = (acc[feat] || 0) + 1;
    return acc;
  }, {});
  let mostModifiedFeature = "-";
  let maxFeatureCount = 0;
  Object.keys(featureCounts).forEach(f => {
    if (featureCounts[f] > maxFeatureCount) {
      maxFeatureCount = featureCounts[f];
      mostModifiedFeature = f;
    }
  });

  const handleExport = () => {
    toast.success("Laporan riwayat perubahan data berhasil diekspor sebagai Excel/CSV (Simulator)!");
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950/40 p-8 rounded-3xl text-left shadow-xl shadow-indigo-950/10">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <Badge className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full font-bold text-[9px] uppercase tracking-wider px-3.5 py-1">
              Khusus Super Admin Aldi
            </Badge>
            <h2 className="font-display text-3xl font-black text-white flex items-center gap-2">
              <History className="h-7 w-7 text-indigo-500 animate-spin" style={{ animationDuration: '8s' }} /> Laporan Perubahan Data
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl">
              Pusat pemantauan mutasi data di seluruh modul TPQ secara real-time. Melacak penambahan, penyuntingan, dan penghapusan informasi.
            </p>
          </div>
          
          <Button 
            onClick={handleExport} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-5 px-6 font-bold text-xs gap-2 shadow-lg shadow-indigo-600/15"
          >
            <FileSpreadsheet className="h-4.5 w-4.5" /> Ekspor Log Riwayat (.xlsx)
          </Button>
        </div>
      </div>

      {/* Stats Summary Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Perubahan Data</span>
            <span className="font-display text-2xl font-black text-slate-900">{totalChanges} Aktivitas</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kontributor Teraktif</span>
            <span className="font-display text-lg font-black text-slate-900 truncate max-w-[180px] block">@{mostActiveUser}</span>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Database className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fitur Paling Sering Diubah</span>
            <span className="font-display text-lg font-black text-slate-900 truncate max-w-[180px] block">{mostModifiedFeature}</span>
          </div>
        </Card>
      </div>

      {/* Advanced Filter controls */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan kata kunci aktivitas, operator, atau alamat IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5 w-full"
            />
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-1.5 w-full sm:w-[180px]">
              <Filter className="h-3.5 w-3.5 text-slate-450 shrink-0" />
              <select
                value={featureFilter}
                onChange={(e) => setFeatureFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full font-bold"
              >
                <option value="Semua">Semua Fitur</option>
                {uniqueFeatures.map(feat => (
                  <option key={feat} value={feat}>{feat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-[160px]">
              <Users className="h-3.5 w-3.5 text-slate-450 shrink-0" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full font-bold"
              >
                <option value="Semua">Semua Admin</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>@{user}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History table */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
          <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-indigo-500 animate-pulse" /> Jejak Audit Histori Perubahan Data
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-450 font-medium">Menampilkan {filteredLogs.length} dari total {logs.length} histori aktivitas terdaftar.</CardDescription>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs uppercase bg-slate-50 text-slate-450 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Operator / Role</th>
                <th className="px-6 py-4">Deskripsi Perubahan Data</th>
                <th className="px-6 py-4">IP & Browser</th>
                <th className="px-6 py-4">Hari & Jam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const featureName = log.aktivitas.match(/fitur\s+(.+)$/i)?.[1] || "Sistem";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">@{log.username}</div>
                          <Badge variant="outline" className="text-[8px] font-bold rounded-full mt-0.5 border-slate-200 text-slate-500 bg-slate-50">
                            {log.role}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 text-xs">{log.aktivitas}</div>
                          <Badge className="bg-indigo-50 text-indigo-700 border-none text-[8.5px] font-extrabold rounded-md px-1.5 py-0.5">
                            {featureName}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-mono text-slate-500 font-bold">{log.ipAddress}</div>
                        <div className="text-slate-400 truncate max-w-[180px] mt-0.5" title={log.perangkat}>{log.perangkat}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" /> {log.tanggal}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5">{log.jam} WIB</div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada log perubahan data yang cocok dengan kriteria filter.
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
