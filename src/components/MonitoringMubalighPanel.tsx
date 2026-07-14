import React, { useState, useEffect, useMemo } from "react";
import { getMubalighSetempat, getMubalighTugasan, getKelompok } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  LayoutDashboard, ClipboardList, Users, Award, ShieldAlert, FileSpreadsheet, Share2, 
  MapPin, CheckCircle2, User, Clock, Calendar, CheckSquare, Star, MessageSquare, 
  Sparkles, Bot, FileText, ChevronRight, Compass, Camera, Upload, Send, Trash2, Edit2, Play, Download, AlertTriangle, AlertCircle
} from "lucide-react";

// Types
export interface DailyActivityReport {
  id: string;
  mubalighId: string;
  namaMubaligh: string;
  kelompokTPQ: string;
  desa: string;
  daerah: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  lokasi: string;
  
  // Presensi
  checkIn: string; 
  checkOut?: string; 
  gpsLocation: string; 
  selfieUrl?: string; 
  verifiedLocation: boolean;

  // Aktivitas Mengajar
  aktivitas: {
    [key: string]: {
      checked: boolean;
      durasi: number; // menit
      generusCount: number;
      ketercapaian: number; // 0-100
      catatan: string;
    }
  };

  // Monitoring Materi
  materi: {
    bab: string;
    halaman: string;
    kitab: string;
    kompetensi: string;
    target: string;
    realisasi: string;
    persentasePenyelesaian: number;
  };

  // Monitoring Generus
  generus: {
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
    baru: number;
    lulus: number;
    perhatianKhusus: string;
  };

  // Penilaian Kelas (1-5)
  penilaian: {
    antusias: number;
    disiplin: number;
    kondisi: number;
    media: number;
    pemahaman: number;
  };

  // Dokumentasi
  dokumentasi: {
    fotoUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    dokumenUrl?: string;
  };

  // Catatan Harian
  catatanHarian: {
    kendala: string;
    solusi: string;
    idePerbaikan: string;
    kebutuhanBantuan: string;
    rencanaEsok: string;
  };

  // Evaluasi AI
  evaluasiAI?: {
    skorKinerja: number;
    konsistensiKehadiran: string;
    produktivitasMengajar: string;
    penyelesaianKurikulum: string;
    trenPeningkatan: string;
    trenPenurunan: string;
    risikoPenurunanKualitas: string;
    rekomendasiPembinaan: string;
  };

  // Evaluasi Pengurus
  evaluasiPengurus?: {
    skor: number; 
    catatan: string;
    penilai: string;
    tanggal: string;
  };

  nilaiAkhir?: number; 
  kategoriNilai?: "Sangat Baik" | "Baik" | "Cukup" | "Perlu Pembinaan";
}

// Initial Mock Reports for last 7 days to seed data
const MOCK_MUBALIGH_LIST = [
  { id: "ms-1", nama: "Ust. Heri Susanto", kelompok: "Kelompok Karas", desa: "Desa Selatan", wa: "08123456001" },
  { id: "ms-2", nama: "Usth. Fatmawati", kelompok: "Kelompok Patihan", desa: "Desa Selatan", wa: "08123456002" },
  { id: "mt-1", nama: "Ust. M. Ridho", kelompok: "Kelompok Malang", desa: "Desa Selatan", wa: "08123456003" },
  { id: "mt-2", nama: "Usth. Laila", kelompok: "Kelompok Pandeyan", desa: "Desa Selatan", wa: "08123456004" }
];

const MOCK_ACTIVITIES = [
  "Apakah Anda Sholat & Do'a 1/3 Malam Hari ini ?",
  "Apakah anda Membersihkan Masjid, Kamar Mt, Kamar Mandi, Tempat Wudhu, Hari ini ?",
  "Apakah Anda sudah melaksanakan Sholat 5 Waktu tepat Waktu Hari ini ?",
  "Apakah Anda Menderes Materi yg Akan anda Sampaikan ke Pengajian Hari ini?",
  "Apakah Anda Berkunjung ke Rumah Jama'ah Hari ini? (Min 3 x dalam Seminggu)",
  "berapa Jam anda mengajar Hari ini ? (Sehari Minimal 3 Jam)"
];

const generateMockReports = (): DailyActivityReport[] => {
  const reports: DailyActivityReport[] = [];
  const today = new Date();
  
  MOCK_MUBALIGH_LIST.forEach((mub) => {
    // Generate 7 days of reports
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      
      const jamMulai = "15:30";
      const jamSelesai = "17:15";
      const durasiTotal = 105;
      
      // Presensi
      const checkIn = `${jamMulai}:10`;
      const checkOut = `${jamSelesai}:05`;
      
      // Aktivitas
      const aktivitas: DailyActivityReport["aktivitas"] = {};
      MOCK_ACTIVITIES.forEach((act, idx) => {
        // Randomly check questions (high probability of being true)
        const checked = (idx + i) % 5 !== 0;
        const isHours = act.toLowerCase().includes("berapa jam");
        aktivitas[act] = {
          checked,
          durasi: checked ? (isHours ? 3 + (i % 3) : 0) : 0,
          generusCount: checked ? 12 + (i % 3) : 0,
          ketercapaian: checked ? 100 : 0,
          catatan: checked && !isHours && (idx === 4) ? "Berkunjung ke keluarga Budi & Ahmad" : ""
        };
      });

      // Penilaian
      const scoreSeed = (i + mub.nama.length) % 5;
      const penilaian = {
        antusias: Math.max(3, 4 + (scoreSeed % 2) - (i % 2 === 0 ? 1 : 0)),
        disiplin: Math.max(3, 3 + (scoreSeed % 3)),
        kondisi: Math.max(3, 4 - (scoreSeed % 2)),
        media: Math.max(3, 3 + (i % 2)),
        pemahaman: Math.max(3, 4 + (i % 3 === 0 ? 1 : -1))
      };

      // AI evaluasi
      const skorAI = 75 + (i * 3 + scoreSeed * 5) % 21;
      const evaluasiAI = {
        skorKinerja: skorAI,
        konsistensiKehadiran: skorAI > 85 ? "Sangat Konsisten" : "Konsisten",
        produktivitasMengajar: "Sesuai Standar Kurikulum",
        penyelesaianKurikulum: `${70 + (i * 4) % 25}% target semester tercapai`,
        trenPeningkatan: "Fokus interaksi personal santri membaik",
        trenPenurunan: i === 2 ? "Durasi review materi agak berkurang" : "Tidak ada tren penurunan signifikan",
        risikoPenurunanKualitas: "Rendah",
        rekomendasiPembinaan: "Tingkatkan penggunaan media audiovisual pembelajaran."
      };

      const evaluasiPengurus = {
        skor: 80 + (scoreSeed * 4) % 16,
        catatan: "Kerja bagus, pertahankan dedikasi mengajar.",
        penilai: "H. Nurhadi (Pengurus Desa)",
        tanggal: dateString
      };

      // Calculate final score
      // Kehadiran 25% (here checkIn exists: 25 pts)
      // Ketepatan waktu 10% (checkin <= 15:35 = 10 pts, else 5 pts)
      // Jam mengajar 15% (durasi > 90m = 15 pts)
      // Penyelesaian materi 20% (average ketercapaian)
      // Kedisiplinan laporan 10% (submitted on same day = 10 pts)
      // Dokumentasi 5% (simulated = 5 pts)
      // Evaluasi Pengurus 10% (10% of pengurus score)
      // Penilaian AI 5% (5% of AI score)
      const presensiPts = 25;
      const tepatWaktuPts = 10;
      const jamMengajarPts = 15;
      const materiPts = 17; // mock average
      const disiplinLapPts = 10;
      const dokPts = 5;
      const evalPengurusPts = evaluasiPengurus.skor * 0.1;
      const evalAIPts = evaluasiAI.skorKinerja * 0.05;
      const nilaiAkhir = Math.round(presensiPts + tepatWaktuPts + jamMengajarPts + materiPts + disiplinLapPts + dokPts + evalPengurusPts + evalAIPts);

      let kategoriNilai: DailyActivityReport["kategoriNilai"] = "Baik";
      if (nilaiAkhir >= 85) kategoriNilai = "Sangat Baik";
      else if (nilaiAkhir >= 70) kategoriNilai = "Baik";
      else if (nilaiAkhir >= 55) kategoriNilai = "Cukup";
      else kategoriNilai = "Perlu Pembinaan";

      reports.push({
        id: `rep-${mub.id}-${dateString}`,
        mubalighId: mub.id,
        namaMubaligh: mub.nama,
        kelompokTPQ: mub.kelompok,
        desa: mub.desa,
        daerah: "Magetan",
        tanggal: dateString,
        jamMulai,
        jamSelesai,
        lokasi: `TPQ ${mub.kelompok}`,
        checkIn,
        checkOut,
        gpsLocation: "-7.65432, 111.45678",
        verifiedLocation: true,
        selfieUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        aktivitas,
        materi: {
          bab: "Bab 4 (Tajwid Nun Sukun)",
          halaman: "Halaman 12-15",
          kitab: "Kitab Tajwid Praktis",
          kompetensi: "Mengenal Idzhar & Idgham",
          target: "Mampu melafalkan contoh di Al-Qur'an",
          realisasi: "Santri mampu mengidentifikasi Idzhar",
          persentasePenyelesaian: 80 + (i * 3) % 21
        },
        generus: {
          hadir: 15 + (i % 3),
          izin: 1,
          sakit: 0,
          alfa: 0,
          baru: i === 6 ? 1 : 0,
          lulus: 0,
          perhatianKhusus: i === 4 ? "Ahmad membutuhkan bimbingan ekstra tajwid" : ""
        },
        penilaian,
        dokumentasi: {
          fotoUrl: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400",
          videoUrl: "",
          audioUrl: "",
          dokumenUrl: "laporan_kelas.pdf"
        },
        catatanHarian: {
          kendala: "Beberapa santri kurang konsentrasi karena cuaca panas.",
          solusi: "Mengadakan game edukatif di sela KBM.",
          idePerbaikan: "Menggunakan kipas angin portable tambahan.",
          kebutuhanBantuan: "Penyediaan LCD proyektor kelompok.",
          rencanaEsok: "Melanjutkan materi halaman 16 serta setoran hafalan doa harian."
        },
        evaluasiAI,
        evaluasiPengurus,
        nilaiAkhir,
        kategoriNilai
      });
    }
  });

  return reports;
};

