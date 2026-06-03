import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, ENCOURAGEMENTS, RETRY_MESSAGES, xpToLevel } from "@/lib/pintar";
import { toast } from "sonner";
import { X, ArrowRight, Star, Volume2, Sparkles, Trophy, Lightbulb, Bot } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/speech";
import { generateQuestions } from "@/server-functions/gemini";
import { CreativeGame } from "@/components/games/CreativeGame";
import { MusicGame } from "@/components/games/MusicGame";
import { updateStreak, checkAndAwardBadges } from "@/lib/game-logic";

export const Route = createFileRoute("/play/$categoryId")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      childId: search.childId as string,
    };
  },
  component: PlayRoute,
});

function PlayRoute() {
  const { categoryId } = Route.useParams();
  const { childId } = Route.useSearch();
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    fetchChild();
  }, [childId]);

  async function fetchChild() {
    const { data } = await supabase.from('children').select('*').eq('id', childId).single();
    if (data) setChild(data);
  }

  if (categoryId === 'creative') {
    return <CreativeGame childId={childId} childName={child?.name || "Anak"} />;
  }

  if (categoryId === 'music') {
    return <MusicGame childId={childId} childName={child?.name || "Anak"} />;
  }

  return <GameEngine child={child} />;
}

function GameEngine({ child }: { child: any }) {
  const { categoryId } = Route.useParams();
  const { childId } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [wrongCount, setWrongCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime] = useState(Date.now());
  
  // State for fill-in type
  const [fillInAnswer, setFillInAnswer] = useState("");

  const category = CATEGORIES.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (user && childId && child) loadQuestions();
  }, [user, authLoading, childId, categoryId, child]);

  async function loadQuestions() {
    if (!child) return;
    setLoading(true);
    setLoadingAi(true);
    try {
      // Panggil AI Tutor (Gemini Server Function)
      const aiQuestions = await generateQuestions({
        data: {
          categoryId: categoryId as string,
          ageGroup: child.age_group,
          language: child.language_mode || 'id',
          islamicContent: child.islamic_content || false
        }
      });
      
      setQuestions(aiQuestions);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal memuat soal. Pastikan API Key Gemini sudah disetel di Admin.");
      // Fallback ke soal dummy jika error
      setQuestions([
        { q: "Berapa 2 + 3?", a: ["4", "5", "6"], c: "5", type: "tap", hint: "Gunakan 5 jarimu", explanation: "Dua ditambah tiga sama dengan lima!" },
        { q: "Yang mana gambar Gajah?", a: ["🦒", "🐘", "🦁"], c: "🐘", type: "tap", hint: "Hewan yang belalainya panjang", explanation: "Gajah punya belalai yang panjang dan telinga yang lebar." }
      ]);
    } finally {
      setLoading(false);
      setLoadingAi(false);
    }
  }

  useEffect(() => {
    if (questions[currentIdx] && !loading && !isFinished) {
      speak(questions[currentIdx].q);
    }
    return () => stopSpeaking();
  }, [currentIdx, loading, questions, isFinished]);

  const handleAnswer = (ans: string) => {
    if (showFeedback) return;

    // Normalisasi jawaban untuk fill-in
    const currentQ = questions[currentIdx];
    const isCorrect = ans.trim().toLowerCase() === currentQ.c.toString().toLowerCase();

    if (isCorrect) {
      setScore((s) => s + 1);
      setShowFeedback("correct");
      const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
      setFeedbackMsg(msg);
      speak(msg);
      
      setTimeout(() => {
        setShowFeedback(null);
        setWrongCount(0);
        setShowHint(false);
        setShowExplanation(false);
        setFillInAnswer("");
        
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
        } else {
          finishGame();
        }
      }, 1500);

    } else {
      setShowFeedback("wrong");
      const msg = RETRY_MESSAGES[Math.floor(Math.random() * RETRY_MESSAGES.length)];
      setFeedbackMsg(msg);
      speak(msg);
      
      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);

      setTimeout(() => {
        setShowFeedback(null);
        if (newWrongCount === 1 && currentQ.hint) {
           setShowHint(true);
           speak("Ini petunjuknya: " + currentQ.hint);
        } else if (newWrongCount >= 2 && currentQ.explanation) {
           setShowExplanation(true);
           speak("Dengarkan penjelasan AI Tutor ya: " + currentQ.explanation);
        }
      }, 1500);
    }
  };

  async function finishGame() {
    setIsFinished(true);
    const xpEarned = score * 10 + 5;
    const durationSec = Math.floor((Date.now() - startTime) / 1000);

    await supabase.from("game_sessions").insert({
      child_id: childId,
      category: categoryId as any,
      topic: "General",
      correct: score,
      total: questions.length,
      xp_earned: xpEarned,
      stars: score === questions.length ? 3 : score >= questions.length / 2 ? 2 : 1,
      duration_sec: durationSec,
    });

    // Log to screen_time_logs
    await supabase.from("screen_time_logs").insert({
      child_id: childId,
      duration_sec: durationSec,
      date: new Date().toISOString().split('T')[0]
    });

    const { data: prog } = await supabase.from("child_progress").select("xp, level").eq("child_id", childId).single();
    if (prog) {
      const newXp = prog.xp + xpEarned;
      const { level: newLevel } = xpToLevel(newXp);
      
      await supabase.from("child_progress").update({ xp: newXp, level: newLevel }).eq("child_id", childId);
      
      if (newLevel > (prog.level || 1)) {
        toast.success(`HORE! Kamu naik ke Level ${newLevel}! 🚀`, {
          description: "Kamu makin pintar!",
          duration: 5000,
        });
        speak(`Hore! Selamat ya, kamu sekarang sudah naik ke level ${newLevel}! Kamu luar biasa!`);
      }
    }

    // Award badges and update streaks
    await updateStreak(childId);
    const newBadges = await checkAndAwardBadges(childId);
    if (newBadges.length > 0) {
      toast.success(`Selamat! Kamu mendapatkan ${newBadges.length} lencana baru! 🏅`);
    }

    // Check Daily Challenge
    const today = new Date().toISOString().split('T')[0];
    const { data: challenge } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("child_id", childId)
      .eq("date", today)
      .maybeSingle();
    
    if (challenge && !challenge.completed) {
      // Check if this is the 2nd game today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("game_sessions")
        .select("*", { count: 'exact', head: true })
        .eq("child_id", childId)
        .gte("played_at", startOfDay.toISOString());

      if (count && count >= 2) {
        await supabase
          .from("daily_challenges")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", challenge.id);
        toast.success("Tantangan Harian Selesai! 🎉 +50 XP Bonus!");
        // Add bonus XP
        const { data: currentProg } = await supabase.from("child_progress").select("xp").eq("child_id", childId).single();
        if (currentProg) {
          await supabase.from("child_progress").update({ xp: currentProg.xp + 50 }).eq("child_id", childId);
        }
      }
    }
  }

  if (loading || authLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-accent/30 space-y-4">
        <div className="text-6xl animate-bounce">🤖</div>
        <div className="text-lg font-bold text-muted-foreground">AI Tutor sedang membuat soal yang seru...</div>
        <Progress value={undefined} className="w-48 h-2" />
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
              className={`w-12 h-12 ${i <= (score >= Math.ceil(questions.length * 0.8) ? 3 : score >= Math.ceil(questions.length * 0.5) ? 2 : 1) ? "text-sunny fill-sunny" : "text-muted-foreground/30"}`}
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
            onClick={() => {
              setScore(0);
              setCurrentIdx(0);
              setIsFinished(false);
              loadQuestions();
            }}
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
  if (!currentQ) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] overflow-hidden relative">
      {/* Header */}
      <header className="p-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => navigate({ to: "/play", search: { childId } })}
          className="p-3 bg-white border-2 rounded-full text-muted-foreground shadow-sm hover:bg-accent transition"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Progress value={((currentIdx) / questions.length) * 100} className="h-5 rounded-full border-2" />
        </div>
        <div className="flex items-center gap-2 bg-white border-2 px-4 py-2 rounded-full shadow-sm">
          <Star className="w-5 h-5 text-sunny fill-sunny animate-pulse" />
          <span className="font-black text-lg text-sunny-foreground">{score}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 relative z-10 w-full max-w-xl mx-auto">
        
        {/* Question Area */}
        <div className="text-center space-y-6 w-full">
          <div className="bg-white p-8 rounded-[3rem] border-4 border-primary/20 shadow-[0_8px_0_0_oklch(0.92_0.01_85)]">
            <h2 className="text-3xl md:text-4xl font-display font-black leading-tight text-foreground">
              {currentQ.q}
            </h2>
          </div>
          
          <button 
            onClick={() => speak(currentQ.q)}
            className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto hover:bg-primary/20 hover:scale-110 transition-transform cursor-pointer border-2 border-primary/20 shadow-sm"
          >
            <Volume2 className="w-7 h-7" />
          </button>
        </div>

        {/* AI Helper Messages */}
        {(showHint || showExplanation) && (
          <div className="w-full bg-creative/10 border-2 border-creative/30 p-4 rounded-3xl flex items-start gap-3 animate-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-white rounded-full flex flex-shrink-0 items-center justify-center text-2xl shadow-sm">
              🤖
            </div>
            <div>
              <div className="font-bold text-creative flex items-center gap-1">
                {showExplanation ? <><Bot className="w-4 h-4"/> AI Tutor Menjelaskan</> : <><Lightbulb className="w-4 h-4"/> Petunjuk</>}
              </div>
              <p className="font-medium text-foreground mt-1">
                {showExplanation ? currentQ.explanation : currentQ.hint}
              </p>
            </div>
          </div>
        )}

        {/* Answer Area based on Type */}
        <div className="w-full pt-4">
          
          {(currentQ.type === 'tap' || currentQ.type === 'visual' || currentQ.type === 'true-false' || !currentQ.type) && (
            <div className={`grid gap-4 w-full ${currentQ.a?.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {currentQ.a?.map((ans: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(ans)}
                  className={`min-h-20 p-4 rounded-[2rem] border-4 border-[#E2E8F0] bg-white text-2xl font-black shadow-[0_6px_0_0_oklch(0.92_0.01_85)] transition-all active:scale-95 active:translate-y-2 active:shadow-none hover:border-primary hover:bg-primary/5`}
                >
                  {ans}
                </button>
              ))}
            </div>
          )}

          {currentQ.type === 'fill-in' && (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleAnswer(fillInAnswer); }}
              className="flex flex-col gap-4 w-full"
            >
              <Input 
                autoFocus
                value={fillInAnswer}
                onChange={(e) => setFillInAnswer(e.target.value)}
                placeholder="Ketik jawabanmu di sini..."
                className="h-20 rounded-[2rem] border-4 border-[#E2E8F0] text-center text-3xl font-black shadow-inner"
              />
              <Button type="submit" disabled={!fillInAnswer} className="h-16 rounded-[2rem] text-xl font-bold bg-success hover:bg-success/90 shadow-[0_6px_0_0_oklch(0.6_0.15_140)] hover:shadow-none hover:translate-y-1 transition-all">
                Cek Jawaban ✔️
              </Button>
            </form>
          )}

        </div>
      </main>

      {/* Feedback Overlay */}
      {showFeedback && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-10 animate-in zoom-in duration-300 ${showFeedback === "correct" ? "bg-success/90" : "bg-coral/90"}`}
        >
          <div className="bg-white rounded-[3rem] p-10 text-center shadow-2xl space-y-4 max-w-sm w-full border-4 border-white/20">
            <div className="text-9xl animate-bounce">
              {showFeedback === "correct" ? "🐰✨" : "🐰💨"}
            </div>
            <h2 className="font-display text-4xl font-black text-foreground">
              {showFeedback === "correct" ? "HEBAT!" : "OOPS!"}
            </h2>
            <p className="text-xl font-bold text-muted-foreground">{feedbackMsg}</p>
          </div>
        </div>
      )}

      {/* Background shapes */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-5 text-8xl blur-[2px]">🎈</div>
        <div className="absolute bottom-1/4 right-5 text-8xl blur-[2px]">🌟</div>
        <div className="absolute top-1/2 right-1/4 text-7xl blur-[1px]">🎨</div>
      </div>
    </div>
  );
}
