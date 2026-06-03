
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/card"; // Using Card as base for playful buttons
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BADGES } from "@/lib/pintar";
import { ArrowLeft, Trophy, Star, Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/play/trophies")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      childId: search.childId as string,
    };
  },
  component: TrophiesPage,
});

function TrophiesPage() {
  const { childId } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (user && childId) fetchEarnedBadges();
  }, [user, authLoading, childId]);

  async function fetchEarnedBadges() {
    setLoading(true);
    const { data } = await supabase
      .from("badges_earned")
      .select("badge_key")
      .eq("child_id", childId);
    
    if (data) {
      setEarnedBadges(new Set(data.map(b => b.badge_key)));
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-accent/30">
      <div className="text-4xl animate-bounce">🏆</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b">
        <Link to="/play" search={{ childId }}>
          <button className="p-3 bg-white border-2 rounded-full text-muted-foreground shadow-sm hover:bg-accent transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </Link>
        <h1 className="font-display text-2xl font-black flex items-center gap-2">
          Ruang Koleksi 🏅
        </h1>
      </header>

      <main className="flex-1 p-6 space-y-8 container max-w-2xl mx-auto">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-3xl bg-sunny/10 border-sunny/20 border-2 flex flex-col items-center text-center">
            <div className="text-3xl mb-1">🏅</div>
            <div className="font-black text-2xl text-sunny-foreground">{earnedBadges.size}</div>
            <div className="text-xs font-bold text-sunny-foreground/60 uppercase">Badge Didapat</div>
          </Card>
          <Card className="p-4 rounded-3xl bg-primary/10 border-primary/20 border-2 flex flex-col items-center text-center">
            <div className="text-3xl mb-1">✨</div>
            <div className="font-black text-2xl text-primary">{BADGES.length - earnedBadges.size}</div>
            <div className="text-xs font-bold text-primary/60 uppercase">Lagi Dicari</div>
          </Card>
        </div>

        {/* Badges Grid */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold px-1">Koleksi Lencana Kamu</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {BADGES.map((badge) => {
              const isEarned = earnedBadges.has(badge.key);
              return (
                <div key={badge.key} className="flex flex-col items-center text-center space-y-3 group">
                  <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-5xl transition-all duration-500 ${isEarned ? 'bg-white shadow-playful scale-100 rotate-0' : 'bg-slate-200 grayscale opacity-40 scale-90 -rotate-12'}`}>
                     {isEarned ? (
                       <>
                         {badge.emoji}
                         <Sparkles className="absolute -top-1 -right-1 text-sunny w-6 h-6 animate-pulse" />
                       </>
                     ) : (
                       <Lock className="w-8 h-8 text-slate-400" />
                     )}
                  </div>
                  <div className="space-y-1">
                    <div className={`font-black text-sm leading-tight ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground leading-tight px-2">
                      {badge.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivational Card */}
        <Card className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-600 text-white border-none shadow-soft text-center space-y-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
           <div className="relative z-10">
             <Trophy className="w-12 h-12 mx-auto mb-2 text-sunny fill-sunny animate-bounce-soft" />
             <h3 className="font-display text-xl font-bold">Terus Bermain & Belajar!</h3>
             <p className="text-sm opacity-90">Setiap game yang kamu selesaikan membawamu lebih dekat ke lencana baru. Semangat ya!</p>
           </div>
        </Card>

      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
        <div className="absolute top-1/3 left-10 text-7xl blur-[1px]">🌟</div>
        <div className="absolute bottom-20 right-10 text-7xl blur-[1px]">💎</div>
      </div>
    </div>
  );
}
