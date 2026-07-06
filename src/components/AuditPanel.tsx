import React, { useState } from "react";
import { getAuditLogs, AuditLogRecord } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldAlert, Monitor, User } from "lucide-react";

export function AuditPanel() {
  const [logs] = useState<AuditLogRecord[]>(getAuditLogs());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua");

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.username.toLowerCase().includes(search.toLowerCase()) || 
                          log.aktivitas.toLowerCase().includes(search.toLowerCase()) || 
                          log.ipAddress.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "Semua" || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">Audit Logs (Jejak Aktivitas)</h2>
        <p className="text-slate-500 text-sm">Rekaman log audit keamanan aktivitas operator, modifikasi data, ekspor laporan, dan login ke sistem.</p>
      </div>

      {/* Filter and Search */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan username, aktivitas, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none h-10 w-full sm:w-[160px] font-bold"
            >
              <option value="Semua">Semua Peran</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin Daerah">Admin Daerah</option>
              <option value="Pengajar">Pengajar</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Roster list */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs uppercase bg-slate-50 text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">User / Peran</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">IP & Perangkat</th>
                <th className="px-6 py-4">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{log.username}</div>
                          <Badge variant="outline" className="text-[9px] font-bold rounded-full">{log.role}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 text-xs leading-relaxed">{log.aktivitas}</td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-mono text-slate-500 font-bold">{log.ipAddress}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5"><Monitor className="h-3 w-3" /> {log.perangkat}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">
                      <div>{log.tanggal}</div>
                      <div className="text-[10px] text-slate-300">{log.jam}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada jejak log aktivitas ditemukan.
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
