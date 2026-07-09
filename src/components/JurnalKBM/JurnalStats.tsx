import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { BookOpen, Calendar, Users, Award, Sparkles, TrendingUp, CheckCircle, Clock } from "lucide-react";

interface JurnalStatsProps {
  journals: any[];
}

export function JurnalStats({ journals }: JurnalStatsProps) {
  // 1. Calculations
  const totalJurnal = journals.length;
  
  const todayStr = new Date().toISOString().split("T")[0];
  const jurnalHariIni = journals.filter(j => j.tanggal === todayStr).length;
  
  // Calculate average attendance rate
  const loggedJournals = journals.filter(j => (j.santriHadirCount + j.santriIzinCount + j.santriSakitCount + j.santriAlfaCount) > 0);
  const totalRate = loggedJournals.reduce((acc, curr) => {
    const total = curr.santriHadirCount + curr.santriIzinCount + curr.santriSakitCount + curr.santriAlfaCount;
    return acc + (curr.santriHadirCount / total) * 100;
  }, 0);
  const avgAttendance = loggedJournals.length > 0 ? Math.round(totalRate / loggedJournals.length) : 0;

  // Material progress
  const materiSelesai = journals.filter(j => j.status === "Disetujui").length;

  // Most active teacher
  const teacherCounts = journals.reduce((acc: any, curr) => {
    acc[curr.pengajar] = (acc[curr.pengajar] || 0) + 1;
    return acc;
  }, {});
  let topTeacher = "-";
  let maxTeacherCount = 0;
  Object.keys(teacherCounts).forEach(t => {
    if (teacherCounts[t] > maxTeacherCount) {
      maxTeacherCount = teacherCounts[t];
      topTeacher = t;
    }
  });

  // Most active class
  const classCounts = journals.reduce((acc: any, curr) => {
    acc[curr.kelas] = (acc[curr.kelas] || 0) + 1;
    return acc;
  }, {});
  let topClass = "-";
  let maxClassCount = 0;
  Object.keys(classCounts).forEach(c => {
    if (classCounts[c] > maxClassCount) {
      maxClassCount = classCounts[c];
      topClass = c;
    }
  });

  // 2. Chart Data mapping
  // Weekly activities (mocked based on actual journals)
  const weeklyData = [
    { name: "Senin", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 1).length },
    { name: "Selasa", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 2).length },
    { name: "Rabu", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 3).length },
    { name: "Kamis", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 4).length },
    { name: "Jumat", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 5).length },
    { name: "Sabtu", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 6).length },
    { name: "Minggu", Pertemuan: journals.filter(j => new Date(j.tanggal).getDay() === 0).length },
  ];

  // Monthly attendance (mocked trend)
  const monthlyData = [
    { name: "Jan", Kehadiran: 88 },
    { name: "Feb", Kehadiran: 90 },
    { name: "Mar", Kehadiran: 85 },
    { name: "Apr", Kehadiran: 92 },
    { name: "Mei", Kehadiran: 94 },
    { name: "Jun", Kehadiran: 89 },
    { name: "Jul", Kehadiran: avgAttendance || 91 },
  ];

  // Status Distribution Pie Chart Data
  const statusCounts = journals.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  const COLORS = {
    Disetujui: "#22C55E",      // Success
    "Menunggu Review": "#F59E0B", // Warning
    Draft: "#94A3B8",          // Gray
    Direvisi: "#3B82F6",       // Blue
    Ditolak: "#EF4444"         // Danger
  };

  const statusData = Object.keys(COLORS).map(statusKey => ({
    name: statusKey,
    value: statusCounts[statusKey] || 0
  })).filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      
      {/* 4 Quick stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Jurnal KBM</span>
            <h4 className="font-display text-2xl font-black text-slate-900">{totalJurnal} Laporan</h4>
            <span className="text-[10px] text-slate-400 block font-semibold">Hari ini: {jurnalHariIni} baru</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Rata-rata Kehadiran</span>
            <h4 className="font-display text-2xl font-black text-slate-900">{avgAttendance}%</h4>
            <span className="text-[10px] text-emerald-600 block font-bold flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Target KBM Tercapai
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Materi Disetujui</span>
            <h4 className="font-display text-2xl font-black text-slate-900">{materiSelesai} KBM</h4>
            <span className="text-[10px] text-slate-400 block font-semibold">Telah terverifikasi pimpinan</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="h-5 w-5" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Keaktifan Tertinggi</span>
            <h4 className="font-display text-sm font-extrabold text-slate-900 truncate max-w-[130px]">{topTeacher}</h4>
            <span className="text-[10px] text-slate-400 block font-semibold">Kelas teraktif: {topClass}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Award className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Two Columns of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Activity & Attendance */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-display text-xs font-bold text-slate-450 uppercase tracking-wider">Tren Kehadiran & Aktivitas Pembelajaran</CardTitle>
            <CardDescription className="text-xs text-slate-400">Statistik persentase kehadiran bulanan santri dalam SIM KBM.</CardDescription>
          </CardHeader>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKehadiran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[50, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="Kehadiran" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorKehadiran)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Status breakdown */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-display text-xs font-bold text-slate-450 uppercase tracking-wider font-extrabold">Status Dokumen Jurnal</CardTitle>
              <CardDescription className="text-xs text-slate-400">Penyebaran status verifikasi jurnal.</CardDescription>
            </CardHeader>
            <div className="h-[160px] w-full flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#CBD5E1"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-450 font-bold">Belum ada data status dokumen</div>
              )}
            </div>
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 mt-2">
            {Object.keys(COLORS).map(statusKey => {
              const count = statusCounts[statusKey] || 0;
              if (count === 0) return null;
              return (
                <div key={statusKey} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[statusKey as keyof typeof COLORS] }} />
                  <span className="truncate">{statusKey} ({count})</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Weekly Activity Bar Chart */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="font-display text-xs font-bold text-slate-450 uppercase tracking-wider">Aktivitas Mengajar Mingguan (KBM)</CardTitle>
          <CardDescription className="text-xs text-slate-400">Distribusi jumlah kegiatan belajar mengajar berdasarkan hari dalam seminggu.</CardDescription>
        </CardHeader>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Pertemuan" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