const INITIAL_WA_REMINDERS_LOG = [
  { id: "rem-1", namaMubaligh: "Ust. M. Ridho", kelompok: "Kelompok Malang", jenis: "Belum Check-In", waktu: "2026-07-08 15:45", status: "Terkirim via WA", pesan: "Assalamu'alaikum Ust. M. Ridho, diingatkan waktu KBM TPQ telah mulai pukul 15:30 namun Anda belum melakukan Check-In. Mohon segera melakukan presensi kehadiran." },
  { id: "rem-2", namaMubaligh: "Usth. Laila", kelompok: "Kelompok Pandeyan", jenis: "Belum Isi Laporan Harian", waktu: "2026-07-08 20:00", status: "Terkirim via WA", pesan: "Assalamu'alaikum Usth. Laila, mohon segera melengkapi Laporan Kegiatan Harian untuk tanggal 2026-07-08 sebelum pukul 22:00. Terima kasih atas dedikasinya." },
  { id: "rem-3", namaMubaligh: "Usth. Fatmawati", kelompok: "Kelompok Patihan", jenis: "Target Mengajar Kurang", waktu: "2026-07-07 18:30", status: "Terkirim via WA", pesan: "Pemberitahuan Sistem: Target ketercapaian materi Kelompok Patihan hari ini berada di bawah 60%. Butuh diskusi kelas / bimbingan tambahan?" }
];

