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
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="relative">
        {/* Vibrant background blobs */}
        <div className="absolute inset-x-0 top-0 h-[900px] -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,oklch(0.92_0.12_250/0.55),transparent_45%),radial-gradient(circle_at_85%_10%,oklch(0.9_0.14_90/0.55),transparent_50%),radial-gradient(circle_at_50%_80%,oklch(0.88_0.14_330/0.45),transparent_55%),radial-gradient(circle_at_10%_85%,oklch(0.9_0.13_180/0.4),transparent_50%)]" />
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute top-10 right-0 w-[480px] h-[480px] rounded-full bg-creative/25 blur-3xl" />
          <div className="absolute top-[420px] left-1/3 w-[380px] h-[380px] rounded-full bg-sunny/40 blur-3xl" />
          <div className="absolute top-[300px] right-1/4 w-[320px] h-[320px] rounded-full bg-coral/25 blur-3xl" />
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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl">
            🐰
          </div>
          <span className="font-display text-xl font-bold">PintarYuk</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#fitur" className="hover:text-primary transition">
            Fitur
          </a>
          <a href="#harga" className="hover:text-primary transition">
            Harga
          </a>
          <a href="#faq" className="hover:text-primary transition">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" className="rounded-full">
              Masuk
            </Button>
          </Link>
          <Link to="/register">
            <Button className="rounded-full">Coba Gratis</Button>
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
        <div className="absolute top-20 left-10 text-4xl animate-bounce-soft">⭐</div>
        <div
          className="absolute top-40 right-16 text-3xl animate-bounce-soft"
          style={{ animationDelay: "0.5s" }}
        >
          📚
        </div>
        <div
          className="absolute top-60 left-1/4 text-3xl animate-bounce-soft"
          style={{ animationDelay: "1s" }}
        >
          🔢
        </div>
        <div
          className="absolute bottom-20 right-1/4 text-4xl animate-bounce-soft"
          style={{ animationDelay: "1.5s" }}
        >
          🎨
        </div>
        <div
          className="absolute top-32 right-1/3 text-3xl animate-bounce-soft"
          style={{ animationDelay: "0.8s" }}
        >
          🌟
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-28 text-center relative">
        <Badge className="rounded-full bg-sunny text-sunny-foreground hover:bg-sunny mb-6 px-4 py-1.5 text-sm">
          🌟 Tanpa iklan · Konten aman · Dipercaya ribuan orang tua
        </Badge>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight max-w-4xl mx-auto">
          Biarkan anak main HP — asal yang dimainkan <span className="text-primary">PintarYuk</span>
          .
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Platform game edukasi untuk anak 2–12 tahun. Belajar angka, huruf, sains, dan Bahasa
          Inggris lewat game yang seru — tanpa iklan, tanpa konten berbahaya.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button size="lg" className="rounded-full h-14 px-8 text-base shadow-soft">
              Coba Gratis Sekarang ✨
            </Button>
          </Link>
          <a href="#preview">
            <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-base">
              Lihat demo →
            </Button>
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Gratis untuk 2 anak · Tanpa kartu kredit · Aman untuk semua usia
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex -space-x-3">
            {["👩", "👨", "👩‍🦱", "👨‍🦰", "👩‍🦳"].map((e, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full bg-card border-2 border-background flex items-center justify-center text-lg shadow-sm"
              >
                {e}
              </div>
            ))}
          </div>
          <div className="text-sm">
            <div className="font-semibold">Dipercaya 20.000+ orang tua Indonesia</div>
            <div className="text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
              <span className="text-sunny">★★★★★</span> 4.9/5 · 500.000+ sesi belajar
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
    <section id="preview" className="py-20 bg-gradient-to-b from-background to-accent/40">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold">Lihat PintarYuk beraksi</h2>
        <p className="mt-3 text-muted-foreground text-lg">
          Explore langsung — gratis, tanpa daftar
        </p>

        <div className="mt-12 max-w-md mx-auto relative">
          <Badge className="absolute -top-3 right-4 z-10 bg-sunny text-sunny-foreground hover:bg-sunny rounded-full px-3">
            🔴 Live Preview
          </Badge>
          {/* Phone frame */}
          <div className="bg-gradient-to-br from-primary/20 via-creative/20 to-sunny/30 p-3 rounded-[3rem] shadow-playful">
            <div className="bg-background rounded-[2.5rem] p-5 text-left space-y-4 max-h-[640px] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                  🐰
                </div>
                <div className="flex-1">
                  <div className="font-display font-bold">Halo, Dinda! 🌟</div>
                  <div className="text-xs text-muted-foreground">⭐ Bintang Bersinar · 450 XP</div>
                </div>
                <div className="flex items-center gap-1 bg-coral/10 px-2.5 py-1 rounded-full">
                  <span className="text-lg animate-flame">🔥</span>
                  <span className="text-sm font-bold text-coral">5</span>
                </div>
              </div>

              {/* Challenge card */}
              <div className="bg-gradient-to-br from-sunny to-challenge rounded-2xl p-4 text-sunny-foreground shadow-soft">
                <div className="text-xs font-semibold uppercase opacity-80">Tantangan Hari Ini</div>
                <div className="font-display font-bold text-lg mt-1">Hitung sampai 20! 🔢</div>
                <div className="mt-2 bg-background/40 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-background/80 rounded-full" style={{ width: "40%" }} />
                </div>
                <Link to="/register">
                  <Button
                    size="sm"
                    className="mt-3 rounded-full bg-background text-foreground hover:bg-background/90"
                  >
                    Main Sekarang!
                  </Button>
                </Link>
              </div>

              {/* Categories grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { e: "🔢", n: "Matematika", c: "bg-cat-math/15 text-cat-math", p: 60 },
                  { e: "📖", n: "Membaca", c: "bg-cat-reading/15 text-cat-reading", p: 40 },
                  { e: "🌍", n: "Sains", c: "bg-cat-science/15 text-cat-science", p: 25 },
                  { e: "🎨", n: "Kreatif", c: "bg-cat-creative/15 text-cat-creative", p: 70 },
                ].map((cat) => (
                  <div key={cat.n} className={`${cat.c} p-3 rounded-2xl`}>
                    <div className="text-2xl">{cat.e}</div>
                    <div className="text-sm font-bold mt-1">{cat.n}</div>
                    <div className="mt-2 h-1.5 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current"
                        style={{ width: `${cat.p}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Mascot */}
              <div
                onClick={() => setEncouragement(tips[Math.floor(Math.random() * tips.length)])}
                className="flex items-center gap-3 bg-accent/60 p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition"
              >
                <div className="text-4xl animate-bounce-soft">🐰</div>
                <div className="bg-card px-3 py-2 rounded-2xl text-sm font-medium shadow-sm flex-1">
                  {encouragement}
                </div>
              </div>

              {/* Badge */}
              <div className="flex items-center gap-2 bg-sunny/20 p-3 rounded-2xl">
                <div className="text-2xl animate-sparkle">🏆</div>
                <div className="text-sm font-semibold">Badge baru: Semangat 5 Hari!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoBar() {
  const cities = ["Jakarta", "Surabaya", "Bandung", "Medan", "Makassar", "Yogyakarta"];
  return (
    <section className="py-12 border-y border-border/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Dipercaya orang tua dari seluruh Indonesia
        </p>
        <div className="flex flex-wrap gap-8 justify-center items-center text-muted-foreground">
          {cities.map((c) => (
            <div key={c} className="font-display font-semibold text-lg">
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
      t: "Game yang tidak mengajarkan apa-apa.",
      d: "Mobile Legends, TikTok — semua dirancang buat bikin anak kecanduan, bukan belajar. Screen time habis tanpa manfaat.",
    },
    {
      e: "🎯",
      t: "Iklan yang tidak sesuai usia.",
      d: "Banyak app edukasi yang katanya gratis, tapi penuh iklan yang tiba-tiba muncul saat anak sedang main. Kontennya pun tidak semua aman.",
    },
    {
      e: "📊",
      t: "Orang tua tidak tahu anak belajar apa.",
      d: "Anak bilang 'sudah belajar' tapi tidak ada buktinya. Tidak ada laporan, tidak ada progress yang bisa dipantau.",
    },
  ];
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center max-w-3xl mx-auto">
          Anak kamu main HP berjam-jam. Pertanyaannya: <span className="text-coral">main apa?</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {pains.map((p) => (
            <Card key={p.t} className="p-6 rounded-3xl border-2">
              <div className="text-5xl mb-4">{p.e}</div>
              <h3 className="font-display text-xl font-bold">{p.t}</h3>
              <p className="text-muted-foreground mt-3 leading-relaxed">{p.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-20 text-center">
          <p className="font-display text-2xl md:text-3xl max-w-2xl mx-auto">
            Jadikan screen time sebagai{" "}
            <span className="text-primary">waktu belajar yang menyenangkan.</span>
          </p>
          <p className="mt-4 text-lg text-muted-foreground">Introducing PintarYuk 🌟</p>
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
      color: "bg-primary/10 text-primary",
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
      color: "bg-creative/10 text-creative",
    },
    {
      tag: "Seperti Duolingo",
      icon: <Trophy className="w-6 h-6" />,
      title: "Streak, badge, dan level yang bikin anak tidak mau berhenti belajar",
      desc: "Sistem reward yang terbukti efektif — streak harian, XP, badge yang bisa dikumpulkan.",
      bullets: ["Daily streak", "20+ badge collection", "Level system", "Daily challenge"],
      emoji: "🏆",
      color: "bg-sunny/30 text-sunny-foreground",
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
      color: "bg-success/10 text-success",
    },
  ];
  return (
    <section id="fitur" className="py-20 bg-gradient-to-b from-accent/30 to-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-center max-w-3xl mx-auto">
          Semua yang anak butuhkan untuk <span className="text-primary">tumbuh lebih cerdas</span>
        </h2>
        <div className="mt-16 space-y-20">
          {feats.map((f, i) => (
            <div
              key={f.title}
              className={`grid md:grid-cols-2 gap-10 items-center ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <Badge className={`${f.color} rounded-full hover:${f.color}`}>{f.tag}</Badge>
                <h3 className="font-display text-3xl font-bold mt-4">{f.title}</h3>
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {f.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-success flex-shrink-0" /> {b}
                    </div>
                  ))}
                </div>
              </div>
              <div
                className={`${f.color} aspect-square max-w-md mx-auto rounded-[3rem] flex items-center justify-center p-12 shadow-soft`}
              >
                <div className="text-[12rem] animate-bounce-soft">{f.emoji}</div>
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
