import React, { useState } from "react";
import { getKelompok, getGenerus, getMubalighSetempat, getSarpras, Kelompok, Generus } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Medal, Award, Flame, User, School, Sparkles, BookOpen, Star 
} from "lucide-react";

export function RankingPanel() {
  const [activeBoard, setActiveBoard] = useState<"kelompok" | "desa" | "pengajar" | "generus">("kelompok");

  const kelompokList = getKelompok();
  const generusList = getGenerus();
  const pengajarList = getMubalighSetempat();
  const sarpras = getSarpras();

  // Calculated Rankings
  const getKelompokRankings = () => {
    return kelompokList
      .map(k => {
        const sRecord = sarpras.find(s => s.kelompokId === k.id);
        const score = sRecord ? sRecord.skorSarpras : 70;
        const totalScore = Math.round((k.jumlahGenerus * 2 + score) / 3);
        return {
          id: k.id,
          nama: k.namaKelompok,
          skor: totalScore,
          detail: `Sarpras: ${score} | Santri: ${k.jumlahGenerus}`
        };
      })
      .sort((a, b) => b.skor - a.skor)
      .slice(0, 10);
  };

  const getDesaRankings = () => {
    // Unique desas with mock average scores
    const desas = ["Kentangan", "Takeran Kulon", "Kiringan", "Gamping", "Madigondo"];
    return desas
      .map((d, idx) => ({
        nama: `Desa ${d}`,
        skor: 94 - idx * 2,
        detail: `Efisiensi Kehadiran: ${94 - idx * 2}%`
      }))
      .slice(0, 10);
  };

  const getPengajarRankings = () => {
    return pengajarList
      .map(p => ({
        id: p.id,
        nama: p.nama,
        skor: 88 + (p.usia % 5),
        detail: `Spesialisasi & Jam Mengajar Teraktif`
      }))
      .sort((a, b) => b.skor - a.skor)
      .slice(0, 10);
  };

  const getGenerusRankings = () => {
    return generusList
      .map(g => ({
        id: g.id,
        nama: g.namaLengkap,
        skor: 95 + (g.usia % 4),
        detail: `Presensi: 98% | Target Kurikulum: Tuntas`
      }))
      .sort((a, b) => b.skor - a.skor)
      .slice(0, 10);
  };

  const getActiveLeaderboard = () => {
    switch (activeBoard) {
      case "desa":
        return getDesaRankings();
      case "pengajar":
        return getPengajarRankings();
      case "generus":
        return getGenerusRankings();
      default:
        return getKelompokRankings();
    }
  };

  // Mock Badge categories
  const generusBadges = [
    { title: "Rajin Hadir", desc: "Presensi harian >95% sebulan", icon: <Flame className="h-5 w-5 text-rose-500" /> },
    { title: "Hafidz Cilik", desc: "Tuntas target hafalan Juz 30", icon: <BookOpen className="h-5 w-5 text-indigo-500" /> },
    { title: "Karakter Luhur", desc: "Mendapat penilaian akhlak A", icon: <Award className="h-5 w-5 text-emerald-500" /> },
    { title: "Santri Teladan", desc: "Kehadiran & raport berprestasi", icon: <Star className="h-5 w-5 text-amber-500" /> }
  ];

  const pengajarBadges = [
    { title: "Inspiratif", desc: "Mendapat feedback terbaik dewan pembina", icon: <Sparkles className="h-5 w-5 text-amber-500" /> },
    { title: "Pengajar Aktif", desc: "Tingkat kehadiran kelas 100%", icon: <Flame className="h-5 w-5 text-rose-500" /> }
  ];

  const kelompokBadges = [
    { title: "Kelompok Terbaik", desc: "Rata-rata kehadiran & sarpras tertinggi", icon: <Trophy className="h-5 w-5 text-indigo-500" /> },
    { title: "Terdisiplin", desc: "Paling awal melakukan presensi harian", icon: <Medal className="h-5 w-5 text-emerald-500" /> }
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Ranking & Lencana Penghargaan</h2>
          <p className="text-slate-500 text-sm">Papan peringkat otomatis (Top 10) dan pembagian lencana prestasi santri, guru, serta kelompok.</p>
        </div>
      </div>

      {/* Leaderboard Selector & Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Papan Peringkat */}
        <Card className="lg:col-span-7 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Trophy className="h-4.5 w-4.5 text-amber-500" /> Papan Peringkat (Top 10)</CardTitle>
            </div>
            
            <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 text-[10px] font-bold">
              <button onClick={() => setActiveBoard("kelompok")} className={`px-2.5 py-1 rounded-lg transition-all ${activeBoard === "kelompok" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Kelompok</button>
              <button onClick={() => setActiveBoard("desa")} className={`px-2.5 py-1 rounded-lg transition-all ${activeBoard === "desa" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Desa</button>
              <button onClick={() => setActiveBoard("pengajar")} className={`px-2.5 py-1 rounded-lg transition-all ${activeBoard === "pengajar" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Pengajar</button>
              <button onClick={() => setActiveBoard("generus")} className={`px-2.5 py-1 rounded-lg transition-all ${activeBoard === "generus" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Santri</button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {getActiveLeaderboard().map((item: any, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4 text-left">
                    <span className="font-display text-base font-black text-slate-400 w-6 text-center">
                      {idx === 0 && <Trophy className="h-5 w-5 text-amber-500 mx-auto" />}
                      {idx === 1 && <Medal className="h-5 w-5 text-slate-400 mx-auto" />}
                      {idx === 2 && <Award className="h-5 w-5 text-amber-600 mx-auto" />}
                      {idx > 2 && `${idx + 1}`}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.nama}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">{item.detail}</span>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold rounded-full text-xs">
                    Skor: {item.skor}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lencana Pencapaian */}
        <Card className="lg:col-span-5 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-6 text-left self-stretch">
          <h3 className="font-display text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5"><Award className="h-5 w-5 text-indigo-500 animate-bounce" /> Lencana Prestasi (Badges)</h3>

          <div className="space-y-4">
            <h4 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">Lencana Santri</h4>
            <div className="grid grid-cols-2 gap-3">
              {generusBadges.map((b, i) => (
                <div key={i} className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {b.icon}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-[10px] block leading-tight">{b.title}</span>
                    <span className="text-[9px] text-slate-400 leading-normal block mt-0.5">{b.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider">Lencana Pengajar & Kelompok</h4>
            <div className="grid grid-cols-2 gap-3">
              {pengajarBadges.concat(kelompokBadges).map((b, i) => (
                <div key={i} className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {b.icon}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-[10px] block leading-tight">{b.title}</span>
                    <span className="text-[9px] text-slate-400 leading-normal block mt-0.5">{b.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
