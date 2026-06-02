import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Daftar Gratis — PintarYuk" },
      {
        name: "description",
        content: "Daftar PintarYuk gratis. Belajar sambil bermain untuk anak 2–12 tahun.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Kata sandi minimal 6 karakter");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Akun berhasil dibuat! Cek email untuk verifikasi 💌");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-5 bg-[#FDFBF7]">
      <aside className="md:col-span-2 relative overflow-hidden bg-sunny text-sunny-foreground p-10 flex flex-col justify-between">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_15%,#ffffff,transparent_45%),radial-gradient(circle_at_85%_10%,#ffffff,transparent_50%)]" />
        <Link to="/" className="flex items-center gap-2 relative z-10 hover:scale-105 transition-transform w-fit">
          <div className="w-12 h-12 rounded-[1rem] bg-white text-sunny flex items-center justify-center text-2xl shadow-[0_4px_0_0_oklch(0.7_0.15_80)]">
            🐰
          </div>
          <span className="font-display text-2xl font-black">PintarYuk</span>
        </Link>
        <div className="relative z-10">
          <div className="text-7xl mb-6 animate-bounce-soft drop-shadow-sm">🚀</div>
          <h2 className="font-display text-4xl font-black leading-tight drop-shadow-sm">
            Mulai gratis untuk 2 anak.
          </h2>
          <p className="mt-4 text-lg opacity-90 font-medium">Tanpa kartu kredit. Tanpa iklan. Aman untuk semua usia.</p>
          <ul className="mt-8 space-y-3 text-base font-bold">
            <li className="flex items-center gap-2"><span className="text-2xl">✨</span> 500+ konten edukatif</li>
            <li className="flex items-center gap-2"><span className="text-2xl">🏆</span> Sistem level ala Duolingo</li>
            <li className="flex items-center gap-2"><span className="text-2xl">📊</span> Pantauan ortu otomatis</li>
          </ul>
        </div>
        <div className="absolute top-16 right-12 text-5xl opacity-40 animate-bounce-soft drop-shadow-sm">📚</div>
        <div
          className="absolute bottom-32 right-16 text-6xl opacity-30 animate-bounce-soft drop-shadow-sm"
          style={{ animationDelay: "0.6s" }}
        >
          🎵
        </div>
        <div className="relative z-10 text-sm font-bold opacity-80">© 2026 PintarYuk</div>
      </aside>

      <main className="md:col-span-3 flex items-center justify-center p-6 relative">
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-creative/20 blur-3xl animate-pulse" />
        <Card className="w-full max-w-md p-10 rounded-[2.5rem] border-4 border-[#E0E7FF] shadow-[0_12px_0_0_oklch(0.92_0.01_85)] bg-white relative z-10">
          <h1 className="font-display text-4xl font-black text-foreground drop-shadow-sm">Daftar gratis 🎉</h1>
          <p className="text-muted-foreground mt-2 font-medium">Cuma 1 menit, langsung bisa dipakai</p>

          <Button
            onClick={onGoogle}
            type="button"
            variant="outline"
            className="w-full mt-8 rounded-full h-14 font-bold border-2 shadow-sm hover:bg-accent"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Daftar dengan Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <div className="h-0.5 flex-1 bg-border" /> atau <div className="h-0.5 flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="font-bold">Nama orang tua</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ibu Rina"
                className="h-14 rounded-2xl mt-2 border-2 text-lg px-4"
              />
            </div>
            <div>
              <Label htmlFor="email" className="font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="h-14 rounded-2xl mt-2 border-2 text-lg px-4"
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-bold">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-2xl mt-2 border-2 text-lg px-4 tracking-[0.2em]"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-14 text-lg font-bold shadow-[0_4px_0_0_oklch(0.5_0.16_250)] hover:shadow-none hover:translate-y-1 transition-all mt-4">
              {loading ? "Membuat akun..." : "Daftar Gratis ✨"}
            </Button>
          </form>

          <p className="text-xs font-bold text-muted-foreground mt-6 text-center leading-relaxed">
            Dengan mendaftar kamu setuju dengan <br/> Syarat & Ketentuan kami.
          </p>
          <p className="text-sm font-bold text-muted-foreground mt-6 text-center">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors underline decoration-2 underline-offset-4">
              Masuk
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