export function MonitoringMubalighPanel({ userRole }: { userRole: string }) {
  // Setup LocalStorage state
  const [reports, setReports] = useState<DailyActivityReport[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sim_tpq_mubaligh_reports");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error loading reports", e);
        }
      }
    }
    const initial = generateMockReports();
    if (typeof window !== "undefined") {
      localStorage.setItem("sim_tpq_mubaligh_reports", JSON.stringify(initial));
    }
    return initial;
  });

  const [waReminders, setWaReminders] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sim_tpq_wa_reminders_log");
      if (saved) return JSON.parse(saved);
    }
    return INITIAL_WA_REMINDERS_LOG;
  });

  // Active view: "mubaligh" (for Pengajar) or "pengurus" (for Admin Kelompok, Desa, Daerah, Super Admin)
  const isMubalighRole = userRole === "Pengajar";
  const [panelView, setPanelView] = useState<"mubaligh" | "pengurus">(isMubalighRole ? "mubaligh" : "pengurus");
  
  // Navigation sub-tabs
  const [mubalighTab, setMubalighTab] = useState<"dashboard" | "form" | "reports">("dashboard");
  const [pengurusTab, setPengurusTab] = useState<"dashboard" | "evaluasi" | "reminders" | "gamifikasi">("dashboard");

  // Selected Mubaligh for Mubaligh Dashboard (if Pengurus view) or current logged in Mubaligh
  const [selectedMubalighId, setSelectedMubalighId] = useState<string>("ms-1");

  // Form State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formCheckIn, setFormCheckIn] = useState<string>("");
  const [formCheckOut, setFormCheckOut] = useState<string>("");
  const [formGps, setFormGps] = useState<string>("");
  const [formVerified, setFormVerified] = useState<boolean>(false);
  const [formSelfie, setFormSelfie] = useState<string>("");
  const [formData, setFormData] = useState({
    namaMubaligh: "Ust. Heri Susanto",
    kelompokTPQ: "Kelompok Karas",
    desa: "Desa Selatan",
    daerah: "Magetan",
    tanggal: new Date().toISOString().split("T")[0],
    jamMulai: "15:30",
    jamSelesai: "17:00",
    lokasi: "TPQ Kelompok Karas",
    materi: {
      bab: "",
      halaman: "",
      kitab: "",
      kompetensi: "",
      target: "",
      realisasi: "",
      persentasePenyelesaian: 0
    },
    generus: {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alfa: 0,
      baru: 0,
      lulus: 0,
      perhatianKhusus: ""
    },
    penilaian: {
      antusias: 3,
      disiplin: 3,
      kondisi: 3,
      media: 3,
      pemahaman: 3
    },
    catatanHarian: {
      kendala: "",
      solusi: "",
      idePerbaikan: "",
      kebutuhanBantuan: "",
      rencanaEsok: ""
    }
  });

  // Checked activities in form
  const [formActivities, setFormActivities] = useState<{
    [key: string]: { checked: boolean; durasi: number; generusCount: number; ketercapaian: number; catatan: string }
  }>(() => {
    const actObj: any = {};
    MOCK_ACTIVITIES.forEach(act => {
      const isHours = act.toLowerCase().includes("berapa jam");
      actObj[act] = { checked: false, durasi: isHours ? 3 : 0, generusCount: 0, ketercapaian: 100, catatan: "" };
    });
    return actObj;
  });

  // Photo & Video Attachments
  const [formDocs, setFormDocs] = useState<{
    foto: string;
    video: string;
    audio: string;
    dokumen: string;
  }>({ foto: "", video: "", audio: "", dokumen: "" });

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // Selected Report for detail modal
  const [selectedReportDetail, setSelectedReportDetail] = useState<DailyActivityReport | null>(null);

  // Pengurus adding evaluation
  const [evaluatingReportId, setEvaluatingReportId] = useState<string | null>(null);
  const [evalScore, setEvalScore] = useState<number>(85);
  const [evalCatatan, setEvalCatatan] = useState<string>("");

  // Sync state (offline capability simulation)
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Filters for Pengurus Dashboard
  const [filterDesa, setFilterDesa] = useState<string>("Semua");
  const [filterKelompok, setFilterKelompok] = useState<string>("Semua");

  // Geolocation trigger simulation
  const handleGPSDetect = () => {
    if (navigator.geolocation) {
      toast.promise(
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
              setFormGps(coords);
              setFormVerified(true);
              resolve(coords);
            },
            (error) => {
              // fallback simulation
              setFormGps("-7.65481, 111.45632");
              setFormVerified(true);
              resolve("-7.65481, 111.45632 (GPS Sim-Bypass)");
            }
          );
        }),
        {
          loading: "Mendeteksi koordinat GPS dan memverifikasi wilayah TPQ...",
          success: (coords) => `GPS Terdeteksi: ${coords}. Lokasi Terverifikasi berada di area TPQ.`,
          error: "Akses GPS ditolak, menggunakan koordinat GPS Terikat Kelompok."
        }
      );
    }
  };

  // Selfie capture trigger simulation
  const handleSelfieCapture = () => {
    toast.info("Mengakses kamera perangkat...");
    setTimeout(() => {
      setFormSelfie("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150");
      toast.success("Foto selfie presensi berhasil diambil!");
    }, 1500);
  };

  // Drag & drop upload simulator
  const simulateUpload = (type: "foto" | "video" | "audio" | "dokumen", fileName: string) => {
    setUploadProgress(prev => ({ ...prev, [type]: 5 }));
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const next = (prev[type] || 0) + 25;
        if (next >= 100) {
          clearInterval(interval);
          setFormDocs(d => ({ ...d, [type]: fileName }));
          toast.success(`Dokumen ${type} (${fileName}) berhasil diunggah!`);
          return { ...prev, [type]: 100 };
        }
        return { ...prev, [type]: next };
      });
    }, 300);
  };

  // Check in trigger
  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    setFormCheckIn(timeStr);
    toast.success(`Check-In berhasil pada pukul ${timeStr}!`);
    handleGPSDetect();
  };

  // Check out trigger
  const handleCheckOut = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    setFormCheckOut(timeStr);
    toast.success(`Check-Out berhasil pada pukul ${timeStr}!`);
  };

  // Report submission
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCheckIn) {
      toast.error("Anda harus melakukan Check-In presensi terlebih dahulu!");
      return;
    }

    // AI Evaluation Simulation
    const checkedActivities = Object.keys(formActivities).filter(k => formActivities[k].checked);
    const scorePenilaian = Math.round(
      (formData.penilaian.antusias + 
      formData.penilaian.disiplin + 
      formData.penilaian.kondisi + 
      formData.penilaian.media + 
      formData.penilaian.pemahaman) * 4
    );

    // Productivity based on checked activities
    const actCount = checkedActivities.length;
    const aiScore = Math.min(100, Math.round(60 + (actCount * 6) + (formData.materi.persentasePenyelesaian * 0.2)));

    const evaluasiAI = {
      skorKinerja: aiScore,
      konsistensiKehadiran: "Sangat Baik (Tepat Waktu)",
      produktivitasMengajar: `${actCount} aktivitas diselesaikan`,
      penyelesaianKurikulum: `Kurikulum target terselesaikan ${formData.materi.persentasePenyelesaian}% hari ini`,
      trenPeningkatan: "Kerapian pelaporan materi dan antusiasme generus dinilai sangat baik oleh AI.",
      trenPenurunan: "Tidak ada tren penurunan kualitas terdeteksi.",
      risikoPenurunanKualitas: "Minimal",
      rekomendasiPembinaan: "Bagus! Teruskan performa. Integrasikan lebih banyak permainan edukatif untuk memicu daya tangkap santri."
    };

    const finalReportScore = Math.round((25 + 10 + 15 + (formData.materi.persentasePenyelesaian * 0.2) + 10 + 5 + 8.5 + (aiScore * 0.05)));
    
    let kategoriNilai: DailyActivityReport["kategoriNilai"] = "Baik";
    if (finalReportScore >= 85) kategoriNilai = "Sangat Baik";
    else if (finalReportScore >= 70) kategoriNilai = "Baik";
    else if (finalReportScore >= 55) kategoriNilai = "Cukup";
    else kategoriNilai = "Perlu Pembinaan";

    const newReport: DailyActivityReport = {
      id: `rep-${selectedMubalighId}-${formData.tanggal}`,
      mubalighId: selectedMubalighId,
      namaMubaligh: MOCK_MUBALIGH_LIST.find(m => m.id === selectedMubalighId)?.nama || "Ust. Mubaligh",
      kelompokTPQ: formData.kelompokTPQ,
      desa: formData.desa,
      daerah: formData.daerah,
      tanggal: formData.tanggal,
      jamMulai: formData.jamMulai,
      jamSelesai: formData.jamSelesai,
      lokasi: formData.lokasi,
      checkIn: formCheckIn,
      checkOut: formCheckOut || formData.jamSelesai + ":00",
      gpsLocation: formGps || "-7.65481, 111.45632",
      verifiedLocation: formVerified,
      selfieUrl: formSelfie || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      aktivitas: formActivities,
      materi: formData.materi,
      generus: formData.generus,
      penilaian: formData.penilaian,
      dokumentasi: {
        fotoUrl: formDocs.foto || "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400",
        videoUrl: formDocs.video,
        audioUrl: formDocs.audio,
        dokumenUrl: formDocs.dokumen
      },
      catatanHarian: formData.catatanHarian,
      evaluasiAI,
      nilaiAkhir: finalReportScore,
      kategoriNilai
    };

    if (!isOnline) {
      // Simulate offline mode saving
      const offlineReports = JSON.parse(localStorage.getItem("offline_mubaligh_reports") || "[]");
      offlineReports.push(newReport);
      localStorage.setItem("offline_mubaligh_reports", JSON.stringify(offlineReports));
      setPendingSyncCount(c => c + 1);
      toast.warning("Laporan tersimpan secara OFFLINE. Sistem akan otomatis melakukan sinkronisasi saat terhubung ke internet.");
    } else {
      const updatedReports = [newReport, ...reports];
      setReports(updatedReports);
      localStorage.setItem("sim_tpq_mubaligh_reports", JSON.stringify(updatedReports));
      toast.success("Laporan kegiatan harian berhasil dikirim dan dianalisis oleh AI!");
    }

    // Reset Form
    setCurrentStep(1);
    setFormCheckIn("");
    setFormCheckOut("");
    setFormSelfie("");
    setFormGps("");
    setFormVerified(false);
    setFormDocs({ foto: "", video: "", audio: "", dokumen: "" });
    setUploadProgress({});
    setMubalighTab("dashboard");
  };

  // Sync trigger
  const handleSyncOfflineData = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          const offlineReports: DailyActivityReport[] = JSON.parse(localStorage.getItem("offline_mubaligh_reports") || "[]");
          if (offlineReports.length > 0) {
            const updated = [...offlineReports, ...reports];
            setReports(updated);
            localStorage.setItem("sim_tpq_mubaligh_reports", JSON.stringify(updated));
            localStorage.removeItem("offline_mubaligh_reports");
          }
          setPendingSyncCount(0);
          resolve(true);
        }, 2000);
      }),
      {
        loading: "Menghubungkan ke server pusat & menyinkronkan data offline...",
        success: "Sinkronisasi berhasil! Seluruh data lokal telah diunggah ke cloud database.",
        error: "Koneksi gagal. Coba lagi nanti."
      }
    );
  };

  // Submit Pengurus Evaluation
  const handleSubmitEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingReportId) return;

    const updated = reports.map(rep => {
      if (rep.id === evaluatingReportId) {
        const evalPengurus = {
          skor: evalScore,
          catatan: evalCatatan,
          penilai: userRole + " (" + (userRole.includes("Super") ? "Admin Pusat" : "Pengurus Wilayah") + ")",
          tanggal: new Date().toISOString().split("T")[0]
        };

        // Recalculate final score with the new Pengurus evaluation
        const presensiPts = rep.checkIn ? 25 : 0;
        const tepatWaktuPts = rep.checkIn && rep.checkIn < "15:35" ? 10 : 5;
        const jamMengajarPts = 15; // default full
        const materiPts = rep.materi.persentasePenyelesaian * 0.2;
        const disiplinLapPts = 10;
        const dokPts = rep.dokumentasi.fotoUrl ? 5 : 0;
        const evalPengurusPts = evalScore * 0.1;
        const evalAIPts = (rep.evaluasiAI?.skorKinerja || 80) * 0.05;

        const nilaiAkhir = Math.round(presensiPts + tepatWaktuPts + jamMengajarPts + materiPts + disiplinLapPts + dokPts + evalPengurusPts + evalAIPts);

        let kategoriNilai: DailyActivityReport["kategoriNilai"] = "Baik";
        if (nilaiAkhir >= 85) kategoriNilai = "Sangat Baik";
        else if (nilaiAkhir >= 70) kategoriNilai = "Baik";
        else if (nilaiAkhir >= 55) kategoriNilai = "Cukup";
        else kategoriNilai = "Perlu Pembinaan";

        return {
          ...rep,
          evaluasiPengurus: evalPengurus,
          nilaiAkhir,
          kategoriNilai
        };
      }
      return rep;
    });

    setReports(updated);
    localStorage.setItem("sim_tpq_mubaligh_reports", JSON.stringify(updated));
    setEvaluatingReportId(null);
    setEvalCatatan("");
    toast.success("Evaluasi pengurus dan bobot penilaian berhasil diperbarui!");
  };

  // Send WhatsApp Reminder Simulator
  const handleSendReminder = (mubName: string, type: string) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          const newReminder = {
            id: `rem-${Date.now()}`,
            namaMubaligh: mubName,
            kelompok: MOCK_MUBALIGH_LIST.find(m => m.nama === mubName)?.kelompok || "Kelompok Binaan",
            jenis: type,
            waktu: new Date().toLocaleString(),
            status: "Terkirim via WA",
            pesan: `WhatsApp Gateway Remind: Halo ${mubName}, Anda mendapat peringatan otomatis dari SIM TPQ terkait: *${type}*. Mohon segera diselesaikan.`
          };
          
          const updated = [newReminder, ...waReminders];
          setWaReminders(updated);
          localStorage.setItem("sim_tpq_wa_reminders_log", JSON.stringify(updated));
          resolve(true);
        }, 1200);
      }),
      {
        loading: `Mengirimkan notifikasi WhatsApp ke ${mubName}...`,
        success: `WhatsApp Pengingat otomatis terkirim ke ${mubName}!`,
        error: "Pengiriman gagal."
      }
    );
  };

  // Export PDF / Excel simulator
  const handleExportData = (format: "PDF" | "Excel") => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => resolve(true), 1500);
      }),
      {
        loading: `Mengekspor data monitoring dalam format ${format}...`,
        success: `Data Monitoring Harian Mubaligh berhasil diunduh sebagai PintarYuk_Monitoring_Mubaligh.${format === "PDF" ? "pdf" : "xlsx"}`,
        error: "Gagal ekspor."
      }
    );
  };

  // Derived Data for current selected Mubaligh
  const selectedMubalighReports = useMemo(() => {
    return reports.filter(r => r.mubalighId === selectedMubalighId);
  }, [reports, selectedMubalighId]);

  const stats = useMemo(() => {
    if (selectedMubalighReports.length === 0) return {
      attendanceRate: 0,
      totalHours: 0,
      avgScore: 0,
      studentsCoached: 0,
      completionRate: 0,
      badgeCount: 0
    };

    const count = selectedMubalighReports.length;
    const attendance = selectedMubalighReports.filter(r => r.checkIn).length;
    const hours = Math.round((attendance * 1.5) * 10) / 10; // 1.5 hours per session
    const totalScore = selectedMubalighReports.reduce((sum, r) => sum + (r.nilaiAkhir || 0), 0);
    const totalCompletion = selectedMubalighReports.reduce((sum, r) => sum + r.materi.persentasePenyelesaian, 0);

    return {
      attendanceRate: Math.round((attendance / 7) * 100),
      totalHours: hours,
      avgScore: Math.round(totalScore / count),
      studentsCoached: 18, // Mock average per class
      completionRate: Math.round(totalCompletion / count),
      badgeCount: Math.round(totalScore / 500) + 3 // dynamic badges base
    };
  }, [selectedMubalighReports]);

  // Chart Data preparation
  const chartDataWeekly = useMemo(() => {
    return selectedMubalighReports.slice().reverse().map(r => ({
      tanggal: r.tanggal.substring(8, 10) + "/" + r.tanggal.substring(5, 7),
      skorKinerja: r.nilaiAkhir,
      kehadiranSantri: r.generus.hadir,
      materiProgress: r.materi.persentasePenyelesaian
    }));
  }, [selectedMubalighReports]);

  // Overall Statistics for Pengurus view
  const groupPerformanceData = useMemo(() => {
    const list: any[] = [];
    MOCK_MUBALIGH_LIST.forEach(mub => {
      const mubReps = reports.filter(r => r.mubalighId === mub.id);
      const avgScore = Math.round(mubReps.reduce((sum, r) => sum + (r.nilaiAkhir || 0), 0) / (mubReps.length || 1));
      const attendanceCount = mubReps.filter(r => r.checkIn).length;
      const totalHadirSantri = mubReps.reduce((sum, r) => sum + r.generus.hadir, 0);
      
      list.push({
        name: mub.nama,
        kelompok: mub.kelompok,
        desa: mub.desa,
        skorKinerja: avgScore,
        kehadiranMubaligh: Math.round((attendanceCount / 7) * 100),
        totalKehadiranSantri: totalHadirSantri
      });
    });
    return list;
  }, [reports]);

  return (
    <div className="space-y-6 text-left">
      {/* Top action header and offline controller */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-emerald-400 animate-bounce" />
            <h1 className="font-display text-2xl font-black tracking-tight">Monitoring Harian Mubaligh</h1>
          </div>
          <p className="text-xs text-slate-400">
            Sistem evaluasi kinerja pengajar TPQ cerdas dengan analisis AI & gamifikasi lencana.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline Sync Badge */}
          <div 
            onClick={() => setIsOnline(!isOnline)} 
            className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold cursor-pointer transition-all ${
              isOnline 
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-ping" : "bg-amber-500 animate-pulse"}`} />
            {isOnline ? "Online (Cloud Sync)" : "Offline Mode (Local)"}
          </div>

          {pendingSyncCount > 0 && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSyncOfflineData} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-xl text-xs font-bold animate-pulse"
            >
              Sync {pendingSyncCount} Data
            </Button>
          )}

          {/* Toggle View for non-mubaligh roles (RBAC) */}
          {!isMubalighRole && (
            <div className="bg-slate-850 p-1 border border-slate-700 rounded-2xl flex">
              <button 
                onClick={() => setPanelView("mubaligh")} 
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  panelView === "mubaligh" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Mubaligh View
              </button>
              <button 
                onClick={() => setPanelView("pengurus")} 
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  panelView === "pengurus" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Pengurus Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER VIEW: MUBALIGH PORTAL */}
      {panelView === "mubaligh" && (
        <div className="space-y-6">
          {/* Sub menu for mubaligh */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 max-w-fit">
            <button 
              onClick={() => setMubalighTab("dashboard")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                mubalighTab === "dashboard" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard Saya
            </button>
            <button 
              onClick={() => setMubalighTab("form")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                mubalighTab === "form" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Form Laporan Harian
            </button>
            <button 
              onClick={() => setMubalighTab("reports")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                mubalighTab === "reports" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4" /> Riwayat Laporan
            </button>
          </div>

          {/* MUBALIGH TAB: DASHBOARD */}
          {mubalighTab === "dashboard" && (
            <div className="space-y-6">
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-550 to-emerald-700 text-white border-none rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-3 translate-y-3">
                    <Clock className="h-32 w-32" />
                  </div>
                  <CardHeader className="p-5 pb-0">
                    <CardDescription className="text-white/80 text-[10px] uppercase font-bold">Total Jam Mengajar</CardDescription>
                    <CardTitle className="text-3xl font-black font-display tracking-tight mt-1">{stats.totalHours} Jam</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-3">
                    <span className="text-[10px] font-semibold text-white/70">Akumulasi Bulan ini</span>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm">
                  <CardHeader className="p-5 pb-0">
                    <CardDescription className="text-slate-400 text-[10px] uppercase font-bold">Tingkat Kehadiran</CardDescription>
                    <CardTitle className="text-3xl font-black font-display tracking-tight text-slate-800 mt-1">{stats.attendanceRate}%</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-3">
                    <span className="text-[10px] font-semibold text-emerald-600">Terdaftar di 7 Hari Terakhir</span>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm">
                  <CardHeader className="p-5 pb-0">
                    <CardDescription className="text-slate-400 text-[10px] uppercase font-bold">Rata-rata Nilai Kinerja</CardDescription>
                    <CardTitle className="text-3xl font-black font-display tracking-tight text-slate-800 mt-1">{stats.avgScore} / 100</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-3">
                    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[9px] rounded-full">
                      Kategori: Baik
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm">
                  <CardHeader className="p-5 pb-0">
                    <CardDescription className="text-slate-400 text-[10px] uppercase font-bold">Santri Dibimbing</CardDescription>
                    <CardTitle className="text-3xl font-black font-display tracking-tight text-emerald-600 mt-1">{stats.studentsCoached} Santri</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-3">
                    <span className="text-[10px] font-semibold text-slate-400">Kelas Aktif Kelompok Karas</span>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Performance charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 bg-white border-slate-200 rounded-3xl shadow-sm p-6">
                  <div className="flex items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-800">Tren Kinerja & Partisipasi Kelas</CardTitle>
                      <CardDescription className="text-xs text-slate-400">Grafik data 7 hari terakhir laporan harian.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg" onClick={() => handleExportData("Excel")}>
                        <Download className="h-3 w-3 mr-1" /> Excel
                      </Button>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDataWeekly} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSkor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSantri" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <ChartTooltip />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Area name="Skor Kinerja" type="monotone" dataKey="skorKinerja" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSkor)" />
                        <Area name="Santri Hadir" type="monotone" dataKey="kehadiranSantri" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSantri)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Gamification badges column */}
                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 text-center space-y-4">
                  <div className="text-left">
                    <CardTitle className="text-sm font-bold text-slate-800">Lencana Penghargaan Anda</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Prestasi dan apresiasi atas dedikasi pengajar.</CardDescription>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="flex flex-col items-center justify-center p-2.5 bg-amber-50 rounded-2xl border border-amber-100">
                      <Award className="h-8 w-8 text-amber-500 animate-pulse" />
                      <span className="text-[9px] font-black text-amber-800 mt-1 block">Guru Teladan</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <Award className="h-8 w-8 text-emerald-600" />
                      <span className="text-[9px] font-black text-emerald-800 mt-1 block">30 Hari Hadir</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <Award className="h-8 w-8 text-indigo-500" />
                      <span className="text-[9px] font-black text-indigo-800 mt-1 block">Mentor Tahsin</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2.5 bg-blue-50 rounded-2xl border border-blue-100 opacity-60">
                      <Award className="h-8 w-8 text-blue-400" />
                      <span className="text-[9px] font-black text-slate-650 mt-1 block">Role Model</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2.5 bg-purple-50 rounded-2xl border border-purple-100 opacity-60">
                      <Award className="h-8 w-8 text-purple-400" />
                      <span className="text-[9px] font-black text-slate-650 mt-1 block">Hafidz Mentor</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2.5 bg-rose-50 rounded-2xl border border-rose-100 opacity-60">
                      <Award className="h-8 w-8 text-rose-400" />
                      <span className="text-[9px] font-black text-slate-650 mt-1 block">Penggerak</span>
                    </div>
                  </div>
                  
                  <div className="text-left bg-slate-50 p-3 rounded-2xl text-[10px] space-y-1">
                    <span className="font-bold text-slate-700 block">Bagaimana cara meraih Lencana baru?</span>
                    <p className="text-slate-400 leading-relaxed">Pertahankan skor kinerja di atas 85 secara konsisten selama 30 hari untuk membuka lencana *Role Model*.</p>
                  </div>
                </Card>
              </div>

              {/* AI Coaching recommendations and history */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Advisor Panel */}
                <Card className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-3xl shadow-xl p-6 md:col-span-2 border border-slate-800">
                  <div className="flex items-center gap-2 pb-4">
                    <Bot className="h-5 w-5 text-indigo-400" />
                    <div>
                      <CardTitle className="text-sm font-black tracking-wide text-white">Rekomendasi Peningkatan AI Cerdas</CardTitle>
                      <CardDescription className="text-[10px] text-slate-400">Analisis aktivitas mengajar & respons santri mingguan.</CardDescription>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-xs">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300">Skor Konsistensi Kurikulum</span>
                        <Badge className="bg-emerald-500 text-white text-[9px] font-bold border-none rounded-full px-2 py-0.5">Sangat Baik (88%)</Badge>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Kurikulum tajwid Nun Sukun berjalan lancar. Santri menunjukkan pemahaman sangat baik pada bagian Idzhar.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-indigo-300 block">Saran Pelatihan Prioritas:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block">Metode Visual Al-Qur'an</span>
                            <span className="text-[10px] text-slate-400">Pemanfaatan kartu visual untuk tajwid anak.</span>
                          </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                          <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block">Manajemen Kelas Interaktif</span>
                            <span className="text-[10px] text-slate-400">Teknik ice breaking saat KBM sore hari.</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-3 flex items-start gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-indigo-200">
                        <strong>Prediksi Bulan Depan:</strong> Kinerja diprediksi stabil pada rentang skor 88–92 dengan potensi peningkatan fokus santri 12% jika metode games audio-visual diterapkan di hari Kamis.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Riwayat Pembinaan */}
                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 text-left">
                  <CardTitle className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-emerald-600" /> Riwayat Pembinaan Pengurus
                  </CardTitle>
                  <div className="space-y-3">
                    <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">06 Juli 2026</span>
                      <span className="text-xs font-bold text-slate-800">Evaluasi Pembagian Durasi KBM</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Disarankan memisahkan sesi Iqro & Al-Qur'an dengan jeda interaktif 5 menit.</p>
                      <span className="text-[9px] font-bold text-emerald-605 block">- Ust. Ali Mahmudi</span>
                    </div>

                    <div className="border-l-2 border-slate-300 pl-3 py-1 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">28 Juni 2026</span>
                      <span className="text-xs font-bold text-slate-800">Pelatihan Kurikulum Tajwid</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Menghadiri coaching munaqosah tingkat desa di Masjid Nurul Iman.</p>
                      <span className="text-[9px] font-bold text-slate-650 block">- Pengurus Desa</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* MUBALIGH TAB: FORM MONITORING HARIAN */}
          {mubalighTab === "form" && (
            <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 md:p-8 max-w-4xl mx-auto">
              {/* Form step progress bar */}
              <div className="flex items-center justify-between mb-8 max-w-lg mx-auto">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <div 
                      onClick={() => formCheckIn && setCurrentStep(stepNum)}
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition-all border ${
                        currentStep === stepNum 
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : currentStep > stepNum
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      {stepNum}
                    </div>
                    {stepNum < 5 && (
                      <div className={`flex-1 h-0.5 mx-2 ${currentStep > stepNum ? "bg-emerald-300" : "bg-slate-100"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="text-center pb-6">
                <h2 className="text-lg font-bold text-slate-800">
                  {currentStep === 1 && "Langkah 1: Identitas & Presensi Masuk (Check-In)"}
                  {currentStep === 2 && "Langkah 2: Monev Kegiatan Harian Mubaligh"}
                  {currentStep === 3 && "Langkah 3: Monitoring Materi & Generus"}
                  {currentStep === 4 && "Langkah 4: Penilaian Kelas & Dokumentasi"}
                  {currentStep === 5 && "Langkah 5: Catatan Harian & Simpan Laporan"}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Isilah laporan kegiatan TPQ harian Anda dengan jujur untuk evaluasi berimbang.
                </p>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-6">
                {/* STEP 1: IDENTITAS & PRESENSI */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Nama Mubaligh</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                          value={selectedMubalighId}
                          onChange={(e) => {
                            setSelectedMubalighId(e.target.value);
                            const mub = MOCK_MUBALIGH_LIST.find(m => m.id === e.target.value);
                            if (mub) {
                              setFormData(prev => ({
                                ...prev,
                                namaMubaligh: mub.nama,
                                kelompokTPQ: mub.kelompok,
                                desa: mub.desa
                              }));
                            }
                          }}
                        >
                          {MOCK_MUBALIGH_LIST.map((mub) => (
                            <option key={mub.id} value={mub.id}>{mub.nama} ({mub.kelompok})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Hari / Tanggal</label>
                        <input 
                          type="date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                          value={formData.tanggal}
                          onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Presensi Check-In Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                      <span className="text-xs font-black text-slate-800 block">Absensi Digital (Realtime GPS & Selfie)</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-3 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-400">CHECK-IN PRESENSI</span>
                          {formCheckIn ? (
                            <div className="text-center space-y-1">
                              <span className="text-2xl font-black text-emerald-600 block">{formCheckIn}</span>
                              <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold rounded-full text-[9px]">Berhasil Masuk</Badge>
                            </div>
                          ) : (
                            <Button type="button" onClick={handleCheckIn} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6">
                              Check-In Sekarang
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-150">
                          <span className="text-[10px] font-bold text-slate-400">CHECK-OUT PRESENSI</span>
                          {formCheckOut ? (
                            <div className="text-center space-y-1">
                              <span className="text-2xl font-black text-amber-600 block">{formCheckOut}</span>
                              <Badge className="bg-amber-100 text-amber-800 border-none font-bold rounded-full text-[9px]">Selesai Tugas</Badge>
                            </div>
                          ) : (
                            <Button type="button" disabled={!formCheckIn} onClick={handleCheckOut} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold px-6">
                              Check-Out KBM
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* GPS & Photo Selfie */}
                      {formCheckIn && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-700 block">Koordinat Lokasi GPS:</span>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                readOnly
                                value={formGps || "Mendeteksi koordinat..."}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold focus:outline-none"
                              />
                              <Button type="button" variant="outline" size="sm" onClick={handleGPSDetect} className="rounded-xl px-2 h-8">
                                <Compass className="h-4 w-4" />
                              </Button>
                            </div>
                            {formVerified && (
                              <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> GPS Terverifikasi di Area TPQ
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-700 block">Foto Selfie Presensi:</span>
                            <div className="flex items-center gap-3">
                              {formSelfie ? (
                                <img src={formSelfie} alt="Selfie" className="h-12 w-12 rounded-xl object-cover border border-slate-200" />
                              ) : (
                                <div className="h-12 w-12 bg-slate-200 rounded-xl flex items-center justify-center">
                                  <Camera className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                              <Button type="button" variant="outline" size="sm" onClick={handleSelfieCapture} className="rounded-xl text-[10px] font-bold h-8">
                                Ambil Foto Selfie
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}                {/* STEP 2: CHECKLIST AKTIVITAS */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 block pb-2">Silakan isi kuesioner monev harian Mubaligh di bawah ini:</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                      {MOCK_ACTIVITIES.map((act) => {
                        const actState = formActivities[act];
                        const isQuestionWithHours = act.toLowerCase().includes("berapa jam");
                        return (
                          <div 
                            key={act} 
                            className={`p-4 rounded-2xl border transition-all ${
                              actState.checked 
                                ? "bg-emerald-50/50 border-emerald-300" 
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  checked={actState.checked}
                                  onChange={(e) => {
                                    setFormActivities(prev => ({
                                      ...prev,
                                      [act]: { ...prev[act], checked: e.target.checked }
                                    }));
                                  }}
                                  className="h-4.5 w-4.5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-xs font-bold text-slate-800">{act}</span>
                              </div>
                            </div>

                            {/* Expanded options for checked activity */}
                            {actState.checked && isQuestionWithHours && (
                              <div className="mt-3 grid grid-cols-1 gap-3 pt-3 border-t border-dashed border-slate-200 text-[10px]">
                                <div className="space-y-1">
                                  <label className="font-bold text-slate-600">Jumlah Jam Mengajar</label>
                                  <input 
                                    type="number"
                                    min="0"
                                    max="24"
                                    placeholder="Contoh: 3"
                                    value={actState.durasi}
                                    onChange={(e) => {
                                      setFormActivities(prev => ({
                                        ...prev,
                                        [act]: { ...prev[act], durasi: parseInt(e.target.value) || 0 }
                                      }));
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-bold text-xs"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Optional Catatan for other questions */}
                            {actState.checked && !isQuestionWithHours && (
                              <div className="mt-3 grid grid-cols-1 gap-3 pt-3 border-t border-dashed border-slate-200 text-[10px]">
                                <div className="space-y-1">
                                  <label className="font-bold text-slate-600">Catatan / Keterangan (Opsional)</label>
                                  <input 
                                    type="text"
                                    placeholder="Tambahkan catatan jika ada..."
                                    value={actState.catatan}
                                    onChange={(e) => {
                                      setFormActivities(prev => ({
                                        ...prev,
                                        [act]: { ...prev[act], catatan: e.target.value }
                                      }));
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: MONITORING MATERI & GENERUS */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {/* Monitoring Materi Card */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                      <span className="text-xs font-black text-slate-800 block">Detail Materi yang Diajarkan</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Nama Kitab / Buku</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Iqro Jilid 4, Tajwid Praktis"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.materi.kitab}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, kitab: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Bab / Sub-Bab</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Hukum Nun Mati"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.materi.bab}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, bab: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Halaman / Ayat</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Hal. 22-25"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.materi.halaman}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, halaman: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Target Kurikulum</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Lancar melafalkan Idzhar"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.materi.target}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, target: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Realisasi Kelas</label>
                          <input 
                            type="text"
                            placeholder="Contoh: 12 anak lancar, 3 anak butuh perbaikan"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.materi.realisasi}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, realisasi: e.target.value }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Persentase Penyelesaian (%)</label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-xs focus:outline-none font-bold"
                            value={formData.materi.persentasePenyelesaian || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              materi: { ...prev.materi, persentasePenyelesaian: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Monitoring Generus */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                      <span className="text-xs font-black text-slate-800 block">Absensi & Kondisi Santri (Generus)</span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-800">Jumlah Hadir</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.hadir || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, hadir: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-blue-800">Jumlah Izin</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.izin || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, izin: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-amber-800">Jumlah Sakit</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.sakit || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, sakit: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-red-800">Jumlah Alfa</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.alfa || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, alfa: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Santri Baru Masuk</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.baru || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, baru: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600">Santri Lulus Tingkatan</label>
                          <input 
                            type="number"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                            value={formData.generus.lulus || ""}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, lulus: parseInt(e.target.value) || 0 }
                            }))}
                          />
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-bold text-amber-805">Butuh Perhatian Khusus</label>
                          <input 
                            type="text"
                            placeholder="Nama anak & kendala (misal: Rian mengantuk)"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            value={formData.generus.perhatianKhusus}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              generus: { ...prev.generus, perhatianKhusus: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: PENILAIAN KELAS & DOKUMENTASI */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Penilaian Kelas (Scale 1-5) */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                      <span className="text-xs font-black text-slate-800 block">Penilaian Kondisi Kelas & Pembelajaran (Skala 1 - 5)</span>
                      
                      <div className="space-y-4">
                        {[
                          { key: "antusias", label: "Antusiasme Generus", desc: "Seberapa antusias anak-anak menyimak KBM" },
                          { key: "disiplin", label: "Disiplin Kelas", desc: "Tingkat ketertiban santri selama pelajaran" },
                          { key: "kondisi", label: "Kondisi Ruangan & Suasana", desc: "Kebersihan, kenyamanan, ventilasi udara" },
                          { key: "media", label: "Ketersediaan Media Belajar", desc: "Alat peraga, buku, papan tulis, proyektor" },
                          { key: "pemahaman", label: "Pemahaman Materi Santri", desc: "Kemampuan santri menyerap penjelasan materi" }
                        ].map((item) => {
                          const val = (formData.penilaian as any)[item.key];
                          return (
                            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-slate-150">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-slate-850 block">{item.label}</span>
                                <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="range"
                                  min="1"
                                  max="5"
                                  className="w-32 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                  value={val}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    penilaian: { ...prev.penilaian, [item.key]: parseInt(e.target.value) }
                                  }))}
                                />
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                      key={star} 
                                      className={`h-4.5 w-4.5 ${
                                        star <= val ? "text-amber-500 fill-amber-500" : "text-slate-205"
                                      }`} 
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-black text-slate-700 w-4 text-center">{val}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Drag-drop upload simulator */}
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                      <span className="text-xs font-black text-slate-800 block">Dokumentasi & Media Pendukung</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: "foto", label: "Foto Kegiatan (.png, .jpg)", icon: Camera, file: "foto_kegiatan.jpg" },
                          { key: "video", label: "Video Pendek (.mp4)", icon: Play, file: "video_belajar.mp4" },
                          { key: "audio", label: "Rekaman Audio Pembelajaran (.mp3)", icon: Upload, file: "audio_tahsin.mp3" },
                          { key: "dokumen", label: "Dokumen / Laporan PDF (.pdf)", icon: FileText, file: "evaluasi_kelas.pdf" }
                        ].map((media) => {
                          const progress = uploadProgress[media.key] || 0;
                          const uploadedFile = (formDocs as any)[media.key];
                          
                          return (
                            <div key={media.key} className="bg-white p-4 border border-slate-200 rounded-2xl space-y-3">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block">{media.label}</span>
                              
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                  <media.icon className="h-5 w-5 text-slate-500" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  {uploadedFile ? (
                                    <span className="text-xs font-bold text-slate-800 truncate block">{uploadedFile}</span>
                                  ) : (
                                    <span className="text-xs text-slate-400 block">Belum ada file diunggah</span>
                                  )}

                                  {progress > 0 && progress < 100 && (
                                    <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                                      <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                  )}
                                </div>

                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => simulateUpload(media.key as any, media.file)} 
                                  className="rounded-xl h-8 px-2.5 text-[10px] font-bold"
                                >
                                  {uploadedFile ? "Ubah" : "Unggah"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: CATATAN HARIAN & KENDALA */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 block pb-2">Catatan Harian Bebas:</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Kendala yang Dihadapi</label>
                        <textarea 
                          placeholder="Jelaskan hambatan selama KBM..."
                          className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                          value={formData.catatanHarian.kendala}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            catatanHarian: { ...prev.catatanHarian, kendala: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Solusi yang Dilakukan</label>
                        <textarea 
                          placeholder="Tindakan alternatif untuk mengatasi kendala..."
                          className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                          value={formData.catatanHarian.solusi}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            catatanHarian: { ...prev.catatanHarian, solusi: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Ide Perbaikan Masa Depan</label>
                        <textarea 
                          placeholder="Usulan inovasi atau teknik mengajar baru..."
                          className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                          value={formData.catatanHarian.idePerbaikan}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            catatanHarian: { ...prev.catatanHarian, idePerbaikan: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Kebutuhan Bantuan Pengurus</label>
                        <textarea 
                          placeholder="Sarana prasarana atau bimbingan yang diperlukan dari desa/daerah..."
                          className="w-full min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                          value={formData.catatanHarian.kebutuhanBantuan}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            catatanHarian: { ...prev.catatanHarian, kebutuhanBantuan: e.target.value }
                          }))}
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700">Rencana Kegiatan Esok Hari</label>
                        <textarea 
                          placeholder="Materi target kurikulum & jam KBM besok..."
                          className="w-full min-h-[60px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
                          value={formData.catatanHarian.rencanaEsok}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            catatanHarian: { ...prev.catatanHarian, rencanaEsok: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Nav Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    disabled={currentStep === 1}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="rounded-xl text-xs font-bold px-4"
                  >
                    Sebelumnya
                  </Button>

                  {currentStep < 5 ? (
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (currentStep === 1 && !formCheckIn) {
                          toast.error("Lakukan Check-In terlebih dahulu untuk memulai!");
                          return;
                        }
                        setCurrentStep(prev => prev + 1);
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold px-6"
                    >
                      Lanjutkan
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6 shadow-md shadow-emerald-600/10"
                    >
                      Kirim Laporan & Analisis AI
                    </Button>
                  )}
                </div>
              </form>
            </Card>
          )}

          {/* MUBALIGH TAB: HISTORY REPORTS */}
          {mubalighTab === "reports" && (
            <Card className="bg-white border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-150 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Riwayat Laporan Aktivitas Harian Anda</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Total {selectedMubalighReports.length} laporan kegiatan terdaftar.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-[10px] h-8 rounded-lg" onClick={() => handleExportData("PDF")}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Unduh PDF
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-405 font-bold uppercase">
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Check-In / Out</th>
                      <th className="p-4">Materi Diajarkan</th>
                      <th className="p-4">Generus Hadir</th>
                      <th className="p-4">Skor AI</th>
                      <th className="p-4">Nilai Akhir</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {selectedMubalighReports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedReportDetail(rep)}>
                        <td className="p-4 font-bold">{rep.tanggal}</td>
                        <td className="p-4 text-slate-400">{rep.checkIn} - {rep.checkOut || "Aktif"}</td>
                        <td className="p-4">{rep.materi.kitab} - {rep.materi.bab}</td>
                        <td className="p-4 font-bold text-emerald-600">{rep.generus.hadir} Santri</td>
                        <td className="p-4 font-bold text-indigo-600">{rep.evaluasiAI?.skorKinerja}%</td>
                        <td className="p-4 font-black">{rep.nilaiAkhir || "-"} / 100</td>
                        <td className="p-4 text-center">
                          <Badge className={`border-none font-bold text-[9px] px-2 py-0.5 rounded-full ${
                            rep.kategoriNilai === "Sangat Baik" 
                              ? "bg-emerald-100 text-emerald-800"
                              : rep.kategoriNilai === "Baik"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                          }`}>
                            {rep.kategoriNilai || "Proses"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RENDER VIEW: PENGURUS PORTAL */}
      {panelView === "pengurus" && (
        <div className="space-y-6">
          {/* Sub menu for pengurus */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2 max-w-fit">
            <button 
              onClick={() => setPengurusTab("dashboard")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                pengurusTab === "dashboard" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Monitoring Global
            </button>
            <button 
              onClick={() => setPengurusTab("evaluasi")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                pengurusTab === "evaluasi" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Penilaian & Laporan
            </button>

            <button 
              onClick={() => setPengurusTab("reminders")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                pengurusTab === "reminders" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Gateway
            </button>
            <button 
              onClick={() => setPengurusTab("gamifikasi")} 
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                pengurusTab === "gamifikasi" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Award className="h-4 w-4" /> Gamifikasi Lencana
            </button>
          </div>

          {/* PENGURUS VIEW: MONITORING GLOBAL (LEADERBOARD & COMPARISONS) */}
          {pengurusTab === "dashboard" && (
            <div className="space-y-6">
              {/* Filter Row */}
              <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Filter Lokasi:</span>
                <select 
                  className="bg-slate-50 border border-slate-205 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                  value={filterDesa}
                  onChange={(e) => setFilterDesa(e.target.value)}
                >
                  <option value="Semua">Semua Desa</option>
                  <option value="Desa Selatan">Desa Selatan</option>
                  <option value="Desa Tengah">Desa Tengah</option>
                  <option value="Desa Utara">Desa Utara</option>
                </select>

                <select 
                  className="bg-slate-50 border border-slate-205 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
                  value={filterKelompok}
                  onChange={(e) => setFilterKelompok(e.target.value)}
                >
                  <option value="Semua">Semua Kelompok</option>
                  <option value="Kelompok Karas">Kelompok Karas</option>
                  <option value="Kelompok Patihan">Kelompok Patihan</option>
                  <option value="Kelompok Malang">Kelompok Malang</option>
                  <option value="Kelompok Pandeyan">Kelompok Pandeyan</option>
                </select>
              </div>

              {/* Leaderboard Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ranking Mubaligh */}
                <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 space-y-4 md:col-span-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Ranking Kinerja Mubaligh Teraktif & Berprestasi</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Diurutkan berdasarkan bobot penilaian komprehensif.</CardDescription>
                  </div>

                  <div className="space-y-3">
                    {groupPerformanceData
                      .filter(m => (filterDesa === "Semua" || m.desa === filterDesa) && (filterKelompok === "Semua" || m.kelompok === filterKelompok))
                      .sort((a,b) => b.skorKinerja - a.skorKinerja)
                      .map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              idx === 0 
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : idx === 1
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <span className="font-bold text-slate-850 block text-xs">{item.name}</span>
                              <span className="text-[10px] text-slate-400 block">{item.kelompok} • {item.desa}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Kehadiran</span>
                              <span className="text-xs font-bold text-emerald-600">{item.kehadiranMubaligh}%</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Skor</span>
                              <span className="text-sm font-black text-indigo-700">{item.skorKinerja} / 100</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>

                {/* Heatmap simulation widgets */}
                <Card className="bg-white border-slate-250 rounded-3xl shadow-sm p-6 text-left space-y-4">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800">Heatmap Keaktifan KBM (Mingguan)</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Deteksi tingkat kepadatan aktivitas.</CardDescription>
                  </div>

                  <div className="space-y-3">
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"].map((day, idx) => {
                      const level = (idx * 3) % 4; // simulated density
                      return (
                        <div key={day} className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">{day}</span>
                          <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((item) => (
                              <div 
                                key={item} 
                                className={`h-4.5 w-4.5 rounded-md ${
                                  item <= level + 1
                                    ? "bg-emerald-500 border border-emerald-600/10"
                                    : "bg-slate-100 border border-slate-200"
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-2xl text-[9px] text-slate-400 leading-relaxed">
                    Warna hijau solid mengindikasikan seluruh pengajar di desa tersebut mengupload laporan tepat waktu & absensi 100%.
                  </div>
                </Card>
              </div>

              {/* Performance charts */}
              <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 text-left">
                <CardTitle className="text-sm font-bold text-slate-800 mb-4">Perbandingan Kinerja Antar Mubaligh</CardTitle>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <ChartTooltip />
                      <Bar name="Skor Kinerja Harian" dataKey="skorKinerja" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} />
                      <Bar name="Total Santri" dataKey="totalKehadiranSantri" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* PENGURUS VIEW: PENILAIAN & LAPORAN */}
          {pengurusTab === "evaluasi" && (
            <Card className="bg-white border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-150 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Manajemen Laporan & Penilaian Pengurus</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Verifikasi laporan kegiatan harian dan input nilai pengurus.</CardDescription>
                </div>
              </div>

              {/* Evaluator Form if active */}
              {evaluatingReportId && (
                <div className="m-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-850 text-xs">Evaluasi Laporan: #{evaluatingReportId}</span>
                    <Button variant="ghost" size="sm" onClick={() => setEvaluatingReportId(null)} className="h-7 text-xs font-bold rounded-lg text-slate-400">
                      Batal
                    </Button>
                  </div>
                  
                  <form onSubmit={handleSubmitEvaluation} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 block">Nilai Pengurus (10% Bobot, Skala 0-100)</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                        value={evalScore}
                        onChange={(e) => setEvalScore(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 block">Catatan Bimbingan & Pembinaan</label>
                      <input 
                        type="text" 
                        placeholder="Berikan masukan perbaikan metode mengajar..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                        value={evalCatatan}
                        onChange={(e) => setEvalCatatan(e.target.value)}
                      />
                    </div>
                    
                    <div className="sm:col-span-3 flex justify-end">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6">
                        Simpan Penilaian Evaluator
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-405 font-bold uppercase">
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Nama Mubaligh</th>
                      <th className="p-4">Materi Diajarkan</th>
                      <th className="p-4">Skor AI (5%)</th>
                      <th className="p-4">Skor Pengurus (10%)</th>
                      <th className="p-4">Nilai Akhir (0-100)</th>
                      <th className="p-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {reports.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold">{rep.tanggal}</td>
                        <td className="p-4">
                          <span className="font-bold block">{rep.namaMubaligh}</span>
                          <span className="text-[10px] text-slate-400 block">{rep.kelompokTPQ}</span>
                        </td>
                        <td className="p-4">{rep.materi.kitab} - {rep.materi.bab}</td>
                        <td className="p-4 font-bold text-indigo-600">{rep.evaluasiAI?.skorKinerja || "-"}%</td>
                        <td className="p-4 font-bold text-emerald-600">
                          {rep.evaluasiPengurus ? `${rep.evaluasiPengurus.skor}%` : (
                            <Badge className="bg-slate-100 border-none text-slate-500 font-bold text-[9px] rounded-full">Belum Dinilai</Badge>
                          )}
                        </td>
                        <td className="p-4 font-black">{rep.nilaiAkhir || "-"} / 100</td>
                        <td className="p-4 text-center flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedReportDetail(rep)} className="text-[10px] h-7 rounded-lg">
                            Detail
                          </Button>
                          <Button size="sm" onClick={() => {
                            setEvaluatingReportId(rep.id);
                            setEvalScore(rep.evaluasiPengurus?.skor || 85);
                            setEvalCatatan(rep.evaluasiPengurus?.catatan || "");
                          }} className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] h-7 rounded-lg">
                            Beri Nilai
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
           )}

          {/* PENGURUS VIEW: WHATSAPP NOTIFICATIONS CENTER */}
          {pengurusTab === "reminders" && (
            <Card className="bg-white border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 text-left">
              <div className="pb-4 border-b border-slate-150 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Notifikasi WhatsApp Otomatis Center</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Kirim peringatan dan pengingat otomatis ke Mubaligh terkait kehadiran dan laporan harian.</CardDescription>
                </div>
              </div>

              {/* Send Quick Reminder Simulator */}
              <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-black text-slate-850 block mb-3">Kirim Pengingat Cepat</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Pilih Mubaligh</label>
                    <select id="sim-rem-mub" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none">
                      {MOCK_MUBALIGH_LIST.map(m => (
                        <option key={m.id} value={m.nama}>{m.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">Tipe Peringatan</label>
                    <select id="sim-rem-type" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold focus:outline-none">
                      <option value="Belum Check-In">Belum Check-In</option>
                      <option value="Belum Isi Laporan">Belum Isi Laporan</option>
                      <option value="Kinerja Menurun">Kinerja Menurun</option>
                      <option value="Belum Upload Dokumentasi">Belum Upload Dokumentasi</option>
                    </select>
                  </div>

                  <Button 
                    onClick={() => {
                      const mubEl = document.getElementById("sim-rem-mub") as HTMLSelectElement;
                      const typeEl = document.getElementById("sim-rem-type") as HTMLSelectElement;
                      if (mubEl && typeEl) {
                        handleSendReminder(mubEl.value, typeEl.value);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-9"
                  >
                    Kirim via WA Gateway
                  </Button>
                </div>
              </div>

              {/* Log History */}
              <span className="text-xs font-black text-slate-800 block mb-3">Log Pengiriman Notifikasi WA Terakhir:</span>
              <div className="space-y-3">
                {waReminders.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.namaMubaligh} ({log.kelompok})</span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">{log.status}</span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{log.pesan}</p>
                    <span className="text-[9px] text-slate-400 font-semibold block pt-1">{log.waktu}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* PENGURUS VIEW: GAMIFICATION LENCANA */}
          {pengurusTab === "gamifikasi" && (
            <Card className="bg-white border-slate-200 rounded-3xl shadow-sm p-6 text-left">
              <div className="pb-4 border-b border-slate-150 flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">Manajemen Penghargaan & Gamifikasi</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Atur dan anugerahkan lencana prestasi bagi Mubaligh yang memiliki dedikasi mengajar tinggi.</CardDescription>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: "Mubaligh Teladan", desc: "Diberikan kepada pengajar dengan rata-rata nilai kinerja > 90 dalam 1 semester.", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
                  { title: "Pengajar Terajin", desc: "Presensi kehadiran 100% dan Check-In tepat waktu berturut-turut.", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                  { title: "Mentor Inspiratif", desc: "Mendapat evaluasi pengurus sempurna (100) dan disukai seluruh santri.", color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100" },
                  { title: "Ahli Tahsin", desc: "Kompetensi tajwid dan tahsin santri bimbingan terselesaikan di atas target.", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
                  { title: "Ahli Tahfidz", desc: "Berhasil meluluskan minimal 5 santri dalam setoran juz 30 lancar sekali duduk.", color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100" },
                  { title: "Disiplin Tinggi", desc: "Mengirim laporan harian sebelum pukul 18:00 setiap harinya secara konsisten.", color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" }
                ].map((badge) => (
                  <div key={badge.title} className={`p-4 border ${badge.border} ${badge.bg} rounded-3xl text-center space-y-2 flex flex-col justify-between`}>
                    <div className="flex flex-col items-center">
                      <Award className={`h-12 w-12 ${badge.color} animate-pulse`} />
                      <span className="font-bold text-xs text-slate-800 mt-2 block">{badge.title}</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{badge.desc}</p>
                    </div>

                    <div className="pt-3">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          toast.success(`Lencana "${badge.title}" berhasil ditambahkan ke profil kandidat terkuat!`);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold h-8 rounded-xl"
                      >
                        Anugerahkan Lencana
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* DETAIL MODAL FOR REPORT */}
      {selectedReportDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border-none">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">Detail Laporan Monitoring Kegiatan</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Diajukan oleh {selectedReportDetail.namaMubaligh} pada {selectedReportDetail.tanggal}
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedReportDetail(null)}
                className="h-8 text-xs font-bold text-slate-405 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs text-left">
              {/* Presensi & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Jam Presensi</span>
                  <span className="font-bold text-slate-800 text-xs">
                    Masuk: {selectedReportDetail.checkIn} | Keluar: {selectedReportDetail.checkOut || "Aktif"}
                  </span>
                  <span className="text-[10px] text-slate-400 block pt-0.5">GPS: {selectedReportDetail.gpsLocation}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center gap-3">
                  {selectedReportDetail.selfieUrl ? (
                    <img src={selectedReportDetail.selfieUrl} alt="Selfie" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="h-10 w-10 bg-slate-200 rounded-lg flex items-center justify-center"><User className="h-5 w-5 text-slate-400" /></div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Verifikasi Lokasi</span>
                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[9px] border-none rounded-full">
                      Tingkat TPQ Sesuai
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Materi & Generus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-150 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-850 block pb-1 border-b border-dashed border-slate-200">Monitoring Materi</span>
                  <div className="space-y-1.5">
                    <div><span className="text-slate-400">Kitab:</span> <span className="font-bold">{selectedReportDetail.materi.kitab}</span></div>
                    <div><span className="text-slate-400">Bab/Hal:</span> <span className="font-bold">{selectedReportDetail.materi.bab} ({selectedReportDetail.materi.halaman})</span></div>
                    <div><span className="text-slate-400">Penyelesaian:</span> <span className="font-black text-indigo-750">{selectedReportDetail.materi.persentasePenyelesaian}%</span></div>
                  </div>
                </div>

                <div className="border border-slate-150 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-850 block pb-1 border-b border-dashed border-slate-200">Kehadiran Santri (Generus)</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-1 bg-emerald-50 rounded-xl"><span className="text-emerald-700 font-black block text-sm">{selectedReportDetail.generus.hadir}</span><span className="text-[8px] text-slate-400 font-bold uppercase">Hadir</span></div>
                    <div className="p-1 bg-blue-50 rounded-xl"><span className="text-blue-700 font-black block text-sm">{selectedReportDetail.generus.izin}</span><span className="text-[8px] text-slate-400 font-bold uppercase">Izin</span></div>
                    <div className="p-1 bg-amber-50 rounded-xl"><span className="text-amber-700 font-black block text-sm">{selectedReportDetail.generus.sakit}</span><span className="text-[8px] text-slate-400 font-bold uppercase">Sakit</span></div>
                    <div className="p-1 bg-red-50 rounded-xl"><span className="text-red-700 font-black block text-sm">{selectedReportDetail.generus.alfa}</span><span className="text-[8px] text-slate-400 font-bold uppercase">Alfa</span></div>
                  </div>
                </div>
              </div>

              {/* Aktivitas Checklist */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-slate-800 block">Monev Harian Mubaligh Terlaksana:</span>
                <div className="flex flex-col gap-2">
                  {Object.keys(selectedReportDetail.aktivitas)
                    .filter(key => selectedReportDetail.aktivitas[key].checked)
                    .map(key => {
                      const act = selectedReportDetail.aktivitas[key];
                      const isHours = key.toLowerCase().includes("berapa jam");
                      return (
                        <div key={key} className="bg-white p-2.5 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-700">{key}</span>
                          <div className="flex items-center gap-2">
                            {isHours ? (
                              <Badge className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-full px-2.5 py-0.5">
                                {act.durasi} Jam
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-full px-2.5 py-0.5">
                                Ya
                              </Badge>
                            )}
                            {act.catatan && (
                              <span className="text-[10px] text-slate-400 italic">({act.catatan})</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Evaluasi AI */}
              {selectedReportDetail.evaluasiAI && (
                <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white p-5 rounded-2xl space-y-3 border border-slate-800 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-5">
                    <Bot className="h-32 w-32" />
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-black text-indigo-400 flex items-center gap-1"><Sparkles className="h-4 w-4" /> Evaluasi AI Realtime</span>
                    <span className="text-sm font-black text-emerald-400">Skor: {selectedReportDetail.evaluasiAI.skorKinerja}%</span>
                  </div>

                  <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                    <div><strong>Konsistensi Kehadiran:</strong> {selectedReportDetail.evaluasiAI.konsistensiKehadiran}</div>
                    <div><strong>Kurikulum Semester:</strong> {selectedReportDetail.evaluasiAI.penyelesaianKurikulum}</div>
                    <div><strong>Tren Positif:</strong> {selectedReportDetail.evaluasiAI.trenPeningkatan}</div>
                    {selectedReportDetail.evaluasiAI.trenPenurunan && (
                      <div><strong>Tren Penurunan:</strong> {selectedReportDetail.evaluasiAI.trenPenurunan}</div>
                    )}
                    <div><strong>Saran Pembinaan:</strong> {selectedReportDetail.evaluasiAI.rekomendasiPembinaan}</div>
                  </div>
                </div>
              )}

              {/* Evaluasi Pengurus */}
              {selectedReportDetail.evaluasiPengurus && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-800">
                    <span>Evaluasi Pembina & Pengurus</span>
                    <span>Nilai: {selectedReportDetail.evaluasiPengurus.skor} / 100</span>
                  </div>
                  <p className="text-slate-650 leading-relaxed text-[11px]">{selectedReportDetail.evaluasiPengurus.catatan}</p>
                  <span className="text-[9px] text-slate-400 block pt-1">
                    Dinilai oleh: {selectedReportDetail.evaluasiPengurus.penilai} pada {selectedReportDetail.evaluasiPengurus.tanggal}
                  </span>
                </div>
              )}

              {/* Catatan Harian */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">Catatan Harian & Hambatan KBM:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl">
                  <div><strong>Kendala:</strong> <span className="text-slate-500">{selectedReportDetail.catatanHarian.kendala || "-"}</span></div>
                  <div><strong>Solusi:</strong> <span className="text-slate-500">{selectedReportDetail.catatanHarian.solusi || "-"}</span></div>
                  <div><strong>Ide Perbaikan:</strong> <span className="text-slate-500">{selectedReportDetail.catatanHarian.idePerbaikan || "-"}</span></div>
                  <div><strong>Esok Hari:</strong> <span className="text-slate-500">{selectedReportDetail.catatanHarian.rencanaEsok || "-"}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
