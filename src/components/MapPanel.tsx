import React, { useState } from "react";
import { getKelompok, getSarpras, Kelompok, Sarpras, getUserDetails } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Search, School, Users, Navigation, Wrench, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function MapPanel({ userRole = "Viewer" }: { userRole?: string }) {
  const [kelompokList] = useState<Kelompok[]>(getKelompok());
  const [sarprasRecords] = useState<Sarpras[]>(getSarpras());

  const [userScope] = useState(() => {
    if (typeof window !== "undefined") {
      const loggedUser = localStorage.getItem("sim_tpq_logged_user");
      if (loggedUser) {
        const details = getUserDetails(loggedUser);
        if (details) {
          if (details.level === "kelompok" || details.level === "desa") {
            return details.scope;
          }
        }
      }
      return localStorage.getItem("sim_tpq_active_scope") || "Semua";
    }
    return "Semua";
  });

  const allowedKelompoks = kelompokList
    .filter(k => {
      if (userRole === "Super Admin" || userRole === "Admin Daerah") return true;
      if (userRole === "Admin Desa") return k.desa === userScope;
      if (userRole === "Admin Kelompok" || userRole === "Pengajar") return k.namaKelompok === userScope;
      return true;
    })
    .map(k => k.namaKelompok);

  const allowedKelompoksList = kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok));

  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState("Semua");
  const [selectedKlpId, setSelectedKlpId] = useState(allowedKelompoksList[0]?.id || "");

  React.useEffect(() => {
    if (allowedKelompoksList.length > 0 && !allowedKelompoksList.some(k => k.id === selectedKlpId)) {
      setSelectedKlpId(allowedKelompoksList[0].id);
    }
  }, [allowedKelompoksList, selectedKlpId]);

  const selectedKelompok = kelompokList.find(k => k.id === selectedKlpId);
  const selectedSarpras = sarprasRecords.find(s => s.kelompokId === selectedKlpId);

  const filteredKelompok = kelompokList.filter(k => {
    if (!allowedKelompoks.includes(k.namaKelompok)) return false;
    const matchesSearch = k.namaKelompok.toLowerCase().includes(search.toLowerCase()) || 
                          k.alamat.toLowerCase().includes(search.toLowerCase());
    const matchesDesa = desaFilter === "Semua" || k.desa === desaFilter;
    return matchesSearch && matchesDesa;
  });

  const handleGetRoute = () => {
    if (!selectedKelompok) return;
    toast.success(`Rute navigasi menuju ${selectedKelompok.namaKelompok} berhasil dikalkulasi! Membuka panduan arah...`);
  };

  // Get distinct list of desas for filter
  const desas = Array.from(new Set(kelompokList.filter(k => allowedKelompoks.includes(k.namaKelompok)).map(k => k.desa)));

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">Peta Sebaran Kelompok</h2>
        <p className="text-slate-500 text-sm">Visualisasi geografis sebaran 32 unit kelompok binaan di Magetan Timur beserta indikator status kelayakan sarana.</p>
      </div>

      {/* Filter and search */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari lokasi kelompok atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 text-slate-900 text-sm py-5"
            />
          </div>
          <div>
            <select
              value={desaFilter}
              onChange={(e) => setDesaFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2.5 text-xs focus:outline-none h-10 w-full md:w-[180px] font-bold"
            >
              <option value="Semua">Semua Desa</option>
              {desas.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Map Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Interactive SVG Vector Map Panel */}
        <Card className="lg:col-span-8 bg-slate-900 border-slate-800 shadow-inner rounded-3xl overflow-hidden self-stretch relative flex flex-col justify-between min-h-[450px]">
          {/* Header Map overlay */}
          <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-400 flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Sarpras Layak</span>
            <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Sarpras Perlu Audit</span>
          </div>

          {/* Interactive SVG Grid Map */}
          <div className="flex-grow flex items-center justify-center p-6 relative">
            <svg 
              viewBox="0 0 800 500" 
              className="w-full h-full max-h-[380px] text-slate-800 pointer-events-none"
            >
              {/* Region outline mock paths representing Magetan Timur map districts */}
              <path d="M50 150 L200 80 L350 120 L400 250 L250 350 L100 320 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M350 120 L550 50 L700 150 L650 300 L400 250 Z" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <path d="M250 350 L400 250 L650 300 L550 450 L300 480 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              
              {/* Grid indicators */}
              <line x1="0" y1="250" x2="800" y2="250" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
              <line x1="400" y1="0" x2="400" y2="500" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
            </svg>

            {/* Absolute markers plotted dynamically inside map wrapper */}
            <div className="absolute inset-0 pointer-events-none">
              {filteredKelompok.map((klp, idx) => {
                // Map latitude/longitude values to pixel coordinates on SVG layout
                const parts = klp.koordinatMaps.split(",");
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                
                // Mock coordinate projecting logic
                const x = 100 + ((lng - 111.4) * 8000) % 600;
                const y = 80 + ((Math.abs(lat) - 7.6) * 8000) % 340;

                const isSelected = selectedKlpId === klp.id;
                
                // Fetch sarpras status for color coding
                const skSar = sarprasRecords.find(s => s.kelompokId === klp.id);
                const isLayak = skSar ? skSar.statusLayak : true;

                return (
                  <button
                    key={klp.id}
                    onClick={() => setSelectedKlpId(klp.id)}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className={`absolute p-1 rounded-full pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 hover:scale-125 z-20 ${
                      isSelected ? "scale-125 z-30" : ""
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      {/* Active locator rings */}
                      {isSelected && <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-75 bg-indigo-400" />}
                      <MapPin className={`h-6 w-6 ${
                        isLayak ? "text-emerald-500 fill-emerald-950" : "text-rose-500 fill-rose-950"
                      } ${isSelected ? "h-8 w-8 text-indigo-400 fill-indigo-950" : ""}`} />
                      
                      {/* Tooltip on hover */}
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-950 text-white font-bold text-[9px] px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 border border-slate-800 z-50">
                        {klp.namaKelompok}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-slate-950/80 border-t border-slate-900 p-4 text-[10px] text-slate-500 font-bold text-center">
            Peta Vektor Wilayah Magetan Timur Center. Arahkan kursor ke marker untuk melihat profil cepat unit kelompok.
          </div>
        </Card>

        {/* Selected TPQ Detail Info Overlay */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl self-stretch flex flex-col justify-between overflow-hidden text-left">
          {selectedKelompok ? (
            <>
              <div>
                {/* Visual placeholder for TPQ photo */}
                <div className="h-40 bg-slate-100 border-b border-slate-100 flex items-center justify-center relative text-slate-300">
                  <School className="h-16 w-16" />
                  <div className="absolute bottom-3 left-3">
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px] rounded-full">
                      Kelompok Aktif
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-extrabold text-slate-900 leading-snug">{selectedKelompok.namaKelompok}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="h-3.5 w-3.5" /> {selectedKelompok.alamat}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4 text-xs font-semibold text-slate-600">
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[10px]">Total Generus:</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1"><Users className="h-4 w-4" /> {selectedKelompok.jumlahGenerus} Santri</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[10px]">Tenaga Pengajar:</span>
                      <span className="text-slate-800 font-bold flex items-center gap-1"><School className="h-4 w-4" /> {selectedKelompok.jumlahPengajar} Pengajar</span>
                    </div>
                  </div>

                  {selectedSarpras && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Skor Sarpras Kelayakan:</span>
                      <Badge className={`font-bold rounded-full ${
                        selectedSarpras.statusLayak ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {selectedSarpras.skorSarpras} / 100
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-100 p-3 rounded-xl leading-relaxed">
                    <span className="font-bold text-slate-700 block font-sans">Koordinat Satelit</span>
                    <span>{selectedKelompok.koordinatMaps}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <Button onClick={handleGetRoute} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                  <Navigation className="h-4 w-4" /> Dapatkan Rute Navigasi
                </Button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium my-auto">
              Pilih pin di peta untuk melihat profil lengkap kelompok.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
