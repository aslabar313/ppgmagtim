import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Key, Bot, Sparkles, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/parent/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash-exp");
  const [imageKey, setImageKey] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (user) checkAdminAndLoad();
  }, [user, authLoading]);

  async function checkAdminAndLoad() {
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user?.id,
      _role: "admin",
    });
    if (!isAdmin) {
      toast.error("Akses ditolak. Anda bukan admin.");
      navigate({ to: "/parent" });
      return;
    }

    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    if (data) {
      setGeminiKey(data.gemini_api_key || "");
      setGeminiModel(data.gemini_model || "gemini-2.0-flash-exp");
      setImageKey(data.image_api_key || "");
    }
    setLoading(false);
  }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        gemini_api_key: geminiKey,
        gemini_model: geminiModel,
        image_api_key: imageKey,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Pengaturan AI berhasil disimpan! ✨");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-accent/20">
      <header className="bg-background border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/parent">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" /> App Admin
            </h1>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary border-primary/20">
            Super Admin
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-display font-bold">AI Configuration</h2>
              <p className="text-sm text-muted-foreground">Atur otak buatan untuk PintarYuk</p>
            </div>
          </div>

          <Card className="p-8 rounded-[2rem] border-2 space-y-6 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="w-4 h-4" /> Gemini API Key
                </Label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="h-12 rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">
                  Kunci ini digunakan untuk men-generate soal kuis dan AI Tutor.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Gemini Model</Label>
                <Input
                  placeholder="gemini-2.0-flash-exp"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Image Generation API Key (Optional)
                </Label>
                <Input
                  type="password"
                  placeholder="Kunci untuk DALL-E atau Midjourney"
                  value={imageKey}
                  onChange={(e) => setImageKey(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full h-12 gap-2 shadow-soft"
              >
                <Save className="w-4 h-4" /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full h-12 w-12 p-0 text-coral border-coral/20"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl bg-sunny/10 border-sunny/20 border-2">
            <h3 className="font-bold flex items-center gap-2 mb-2 text-sunny-foreground">
              <Sparkles className="w-4 h-4" /> Tips Admin
            </h3>
            <p className="text-sm text-sunny-foreground/80 leading-relaxed">
              Pastikan API Key Anda memiliki kuota yang cukup. Untuk performa terbaik dan biaya
              terendah, gunakan model <strong>gemini-2.0-flash-exp</strong>.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
