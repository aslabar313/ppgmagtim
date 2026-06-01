import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3, Clock, Settings, User, ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/parent")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
    if (user) {
      checkAdmin();
    }
  }, [user, authLoading]);

  async function checkAdmin() {
    const { data } = await supabase.rpc("has_role", { _user_id: user?.id, _role: "admin" });
    setIsAdmin(!!data);
  }

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-accent/20">
      <header className="bg-background border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-xl font-bold">Dashboard Orang Tua</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/parent/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-2 border-primary text-primary"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin
                </Button>
              </Link>
            )}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="bg-background p-1 rounded-full border shadow-sm w-full md:w-auto justify-start overflow-x-auto">
            <TabsTrigger value="progress" className="rounded-full gap-2 px-6">
              <BarChart3 className="w-4 h-4" /> Progres
            </TabsTrigger>
            <TabsTrigger value="screentime" className="rounded-full gap-2 px-6">
              <Clock className="w-4 h-4" /> Batas Waktu
            </TabsTrigger>
            <TabsTrigger value="children" className="rounded-full gap-2 px-6">
              <User className="w-4 h-4" /> Anak
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full gap-2 px-6">
              <Settings className="w-4 h-4" /> Pengaturan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 rounded-3xl border-2">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">Total Belajar</h3>
                <div className="text-3xl font-display font-bold mt-2">12 Jam 45 Menit</div>
                <p className="text-xs text-success font-bold mt-1">+15% dari minggu lalu</p>
              </Card>
              <Card className="p-6 rounded-3xl border-2">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">XP Terkumpul</h3>
                <div className="text-3xl font-display font-bold mt-2">4,250 XP</div>
                <p className="text-xs text-muted-foreground mt-1">Level 12: Bintang Bersinar</p>
              </Card>
              <Card className="p-6 rounded-3xl border-2">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">Badge Diraih</h3>
                <div className="text-3xl font-display font-bold mt-2">8 Badge</div>
                <p className="text-xs text-primary font-bold mt-1">2 badge baru minggu ini</p>
              </Card>
            </div>

            <Card className="p-8 rounded-[2rem] border-2">
              <h3 className="font-display text-xl font-bold mb-6">Aktivitas 7 Hari Terakhir</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {[40, 60, 30, 90, 20, 50, 80].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/20 rounded-t-xl relative group">
                      <div
                        className="bg-primary rounded-t-xl transition-all duration-500 group-hover:bg-primary/80"
                        style={{ height: `${h}%` }}
                      />
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">
                        {h} mnt
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="screentime">
            <Card className="p-8 rounded-[2rem] border-2 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <h2 className="text-2xl font-bold">Kontrol Waktu Main</h2>
                <p className="text-muted-foreground">
                  Atur kapan dan berapa lama si kecil boleh belajar setiap harinya.
                </p>
                {/* Add detailed screentime controls here */}
                <Button className="rounded-full w-full h-12">Simpan Pengaturan</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
