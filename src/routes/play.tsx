import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Flame, Trophy, Lock, ArrowLeft, Settings } from "lucide-react";

export const Route = createFileRoute("/play")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      childId: search.childId as string | undefined,
    };
  },
  component: ChildHome,
});

function ChildHome() {
  const { childId } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [child, setChild] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
      return;
    }

    if (user && !childId) {
      navigate({ to: "/" }); // Should go to child selector
      return;
    }

    if (user && childId) {
      fetchChildData();
    }
  }, [user, authLoading, childId]);

  async function fetchChildData() {
    setLoading(true);
    const { data: childData } = await supabase
      .from("children")
      .select("*")
      .eq("id", childId)
      .single();

    const { data: progressData } = await supabase
      .from("child_progress")
      .select("*")
      .eq("child_id", childId)
      .single();

    setChild(childData);
    setProgress(progressData);
    setLoading(false);
  }

  if (loading || authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent/30">
        <div className="text-4xl animate-bounce">🐰</div>
      </div>
    );

  if (!child) return <div>Data anak tidak ditemukan</div>;

  return (
    <div className={`min-h-screen bg-background pb-20 theme-${child.theme}`}>
      {/* Top Header */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-[1.25rem] bg-primary/20 flex items-center justify-center text-3xl shadow-soft">
            {child.avatar === "rabbit" ? "🐰" : "🐻"}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Halo, {child.name}! 👋</h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-sunny/20 text-sunny-foreground hover:bg-sunny/20"
              >
                Lvl {progress?.level || 1}
              </Badge>
              <div className="w-24 h-2 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${progress?.xp % 100 || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-coral/10 px-3 py-1.5 rounded-full border-2 border-coral/20">
            <Flame className="w-5 h-5 text-coral animate-pulse" />
            <span className="font-bold text-coral">{progress?.current_streak || 0}</span>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-muted-foreground"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Daily Challenge */}
        <Card className="p-5 bg-gradient-to-br from-sunny to-challenge text-sunny-foreground rounded-[2rem] border-none shadow-playful relative overflow-hidden group cursor-pointer active:scale-95 transition">
          <div className="absolute -right-4 -top-4 text-7xl opacity-20 group-hover:rotate-12 transition">
            🌟
          </div>
          <div className="relative z-10">
            <Badge className="bg-background/30 text-background hover:bg-background/30 rounded-full mb-2">
              Tantangan Hari Ini
            </Badge>
            <h2 className="font-display text-2xl font-bold">Ayo kumpulkan 50 XP!</h2>
            <p className="mt-1 opacity-90 text-sm">Selesaikan 2 game apa saja sekarang</p>
            <Button className="mt-4 rounded-full bg-background text-foreground hover:bg-background/90 font-bold px-6 shadow-soft">
              Main Sekarang ✨
            </Button>
          </div>
        </Card>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold">Pilih Petualanganmu 🎮</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "math", n: "Angka & Hitung", e: "🔢", c: "bg-cat-math/15 text-cat-math", l: 1 },
              {
                id: "reading",
                n: "Huruf & Baca",
                e: "📖",
                c: "bg-cat-reading/15 text-cat-reading",
                l: 1,
              },
              {
                id: "science",
                n: "Sains & Alam",
                e: "🌍",
                c: "bg-cat-science/15 text-cat-science",
                l: 1,
              },
              {
                id: "creative",
                n: "Dunia Kreatif",
                e: "🎨",
                c: "bg-cat-creative/15 text-cat-creative",
                l: 1,
              },
              {
                id: "english",
                n: "English Fun",
                e: "🗣️",
                c: "bg-cat-english/15 text-cat-english",
                l: 1,
              },
              {
                id: "islamic",
                n: "Belajar Islam",
                e: "☪️",
                c: "bg-cat-islamic/15 text-cat-islamic",
                l: 1,
                hidden: !child.islamic_content,
              },
            ]
              .filter((i) => !i.hidden)
              .map((cat) => (
                <Link
                  key={cat.id}
                  to="/play/$categoryId"
                  params={{ categoryId: cat.id }}
                  search={{ childId }}
                >
                  <Card
                    className={`${cat.c} p-5 rounded-[2.5rem] border-none shadow-soft flex flex-col items-center text-center group cursor-pointer active:scale-95 transition relative h-full`}
                  >
                    <div className="text-5xl mb-3 group-hover:scale-110 transition">{cat.e}</div>
                    <div className="font-display font-bold text-sm leading-tight">{cat.n}</div>
                    <div className="mt-3 w-full bg-background/40 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-current rounded-full" style={{ width: "30%" }} />
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        </section>

        {/* Recently Played */}
        <section className="pt-2">
          <h3 className="font-display text-lg font-bold mb-3">Main Lagi Yuk</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 aspect-square rounded-[2rem] bg-accent/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-3xl opacity-50"
              >
                ❓
              </div>
            ))}
          </div>
        </section>

        {/* Mascot Mascot */}
        <div className="fixed bottom-6 right-6 z-40">
          <div className="bg-card p-3 rounded-2xl shadow-playful border-2 relative animate-bounce-soft cursor-pointer">
            <div className="absolute -top-12 -right-4 bg-background px-3 py-2 rounded-xl text-xs font-bold shadow-sm border whitespace-nowrap">
              Tap aku dong! ✨
            </div>
            <div className="text-5xl">🐰</div>
          </div>
        </div>
      </main>

      {/* Nav Placeholder for Child */}
      <nav className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-md border-t h-16 flex items-center justify-around px-6 z-30">
        <button className="text-primary">
          <Settings className="w-7 h-7" />
        </button>
        <button className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-playful -mt-8 border-4 border-background">
          <Trophy className="w-7 h-7" />
        </button>
        <button className="text-muted-foreground">
          <ArrowLeft className="w-7 h-7" />
        </button>
      </nav>
    </div>
  );
}
