import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Sparkles,
  Shield,
  BarChart3,
  Heart,
  Check,
  Star,
  Flame,
  Trophy,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PintarYuk — Belajar sambil bermain untuk anak 2-12 tahun" },
      {
        name: "description",
        content:
          "Platform game edukasi untuk anak Indonesia usia 2-12 tahun. Belajar angka, huruf, sains, dan Bahasa Inggris lewat game yang seru — tanpa iklan, tanpa konten berbahaya.",
      },
      { property: "og:title", content: "PintarYuk — Belajar sambil bermain" },
      {
        property: "og:description",
        content: "Biarkan anak main HP — asal yang dimainkan PintarYuk. Gratis untuk 2 anak.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <ChildSelector />;
  }

  return <Landing />;
}

function ChildSelector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    if (!user) return;
    const { data } = await supabase.from("children").select("*").eq("parent_id", user.id);
    setChildren(data || []);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-accent/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Siapa yang mau main? 🎮</h1>
          <p className="text-muted-foreground mt-2">Pilih profil untuk mulai belajar</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-center">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => navigate({ to: "/play", search: { childId: child.id } })}
              className="flex flex-col items-center gap-3 group transition"
            >
              <div className="w-32 h-32 rounded-[2.5rem] bg-card border-4 border-transparent group-hover:border-primary group-hover:scale-105 transition flex items-center justify-center text-6xl shadow-soft relative overflow-hidden">
                {child.avatar === "rabbit" ? "🐰" : "🐻"}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition" />
              </div>
              <span className="font-display text-lg font-bold">{child.name}</span>
            </button>
          ))}

          {children.length < 5 && (
            <Link to="/onboarding" className="flex flex-col items-center gap-3 group transition">
              <div className="w-32 h-32 rounded-[2.5rem] bg-card border-4 border-dashed border-muted-foreground/30 flex items-center justify-center text-3xl text-muted-foreground group-hover:border-primary group-hover:text-primary transition shadow-sm">
                <Plus className="w-10 h-10" />
              </div>
              <span className="font-display text-lg font-bold opacity-60">Tambah</span>
            </Link>
          )}
        </div>

        <div className="pt-10 flex items-center justify-center gap-4">
          <Link to="/parent">
            <Button variant="outline" className="rounded-full h-12 px-6 gap-2">
              <Settings className="w-4 h-4" /> Dashboard Orang Tua
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="rounded-full h-12 px-6 gap-2 text-muted-foreground"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] overflow-hidden">
      <Nav />
      <div className="relative">
        {/* Very vibrant, playful background blobs */}
        <div className="absolute inset-x-0 top-0 h-[1000px] -z-10 overflow-hidden opacity-80">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sunny/30 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-creative/20 blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '1s' }} />
          <div className="absolute top-[30%] right-[30%] w-[450px] h-[450px] rounded-full bg-coral/20 blur-3xl animate-pulse" style={{ animationDuration: '11s', animationDelay: '3s' }} />
          <div className="absolute top-[60%] left-[-5%] w-[500px] h-[500px] rounded-full bg-success/20 blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
        </div>
        <Hero />
        <DashboardPreview />
      </div>
      <LogoBar />
      <Problem />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b-4 border-muted/30">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-[1rem] bg-primary text-white flex items-center justify-center text-2xl shadow-[0_4px_0_0_oklch(0.5_0.16_250)] group-hover:-translate-y-1 group-hover:shadow-[0_6px_0_0_oklch(0.5_0.16_250)] transition-all">
            🐰
          </div>
          <span className="font-display text-2xl font-black text-foreground tracking-tight">Pintar<span className="text-primary">Yuk!</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-base font-bold text-muted-foreground">
          <a href="#fitur" className="hover:text-primary hover:scale-105 transition-all">Fitur Seru</a>
          <a href="#harga" className="hover:text-primary hover:scale-105 transition-all">Harga</a>
          <a href="#faq" className="hover:text-primary hover:scale-105 transition-all">Tanya Jawab</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="rounded-full font-bold text-base hover:bg-muted/50 hidden sm:inline-flex">
              Masuk
            </Button>
          </Link>
          <Link to="/register">
            <Button className="rounded-full font-bold text-base bg-sunny hover:bg-sunny/90 text-sunny-foreground shadow-[0_4px_0_0_oklch(0.7_0.15_80)] hover:translate-y-[2px] hover:shadow-[0_2px_0_0_oklch(0.7_0.15_80)] transition-all border-2 border-transparent">
              Coba Gratis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Floating decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-[10%] text-6xl animate-bounce-soft">🎈</div>
        <div className="absolute top-40 right-[15%] text-5xl animate-bounce-soft" style={{ animationDelay: "0.5s" }}>🦖</div>
        <div className="absolute top-60 left-[20%] text-5xl animate-bounce-soft" style={{ animationDelay: "1s" }}>🧩</div>
        <div className="absolute bottom-20 right-[25%] text-6xl animate-bounce-soft" style={{ animationDelay: "1.5s" }}>🚀</div>
        <div className="absolute top-32 right-[35%] text-4xl animate-bounce-soft" style={{ animationDelay: "0.8s" }}>🌟</div>
        <div className="absolute bottom-40 left-[10%] text-5xl animate-bounce-soft" style={{ animationDelay: "0.3s" }}>🎨</div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border-2 border-sunny px-5 py-2 rounded-full mb-8 shadow-sm rotate-[-2deg] hover:rotate-0 transition-transform">
          <span className="text-xl animate-sparkle">✨</span>
          <span className="font-bold text-foreground">Dipercaya oleh ribuan Bunda!</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] max-w-5xl mx-auto text-foreground drop-shadow-sm">
          Main HP Gak Masalah, <br/>
          Asal Main <span className="text-primary inline-block hover:scale-105 transition-transform cursor-pointer">PintarYuk!</span> 🎮
        </h1>
        
        <p className="mt-8 text-xl md:text-2xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
          Tempat seru buat anak 2–12 tahun belajar angka, huruf, sains, dan bahasa! 
          <strong className="text-foreground"> 100% Aman, Tanpa Iklan!</strong>
        </p>
        
        <div className="mt-12 flex flex-col sm:flex-row gap-5 justify-center items-center">
          <Link to="/register">
            <Button size="lg" className="rounded-[2rem] h-16 px-10 text-xl font-bold bg-coral hover:bg-coral/90 text-white shadow-[0_8px_0_0_oklch(0.6_0.18_25)] hover:shadow-[0_4px_0_0_oklch(0.6_0.18_25)] hover:translate-y-1 transition-all">
              Mulai Petualangan 🚀
            </Button>
          </Link>
          <a href="#preview">
            <Button size="lg" variant="outline" className="rounded-[2rem] h-16 px-10 text-xl font-bold border-4 border-primary text-primary bg-white hover:bg-primary/5">
              Lihat Mainannya 👀
            </Button>
          </a>
        </div>
        
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 bg-white/60 p-4 rounded-full max-w-fit mx-auto border border-white/50 backdrop-blur-md">
          <div className="flex -space-x-4">
            {["👩", "👨", "👩‍🦱", "👨‍🦰", "👩‍🦳"].map((e, i) => (
              <div key={i} className="w-12 h-12 rounded-full bg-white border-4 border-[#FDFBF7] flex items-center justify-center text-2xl shadow-sm z-10 relative">
                {e}
              </div>
            ))}
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">20.000+ Orang Tua Happy!</div>
            <div className="text-muted-foreground flex items-center gap-1 font-medium">
              <span className="text-sunny text-xl">★★★★★</span> 4.9/5 Rating
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const [encouragement, setEncouragement] = useState("Yuk belajar lagi hari ini! 💪");
  const tips = [
    "Yuk belajar lagi hari ini! 💪",
    "Kamu hebat sekali! 🌟",
    "Ayo, satu game lagi! 🚀",
    "Aku bangga padamu! 💖",
  ];

  return (
    <section id="preview" className="py-24 bg-primary relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-10 bg-repeat-x" style={{ backgroundImage: 'radial-gradient(circle at 15px 0, transparent 16px, #FDFBF7 17px)', backgroundSize: '30px 20px', transform: 'rotate(180deg)' }}></div>
      <div className="container mx-auto px-4 text-center mt-10">
        <h2 className="font-display text-4xl md:text-5xl font-black text-white drop-shadow-sm">Lihat PintarYuk beraksi</h2>
        <p className="mt-4 text-white/80 text-xl font-medium">
          Explore langsung — gratis, tanpa daftar
        </p>

        <div className="mt-14 max-w-md mx-auto relative">
          <Badge className="absolute -top-4 right-4 z-10 bg-coral text-white hover:bg-coral border-2 border-white rounded-full px-4 py-1 font-bold text-sm shadow-sm rotate-6">
            🔴 Live Preview
          </Badge>
          {/* Phone frame */}
          <div className="bg-white p-4 rounded-[3.5rem] shadow-[0_16px_0_0_oklch(0.4_0.1_250)] border-4 border-[#E0E7FF] transition-transform hover:-translate-y-2 duration-300">
            <div className="bg-[#FDFBF7] rounded-[2.5rem] p-5 text-left space-y-5 max-h-[640px] overflow-hidden border-4 border-muted/50">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-3xl shadow-sm border-2 border-primary-foreground/20">
                  🐰
                </div>
                <div className="flex-1">
                  <div className="font-display font-black text-xl text-foreground">Halo, Dinda! 🌟</div>
                  <div className="text-sm font-bold text-muted-foreground mt-0.5">⭐ Bintang Bersinar · 450 XP</div>
                </div>
                <div className="flex items-center gap-1 bg-[#FEF2F2] border-2 border-coral px-3 py-1.5 rounded-full shadow-sm">
                  <span className="text-xl animate-flame">🔥</span>
                  <span className="text-base font-black text-coral">5</span>
                </div>
              </div>

              {/* Challenge card */}
              <div className="bg-sunny rounded-[2rem] p-5 text-sunny-foreground shadow-[0_6px_0_0_oklch(0.7_0.15_80)] border-4 border-[#FEF08A] relative overflow-hidden group cursor-pointer hover:translate-y-1 hover:shadow-[0_2px_0_0_oklch(0.7_0.15_80)] transition-all">
                <div className="absolute -right-2 -top-2 text-6xl opacity-30 group-hover:rotate-12 transition-transform">🌟</div>
                <div className="relative z-10">
                  <div className="text-sm font-black uppercase opacity-90 mb-1 tracking-wide">Tantangan Hari Ini</div>
                  <div className="font-display font-black text-2xl">Hitung sampai 20! 🔢</div>
                  <div className="mt-4 bg-black/10 rounded-full h-3 overflow-hidden border border-black/5">
                    <div className="h-full bg-white rounded-full" style={{ width: "40%" }} />
                  </div>
                  <Link to="/register">
                    <Button
                      size="sm"
                      className="mt-4 rounded-full bg-white text-sunny-foreground font-bold hover:bg-white/90 border-2 border-transparent hover:border-black/10 shadow-sm"
                    >
                      Main Sekarang!
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Categories grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { e: "🔢", n: "Matematika", c: "bg-[#E0E7FF] border-primary text-primary", p: 60 },
                  { e: "📖", n: "Membaca", c: "bg-[#DCFCE7] border-success text-success", p: 40 },
                  { e: "🌍", n: "Sains", c: "bg-[#FEF3C7] border-challenge text-challenge", p: 25 },
                  { e: "🎨", n: "Kreatif", c: "bg-[#FAE8FF] border-creative text-creative", p: 70 },
                ].map((cat) => (
                  <div key={cat.n} className={`${cat.c} p-4 rounded-[1.5rem] border-2 shadow-sm cursor-pointer hover:scale-105 transition-transform`}>
                    <div className="text-3xl drop-shadow-sm">{cat.e}</div>
                    <div className="text-sm font-black mt-2">{cat.n}</div>
                    <div className="mt-3 h-2 bg-black/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current opacity-80"
                        style={{ width: `${cat.p}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mascot */}
              <div
                onClick={() => setEncouragement(tips[Math.floor(Math.random() * tips.length)])}
                className="flex items-center gap-3 bg-white p-3 rounded-[1.5rem] border-2 border-muted shadow-sm cursor-pointer hover:scale-[1.02] transition"
              >
                <div className="text-4xl animate-bounce-soft drop-shadow-sm">🐰</div>
                <div className="bg-[#F8FAFC] border border-muted px-4 py-3 rounded-[1.25rem] text-sm font-bold text-foreground flex-1 relative">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#F8FAFC] border-l border-b border-muted rotate-45"></div>
                  {encouragement}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-10 bg-repeat-x" style={{ backgroundImage: 'radial-gradient(circle at 15px 10px, #ffffff 16px, transparent 17px)', backgroundSize: '30px 20px' }}></div>
    </section>
  );
}

function LogoBar() {
  const cities = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Yogyakarta"];
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <p className="text-center text-base font-bold text-muted-foreground mb-8 uppercase tracking-widest">
          Dipercaya orang tua dari seluruh Indonesia
        </p>
        <div className="flex flex-wrap gap-8 md:gap-12 justify-center items-center text-muted-foreground/60">
          {cities.map((c) => (
            <div key={c} className="font-display font-black text-2xl tracking-tight grayscale hover:grayscale-0 hover:text-primary transition-all cursor-default">
              📍 {c}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const pains = [
    {
      e: "📱",
      t: "Game tanpa manfaat",
      d: "Waktu habis untuk scrolling video singkat atau game yang bikin candu, nol edukasi.",
    },
    {
      e: "🎯",
      t: "Iklan dimana-mana",
      d: "Aplikasi 'gratis' tapi tiba-tiba muncul iklan judi atau game dewasa di tengah permainan anak.",
    },
    {
      e: "📊",
      t: "Gak bisa dipantau",
      d: "Anak main apa? Sudah belajar apa? Orang tua gelap gulita tanpa ada laporan progress.",
    },
  ];
  return (
    <section className="py-24 bg-[#F8FAFC] relative">
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="font-display text-4xl md:text-5xl font-black text-center max-w-4xl mx-auto leading-tight text-foreground">
          Anak kamu main HP berjam-jam. <br/>Pertanyaannya: <span className="text-coral underline decoration-wavy decoration-coral/40 underline-offset-8">main apa?</span> 🧐
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
          {pains.map((p) => (
            <Card key={p.t} className="p-8 rounded-[2rem] border-4 border-[#E2E8F0] shadow-sm hover:border-coral/50 transition-colors bg-white">
              <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-4xl mb-6">{p.e}</div>
              <h3 className="font-display text-2xl font-black text-foreground">{p.t}</h3>
              <p className="text-muted-foreground font-medium mt-3 leading-relaxed">{p.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-24 text-center">
          <p className="font-display text-3xl md:text-4xl font-black max-w-3xl mx-auto text-foreground">
            Jadikan screen time sebagai <br/>
            <span className="text-primary bg-primary/10 px-4 py-1 rounded-xl inline-block mt-3 rotate-1">waktu belajar yang super seru! ✨</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    {
      tag: "500+ Konten Edukatif",
      icon: <Sparkles className="w-6 h-6" />,
      title: "Belajar angka, huruf, sains, dan Bahasa Inggris — lewat game yang seru",
      desc: "Ratusan game interaktif untuk anak usia 2–12 tahun, didesain sesuai tahap perkembangan.",
      bullets: ["Sesuai usia", "Tanpa iklan", "Konten aman", "Tersedia offline"],
      emoji: "🎮",
      color: "bg-[#E0E7FF] border-primary text-primary",
      blob: "bg-primary/20",
    },
    {
      tag: "Powered by AI",
      icon: <Heart className="w-6 h-6" />,
      title: "AI tutor yang sabar dan selalu semangati anak",
      desc: "Maskot AI tutor hadir saat anak butuh bantuan — kasih hint yang tepat, pujian yang memotivasi.",
      bullets: [
        "Tidak pernah bilang 'salah'",
        "Hint bertahap",
        "Pujian variatif",
        "Adaptive difficulty",
      ],
      emoji: "🐰",
      color: "bg-[#FAE8FF] border-creative text-creative",
      blob: "bg-creative/20",
    },
    {
      tag: "Seperti Duolingo",
      icon: <Trophy className="w-6 h-6" />,
      title: "Streak, badge, dan level yang bikin anak tidak mau berhenti belajar",
      desc: "Sistem reward yang terbukti efektif — streak harian, XP, badge yang bisa dikumpulkan.",
      bullets: ["Daily streak", "20+ badge collection", "Level system", "Daily challenge"],
      emoji: "🏆",
      color: "bg-[#FEF3C7] border-sunny text-sunny-foreground",
      blob: "bg-sunny/30",
    },
    {
      tag: "Full Visibility",
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Pantau progress belajar anak kapan saja",
      desc: "Dashboard khusus orang tua dengan laporan mingguan otomatis, screen time control, dan notifikasi.",
      bullets: [
        "Laporan mingguan",
        "Screen time control",
        "Progress per topik",
        "Notifikasi real-time",
      ],
      emoji: "📊",
      color: "bg-[#DCFCE7] border-success text-success",
      blob: "bg-success/20",
    },
  ];
  return (
    <section id="fitur" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-10 bg-repeat-x" style={{ backgroundImage: 'radial-gradient(circle at 15px 0, transparent 16px, #FDFBF7 17px)', backgroundSize: '30px 20px', transform: 'rotate(180deg)' }}></div>
      <div className="container mx-auto px-4 mt-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-4 py-1.5 text-sm mb-4 font-bold border-2 border-primary/20">Apa yang Bikin Seru? 🤔</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground">
            Semua yang anak butuhkan untuk <span className="text-primary inline-block hover:scale-105 transition-transform cursor-pointer">tumbuh lebih cerdas</span>
          </h2>
        </div>
        
        <div className="space-y-12">
          {feats.map((f, i) => (
            <div
              key={f.title}
              className={`grid md:grid-cols-2 gap-8 items-center bg-white border-4 ${f.color.split(' ')[1]} rounded-[3rem] p-8 md:p-12 shadow-[0_12px_0_0_oklch(0.92_0.01_85)] hover:shadow-none hover:translate-y-3 transition-all duration-300 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <Badge className={`${f.color} rounded-full px-4 py-1 border-2 font-bold text-sm shadow-sm`}>{f.tag}</Badge>
                <h3 className="font-display text-3xl font-black mt-6 leading-tight text-foreground">{f.title}</h3>
                <p className="mt-4 text-xl text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {f.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-3 text-base font-bold text-foreground">
                      <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
              <div
                className={`${f.blob} aspect-square max-w-sm mx-auto rounded-full flex items-center justify-center p-12 shadow-inner`}
              >
                <div className="text-[10rem] animate-bounce-soft hover:scale-110 transition-transform cursor-pointer drop-shadow-xl">{f.emoji}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      big: true,
      n: "Ibu Rina, 32",
      city: "Jakarta",
      text: "Anak saya yang 4 tahun awalnya tidak mau belajar sama sekali. Tapi sejak pakai PintarYuk, dia malah yang minta main sendiri setiap sore. Dalam 2 bulan, dia sudah bisa baca kata-kata sederhana padahal belum masuk TK. Yang bikin saya senang, tidak ada iklan sama sekali — aman banget.",
    },
    {
      n: "Pak Andi",
      city: "Bandung",
      text: "Fitur streak-nya yang bikin anak saya konsisten. Dia tidak mau 'putus rantai'-nya. Sekarang sudah 45 hari berturut-turut belajar! 🔥",
    },
    {
      n: "Ibu Sari",
      city: "Surabaya",
      text: "Laporan mingguannya sangat membantu. Saya jadi tahu anak saya masih perlu latihan di perkalian, jadi bisa saya bantu di rumah.",
    },
    {
      n: "Ummi Fatimah",
      city: "Medan",
      text: "Konten islaminya bagus! Anak saya sekarang sudah hafal 5 surat pendek dan doa-doa harian. Lebih mudah dari flashcard fisik.",
    },
  ];
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center">
          Kata orang tua yang sudah merasakan
        </h2>
        <p className="text-center text-muted-foreground mt-3 text-lg">
          20.000+ orang tua Indonesia sudah percayakan PintarYuk
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {items.map((t, i) => (
            <Card
              key={i}
              className={`p-6 rounded-3xl border-2 ${t.big ? "md:col-span-2 md:row-span-2 bg-primary/5 border-primary/20" : ""}`}
            >
              <div className="flex text-sunny mb-3">{"★★★★★"}</div>
              <p className={`${t.big ? "text-lg" : "text-sm"} leading-relaxed`}>"{t.text}"</p>
              <div className="mt-4 text-sm text-muted-foreground">
                — {t.n}, {t.city}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="harga" className="py-20 bg-accent/30">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center">
          Investasi terbaik untuk masa depan anak
        </h2>
        <p className="text-center text-muted-foreground mt-3 text-lg">
          Lebih murah dari 1 buku pelajaran, manfaatnya sepanjang tahun
        </p>

        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="p-8 rounded-3xl border-2">
            <div className="text-sm font-semibold text-muted-foreground">FREE</div>
            <div className="mt-2 font-display text-4xl font-bold">Rp 0</div>
            <p className="text-sm text-muted-foreground mt-1">Selamanya</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "2 profil anak",
                "Akses 3 kategori dasar",
                "20 game per bulan",
                "10 lagu edukasi",
                "Parent dashboard basic",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block mt-8">
              <Button className="w-full rounded-full" variant="outline">
                Mulai Gratis
              </Button>
            </Link>
          </Card>

          <Card className="p-8 rounded-3xl border-2 border-primary bg-primary/5 relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sunny text-sunny-foreground hover:bg-sunny rounded-full">
              ⭐ Paling Populer
            </Badge>
            <div className="text-sm font-semibold text-primary">PRO</div>
            <div className="mt-2 font-display text-4xl font-bold">
              Rp 29.000<span className="text-base text-muted-foreground font-normal">/bulan</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">atau Rp 249.000/tahun (hemat 28%)</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "5 profil anak — tidak perlu beli per anak",
                "Semua kategori (termasuk Islami)",
                "Unlimited game & lagu",
                "AI tutor unlimited",
                "Full gamification & badge",
                "Laporan mingguan otomatis",
                "Konten offline",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <WaitlistButton />
          </Card>
        </div>
      </div>
    </section>
  );
}

function WaitlistButton() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from("pro_waitlist").insert({ email, source: "pricing" });
    setLoading(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Gagal mendaftar, coba lagi");
    } else {
      setDone(true);
      toast.success("Kami akan kabari saat Pro siap! 🌟");
    }
  }

  if (done) {
    return (
      <div className="mt-8 p-4 rounded-2xl bg-success/10 text-success text-sm text-center font-medium">
        ✨ Terima kasih! Kami akan kabari kamu.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-2">
      <div className="text-xs text-muted-foreground text-center">
        Pro segera hadir — daftar waitlist:
      </div>
      <Input
        type="email"
        required
        placeholder="email@kamu.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-full"
      />
      <Button type="submit" className="w-full rounded-full" disabled={loading}>
        {loading ? "Mendaftar..." : "Notify Me 🔔"}
      </Button>
    </form>
  );
}

function FAQ() {
  const qs = [
    {
      q: "Apakah benar-benar tidak ada iklan?",
      a: "Ya, 100% bebas iklan. Kami percaya anak harus fokus belajar, bukan terganggu oleh iklan yang tidak sesuai usia.",
    },
    {
      q: "Konten islaminya wajib diaktifkan atau opsional?",
      a: "Sepenuhnya opsional dan default OFF. Orang tua bisa aktifkan dari pengaturan kapan saja sesuai kebutuhan keluarga.",
    },
    {
      q: "Apakah bisa dipakai untuk beberapa anak sekaligus?",
      a: "Bisa! Free plan untuk 2 anak, Pro plan untuk 5 anak — masing-masing punya profil, progress, dan badge sendiri.",
    },
    {
      q: "Apakah konten sesuai dengan kurikulum sekolah Indonesia?",
      a: "Konten kami disesuaikan dengan kurikulum nasional dan tahap perkembangan anak Indonesia, dari balita hingga SD kelas 6.",
    },
    {
      q: "Apakah bisa dimainkan tanpa internet?",
      a: "Plan Pro mendukung mode offline — anak bisa download konten favoritnya dan main meski tanpa koneksi internet.",
    },
    {
      q: "Berapa lama sebaiknya anak main setiap hari?",
      a: "Rekomendasi kami: 30-60 menit per hari untuk anak di bawah 6 tahun, 60-90 menit untuk SD. Kamu bisa set batas waktu dari parent dashboard.",
    },
    {
      q: "Bagaimana cara memantau progress anak?",
      a: "Parent dashboard menampilkan grafik harian, progress per kategori, dan laporan mingguan otomatis yang bisa kamu share ke pasangan via WhatsApp.",
    },
  ];
  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center">
          Pertanyaan yang sering ditanya
        </h2>
        <Accordion type="single" collapsible className="mt-10">
          {qs.map((item, i) => (
            <AccordionItem key={i} value={`q${i}`} className="border-border/50">
              <AccordionTrigger className="text-left font-semibold text-base hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="rounded-[3rem] p-12 md:p-20 text-center gradient-brand text-primary-foreground relative overflow-hidden">
          <div className="absolute top-8 left-8 text-5xl animate-bounce-soft">🐰</div>
          <div
            className="absolute top-12 right-12 text-4xl animate-bounce-soft"
            style={{ animationDelay: "0.6s" }}
          >
            ⭐
          </div>
          <div
            className="absolute bottom-10 left-1/4 text-4xl animate-bounce-soft"
            style={{ animationDelay: "1.2s" }}
          >
            🎈
          </div>

          <h2 className="font-display text-4xl md:text-6xl font-bold max-w-2xl mx-auto">
            Mulai perjalanan belajar anak hari ini.
          </h2>
          <p className="mt-4 text-lg opacity-90">Gratis untuk 2 anak. Tidak perlu kartu kredit.</p>
          <Link to="/register">
            <Button
              size="lg"
              className="mt-8 rounded-full h-14 px-10 text-base bg-sunny text-sunny-foreground hover:bg-sunny/90 shadow-playful"
            >
              Coba Gratis Sekarang 🌟
            </Button>
          </Link>
          <p className="mt-4 text-sm opacity-80">Tanpa iklan · Konten aman · Cancel kapan saja</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[oklch(0.25_0.06_265)] text-background py-16">
      <div className="container mx-auto px-4 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-xl">
              🐰
            </div>
            <span className="font-display text-xl font-bold">PintarYuk</span>
          </div>
          <p className="text-sm opacity-80">Belajar itu menyenangkan 🌟</p>
          <p className="text-xs opacity-60 mt-2">Konten islami tersedia sebagai fitur opsional</p>
        </div>
        {[
          {
            title: "Fitur",
            links: ["Game Library", "AI Tutor", "Parent Dashboard", "Konten Islami"],
          },
          { title: "Tentang", links: ["Cerita Kami", "Tim", "Karir", "Blog"] },
          {
            title: "Legal",
            links: ["Syarat & Ketentuan", "Kebijakan Privasi", "Keamanan Anak", "Kontak"],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-display font-bold mb-3">{col.title}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="hover:opacity-100">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container mx-auto px-4 mt-10 pt-6 border-t border-background/10 text-xs opacity-60 text-center">
        © 2026 PintarYuk · Dibuat dengan ❤️ untuk anak Indonesia
      </div>
    </footer>
  );
}
