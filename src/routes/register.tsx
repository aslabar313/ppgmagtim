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
    <div className="min-h-screen grid md:grid-cols-5">
      <aside className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-creative via-primary to-sunny text-primary-foreground p-10 flex flex-col justify-between">
        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-background/20 backdrop-blur flex items-center justify-center text-2xl">
            🐰
          </div>
          <span className="font-display text-2xl font-bold">PintarYuk</span>
        </Link>
        <div className="relative z-10">
          <div className="text-7xl mb-4 animate-bounce-soft">🚀</div>
          <h2 className="font-display text-3xl font-bold leading-tight">
            Mulai gratis untuk 2 anak.
          </h2>
          <p className="mt-3 opacity-90">Tanpa kartu kredit. Tanpa iklan. Aman untuk semua usia.</p>
          <ul className="mt-6 space-y-2 text-sm">
            <li>✨ 500+ konten edukatif</li>
            <li>🏆 Streak, badge, level seperti Duolingo</li>
            <li>📊 Laporan mingguan otomatis</li>
          </ul>
        </div>
        <div className="absolute top-16 right-12 text-5xl opacity-30 animate-bounce-soft">📚</div>
        <div
          className="absolute bottom-32 right-16 text-6xl opacity-20 animate-bounce-soft"
          style={{ animationDelay: "0.6s" }}
        >
          🎵
        </div>
        <div className="relative z-10 text-sm opacity-80">© 2025 PintarYuk</div>
      </aside>

      <main className="md:col-span-3 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 rounded-3xl border-2 shadow-soft">
          <h1 className="font-display text-3xl font-bold">Buat akun gratis 🎉</h1>
          <p className="text-muted-foreground mt-2">Cuma 1 menit, langsung bisa dipakai</p>

          <Button
            onClick={onGoogle}
            type="button"
            variant="outline"
            className="w-full mt-6 rounded-full h-12"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
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

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> atau <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nama orang tua</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ibu Rina"
                className="h-12 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="h-12 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-12 rounded-xl mt-1.5"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-12 text-base">
              {loading ? "Membuat akun..." : "Daftar Gratis ✨"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Dengan mendaftar kamu setuju dengan Syarat & Ketentuan kami.
          </p>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Masuk
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
