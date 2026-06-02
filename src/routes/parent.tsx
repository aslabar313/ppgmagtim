import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3, Clock, Settings, User, ArrowLeft, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
export const Route = createFileRoute("/parent")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Screen Time State
  const [dailyLimit, setDailyLimit] = useState("60");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (user) {
      checkAdmin();
      fetchData();
    }
  }, [user, authLoading]);

  async function checkAdmin() {
    const { data } = await supabase.rpc("has_role", { _user_id: user?.id, _role: "admin" });
    setIsAdmin(!!data);
  }

  async function fetchData() {
    setLoading(true);
    if (!user) return;
    
    // Ambil data anak
    const { data: kids, error } = await supabase.from("children").select("*").eq("parent_id", user.id);
    if (error) {
      console.error(error);
      toast.error("Gagal mengambil data anak.");
    }
    if (kids && kids.length > 0) {
      setChildren(kids);
      setSelectedChild(kids[0]);
      setDailyLimit(kids[0].daily_limit_min?.toString() || "60");
    }
    setLoading(false);
  }

  const handleSaveScreenTime = async () => {
    if (!selectedChild) return toast.error("Pilih profil anak terlebih dahulu.");
    const { error } = await supabase
      .from("children")
      .update({ daily_limit_min: parseInt(dailyLimit) || 60 })
      .eq("id", selectedChild.id);
      
    if (error) toast.error(error.message);
    else {
      toast.success("Batas waktu bermain berhasil diperbarui!");
      fetchData(); // Refresh data
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-accent/20">
      <div className="text-4xl animate-bounce">📊</div>
    </div>
  );

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
        {children.length > 0 && (
          <div className="mb-8 flex items-center gap-4 bg-background p-3 rounded-2xl border shadow-sm w-fit">
            <span className="text-sm font-bold text-muted-foreground ml-2">Pilih Profil:</span>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  setSelectedChild(child);
                  setDailyLimit(child.daily_limit_min?.toString() || "60");
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedChild?.id === child.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {child.avatar === "rabbit" ? "🐰" : "🐻"} {child.name}
              </button>
            ))}
          </div>
        )}

        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="bg-background p-1 rounded-full border shadow-sm w-full md:w-auto justify-start overflow-x-auto">
            <TabsTrigger value="progress" className="rounded-full gap-2 px-6">
              <BarChart3 className="w-4 h-4" /> Progres
            </TabsTrigger>
            <TabsTrigger value="screentime" className="rounded-full gap-2 px-6">
              <Clock className="w-4 h-4" /> Batas Waktu
            </TabsTrigger>
            <TabsTrigger value="children" className="rounded-full gap-2 px-6">
              <User className="w-4 h-4" /> Profil Anak
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full gap-2 px-6">
              <Settings className="w-4 h-4" /> Akun
            </TabsTrigger>
          </TabsList>

          <TabsContent value="progress" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 rounded-3xl border-2 shadow-sm">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">Total Belajar (Minggu Ini)</h3>
                <div className="text-3xl font-display font-bold mt-2">2 Jam 45 Menit</div>
                <p className="text-xs text-success font-bold mt-1">Sangat konsisten!</p>
              </Card>
              <Card className="p-6 rounded-3xl border-2 shadow-sm">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">XP Terkumpul</h3>
                <div className="text-3xl font-display font-bold mt-2 text-sunny-foreground">1,250 XP</div>
                <p className="text-xs text-muted-foreground mt-1">Level 4: Penjelajah Cilik</p>
              </Card>
              <Card className="p-6 rounded-3xl border-2 shadow-sm">
                <h3 className="font-bold text-muted-foreground text-sm uppercase">Badge Spesial</h3>
                <div className="text-3xl font-display font-bold mt-2 text-creative">3 Badge</div>
                <p className="text-xs text-muted-foreground mt-1">🏆 🌟 📚</p>
              </Card>
            </div>

            <Card className="p-8 rounded-[2rem] border-2 shadow-sm">
              <h3 className="font-display text-xl font-bold mb-6">Aktivitas Belajar {selectedChild?.name || "Anak"}</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {[15, 30, 45, 60, 20, 0, 0].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/10 rounded-t-xl relative group h-full flex items-end">
                      <div
                        className="bg-primary rounded-t-xl transition-all duration-500 w-full"
                        style={{ height: `${(h / 60) * 100}%` }}
                      />
                      <div className="absolute bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 bg-foreground text-background text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none whitespace-nowrap">
                        {h} mnt
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mt-2">
                      {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="screentime" className="animate-in fade-in duration-500">
            <Card className="p-8 rounded-[2rem] border-2 shadow-sm max-w-2xl">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-coral/10 text-coral flex items-center justify-center flex-shrink-0">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold">Kontrol Waktu Main</h2>
                    <p className="text-muted-foreground mt-1">
                      Atur berapa lama {selectedChild?.name || "anak"} boleh belajar/bermain di PintarYuk setiap harinya.
                    </p>
                  </div>
                  
                  <div className="space-y-3 bg-accent/30 p-5 rounded-2xl">
                    <label className="text-sm font-bold">Batas Waktu Harian</label>
                    <Select value={dailyLimit} onValueChange={setDailyLimit}>
                      <SelectTrigger className="h-14 rounded-xl bg-background text-lg font-medium border-2">
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
                    <p className="text-xs text-muted-foreground">Waktu akan direset setiap tengah malam.</p>
                  </div>

                  <Button onClick={handleSaveScreenTime} className="rounded-full h-12 px-8 font-bold">
                    Simpan Pengaturan
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="children" className="animate-in fade-in duration-500">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {children.map(child => (
                <Card key={child.id} className="p-6 rounded-[2rem] border-2 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-2 bg-accent rounded-full text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4"/></button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="font-display text-2xl">Edit Profil {child.name}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label>Nama</Label>
                            <Input 
                              defaultValue={child.name} 
                              className="rounded-xl h-12" 
                              onChange={(e) => child.newName = e.target.value}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Untuk mengubah preferensi secara lengkap, fitur ini akan segera hadir.</p>
                        </div>
                        <DialogFooter>
                          <Button 
                            className="rounded-full h-12 w-full font-bold"
                            onClick={async () => {
                              if (!child.newName) return toast.error("Nama tidak boleh kosong.");
                              const { error } = await supabase.from('children').update({ name: child.newName }).eq('id', child.id);
                              if (error) toast.error("Gagal mengubah nama: " + error.message);
                              else {
                                toast.success("Nama anak berhasil diubah!");
                                fetchData();
                              }
                            }}
                          >
                            Simpan Perubahan
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-5xl mb-4 border-4 border-background shadow-sm">
                    {child.avatar === "rabbit" ? "🐰" : "🐻"}
                  </div>
                  <h3 className="font-display font-bold text-xl">{child.name}</h3>
                  <Badge variant="outline" className="mt-2">{(child.age_group || "").replace('_', ' ').toUpperCase()}</Badge>
                  <div className="mt-4 pt-4 border-t w-full flex justify-between text-sm text-muted-foreground">
                    <span>{child.language_mode === 'id' ? '🇮🇩 Indo' : '🇺🇸 Eng'}</span>
                    <span>{child.islamic_content ? '☪️ Islami On' : '⭐ Umum'}</span>
                  </div>
                </Card>
              ))}

              {children.length < 5 && (
                <Link to="/onboarding" className="block">
                  <Card className="p-6 rounded-[2rem] border-2 border-dashed border-muted-foreground/30 shadow-none flex flex-col items-center justify-center text-center h-full min-h-[280px] hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-accent group-hover:bg-primary/20 flex items-center justify-center text-muted-foreground group-hover:text-primary mb-4 transition-colors">
                      <Plus className="w-8 h-8" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-muted-foreground group-hover:text-primary">Tambah Anak</h3>
                    <p className="text-xs text-muted-foreground mt-2">Bisa tambah {5 - children.length} profil lagi</p>
                  </Card>
                </Link>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card className="p-8 rounded-[2rem] border-2 max-w-2xl">
              <h2 className="text-2xl font-display font-bold mb-6">Pengaturan Akun</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <div className="font-bold">Email</div>
                    <div className="text-sm text-muted-foreground">{user?.email}</div>
                  </div>
                  <Badge>Terverifikasi</Badge>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <div>
                    <div className="font-bold">Paket Langganan</div>
                    <div className="text-sm text-muted-foreground">PintarYuk FREE</div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">Upgrade Pro</Button>
                </div>
                <div className="pt-4">
                  <Button variant="destructive" className="rounded-full">Hapus Akun</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
