import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, MessageSquare, Star, Smile, TrendingUp } from "lucide-react";

export function SurveiPanel() {
  // Mock Survey metrics
  const metrics = [
    { kategori: "Tenaga Pengajar", skor: 88, desc: "Keramahan, kedisiplinan & cara mendidik guru" },
    { kategori: "Sarana Fisik", skor: 81, desc: "Kebersihan kelas, Kamar Mandi & sarana belajar" },
    { kategori: "Materi Kurikulum", skor: 85, desc: "Kesesuaian modul ngaji & hafalan juz" },
    { kategori: "Komunikasi Orang Tua", skor: 90, desc: "Kecepatan update via WhatsApp Center" },
    { kategori: "Pelayanan TPQ", skor: 86, desc: "Administrasi raport & presensi digital" }
  ];

  // Feedback list
  const feedbacks = [
    { id: "fb-1", tanggal: "2026-07-06", pengirim: "Wali dari Ahmad Bagus", skor: 5, komentar: "Sangat terbantu dengan sistem presensi QR, saya tahu anak saya sudah sampai masjid tepat waktu." },
    { id: "fb-2", tanggal: "2026-07-05", pengirim: "Wali dari Siti Rahmawati", skor: 4, komentar: "Guru sangat ramah. Namun mohon di musim kemarau ini ventilasi/kipas angin di kelas caberawit bisa diperbanyak." },
    { id: "fb-3", tanggal: "2026-07-04", pengirim: "Wali dari Muhammad Zaki", skor: 3, komentar: "Kurikulum hafalan sangat baik. Mohon perbaikan Kamar Mandi santri agar lebih bersih." }
  ];

  // AI Recommendation engine text
  const aiInsight = "Berdasarkan analisis sentimen dari 120 koresponden survei: Umpan balik terkait Tenaga Pengajar dan WhatsApp Center sangat positif (>88%). Namun, tingkat kepuasan Sarana Fisik (81%) mengalami penurunan karena keterbatasan sirkulasi udara di ruang kelas (12 aduan kipas angin) dan kebersihan Kamar Mandi (8 aduan). Rekomendasi tindakan prioritas: Alokasikan anggaran kas daerah untuk pemeliharaan kipas kelas TPQ Kelompok 4 & Kelompok 12.";

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">Survei Kepuasan Wali Santri</h2>
        <p className="text-slate-500 text-sm">Hasil rekap kuesioner bulanan kepuasan orang tua terhadap pelayanan pengajar, materi, dan sarana prasarana.</p>
      </div>

      {/* AI Recommendation Banner */}
      <Card className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 shadow-sm rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/0 rounded-full blur-xl" />
        <div className="space-y-3 relative z-10">
          <h3 className="font-display text-sm font-bold text-emerald-800 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Rekomendasi Strategis AI
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{aiInsight}</p>
        </div>
      </Card>

      {/* Metrics scores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Graph representation */}
        <Card className="lg:col-span-7 bg-white border-slate-200 shadow-sm rounded-3xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><TrendingUp className="h-4.5 w-4.5 text-blue-500" /> Grafik Persentase Kepuasan Layanan</CardTitle>
          </CardHeader>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="kategori" stroke="#94a3b8" fontSize={10} width={110} tickLine={false} />
                <Tooltip />
                <Bar dataKey="skor" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Breakdown widgets */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Star className="h-4.5 w-4.5 text-amber-500" /> Rekap Skor Indeks</h3>
          <div className="space-y-3">
            {metrics.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">{m.kategori}</span>
                  <span className="text-[9px] text-slate-450 leading-normal block mt-0.5">{m.desc}</span>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold rounded-full">{m.skor}%</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Roster Parent Testimonials */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-3xl p-6 text-left space-y-4">
        <h3 className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><MessageSquare className="h-4.5 w-4.5 text-indigo-500" /> Komentar & Umpan Balik Terbaru</h3>
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-700">
                <span>{fb.pengirim}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>{fb.skor} / 5</span>
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed font-medium">{fb.komentar}</p>
              <span className="text-[10px] text-slate-400 font-mono font-bold block">{fb.tanggal}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
