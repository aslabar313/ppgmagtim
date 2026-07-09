import React, { useState } from "react";
import { 
  School, Lock, Search, BookOpen, Star, Sparkles, ShieldCheck, 
  MapPin, Calendar, Users, Eye, HelpCircle, ArrowRight, Info
} from "lucide-react";
import { getKelompok, verifyCredentials, Kelompok } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DirektoriKelompok } from "./DirektoriKelompok";

interface PortalPublicProps {
  onEnterAdmin: (role: string) => void;
}

export function PortalPublic({ onEnterAdmin }: PortalPublicProps) {
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  const [searchQuery, setSearchQuery] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [bgCustomizeOpen, setBgCustomizeOpen] = useState(false);
  const [bgImage, setBgImage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_public_bg") || "/mosque_bg.png";
    }
    return "/mosque_bg.png";
  });

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit lockout status
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast.error(`Batas percobaan terlampaui! Akses portal masuk dikunci. Silakan coba lagi dalam ${remainingSecs} detik.`);
      return;
    }
    
    const result = verifyCredentials(username, password);

    if (result && result.success) {
      setFailedAttempts(0);
      setLockoutUntil(null);
      toast.success(`Login sukses sebagai ${result.role} (Admin ${result.adminNum})!`);
      setLoginOpen(false);
      localStorage.setItem("sim_tpq_logged_user", username.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
      localStorage.setItem("sim_tpq_active_scope", result.scope);
      localStorage.setItem("sim_tpq_admin_num", String(result.adminNum));
      onEnterAdmin(result.role);
    } else {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);
      
      if (nextFailCount >= 5) {
        const lockDuration = 60 * 1000; // 1 minute lockout
        setLockoutUntil(Date.now() + lockDuration);
        toast.error("Terlalu banyak kegagalan autentikasi! Akses masuk dikunci selama 60 detik.");
      } else {
        toast.error(`Username atau Password salah! Percobaan masuk ke-${nextFailCount} dari batas maksimal 5.`);
      }
    }
  };

  const filteredKelompok = kelompokList.filter(klp => 
    klp.namaKelompok.toLowerCase().includes(searchQuery.toLowerCase()) ||
    klp.desa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    klp.kecamatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      style={bgImage !== "none" ? { backgroundImage: `url(${bgImage})`, backgroundAttachment: "fixed" } : undefined}
      className={`min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30 antialiased overflow-x-hidden relative ${bgImage !== "none" ? "bg-cover bg-center" : "bg-slate-950"}`}
    >
      
      {/* Background Dark Overlay for glassmorphism and readability */}
      {bgImage !== "none" && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1.5px] z-0 pointer-events-none" />
      )}
      
      {/* Dynamic Aurora Glow Effects (Futuristic) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Header (Futuristic Glass) */}
      <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <School className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <span className="font-display text-lg font-black tracking-tight text-white block">
                PintarYuk <span className="text-emerald-500">SIM Kelompok</span>
              </span>
              <span className="block text-[8px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                PPG Magetan Timur Center
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Background Customizer */}
            <Dialog open={bgCustomizeOpen} onOpenChange={setBgCustomizeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-slate-800 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl font-bold p-2.5 h-10 w-10 flex items-center justify-center shrink-0 bg-transparent">
                  <Eye className="h-4.5 w-4.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-3xl bg-slate-900 border-slate-800 text-slate-100 p-6 text-left">
                <DialogHeader className="space-y-2">
                  <DialogTitle className="font-display text-lg font-black text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" /> Kustomisasi Tampilan Portal
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Ganti gambar latar belakang portal dengan gambar masjid atau ikon daerah Anda.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Pilih Latar Belakang</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBgImage("/mosque_bg.png");
                          localStorage.setItem("sim_tpq_public_bg", "/mosque_bg.png");
                          toast.success("Mengaktifkan gambar Masjid daerah default.");
                        }}
                        className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                          bgImage === "/mosque_bg.png" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-450"
                        }`}
                      >
                        Masjid Default
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBgImage("none");
                          localStorage.setItem("sim_tpq_public_bg", "none");
                          toast.success("Mengaktifkan tema Neon Glow bawaan.");
                        }}
                        className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                          bgImage === "none" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-450"
                        }`}
                      >
                        Neon Glow
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const custom = localStorage.getItem("sim_tpq_custom_bg_data");
                          if (custom) {
                            setBgImage(custom);
                            localStorage.setItem("sim_tpq_public_bg", custom);
                            toast.success("Mengaktifkan gambar kustom Anda.");
                          } else {
                            toast.error("Belum ada berkas gambar kustom yang diunggah.");
                          }
                        }}
                        className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all cursor-pointer ${
                          bgImage !== "/mosque_bg.png" && bgImage !== "none" ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-450"
                        }`}
                      >
                        Gambar Kustom
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-800/80 pt-4">
                    <label className="text-xs font-bold text-slate-400">Unggah Gambar Masjid Anda (.jpg, .png)</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Ukuran berkas gambar maksimal 2 MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          try {
                            localStorage.setItem("sim_tpq_custom_bg_data", dataUrl);
                            localStorage.setItem("sim_tpq_public_bg", dataUrl);
                            setBgImage(dataUrl);
                            toast.success("Gambar masjid berhasil diunggah dan diterapkan!");
                          } catch (err) {
                            toast.error("Gagal menyimpan gambar (melebihi batas memori lokal).");
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="rounded-xl border-slate-800 bg-slate-950 text-slate-400 text-[10px] cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-450 block">Maksimal 2 MB. Gambar disimpan secara lokal di browser.</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold gap-1.5 shadow-md shadow-emerald-600/10 text-xs px-4 py-2">
                  <Lock className="h-4 w-4" /> Portal Monitoring
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] rounded-3xl bg-slate-900 border-slate-800 text-slate-100 p-6">
                <DialogHeader className="space-y-2 text-center">
                  <DialogTitle className="font-display text-xl font-black text-white flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500 animate-spin" /> Masuk Akses SIM Kelompok
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Masukkan kredensial otorisasi multi-wilayah untuk mengelola platform.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleLoginSubmit} className="space-y-4 pt-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Username Operator</label>
                    <Input
                      type="text"
                      placeholder="Masukkan username..."
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="rounded-xl border-slate-800 bg-slate-950 text-slate-200 text-xs py-2 h-10 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Password Keamanan</label>
                    <Input
                      type="password"
                      placeholder="Masukkan password..."
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="rounded-xl border-slate-800 bg-slate-950 text-slate-200 text-xs py-2 h-10 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl text-[10px] text-slate-400 space-y-1.5 font-sans leading-relaxed">
                    <div className="font-bold text-slate-300 flex items-center gap-1"><Info className="h-3.5 w-3.5 text-indigo-400" /> Kredensial Simulator Peran (Password: <code>admin123</code>)</div>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                      <div>Super Admin: <code>superadminharjito/aldi/wanda/deni/oga</code></div>
                      <div>Daerah: <code>daerah1</code></div>
                      <div>Desa: <code>desaselatan1</code></div>
                      <div>Kelompok: <code>adminkaras1</code></div>
                      <div>Pengajar: <code>pengajar1</code></div>
                      <div>Viewer: <code>viewer1</code></div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold text-xs mt-2 shadow-md shadow-emerald-600/10">
                    Masuk ke Dashboard
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section (Futuristic glowing layout) */}
      <section className="relative py-24 lg:py-32 flex items-center">
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          <div className="lg:col-span-7 space-y-6 text-left">
            <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
              Integrated Monitoring SaaS Platform
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Satu Pintu Monitoring <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
                30 Kelompok Binaan Wilayah
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed font-medium">
              Kelola kurikulum Tri Sukses secara terpusat. Pantau presensi santri berbasis QR Code, penilaian raport, audit ketersediaan sarpras, dan log penugasan mubaligh daerah.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button onClick={() => setLoginOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/15 transition-all text-xs flex items-center gap-2">
                Akses Dashboard Monitor <ShieldCheck className="h-4.5 w-4.5" />
              </Button>
              <a href="#direktori" className="inline-flex items-center justify-center border border-slate-800 hover:bg-slate-900 text-slate-300 px-8 py-3 rounded-xl font-bold text-xs transition-all">
                Direktori 30 Kelompok
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 rounded-3xl text-center space-y-1 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
              <span className="font-display text-3xl font-black text-white block">30</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kelompok Binaan</span>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 rounded-3xl text-center space-y-1 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
              <span className="font-display text-3xl font-black text-emerald-400 block">550+</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Santri Generus</span>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 rounded-3xl text-center space-y-1 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
              <span className="font-display text-3xl font-black text-blue-400 block">45+</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Mubaligh Binaan</span>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-850 p-6 rounded-3xl text-center space-y-1 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
              <span className="font-display text-3xl font-black text-amber-400 block">100%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SaaS Sync Luring</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tri Sukses Target Cards */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-center relative z-10">
        <div className="max-w-2xl mx-auto mb-16 space-y-3">
          <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold text-[9px] uppercase tracking-wider">Target Karakter Dasar</Badge>
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
            Tiga Target Pembinaan (Tri Sukses)
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">
            SIM Kelompok mengintegrasikan pengawasan indikator keberhasilan kurikulum santri generus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-slate-900/35 border-slate-850 shadow-lg rounded-3xl hover:border-slate-800 transition-all text-left">
            <CardHeader className="space-y-4 p-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <CardTitle className="font-display text-lg font-bold text-white">1. Alim & Faqih</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                Memiliki pemahaman agama yang mendalam, kelancaran tahsin membaca Al-Qur'an, dan penguasaan hukum fiqih ibadah dasar sehari-hari.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/35 border-slate-850 shadow-lg rounded-3xl hover:border-slate-800 transition-all text-left">
            <CardHeader className="space-y-4 p-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Star className="h-6 w-6" />
              </div>
              <CardTitle className="font-display text-lg font-bold text-white">2. Akhlakul Karimah</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                Penerapan 6 Tabiat Luhur (Jujur, Amanah, Mujhid-Muzhid, Rukun, Kompak, Kerjasama yang baik) dalam bersosialisasi dan berbakti.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-900/35 border-slate-850 shadow-lg rounded-3xl hover:border-slate-800 transition-all text-left">
            <CardHeader className="space-y-4 p-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="font-display text-lg font-bold text-white">3. Mandiri</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                Kemampuan mengurus diri sendiri, melatih keterampilan dasar (life skills), kewirausahaan, serta kemandirian ekonomi sejak dini.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Directory 32 Groups Roster */}
      <section id="direktori" className={`py-24 border-t border-b border-slate-900/60 relative z-10 ${bgImage !== "none" ? "bg-slate-950/45 backdrop-blur-[1px]" : "bg-slate-950"}`}>
        <div className="max-w-7xl mx-auto px-6">
          <DirektoriKelompok />
        </div>
      </section>

      {/* Academics Calender & Agenda */}
      <section className="py-24 max-w-7xl mx-auto px-6 text-left relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold text-[9px] uppercase tracking-wider">Kalender Akademik</Badge>
            <h2 className="font-display text-3xl font-black text-white">Agenda Terdekat Daerah</h2>
            <p className="text-slate-450 text-xs sm:text-sm font-medium leading-relaxed">
              Jadwal pelaksanaan rapat pembina kurikulum daerah, munaqosah evaluasi santri, dan festival anak shalih sewilayah Magetan Timur Center.
            </p>
            <Button onClick={() => setLoginOpen(true)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 px-6 py-2.5 rounded-xl font-bold text-xs gap-1.5 shadow-sm">
              Kelola Kalender Akademik <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/35 border-slate-850 shadow-sm rounded-3xl p-6 flex gap-4 items-start hover:border-slate-800 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold">12 JULI 2026</span>
                <h4 className="text-xs font-bold text-white">Rapat Koordinasi Dewan Kurikulum PPG</h4>
                <p className="text-[10px] text-slate-450 font-medium">Evaluasi materi hafalan dan sinkronisasi log presensi luring semester ganjil.</p>
              </div>
            </Card>

            <Card className="bg-slate-900/35 border-slate-850 shadow-sm rounded-3xl p-6 flex gap-4 items-start hover:border-slate-800 transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-450 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold">25 JULI 2026</span>
                <h4 className="text-xs font-bold text-white">Ujian Munaqosah Serentak Wilayah</h4>
                <p className="text-[10px] text-slate-450 font-medium">Pengujian lisan materi Al-Qur'an dan Hadits dasar tingkat desa/kelompok.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t border-slate-900/60 py-8 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider relative z-10 ${bgImage !== "none" ? "bg-slate-950/70" : "bg-slate-950"}`}>
        © 2026 PintarYuk SIM Kelompok. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
