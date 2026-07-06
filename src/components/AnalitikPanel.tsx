import React, { useState } from "react";
import { getKelompok, getGenerus, getPresensi, getRaport, getSarpras, getAlumni } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, Users, Calendar, Award, Building, BarChart2, Filter } from "lucide-react";

export function AnalitikPanel() {
  // Filter states
  const [filterTahun, setFilterTahun] = useState("2025/2026");
  const [filterSemester, setFilterSemester] = useState("1");
  const [filterKelompok, setFilterKelompok] = useState("Semua");

  const kelompokList = getKelompok();
  const generus = getGenerus();
  const presensi = getPresensi();
  const raports = getRaport();
  const alumni = getAlumni();
  const sarpras = getSarpras();

  // Dynamic filter application (mock representation)
  const totalAlumni = alumni.length;
  const avgSarpras = Math.round(sarpras.reduce((acc, s) => acc + s.skorSarpras, 0) / sarpras.length);

  // Chart 1: Generus Growth over the years
  const dataPertumbuhan = [
    { tahun: "2022", Caberawit: 120, Remaja: 80, MudaMudi: 60 },
    { tahun: "2023", Caberawit: 140, Remaja: 95, MudaMudi: 75 },
    { tahun: "2024", Caberawit: 160, Remaja: 110, MudaMudi: 90 },
    { tahun: "2025", Caberawit: 175, Remaja: 115, MudaMudi: 100 },
    { tahun: "2026", Caberawit: 180, Remaja: 120, MudaMudi: 110 }
  ];

  // Chart 2: Monthly Attendance Trend
  const dataKehadiran = [
    { bulan: "Jan", Hadir: 92, Izin: 5, Alfa: 3 },
    { bulan: "Feb", Hadir: 94, Izin: 4, Alfa: 2 },
    { bulan: "Mar", Hadir: 93, Izin: 5, Alfa: 2 },
    { bulan: "Apr", Hadir: 89, Izin: 7, Alfa: 4 },
    { bulan: "Mei", Hadir: 91, Izin: 6, Alfa: 3 },
    { bulan: "Jun", Hadir: 95, Izin: 4, Alfa: 1 },
    { bulan: "Jul", Hadir: 93, Izin: 5, Alfa: 2 }
  ];

  // Chart 3: Curriculum Mastery score averages
  const dataKurikulum = [
    { sub: "Tahsin", RataRata: 82 },
    { sub: "Tahfidz", RataRata: 85 },
    { sub: "Doa Harian", RataRata: 80 },
    { sub: "Akhlak", RataRata: 90 },
    { sub: "Ibadah", RataRata: 84 },
    { sub: "Keaktifan", RataRata: 88 }
  ];

  // Chart 4: Sarpras score ranges
  const dataSarpras = [
    { range: "Layak (>80)", Jumlah: sarpras.filter(s => s.skorSarpras >= 80).length, color: "#10b981" },
    { range: "Cukup (60-79)", Jumlah: sarpras.filter(s => s.skorSarpras >= 60 && s.skorSarpras < 80).length, color: "#3b82f6" },
    { range: "Kurang (<60)", Jumlah: sarpras.filter(s => s.skorSarpras < 60).length, color: "#ef4444" }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Dashboard Analitik Lanjut</h2>
          <p className="text-slate-500 text-sm">Analisis data komprehensif pertumbuhan santri, tren kehadiran, dan kelayakan sarana fisik.</p>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0"><Filter className="h-4 w-4" /> Filter Analisis:</span>
          
          <div className="flex flex-wrap gap-2 w-full">
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
            >
              <option value="2025/2026">Tahun 2025/2026</option>
              <option value="2026/2027">Tahun 2026/2027</option>
            </select>

            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>

            <select
              value={filterKelompok}
              onChange={(e) => setFilterKelompok(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold max-w-[240px]"
            >
              <option value="Semua">Semua TPQ (32 Kelompok)</option>
              {kelompokList.slice(0, 10).map(k => (
                <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* High-level stats panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Total Alumni Terarsip</span>
          <span className="font-display text-3xl font-black text-slate-900">{totalAlumni} Orang</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Rata-rata Skor Sarpras</span>
          <span className="font-display text-3xl font-black text-slate-900">{avgSarpras} / 100</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Kompetensi Kurikulum</span>
          <span className="font-display text-3xl font-black text-emerald-600">85% Tuntas</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Rasio Guru:Santri</span>
          <span className="font-display text-3xl font-black text-blue-600">1 : 12</span>
        </Card>
      </div>

      {/* Advanced Charting Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth line chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><TrendingUp className="h-4.5 w-4.5 text-indigo-500" /> Pertumbuhan Generus 5 Tahun Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPertumbuhan} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tahun" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Caberawit" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Remaja" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="MudaMudi" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Attendance Area Chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Calendar className="h-4.5 w-4.5 text-emerald-500" /> Tren Komparatif Presensi Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataKehadiran} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="Hadir" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="Izin" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Curriculum Mastery Bar chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Award className="h-4.5 w-4.5 text-amber-500" /> Rata-Rata Capaian Kurikulum Santri</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataKurikulum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sub" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[50, 100]} />
                <Tooltip />
                <Bar dataKey="RataRata" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sarpras Pie Chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl text-left">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Building className="h-4.5 w-4.5 text-rose-500" /> Status Kelayakan Sarana Prasarana (TPQ)</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center">
            <div className="w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataSarpras}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="Jumlah"
                  >
                    {dataSarpras.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-xs font-semibold ml-6">
              {dataSarpras.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-500">{d.range} ({d.Jumlah})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
