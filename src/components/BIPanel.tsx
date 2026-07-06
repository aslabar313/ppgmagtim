import React, { useState } from "react";
import { getKelompok, Kelompok } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";
import { BrainCircuit, Filter, TrendingUp, Users, Wrench, ShieldCheck } from "lucide-react";

export function BIPanel() {
  const [filterDesa, setFilterDesa] = useState("Semua");
  const kelompokList = getKelompok();

  // Predictive dataset representing future growth simulations (2026 - 2028)
  const dataPrediksiGenerus = [
    { name: "Jul 2026", Real: 550, Prediksi: 550 },
    { name: "Okt 2026", Real: 565, Prediksi: 570 },
    { name: "Jan 2027", Real: 590, Prediksi: 600 },
    { name: "Apr 2027", Real: null, Prediksi: 625 },
    { name: "Jul 2027", Real: null, Prediksi: 650 },
    { name: "Okt 2027", Real: null, Prediksi: 680 }
  ];

  // Radar chart data of regional needs
  const dataRadarKebutuhan = [
    { subject: "Ust/Ustd Pengajar", A: 85, fullMark: 100 },
    { subject: "Gedung / Ruang Kelas", A: 70, fullMark: 100 },
    { subject: "Kitab Al-Qur'an", A: 90, fullMark: 100 },
    { subject: "Toilet Bersih", A: 65, fullMark: 100 },
    { subject: "Sarana IT / Sound", A: 75, fullMark: 100 }
  ];

  // Distinct desas
  const desas = Array.from(new Set(kelompokList.map(k => k.desa)));

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Business Intelligence (BI) Dashboard</h2>
          <p className="text-slate-500 text-sm">Analisis tren prediktif pertumbuhan santri, prakiraan kebutuhan tenaga pengajar, dan alokasi anggaran sarana daerah.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0"><Filter className="h-4 w-4" /> Filter Prediksi:</span>
          
          <div className="flex flex-wrap gap-2 w-full">
            <select
              value={filterDesa}
              onChange={(e) => setFilterDesa(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
            >
              <option value="Semua">Semua Wilayah Desa</option>
              {desas.map((d, idx) => (
                <option key={idx} value={d}>Desa {d}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* BI Intelligence Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold block uppercase">Prediksi Kebutuhan Guru (2027)</span>
            <span className="font-display text-2xl font-black text-rose-600">+12 Pengajar Baru</span>
            <p className="text-[10px] text-slate-400 font-medium">Berdasarkan rasio pertumbuhan santri baru 1:15 di kecamatan Takeran.</p>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold block uppercase">Kebutuhan Anggaran Wilayah</span>
            <span className="font-display text-2xl font-black text-emerald-600">+15% Alokasi Kas</span>
            <p className="text-[10px] text-slate-400 font-medium">Diperlukan untuk menunjang pengadaan toilet layak di 6 kelompok binaan.</p>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold block uppercase">Estimasi Total Generus (Des 2027)</span>
            <span className="font-display text-2xl font-black text-blue-600">680 Santri Aktif</span>
            <p className="text-[10px] text-slate-400 font-medium">Kenaikan tren pendaftaran santri baru caberawit pasca kelulusan munaqosah.</p>
          </div>
        </Card>
      </div>

      {/* Advanced BI Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Forecast Area chart */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><BrainCircuit className="h-4.5 w-4.5 text-indigo-500 animate-pulse" /> Prakiraan Tren Pertumbuhan Santri Binaan (2026/2027)</CardTitle>
          </CardHeader>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPrediksiGenerus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="Real" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} name="Data Real" />
                <Area type="monotone" dataKey="Prediksi" stroke="#6366f1" fill="#6366f1" fillOpacity={0.05} strokeWidth={2} strokeDasharray="5 5" name="Prakiraan AI" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Radar chart of needs index */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 self-stretch flex flex-col justify-between text-left">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800">Indeks Kebutuhan Wilayah</CardTitle>
          </CardHeader>
          <div className="h-[210px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" radius="70%" data={dataRadarKebutuhan}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={8} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} />
                <Radar name="Kebutuhan" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
