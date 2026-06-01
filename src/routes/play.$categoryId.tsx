import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, ENCOURAGEMENTS, RETRY_MESSAGES } from "@/lib/pintar";
import { toast } from "sonner";
import { X, Check, ArrowRight, Star, Volume2, Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/play/$categoryId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      childId: search.childId as string,
    };
  },
  component: GameEngine,
});

function GameEngine() {
  const { categoryId } = Route.useParams();
  const { childId } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [wrongCount, setWrongCount] = useState(0);

  const category = CATEGORIES.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (user && childId) loadQuestions();
  }, [user, authLoading, childId, categoryId]);

  async function loadQuestions() {
    setLoading(true);
    // Placeholder questions until Gemini integration is ready
    const mockQuestions = [
      { q: "Berapa 2 + 3?", a: ["4", "5", "6"], c: "5", type: "tap" },
      { q: "Yang mana gambar Gajah?", a: ["🦒", "🐘", "🦁"], c: "🐘", type: "tap" },
      { q: "Lengkapi kata: B_KU", a: ["A", "I", "U"], c: "U", type: "tap" },
      { q: "Ada berapa bintang? ⭐⭐⭐", a: ["2", "3", "4"], c: "3", type: "tap" },
      { q: "Warna langit adalah...", a: ["Biru", "Merah", "Hijau"], c: "Biru", type: "tap" },
    ];
    setQuestions(mockQuestions);
    setLoading(false);
  }

  const handleAnswer = (ans: string) => {
    if (showFeedback) return;

    const correct = ans === questions[currentIdx].c;
    if (correct) {
      setScore((s) => s + 1);
      setShowFeedback("correct");
      setFeedbackMsg(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      setWrongCount(0);

      // Play sound placeholder
      // new Audio('/sounds/correct.mp3').play();
    } else {
      setShowFeedback("wrong");
      setFeedbackMsg(RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)]);
      setWrongCount((w) => w + 1);
      // new Audio('/sounds/wrong.mp3').play();
    }

    setTimeout(() => {
      setShowFeedback(null);
      if (correct) {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
        } else {
          finishGame();
        }
      }
    }, 1500);
  };

  async function finishGame() {
    setIsFinished(true);
    const xpEarned = score * 10 + 5;

    // Save to DB
    await supabase.from("game_sessions").insert({
      child_id: childId,
      category: categoryId as any,
      topic: "General",
      score,
      total: questions.length,
      xp_earned: xpEarned,
      stars: score === questions.length ? 3 : score >= questions.length / 2 ? 2 : 1,
    });

    // Update progress
    const { data: prog } = await supabase
      .from("child_progress")
      .select("xp")
      .eq("child_id", childId)
      .single();
    if (prog) {
      await supabase
        .from("child_progress")
        .update({ xp: prog.xp + xpEarned })
        .eq("child_id", childId);
    }
  }

  if (loading || authLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent/30">
        <div className="text-6xl animate-spin">🐰</div>
      </div>
    );

  if (isFinished)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-gradient-to-b from-background to-primary/10">
        <div className="relative">
          <div className="text-9xl animate-bounce-soft">🏆</div>
          <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-sunny animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold">Hebat Banget! 🎉</h1>
          <p className="text-xl text-muted-foreground">Kamu berhasil menyelesaikan game ini</p>
        </div>

        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Star
              key={i}
              className={`w-12 h-12 ${i <= (score >= 4 ? 3 : score >= 2 ? 2 : 1) ? "text-sunny fill-sunny" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>

        <Card className="p-6 rounded-3xl border-2 shadow-soft w-full max-w-sm bg-background">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">Skor Kamu</span>
            <span className="text-2xl font-bold text-primary">
              {score}/{questions.length}
            </span>
          </div>
          <div className="flex justify-between items-center text-success">
            <span className="font-bold">XP Didapat</span>
            <span className="text-xl font-bold">+ {score * 10 + 5} XP</span>
          </div>
        </Card>

        <div className="flex flex-col gap-3 w-full max-w-sm pt-4">
          <Button
            size="xl"
            className="rounded-full shadow-playful"
            onClick={() => navigate({ to: "/play", search: { childId } })}
          >
            Main Lagi Yuk! 🚀
          </Button>
          <Link to="/" search={{ childId }}>
            <Button variant="ghost" className="rounded-full">
              Kembali ke Menu
            </Button>
          </Link>
        </div>
      </div>
    );

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => navigate({ to: "/play", search: { childId } })}
          className="p-2 bg-accent rounded-full text-muted-foreground"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Progress value={(currentIdx / questions.length) * 100} className="h-4 rounded-full" />
          <span className="font-bold text-sm text-muted-foreground">
            {currentIdx + 1}/{questions.length}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-sunny/20 px-3 py-1.5 rounded-full">
          <Star className="w-4 h-4 text-sunny fill-sunny" />
          <span className="font-bold text-sunny-foreground">{score}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="text-3xl font-display font-bold leading-tight max-w-lg">{currentQ.q}</div>
          <button className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto hover:bg-primary/20 transition">
            <Volume2 className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          {currentQ.a.map((ans: string, i: number) => (
            <button
              key={i}
              onClick={() => handleAnswer(ans)}
              className={`h-20 rounded-[2rem] border-4 border-accent text-2xl font-bold shadow-soft transition active:scale-95 hover:bg-accent/50 ${showFeedback === "correct" && ans === currentQ.c ? "bg-success/20 border-success text-success" : ""}`}
            >
              {ans}
            </button>
          ))}
        </div>
      </main>

      {/* Feedback Overlay */}
      {showFeedback && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-10 animate-in zoom-in duration-300 ${showFeedback === "correct" ? "bg-success/80" : "bg-coral/80"}`}
        >
          <div className="bg-background rounded-[3rem] p-10 text-center shadow-2xl space-y-4 max-w-sm w-full">
            <div className="text-8xl animate-bounce">
              {showFeedback === "correct" ? "🐰✨" : "🐰💨"}
            </div>
            <h2 className="font-display text-3xl font-bold">
              {showFeedback === "correct" ? "HEBAT!" : "OOPS!"}
            </h2>
            <p className="text-lg font-medium">{feedbackMsg}</p>
          </div>
        </div>
      )}

      {/* Background shapes */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-10 text-9xl">🎈</div>
        <div className="absolute bottom-1/4 right-10 text-9xl">🌟</div>
        <div className="absolute top-1/2 right-1/4 text-8xl">🔢</div>
      </div>
    </div>
  );
}
