import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Play, Pause, SkipForward, Music2, Trophy, Check, Volume2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateStreak, checkAndAwardBadges } from "@/lib/game-logic";
import { xpToLevel } from "@/lib/pintar";
import { speak } from "@/lib/speech";

interface MusicGameProps {
  childId: string;
  childName: string;
}

const SONGS = [
  {
    title: "Pelangi-Pelangi",
    lyrics: ["Pelangi-pelangi", "Alangkah indahmu", "Merah kuning hijau", "Di langit yang biru"],
    emoji: "🌈"
  },
  {
    title: "Cicak di Dinding",
    lyrics: ["Cicak cicak di dinding", "Diam-diam merayap", "Datang seekor nyamuk", "Hap! Lalu ditangkap"],
    emoji: "🦎"
  },
  {
    title: "Balonku Ada Lima",
    lyrics: ["Balonku ada lima", "Rupa-rupa warnanya", "Hijau kuning kelabu", "Merah muda dan biru"],
    emoji: "🎈"
  }
];

export function MusicGame({ childId, childName }: MusicGameProps) {
  const navigate = useNavigate();
  const [currentSongIdx, setCurrentSongIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime] = useState(Date.now());
  
  const currentSong = SONGS[currentSongIdx];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentLineIdx((prev) => {
          if (prev < currentSong.lyrics.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSongIdx]);

  const togglePlay = () => {
    if (currentLineIdx === currentSong.lyrics.length - 1 && !isPlaying) {
      setCurrentLineIdx(0);
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    setCurrentSongIdx((prev) => (prev + 1) % SONGS.length);
    setCurrentLineIdx(0);
    setIsPlaying(false);
  };

  const finishGame = async () => {
    const xpEarned = 30;
    const durationSec = Math.floor((Date.now() - startTime) / 1000);
    
    await supabase.from("game_sessions").insert({
      child_id: childId,
      category: "music",
      topic: currentSong.title,
      correct: 1,
      total: 1,
      xp_earned: xpEarned,
      stars: 3,
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
        toast.success(`HORE! Kamu naik ke Level ${newLevel}! 🚀`);
        speak(`Hore! Suaramu merdu sekali! Kamu naik ke level ${newLevel}!`);
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
        const { data: currentProg } = await supabase.from("child_progress").select("xp").eq("child_id", childId).single();
        if (currentProg) {
          await supabase.from("child_progress").update({ xp: currentProg.xp + 50 }).eq("child_id", childId);
        }
      }
    }

    toast.success("Kamu hebat sudah bernyanyi! +30 XP 🎉");
    navigate({ to: "/play", search: { childId } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2FF] overflow-hidden fixed inset-0 z-50">
      <header className="p-4 flex items-center justify-between bg-white border-b-4 border-primary/20 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full border-2" 
          onClick={() => navigate({ to: "/play", search: { childId } })}
        >
          <X className="w-6 h-6" />
        </Button>
        <h1 className="font-display font-black text-xl text-primary">Panggung Musik {childName} 🎵</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
        
        {/* Song Info */}
        <div className="text-center space-y-4">
          <div className="w-32 h-32 rounded-full bg-white border-4 border-primary/30 flex items-center justify-center text-7xl shadow-soft mx-auto animate-bounce-soft">
            {currentSong.emoji}
          </div>
          <h2 className="text-3xl font-display font-black text-foreground">{currentSong.title}</h2>
        </div>

        {/* Karaoke Screen */}
        <Card className="w-full max-w-2xl p-10 rounded-[3rem] border-4 border-primary/20 bg-white shadow-[0_12px_0_0_oklch(0.5_0.16_250)] text-center relative overflow-hidden">
          <div className="absolute top-4 left-6 text-primary/10">
             <Music2 className="w-20 h-20" />
          </div>
          
          <div className="space-y-6 relative z-10 min-h-[120px] flex flex-col justify-center">
            {currentSong.lyrics.map((line, idx) => (
              <p 
                key={idx} 
                className={`text-3xl md:text-4xl font-display font-black transition-all duration-500 ${idx === currentLineIdx ? 'text-primary scale-110' : 'opacity-20 scale-90 blur-[1px]'}`}
              >
                {line}
              </p>
            ))}
          </div>
        </Card>

        {/* Player Controls */}
        <div className="flex items-center gap-6">
          <button 
            onClick={nextSong}
            className="w-16 h-16 rounded-full bg-white border-4 border-muted flex items-center justify-center text-muted-foreground hover:bg-accent transition"
          >
            <SkipForward className="w-8 h-8" />
          </button>
          
          <button 
            onClick={togglePlay}
            className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center shadow-playful hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
          </button>

          <button 
            onClick={finishGame}
            className="w-16 h-16 rounded-full bg-success text-white border-4 border-white/20 flex items-center justify-center shadow-soft hover:scale-110 transition"
          >
            <Check className="w-8 h-8" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground font-bold bg-white/50 px-4 py-2 rounded-full border">
          <Volume2 className="w-5 h-5" />
          <span>Bernyanyi yuk!</span>
        </div>
      </main>

      {/* Decorative */}
      <div className="absolute top-1/4 right-10 text-6xl opacity-20 pointer-events-none">🎸</div>
      <div className="absolute bottom-1/4 left-10 text-6xl opacity-20 pointer-events-none">🎹</div>
    </div>
  );
}
