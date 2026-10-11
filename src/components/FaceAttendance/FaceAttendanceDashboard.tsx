import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, CheckCircle2, AlertTriangle, ShieldCheck, 
  History, Camera, Trash2, Filter
} from "lucide-react";
import { getFaceEnrollments, getFaceScanEvents, getFaceTemplates, deleteFaceEnrollment } from "@/lib/faceStorage";
import { Generus, Presensi } from "@/lib/mockData";
import { toast } from "sonner";

interface FaceAttendanceDashboardProps {
  selectedKelompok: string;
  activeDate: string;
  jenisPengajian: string;
  generusList: Generus[];
  presensiList: Presensi[];
  onOpenEnrollmentModal: (student: Generus) => void;
}

export function FaceAttendanceDashboard({
  selectedKelompok,
  activeDate,
  jenisPengajian,
  generusList,
  presensiList,
  onOpenEnrollmentModal,
}: FaceAttendanceDashboardProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [events, setEvents] = useState(() => getFaceScanEvents());
  const [enrollments, setEnrollments] = useState(() => getFaceEnrollments());
  const [templates, setTemplates] = useState(() => getFaceTemplates());

  const groupStudents = generusList.filter(g => g.namaKelompok === selectedKelompok);
  const enrolledStudentIds = new Set(templates.filter(t => t.isActive).map(t => t.generusId));

  const refreshData = () => {
    setEvents(getFaceScanEvents());
    setEnrollments(getFaceEnrollments());
    setTemplates(getFaceTemplates());
  };

  const handleDelete = (student: Generus) => {
    if (confirm(`Hapus template wajah ${student.namaLengkap}?`)) {
      deleteFaceEnrollment(student.id);
      refreshData();
      toast.success(`Template ${student.namaLengkap} berhasil dihapus.`);
    }
  };

  // Statistik Kehadiran Sesi ini
  const sessionPresensi = presensiList.filter(
    p => p.namaKelompok === selectedKelompok &&
         p.tanggal === activeDate &&
         (!p.jenisPengajian || p.jenisPengajian === jenisPengajian)
  );
  const totalHadir = sessionPresensi.filter(p => p.statusKehadiran === "Hadir").length;
  const hadirViaWajah = sessionPresensi.filter(
    p => p.statusKehadiran === "Hadir" && p.keterangan && p.keterangan.includes("Wajah")
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Santri</p>
              <h3 className="text-2xl font-black text-slate-800">{groupStudents.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Target jamaah {selectedKelompok}</p>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Wajah Terdaftar</p>
              <h3 className="text-2xl font-black text-indigo-600">
                {groupStudents.filter(s => enrolledStudentIds.has(s.id)).length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Camera className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-indigo-600 mt-2 font-bold">
            {groupStudents.length > 0
              ? `${Math.round((groupStudents.filter(s => enrolledStudentIds.has(s.id)).length / groupStudents.length) * 100)}% ter-enroll`
              : "0%"}
          </p>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Hadir Hari Ini</p>
              <h3 className="text-2xl font-black text-emerald-600">{totalHadir}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-600 mt-2 font-bold">
            {hadirViaWajah} via Face Scan
          </p>
        </Card>

        <Card className="rounded-2xl border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Log Audit Scan</p>
              <h3 className="text-2xl font-black text-slate-800">{events.length}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <History className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Recorded events</p>
        </Card>
      </div>

      {/* Tabel Status Registrasi Jamaah Kelompok */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-slate-800 text-base">Status Registrasi Wajah Jamaah</h4>
            <p className="text-xs text-slate-400">Kelola dan perbarui template biometrik santri per kelompok</p>
          </div>
          <input
            type="text"
            placeholder="Cari nama santri..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full sm:w-60 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Jamaah / Santri</th>
                <th className="px-5 py-3">NIS</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Status Face ID</th>
                <th className="px-5 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupStudents
                .filter(s => s.namaLengkap.toLowerCase().includes(filterQuery.toLowerCase()))
                .map((student) => {
                  const hasTemplate = enrolledStudentIds.has(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2.5">
                        <img
                          src={student.foto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                          alt={student.namaLengkap}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <span>{student.namaLengkap}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{student.nisInternal}</td>
                      <td className="px-5 py-3.5 text-slate-600">{student.kategori || "Caberawit"}</td>
                      <td className="px-5 py-3.5">
                        {hasTemplate ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-200">
                            Aktif (Terdaftar)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">
                            Belum Ada Template
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                          onClick={() => onOpenEnrollmentModal(student)}
                        >
                          {hasTemplate ? "Re-enroll" : "Daftarkan"}
                        </Button>
                        {hasTemplate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(student)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Log Scan Events */}
      <Card className="rounded-3xl border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            Riwayat Audit Event Scan Wajah
          </h4>
          <span className="text-[10px] text-slate-400">Paling baru di atas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="px-3 py-2">Waktu</th>
                <th className="px-3 py-2">Kegiatan</th>
                <th className="px-3 py-2">Jamaah Teridentifikasi</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Akurasi</th>
                <th className="px-3 py-2">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.slice(0, 10).map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-slate-400 text-[11px]">
                    {new Date(ev.createdAt).toLocaleTimeString("id-ID")}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{ev.sessionName}</td>
                  <td className="px-3 py-2 font-bold text-slate-800">{ev.matchedNama || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge
                      className={
                        ev.statusResult === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : ev.statusResult === "already_present"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {ev.statusResult}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-indigo-600">
                    {ev.confidenceScore ? `${ev.confidenceScore}%` : "-"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-[11px]">{ev.scannedBy || "Petugas"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
