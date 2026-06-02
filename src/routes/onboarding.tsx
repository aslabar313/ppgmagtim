import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { User, Heart, Shield, ArrowRight, ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Identity
  const [childName, setChildName] = useState("");
  const [ageGroup, setAgeGroup] = useState<
    "toddler" | "kindergarten" | "elementary_low" | "elementary_high"
  >("kindergarten");
  const [gender, setGender] = useState("boy");

  // Step 2: Preferences
  const [islamicContent, setIslamicContent] = useState(false);
  const [language, setLanguage] = useState("id");

  // Step 3: Parental Control
  const [pin, setPin] = useState("");
  const [dailyLimit, setDailyLimit] = useState("60");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!user) return;
    if (pin.length !== 4) return toast.error("PIN harus 4 angka");

    setLoading(true);
    try {
      // 1. Update parent profile with PIN
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ pin_hash: pin }) // In real app, hash this
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Create first child
      const { error: childError } = await supabase.from("children").insert({
        parent_id: user.id,
        name: childName.trim(),
        age_group: ageGroup,
        gender,
        islamic_content: islamicContent,
        language_mode: language,
        daily_limit_min: parseInt(dailyLimit) || 60,
      });

      if (childError) {
        console.error("Child Insert Error:", childError);
        throw new Error("Gagal menyimpan profil anak: " + childError.message);
      }

      toast.success("Profil berhasil disiapkan! 🎉");
      navigate({ to: "/" }); // Will redirect to child selection or home later
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-accent/30 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${step >= s ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground border-2"}`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 rounded-full ${step > s ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="p-8 rounded-[2rem] border-2 shadow-playful relative overflow-hidden">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8" />
                </div>
                <h1 className="font-display text-2xl font-bold">Siapa nama si kecil?</h1>
                <p className="text-muted-foreground">Kita buat profil pertamanya ya</p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nama Anak</Label>
                  <Input
                    placeholder="Contoh: Dinda"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="h-12 rounded-xl text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kelompok Usia</Label>
                    <Select value={ageGroup} onValueChange={(v: any) => setAgeGroup(v)}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toddler">Balita (2-3 thn)</SelectItem>
                        <SelectItem value="kindergarten">TK (4-6 thn)</SelectItem>
                        <SelectItem value="elementary_low">SD Kecil (1-3)</SelectItem>
                        <SelectItem value="elementary_high">SD Besar (4-6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jenis Kelamin</Label>
                    <div className="flex gap-2 p-1 bg-accent/50 rounded-xl h-12">
                      <button
                        onClick={() => setGender("boy")}
                        className={`flex-1 rounded-lg text-sm font-bold transition ${gender === "boy" ? "bg-background shadow-sm" : "opacity-60"}`}
                      >
                        Laki-laki
                      </button>
                      <button
                        onClick={() => setGender("girl")}
                        className={`flex-1 rounded-lg text-sm font-bold transition ${gender === "girl" ? "bg-background shadow-sm" : "opacity-60"}`}
                      >
                        Perempuan
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={!childName}
                className="w-full h-14 rounded-full text-lg font-bold mt-6 shadow-soft"
              >
                Lanjut <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-creative/10 text-creative rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8" />
                </div>
                <h1 className="font-display text-2xl font-bold">Preferensi Belajar</h1>
                <p className="text-muted-foreground">Atur apa yang dipelajari {childName}</p>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between p-4 bg-accent/30 rounded-2xl border-2 border-transparent hover:border-primary/20 transition">
                  <div className="flex gap-4">
                    <div className="text-2xl">☪️</div>
                    <div>
                      <div className="font-bold">Konten Islami</div>
                      <div className="text-xs text-muted-foreground">
                        Doa harian, huruf hijaiyah, kisah nabi
                      </div>
                    </div>
                  </div>
                  <Switch checked={islamicContent} onCheckedChange={setIslamicContent} />
                </div>

                <div className="space-y-2">
                  <Label>Bahasa Pengantar</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLanguage("id")}
                      className={`p-4 rounded-2xl border-2 transition text-left ${language === "id" ? "border-primary bg-primary/5" : "bg-card border-border"}`}
                    >
                      <div className="text-xl mb-1">🇮🇩</div>
                      <div className="font-bold">Indonesia</div>
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`p-4 rounded-2xl border-2 transition text-left ${language === "en" ? "border-primary bg-primary/5" : "bg-card border-border"}`}
                    >
                      <div className="text-xl mb-1">🇺🇸</div>
                      <div className="font-bold">English</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={handleBack} className="h-14 rounded-full px-6">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-14 rounded-full text-lg font-bold shadow-soft"
                >
                  Hampir Selesai <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-coral/10 text-coral rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8" />
                </div>
                <h1 className="font-display text-2xl font-bold">Parental Control</h1>
                <p className="text-muted-foreground">Keamanan tambahan untuk Ayah & Bunda</p>
              </div>

              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>PIN Orang Tua (4 Angka)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Digunakan untuk akses dashboard dan ubah pengaturan
                  </p>
                  <Input
                    type="password"
                    maxLength={4}
                    placeholder="0000"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    className="h-14 rounded-xl text-2xl tracking-[1em] text-center font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Batas Waktu Harian</Label>
                  <Select value={dailyLimit} onValueChange={setDailyLimit}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Menit</SelectItem>
                      <SelectItem value="30">30 Menit</SelectItem>
                      <SelectItem value="60">1 Jam (Rekomendasi)</SelectItem>
                      <SelectItem value="120">2 Jam</SelectItem>
                      <SelectItem value="0">Tanpa Batas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="h-14 rounded-full px-6"
                  disabled={loading}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={pin.length !== 4 || loading}
                  className="flex-1 h-14 rounded-full text-lg font-bold shadow-soft bg-success hover:bg-success/90"
                >
                  {loading ? "Menyimpan..." : "Selesai & Main! ✨"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-muted-foreground text-sm mt-8">
          Tenang, Ayah/Bunda bisa mengubah semua ini nanti di pengaturan.
        </p>
      </div>
    </div>
  );
}
