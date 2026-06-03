import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Trash2, Download, Pencil, Eraser, Palette, Undo, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { updateStreak, checkAndAwardBadges } from "@/lib/game-logic";
import { xpToLevel } from "@/lib/pintar";
import { speak } from "@/lib/speech";

interface CreativeGameProps {
  childId: string;
  childName: string;
}

export function CreativeGame({ childId, childName }: CreativeGameProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#FF4B91");
  const [brushSize, setBrushSize] = useState(10);
  const [mode, setMode] = useState<"draw" | "erase">("draw");
  const [history, setHistory] = useState<string[]>([]);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to container size
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveHistory();
    }
  }, []);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory((prev) => [...prev, canvas.toDataURL()].slice(-20));
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.beginPath();
      saveHistory();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let x, y;
    if ("touches" in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.lineWidth = brushSize;
    ctx.strokeStyle = mode === "erase" ? "white" : color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveHistory();
      toast.success("Kanvas dibersihkan! ✨");
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // current
    const lastState = newHistory[newHistory.length - 1];
    
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx?.drawImage(img, 0, 0);
      setHistory(newHistory);
    };
  };

  const finishGame = async () => {
    const xpEarned = 50;
    const durationSec = Math.floor((Date.now() - startTime) / 1000);
    
    // Save session
    await supabase.from("game_sessions").insert({
      child_id: childId,
      category: "creative",
      topic: "Free Painting",
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

    // Update progress
    const { data: prog } = await supabase.from("child_progress").select("xp, level").eq("child_id", childId).single();
    if (prog) {
      const newXp = prog.xp + xpEarned;
      const { level: newLevel } = xpToLevel(newXp);
      await supabase.from("child_progress").update({ xp: newXp, level: newLevel }).eq("child_id", childId);
      
      if (newLevel > (prog.level || 1)) {
        toast.success(`HORE! Kamu naik ke Level ${newLevel}! 🚀`);
        speak(`Hore! Lukisanmu membawa kamu naik ke level ${newLevel}! Kamu seniman hebat!`);
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

    toast.success("Karya seni kamu disimpan! +50 XP 🎉");
    navigate({ to: "/play", search: { childId } });
  };

  const colors = [
    "#FF4B91", "#FF9209", "#FFD700", "#52D3D8", "#3887BE", "#7C3AED", "#000000", "#94A3B8"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] overflow-hidden fixed inset-0 z-50">
      {/* Top Controls */}
      <header className="p-4 flex items-center justify-between bg-white border-b-4 border-muted/20 z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full border-2" 
            onClick={() => navigate({ to: "/play", search: { childId } })}
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="hidden sm:block">
            <h1 className="font-display font-black text-xl">Dunia Seni {childName} 🎨</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-2" 
            onClick={undo}
            disabled={history.length <= 1}
          >
            <Undo className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-2 text-coral hover:bg-coral/10 border-coral/20" 
            onClick={clearCanvas}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <Button 
            className="rounded-full bg-success hover:bg-success/90 font-bold px-6 shadow-soft"
            onClick={finishGame}
          >
            Selesai <Check className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row relative overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 bg-white relative cursor-crosshair touch-none overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full block"
          />
        </div>

        {/* Toolbar (Side or Bottom) */}
        <div className="bg-white border-t-4 sm:border-t-0 sm:border-l-4 border-muted/20 p-4 sm:w-24 flex sm:flex-col gap-4 overflow-x-auto sm:overflow-y-auto">
          {/* Brush/Eraser Toggle */}
          <div className="flex sm:flex-col gap-2 p-1 bg-accent/50 rounded-2xl">
            <button
              onClick={() => setMode("draw")}
              className={`p-3 rounded-xl transition-all ${mode === "draw" ? "bg-white shadow-sm text-primary" : "text-muted-foreground opacity-60"}`}
            >
              <Pencil className="w-7 h-7" />
            </button>
            <button
              onClick={() => setMode("erase")}
              className={`p-3 rounded-xl transition-all ${mode === "erase" ? "bg-white shadow-sm text-primary" : "text-muted-foreground opacity-60"}`}
            >
              <Eraser className="w-7 h-7" />
            </button>
          </div>

          <div className="h-px w-full bg-muted/20 hidden sm:block" />

          {/* Color Palette */}
          <div className="flex sm:flex-col gap-3">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setMode("draw"); }}
                style={{ backgroundColor: c }}
                className={`w-10 h-10 rounded-full flex-shrink-0 border-4 transition-transform active:scale-90 ${color === c && mode === "draw" ? "border-white shadow-[0_0_0_2px_black]" : "border-transparent"}`}
              />
            ))}
          </div>

          <div className="h-px w-full bg-muted/20 hidden sm:block" />

          {/* Brush Size */}
          <div className="flex sm:flex-col gap-4 items-center sm:pt-2">
            {[8, 16, 24].map((s) => (
              <button
                key={s}
                onClick={() => setBrushSize(s)}
                className={`flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center transition-all ${brushSize === s ? "border-2 border-primary scale-110" : "opacity-40"}`}
                style={{ width: 20 + s/2, height: 20 + s/2 }}
              >
                <div 
                  className="rounded-full bg-slate-600" 
                  style={{ width: s/2, height: s/2 }} 
                />
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Mascot Message */}
      <div className="absolute bottom-28 left-6 sm:left-auto sm:right-32 pointer-events-none hidden sm:block">
         <div className="bg-white p-3 rounded-2xl shadow-playful border-2 flex items-center gap-3 animate-bounce-soft">
            <div className="text-3xl">🐰</div>
            <div className="text-xs font-black">Lukisanmu bagus <br/> banget lho! ✨</div>
         </div>
      </div>
    </div>
  );
}
