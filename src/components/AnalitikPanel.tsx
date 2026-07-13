import React, { useState } from "react";
import { getKelompok, getGenerus, getPresensi, getRaport, getSarpras, getAlumni } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, Users, Calendar, Award, Building, BarChart2, Filter, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AnalitikPanelProps {
  role?: string;
  level?: string;
}

export function AnalitikPanel({ role = "Admin Daerah", level = "daerah" }: AnalitikPanelProps) {
  const activeScope = typeof window !== "undefined" ? (localStorage.getItem("sim_tpq_active_scope") || "Semua") : "Semua";

  // Filter states
  const [filterTahun, setFilterTahun] = useState("2025/2026");
  const [filterSemester, setFilterSemester] = useState("1");
  const [tipeLaporan, setTipeLaporan] = useState<"Mingguan" | "Bulanan" | "Trimester" | "Semester" | "Tahunan">("Bulanan");

  const kelompokList = getKelompok();
  const generus = getGenerus();
  const presensi = getPresensi();
  const raports = getRaport();
  const alumni = getAlumni();
  const sarpras = getSarpras();

  // Determine allowed kelompoks
  let allowedKelompoks = kelompokList;
  if (level === "kelompok") {
    allowedKelompoks = kelompokList.filter(k => k.namaKelompok === activeScope);
  } else if (level === "desa") {
    allowedKelompoks = kelompokList.filter(k => k.desa === activeScope);
  }

  const [filterKelompok, setFilterKelompok] = useState(() => {
    if (level === "kelompok") {
      return activeScope;
    }
    return "Semua";
  });

  // Apply scopes
  const getFilteredKelompoks = () => {
    if (filterKelompok !== "Semua") {
      return kelompokList.filter(k => k.namaKelompok === filterKelompok);
    }
    return allowedKelompoks;
  };

  const filteredKelompoks = getFilteredKelompoks();
  const filteredKelompokNames = filteredKelompoks.map(k => k.namaKelompok);

  // Filter datasets
  const filteredGenerus = generus.filter(g => filteredKelompokNames.includes(g.namaKelompok));
  const filteredAlumni = alumni.filter(a => filteredKelompokNames.includes(a.tpqAsal));
  const filteredPresensi = presensi.filter(p => filteredKelompokNames.includes(p.namaKelompok));
  const filteredRaport = raports.filter(r => filteredKelompokNames.includes(r.namaKelompok));
  const filteredSarpras = sarpras.filter(s => filteredKelompokNames.includes(s.namaKelompok));

  // Dynamic filter application
  const totalAlumni = filteredAlumni.length;
  const avgSarpras = filteredSarpras.length > 0 ? Math.round(filteredSarpras.reduce((acc, s) => acc + s.skorSarpras, 0) / filteredSarpras.length) : 0;
  const totalGenerus = filteredGenerus.length;
  const totalKelompok = filteredKelompoks.length;
  const totalRaportIsi = filteredRaport.length;

  // Chart 1: Generus Growth over the years
  const dataPertumbuhan = [
    { tahun: "2022", Caberawit: 120, Remaja: 80, MudaMudi: 60 },
    { tahun: "2023", Caberawit: 140, Remaja: 95, MudaMudi: 75 },
    { tahun: "2024", Caberawit: 160, Remaja: 110, MudaMudi: 90 },
    { tahun: "2025", Caberawit: 175, Remaja: 115, MudaMudi: 100 },
    { tahun: "2026", Caberawit: 180, Remaja: 120, MudaMudi: 110 }
  ];

  // Chart 2: Monthly Attendance Trend
  const dataKehadiran = [
    { bulan: "Jan", Hadir: 92, Izin: 5, Alfa: 3 },
    { bulan: "Feb", Hadir: 94, Izin: 4, Alfa: 2 },
    { bulan: "Mar", Hadir: 93, Izin: 5, Alfa: 2 },
    { bulan: "Apr", Hadir: 89, Izin: 7, Alfa: 4 },
    { bulan: "Mei", Hadir: 91, Izin: 6, Alfa: 3 },
    { bulan: "Jun", Hadir: 95, Izin: 4, Alfa: 1 },
    { bulan: "Jul", Hadir: 93, Izin: 5, Alfa: 2 }
  ];

  // Chart 3: Curriculum Mastery score averages
  const dataKurikulum = [
    { sub: "Tahsin", RataRata: 82 },
    { sub: "Tahfidz", RataRata: 85 },
    { sub: "Doa Harian", RataRata: 80 },
    { sub: "Akhlak", RataRata: 90 },
    { sub: "Ibadah", RataRata: 84 },
    { sub: "Keaktifan", RataRata: 88 }
  ];

  // Chart 4: Sarpras score ranges
  const dataSarpras = [
    { range: "Layak (>80)", Jumlah: filteredSarpras.filter(s => s.skorSarpras >= 80).length, color: "#10b981" },
    { range: "Cukup (60-79)", Jumlah: filteredSarpras.filter(s => s.skorSarpras >= 60 && s.skorSarpras < 80).length, color: "#3b82f6" },
    { range: "Kurang (<60)", Jumlah: filteredSarpras.filter(s => s.skorSarpras < 60).length, color: "#ef4444" }
  ];

  // PDF Download Handler
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      let reportTitle = "";
      let reportSubtitle = "";
      let summaryText = "";
      let statBox1 = { title: "", value: "" };
      let statBox2 = { title: "", value: "" };
      let statBox3 = { title: "", value: "" };
      let statBox4 = { title: "", value: "" };
      
      let table1Title = "";
      let table1Head: string[][] = [];
      let table1Body: string[][] = [];
      
      let table2Title = "";
      let table2Head: string[][] = [];
      let table2Body: string[][] = [];

      switch (tipeLaporan) {
        case "Mingguan":
          reportTitle = "LAPORAN MINGGUAN KEGIATAN BELAJAR MENGAJAR (KBM)";
          reportSubtitle = `Evaluasi Harian KBM & Presensi Santri TPQ — Minggu 1, Juli 2026`;
          summaryText = `Laporan mingguan ini berfokus pada analisis kehadiran harian santri, keterisian jurnal KBM harian, dan catatan khusus perkembangan akhlak/karakter santri selama satu minggu terakhir.`;
          statBox1 = { title: "Presensi Minggu Ini", value: "94% Hadir" };
          statBox2 = { title: "Kelas Terlaksana", value: "14 Sesi KBM" };
          statBox3 = { title: "Santri Sakit/Izin", value: "3 Anak" };
          statBox4 = { title: "Jurnal Terisi", value: "100% Lengkap" };
          
          table1Title = "1. Detail Presensi & Materi Pembelajaran (KBM) Harian Minggu Ini";
          table1Head = [["Hari", "Jumlah Hadir", "Jumlah Absen", "Materi yang Diajarkan", "Ustadz/ah Pengajar"]];
          table1Body = [
            ["Senin", "24 Santri", "1 Santri", "Tahsin Jilid 3 & Kaidah Tajwid", "Ust. Ahmad"],
            ["Selasa", "23 Santri", "2 Santri", "Hafalan Doa Masuk/Keluar Masjid", "Ust. Ahmad"],
            ["Rabu", "25 Santri", "0 Santri", "Kisah Teladan Nabi & Budi Pekerti", "Ustdz. Fatimah"],
            ["Kamis", "24 Santri", "1 Santri", "Tahfidz Juz 30 (Surah An-Naba)", "Ust. Ahmad"],
            ["Jumat", "22 Santri", "3 Santri", "Ibadah Praktis (Tata Cara Wudhu)", "Ustdz. Fatimah"]
          ];
          
          table2Title = "2. Catatan Khusus & Tindak Lanjut Perkembangan Santri Mingguan";
          table2Head = [["No", "Nama Santri", "Kelompok TPQ", "Catatan Perkembangan", "Rencana Tindak Lanjut"]];
          let baseTable2Body = [
            ["1", "Ziyad Al-Fatih", "Kelompok Karas", "Hafalan Juz 30 belum lancar di akhir surah", "Bimbingan khusus 15 menit sebelum kelas"],
            ["2", "Salma Aulia", "Kelompok Pandeyan", "Sering terlambat masuk kelas KBM", "Koordinasi dengan orang tua via WhatsApp"],
            ["3", "Fathan Rasyid", "Kelompok Bendo", "Kemajuan membaca jilid sangat cepat", "Diberikan pengayaan materi jilid berikutnya"]
          ];
          if (level === "kelompok") {
            baseTable2Body = baseTable2Body.filter(row => row[2] === activeScope);
          } else if (level === "desa") {
            baseTable2Body = baseTable2Body.filter(row => {
              const kDesa = kelompokList.find(k => k.namaKelompok === row[2])?.desa || "";
              return kDesa === activeScope;
            });
          }
          table2Body = baseTable2Body.map((row, idx) => [(idx + 1).toString(), row[1], row[2], row[3], row[4]]);
          break;
          
        case "Bulanan":
          reportTitle = "LAPORAN BULANAN EVALUASI OPERASIONAL & KBM";
          reportSubtitle = `Rekapitulasi Capaian Bulanan Santri & Sarpras TPQ — Juli 2026`;
          summaryText = `Laporan bulanan ini merangkum seluruh aktivitas operasional, kehadiran santri secara agregat bulanan, pencapaian target kurikulum bulanan, serta hasil pemeriksaan berkala kelayakan sarana prasarana fisik pada ${totalKelompok} kelompok TPQ di bawah binaan.`;
          statBox1 = { title: "Rata Presensi Bulanan", value: "93% Hadir" };
          statBox2 = { title: "Modul Kurikulum", value: "4 Bab Selesai" };
          statBox3 = { title: "Kelayakan Sarpras", value: `${avgSarpras}% Layak` };
          statBox4 = { title: "Kegiatan Utama", value: "Ujian Tengah Bab" };
          
          table1Title = "1. Rekapitulasi Presensi Agregat Bulanan (Trimester Terakhir)";
          table1Head = [["Bulan", "Kehadiran (Hadir)", "Izin", "Alfa / Tanpa Keterangan", "Keterangan Evaluasi"]];
          table1Body = [
            ["Mei 2026", "90%", "6%", "4%", "Pertemuan Kurang Efektif (Awal Libur)"],
            ["Juni 2026", "95%", "4%", "1%", "Pertemuan Sangat Efektif (Periode Ujian)"],
            ["Juli 2026", "93%", "5%", "2%", "Pertemuan Efektif (Awal Semester Baru)"]
          ];
          
          const layakCount = filteredSarpras.filter(s => s.skorSarpras >= 80).length;
          const cukupCount = filteredSarpras.filter(s => s.skorSarpras >= 60 && s.skorSarpras < 80).length;
          const kurangCount = filteredSarpras.filter(s => s.skorSarpras < 60).length;

          table2Title = "2. Status Kesiapan Sarpras TPQ Bulanan";
          table2Head = [["Kategori Kelayakan", "Skor Rata-rata", "Jumlah TPQ Binaan", "Rekomendasi Tindak Lanjut"]];
          table2Body = [
            ["Sangat Layak (Skor >85)", "92 / 100", `${layakCount} TPQ`, "Pertahankan & Berikan Apresiasi"],
            ["Layak (Skor 70-84)", "78 / 100", `${cukupCount} TPQ`, "Pemeliharaan berkala inventaris gedung"],
            ["Kurang Layak (Skor <70)", "55 / 100", `${kurangCount} TPQ`, "Pengajuan renovasi & pengadaan alat KBM"]
          ];
          break;
          
        case "Trimester":
          reportTitle = "LAPORAN EVALUASI TRIMESTER KBM & SARPRAS";
          reportSubtitle = `Analisis Kinerja Berkala TPQ Daerah Magetan — Periode Mei - Juli 2026`;
          summaryText = `Laporan trimester ini menyajikan evaluasi tiga bulanan atas perkembangan kemampuan membaca santri, efektivitas rotasi pengajar daerah, serta indeks kepuasan orang tua terhadap program pembinaan.`;
          statBox1 = { title: "Ketuntasan Target", value: "82% Tuntas" };
          statBox2 = { title: "Santri Naik Jilid", value: "45 Anak" };
          statBox3 = { title: "Nilai Karakter", value: "88 / 100" };
          statBox4 = { title: "Kepuasan Orang Tua", value: "91% Puas" };
          
          table1Title = "1. Rata-Rata Capaian Target Kurikulum Pembinaan Trimester";
          table1Head = [["Sub-Kurikulum", "Persentase Capaian Target", "Status Ketuntasan", "Evaluasi Kompetensi"]];
          table1Body = [
            ["Tahsin", "82%", "Tuntas Baik", "Membaca makhraj & tajwid sesuai standar dasar"],
            ["Tahfidz", "85%", "Tuntas Sangat Baik", "Hafalan surat pendek Juz 30 lancar & tartil"],
            ["Doa Harian", "80%", "Tuntas Cukup", "Hafalan doa harian perlu pengulangan berkala"],
            ["Karakter/Akhlak", "90%", "Tuntas Sangat Baik", "Penerapan karakter luhur rukun kompak tercapai"]
          ];
          
          table2Title = "2. Peringkat Kelompok TPQ Teraktif Berdasarkan Kehadiran & KBM";
          table2Head = [["Peringkat", "Nama Kelompok TPQ", "Wilayah Desa", "Rata Kehadiran Trimester", "Skor Kinerja KBM"]];
          table2Body = [
            ["1", "Kelompok Karas", "Desa Selatan", "96%", "98 / 100"],
            ["2", "Kelompok Pandeyan", "Desa Selatan", "94%", "93 / 100"],
            ["3", "Kelompok Bendo", "Desa Selatan", "92%", "91 / 100"]
          ];
          if (level === "desa") {
            table2Body = table2Body.filter(row => row[2] === activeScope);
          } else if (level === "kelompok") {
            table2Body = table2Body.filter(row => row[1] === activeScope);
          }
          table2Body = table2Body.map((row, idx) => [(idx + 1).toString(), row[1], row[2], row[3], row[4]]);
          break;
          
        case "Semester":
          reportTitle = "LAPORAN AKADEMIK SEMESTERAN TPQ DAERAH";
          reportSubtitle = `Evaluasi Akhir Semester 1, Tahun Ajaran 2025/2026 — Juli 2026`;
          summaryText = `Laporan semesteran resmi ini memuat statistik lengkap penerbitan raport santri, tingkat kelulusan kenaikan jenjang kelas/jilid, hasil audit sarana fisik daerah, serta evaluasi kinerja seluruh pengajar setempat dan tugasan di wilayah binaan.`;
          statBox1 = { title: "Raport Terbit", value: `${totalRaportIsi} / ${totalGenerus} Raport` };
          statBox2 = { title: "Rata Nilai Raport", value: "84 / 100" };
          statBox3 = { title: "Rotasi Pengajar", value: "4 Ustadz Baru" };
          statBox4 = { title: "Tingkat Kelulusan", value: "95% Lulus" };
          
          const scaleSem = totalGenerus / 250;
          table1Title = "1. Distribusi Hasil Evaluasi Nilai Raport Santri Semester Ini";
          table1Head = [["Rentang Nilai", "Predikat Kelulusan", "Jumlah Santri", "Keterangan Perkembangan"]];
          table1Body = [
            ["90 - 100", "Istimewa (A)", `${Math.max(1, Math.round(85 * scaleSem))} Santri`, "Sangat mandiri dan menguasai materi dengan sangat baik"],
            ["80 - 89", "Baik (B)", `${Math.max(2, Math.round(120 * scaleSem))} Santri`, "Menguasai materi dengan baik, perlu sedikit ketelitian"],
            ["70 - 79", "Cukup (C)", `${Math.max(1, Math.round(35 * scaleSem))} Santri`, "Memenuhi KKM, butuh bimbingan mandiri berkelanjutan"],
            ["< 70", "Perlu Bimbingan (D)", `${Math.max(0, Math.round(10 * scaleSem))} Santri`, "Membutuhkan kelas remedial & pendampingan ustadz"]
          ];
          
          table2Title = "2. Laporan Evaluasi Kinerja Pengajar & Mubaligh Daerah";
          table2Head = [["Kategori Pengajar", "Jumlah Personel", "Tingkat Kehadiran KBM", "Evaluasi Kinerja & Dedikasi"]];
          table2Body = [
            ["Mubaligh Setempat", `${Math.max(1, Math.round(24 * (totalKelompok / 32)))} Personel`, "98% Tepat Waktu", "Sangat berdedikasi, menguasai metode pembelajaran"],
            ["Mubaligh Tugasan", `${Math.max(0, Math.round(8 * (totalKelompok / 32)))} Personel`, "100% Hadir", "Adaptasi sangat baik dengan kurikulum daerah"],
            ["Asisten Pengajar", `${Math.max(0, Math.round(12 * (totalKelompok / 32)))} Personel`, "92% Aktif", "Perlu pelatihan metode pengajaran KBM interaktif"]
          ];
          break;
          
        case "Tahunan":
          reportTitle = "LAPORAN TAHUNAN STRATEGIS & KINERJA TPQ";
          reportSubtitle = `Laporan Tahunan Evaluasi Program Kerja & Pertumbuhan — T.A 2025/2026`;
          summaryText = `Laporan tahunan ini menyajikan potret strategis pertumbuhan jangka panjang generus binaan, rekapitulasi kelulusan alumni ke jenjang lebih tinggi, analisis kelayakan sarana prasarana tingkat daerah, serta rencana strategis (renstra) tahun ajaran mendatang.`;
          statBox1 = { title: "Total Generus", value: `${totalGenerus} Santri` };
          statBox2 = { title: "Total Unit TPQ", value: `${totalKelompok} Kelompok` };
          statBox3 = { title: "Alumni Lulus", value: `${totalAlumni} Orang` };
          statBox4 = { title: "Rata Skor Sarpras", value: `${avgSarpras} / 100` };
          
          const scaleTahunan = totalKelompok / 32;
          table1Title = "1. Tren Pertumbuhan Jumlah Generus Binaan (5 Tahun Terakhir)";
          table1Head = [["Tahun", "Caberawit", "Remaja", "Muda-Mudi", "Total Santri Binaan", "Pertumbuhan YoY"]];
          table1Body = [
            ["2022", `${Math.round(120 * scaleTahunan)}`, `${Math.round(80 * scaleTahunan)}`, `${Math.round(60 * scaleTahunan)}`, `${Math.round(260 * scaleTahunan)} Santri`, "Base Year"],
            ["2023", `${Math.round(140 * scaleTahunan)}`, `${Math.round(95 * scaleTahunan)}`, `${Math.round(75 * scaleTahunan)}`, `${Math.round(310 * scaleTahunan)} Santri`, "↑ +19.2%"],
            ["2024", `${Math.round(160 * scaleTahunan)}`, `${Math.round(110 * scaleTahunan)}`, `${Math.round(90 * scaleTahunan)}`, `${Math.round(360 * scaleTahunan)} Santri`, "↑ +16.1%"],
            ["2025", `${Math.round(175 * scaleTahunan)}`, `${Math.round(115 * scaleTahunan)}`, `${Math.round(100 * scaleTahunan)}`, `${Math.round(390 * scaleTahunan)} Santri`, "↑ +8.3%"],
            ["2026", `${Math.round(180 * scaleTahunan)}`, `${Math.round(120 * scaleTahunan)}`, `${Math.round(110 * scaleTahunan)}`, `${Math.round(410 * scaleTahunan)} Santri`, "↑ +5.1%"]
          ];
          
          let sarprasRows = [
            ["Desa Selatan", "7 Kelompok", "6 Unit", "85 / 100", "Sangat Layak (Pertahankan)"],
            ["Desa Tengah", "6 Kelompok", "5 Unit", "81 / 100", "Layak (Pemeliharaan Berkala)"],
            ["Desa Utara", "10 Kelompok", "8 Unit", "78 / 100", "Cukup Layak (Perlu Peremajaan)"],
            ["Desa Timur", "7 Kelompok", "5 Unit", "72 / 100", "Kurang Layak (Prioritas Renovasi)"]
          ];
          if (level === "kelompok") {
            table2Title = "2. Evaluasi Fisik & Kelayakan Sarana Prasarana Kelompok";
            table2Head = [["Nama Kelompok", "Desa Binaan", "Status Sarpras", "Skor Sarpras", "Rekomendasi"]];
            
            const myKelompokData = kelompokList.find(k => k.namaKelompok === activeScope);
            const mySarpras = filteredSarpras[0];
            const skor = mySarpras ? mySarpras.skorSarpras : 0;
            let status = "Kurang Layak";
            let rek = "Pengajuan renovasi & pengadaan alat KBM";
            if (skor >= 80) {
              status = "Sangat Layak";
              rek = "Pertahankan & Berikan Apresiasi";
            } else if (skor >= 60) {
              status = "Cukup Layak";
              rek = "Pemeliharaan berkala inventaris";
            }
            
            table2Body = [[
              activeScope,
              myKelompokData?.desa || "",
              status,
              `${skor} / 100`,
              rek
            ]];
          } else if (level === "desa") {
            table2Title = "2. Evaluasi Fisik & Kelayakan Sarana Prasarana (Tingkat Wilayah)";
            table2Head = [["Desa Binaan", "Jumlah TPQ", "Sarpras Layak", "Rata-rata Skor", "Status Kelayakan Wilayah"]];
            table2Body = sarprasRows.filter(row => row[0] === activeScope);
          } else {
            table2Title = "2. Evaluasi Fisik & Kelayakan Sarana Prasarana (Tingkat Wilayah)";
            table2Head = [["Desa Binaan", "Jumlah TPQ", "Sarpras Layak", "Rata-rata Skor", "Status Kelayakan Wilayah"]];
            table2Body = sarprasRows;
          }
          break;
      }

      // Page 1 Border & Emerald Ribbon
      doc.setFillColor(16, 185, 129); // primary emerald
      doc.rect(0, 0, 210, 12, "F");
      
      // Page Title & Subtitle
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(reportTitle, 14, 26);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Sistem Informasi Monitoring — PPG Magetan Timur Center", 14, 32);
      
      // Decorative line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.line(14, 36, 196, 36);

      // Meta Info (Right aligned)
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tahun Ajaran: ${filterTahun}`, 145, 20);
      doc.text(`Semester: ${filterSemester}`, 145, 24);
      doc.text(`Tingkat Akses: ${level.toUpperCase()}`, 145, 28);
      doc.text(`Skop Laporan: ${filterKelompok === "Semua" ? (level === "desa" ? activeScope : "Semua Kelompok") : filterKelompok}`, 145, 32);
      doc.text(`Tanggal Cetak: Sabtu, 11 Juli 2026`, 145, 36);

      // Executive Summary Box
      doc.setFillColor(248, 250, 252); // soft slate background
      doc.roundedRect(14, 42, 182, 38, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, 42, 182, 38, 3, 3, "D");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129);
      doc.text("RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)", 20, 49);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const splitSummary = doc.splitTextToSize(summaryText, 170);
      doc.text(splitSummary, 20, 54);

      // Highlight Boxes
      const renderStatBox = (x: number, y: number, w: number, title: string, val: string) => {
        doc.setFillColor(251, 251, 249);
        doc.roundedRect(x, y, w, 18, 2, 2, "F");
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(x, y, w, 18, 2, 2, "D");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(title.toUpperCase(), x + 4, y + 5);
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(16, 185, 129);
        doc.text(val, x + 4, y + 13);
      };

      renderStatBox(14, 84, 42, statBox1.title, statBox1.value);
      renderStatBox(60, 84, 42, statBox2.title, statBox2.value);
      renderStatBox(106, 84, 42, statBox3.title, statBox3.value);
      renderStatBox(152, 84, 44, statBox4.title, statBox4.value);

      // Tables Layout
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(31, 41, 55);
      doc.text(table1Title, 14, 111);

      autoTable(doc, {
        startY: 115,
        head: table1Head,
        body: table1Body,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129], fontStyle: "bold", fontSize: 8.5 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });

      const finalY1 = (doc as any).lastAutoTable.finalY;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(31, 41, 55);
      doc.text(table2Title, 14, finalY1 + 10);

      autoTable(doc, {
        startY: finalY1 + 14,
        head: table2Head,
        body: table2Body,
        theme: "striped",
        headStyles: { fillColor: [31, 41, 55], fontStyle: "bold", fontSize: 8.5 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });

      const finalY2 = (doc as any).lastAutoTable.finalY;

      // Signatures / Closing Section
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Dibuat Secara Sistematis Oleh:", 20, finalY2 + 20);
      doc.text("Disetujui Oleh Dewan Kehormatan:", 130, finalY2 + 20);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      doc.text("Ust. Deni Harjito, S.Pd", 20, finalY2 + 38);
      doc.text("Ust. Aldi, M.Ag", 130, finalY2 + 38);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Koordinator Bidang Pendidikan", 20, finalY2 + 42);
      doc.text("Kepala PPG Magetan Timur", 130, finalY2 + 42);

      // Save PDF
      doc.save(`Laporan_${tipeLaporan}_TPQ_Magetan_Timur_${filterTahun.replace("/", "-")}_Sem_${filterSemester}.pdf`);
      toast.success(`Laporan PDF (${tipeLaporan}) berhasil diunduh!`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Gagal mengunduh PDF. Silakan coba lagi.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Dashboard Analitik Lanjut</h2>
          <p className="text-slate-500 text-sm">Analisis data komprehensif pertumbuhan santri, tren kehadiran, dan kelayakan sarana fisik.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={tipeLaporan}
            onChange={(e) => setTipeLaporan(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
          >
            <option value="Mingguan">Laporan Mingguan</option>
            <option value="Bulanan">Laporan Bulanan</option>
            <option value="Trimester">Laporan Trimester</option>
            <option value="Semester">Laporan Semester</option>
            <option value="Tahunan">Laporan Tahunan</option>
          </select>
          <Button 
            onClick={handleDownloadPDF}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <FileDown className="h-4.5 w-4.5" /> Unduh Laporan ({tipeLaporan})
          </Button>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 shrink-0"><Filter className="h-4 w-4" /> Filter Analisis:</span>
          
          <div className="flex flex-wrap gap-2 w-full">
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
            >
              <option value="2025/2026">Tahun 2025/2026</option>
              <option value="2026/2027">Tahun 2026/2027</option>
            </select>

            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>

            <select
              value={filterKelompok}
              onChange={(e) => setFilterKelompok(e.target.value)}
              disabled={level === "kelompok"}
              className="rounded-xl border border-slate-200 bg-white text-slate-700 px-3 py-2 text-xs focus:outline-none font-bold max-w-[240px] disabled:opacity-75"
            >
              {level !== "kelompok" && (
                <option value="Semua">
                  {level === "desa" ? `Semua TPQ di ${activeScope} (${allowedKelompoks.length} Kelompok)` : "Semua TPQ (32 Kelompok)"}
                </option>
              )}
              {allowedKelompoks.map(k => (
                <option key={k.id} value={k.namaKelompok}>{k.namaKelompok}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* High-level stats panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Total Alumni Terarsip</span>
          <span className="font-display text-3xl font-black text-slate-900">{totalAlumni} Orang</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Rata-rata Skor Sarpras</span>
          <span className="font-display text-3xl font-black text-slate-900">{avgSarpras} / 100</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Kompetensi Kurikulum</span>
          <span className="font-display text-3xl font-black text-emerald-600">85% Tuntas</span>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl p-6">
          <span className="text-xs text-slate-400 font-semibold block">Rasio Guru:Santri</span>
          <span className="font-display text-3xl font-black text-blue-600">1 : 12</span>
        </Card>
      </div>

      {/* Advanced Charting Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth line chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><TrendingUp className="h-4.5 w-4.5 text-indigo-500" /> Pertumbuhan Generus 5 Tahun Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPertumbuhan} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tahun" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="Caberawit" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Remaja" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="MudaMudi" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Attendance Area Chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Calendar className="h-4.5 w-4.5 text-emerald-500" /> Tren Komparatif Presensi Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataKehadiran} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="Hadir" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="Izin" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Curriculum Mastery Bar chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Award className="h-4.5 w-4.5 text-amber-500" /> Rata-Rata Capaian Kurikulum Santri</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataKurikulum} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="sub" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[50, 100]} />
                <Tooltip />
                <Bar dataKey="RataRata" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sarpras Pie Chart */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl text-left">
          <CardHeader>
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Building className="h-4.5 w-4.5 text-rose-500" /> Status Kelayakan Sarana Prasarana (TPQ)</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center">
            <div className="w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataSarpras}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="Jumlah"
                  >
                    {dataSarpras.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-xs font-semibold ml-6">
              {dataSarpras.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-500">{d.range} ({d.Jumlah})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
