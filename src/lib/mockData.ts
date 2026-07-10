// Extended Mock Database for SIM TPQ (Advanced Features)
import { loadData, saveData } from "./mockDataHelper";

export interface Kelompok {
  id: string;
  namaKelompok: string;
  desa: string;
  kecamatan: string;
  alamat: string;
  koordinatMaps: string;
  foto: string;
  statusAktif: boolean;
  jumlahGenerus: number;
  jumlahPengajar: number;
}

export interface Generus {
  id: string;
  foto: string;
  namaLengkap: string;
  nisInternal: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  usia: number;
  tanggalLahir: string;
  alamat: string;
  namaOrangTua: string;
  whatsappOrangTua: string;
  namaKelompok: string;
  statusAktif: boolean;
  catatan: string;
  qrCode: string;
  kategori?: "Caberawit" | "Muda-Mudi" | "Jama'ah Dewasa";
  rfidUid?: string;
}

export interface Alumni {
  id: string;
  namaLengkap: string;
  nisInternal: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  tahunLulus: number;
  tpqAsal: string;
  nilaiTerakhir: number;
  kontak: string;
}

export interface DocumentRecord {
  id: string;
  ownerId: string; // Generus or Mubaligh ID
  ownerName: string;
  kategori: "KK" | "Akta Kelahiran" | "KTP" | "Surat Tugas" | "Ijazah" | "Sertifikat";
  namaFile: string;
  ukuran: string;
  tanggalUpload: string;
  versi: number;
}

export interface GalleryItem {
  id: string;
  kelompok: string;
  kategori: "Belajar" | "Ujian" | "Lomba" | "Pengajian" | "Kerja Bakti" | "Wisuda";
  url: string;
  caption: string;
  tanggal: string;
  tags: string[];
  comments: { user: string; text: string; date: string }[];
}

export interface Announcement {
  id: string;
  judul: string;
  konten: string;
  sasaranTarget: string; // "Semua", "Desa Kiringan", "TPQ Kelompok 1", "Orang Tua", "Pengajar"
  tanggal: string;
  metode: string[]; // "Dalam Aplikasi", "WhatsApp", "Push Notification"
  statusKirim: "Terkirim" | "Diproses";
  jumlahDibaca: number;
}

export interface AuditLogRecord {
  id: string;
  username: string;
  role: string;
  aktivitas: string;
  ipAddress: string;
  perangkat: string;
  tanggal: string;
  jam: string;
}

export interface BackupRecord {
  id: string;
  namaFile: string;
  ukuran: string;
  tanggal: string;
  status: "Berhasil" | "Gagal";
}

export interface MubalighSetempat {
  id: string;
  foto: string;
  nama: string;
  kelompok: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  usia: number;
  namaOrangTua: string;
  whatsapp: string;
  status: "Aktif" | "Izin";
  qrCode?: string;
}

export interface MubalighTugasan {
  id: string;
  foto: string;
  nama: string;
  kelompok: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  usia: number;
  namaOrangTua: string;
  asalDaerah: string;
  whatsapp: string;
  masaTugasan: string;
  status: "Aktif" | "Izin" | "Selesai";
  qrCode?: string;
}

export interface Pengurus {
  id: string;
  nama: string;
  asalKelompok: string;
  dapukan: string;
  whatsapp: string;
  foto: string;
  tingkat: "Daerah" | "Desa" | "Kelompok";
  kategori: "Harian" | "PPG";
}

export interface Presensi {
  id: string;
  generusId: string;
  namaLengkap: string;
  namaKelompok: string;
  tanggal: string;
  statusKehadiran: "Hadir" | "Izin" | "Sakit" | "Alfa";
  jenisPengajian?: string;
}

export interface Raport {
  id: string;
  generusId: string;
  namaLengkap: string;
  namaKelompok: string;
  semester: 1 | 2;
  tahunAjaran: string;
  tahsin: number;
  tahfidz: number;
  doaHarian: number;
  akhlak: number;
  ibadah: number;
  keaktifan: number;
  kedisiplinan: number;
  catatanPengajar: string;
  ttdDigital: string;
}

export interface Kurikulum {
  id: string;
  materi: string;
  kategori: "Al-Qur'an" | "Hadits" | "Karakter" | "Keorganisasian";
  semester: 1 | 2;
  target: string;
  subMateri: string;
  checklistPenyelesaian: boolean;
  progress: number;
  modulUrl?: string;
  videoUrl?: string;
}

export interface Sarpras {
  id: string;
  kelompokId: string;
  namaKelompok: string;
  gedung: boolean;
  meja: boolean;
  kursi: boolean;
  karpet: boolean;
  papanTulis: boolean;
  alquran: boolean;
  iqro: boolean;
  soundSystem: boolean;
  kipas: boolean;
  lcd: boolean;
  toilet: boolean;
  tempatWudhu: boolean;
  lampu: boolean;
  internet: boolean;
  kebersihan: boolean;
  fotoKondisi: string;
  catatan: string;
  statusLayak: boolean;
  skorSarpras: number;
}

export interface WaTemplate {
  id: string;
  nama: string;
  pesan: string;
}

// Custom mapping of Daerah Magetan Timur (4 Desas and 30 Kelompoks)
const DESAS_AND_KELOMPOKS = [
  {
    desa: "Desa Selatan",
    kelompoks: ["Karas", "Patihan", "Malang", "Pandeyan", "Soco", "Setren", "Bendo"]
  },
  {
    desa: "Desa Tengah",
    kelompoks: ["Candi", "Gombel", "Barat", "Ngumpul", "Blaran 2", "Sumberejo"]
  },
  {
    desa: "Desa Utara",
    kelompoks: ["Blaran 1", "Tawang", "Jeruk", "Singgahan 1", "Singgahan 2", "Karasan", "Klampisan", "Dinden", "Wruk", "Guyung"]
  },
  {
    desa: "Desa Timur",
    kelompoks: ["Panggangung", "Klagen Serut", "Teseh", "Dingin", "Klayapan 1", "Klayapan 2", "Pencol"]
  }
];

const buildInitialKelompok = (): Kelompok[] => {
  const list: Kelompok[] = [];
  let kIdx = 1;
  DESAS_AND_KELOMPOKS.forEach((item) => {
    item.kelompoks.forEach((kName) => {
      list.push({
        id: `klp-${kIdx}`,
        namaKelompok: `Kelompok ${kName}`,
        desa: item.desa,
        kecamatan: "Magetan Timur",
        alamat: `Jl. Raya ${kName}, ${item.desa}, Magetan`,
        koordinatMaps: `-7.6543${kIdx}, 111.4567${kIdx}`,
        foto: "",
        statusAktif: true,
        jumlahGenerus: 15 + (kIdx * 3) % 20,
        jumlahPengajar: 2 + (kIdx % 2)
      });
      kIdx++;
    });
  });
  return list;
};

const INITIAL_KELOMPOK: Kelompok[] = buildInitialKelompok();

export interface AuthResult {
  success: boolean;
  role: string;
  level: "daerah" | "desa" | "kelompok" | "global";
  scope: string;
  adminNum: number;
}

export const ROLE_HIERARCHY: Record<string, string[]> = {
  "Super Admin": ["Super Admin", "Admin Daerah", "Admin Desa", "Admin Kelompok", "Pengajar", "Viewer"],
  "Admin Daerah": ["Admin Daerah", "Admin Desa", "Admin Kelompok", "Pengajar", "Viewer"],
  "Admin Desa": ["Admin Desa", "Admin Kelompok", "Pengajar", "Viewer"],
  "Admin Kelompok": ["Admin Kelompok", "Pengajar", "Viewer"],
  "Pengajar": ["Pengajar", "Viewer"],
  "Viewer": ["Viewer"]
};

export interface UserDetails {
  username: string;
  role: string;
  level: "daerah" | "desa" | "kelompok" | "global";
  scope: string;
  adminNum: number;
}

export const getRoleFromUsername = (u: string): string => {
  const normalized = u.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const superAdmins = [
    "superadminharjito", "superadminaldi", "superadminwanda", "superadmindeni", "superadminoga",
    "superadmin", "superadmin1", "superadmin2", "superadmin3", "superadmin4"
  ];
  if (superAdmins.includes(normalized)) return "Super Admin";
  if (normalized === "daerah1" || normalized === "daerah2") return "Admin Daerah";
  
  const desas = ["selatan", "tengah", "utara", "timur"];
  for (const d of desas) {
    if (normalized === `desa${d}1` || normalized === `desa${d}2`) {
      return "Admin Desa";
    }
  }
  
  if (normalized.startsWith("admin")) return "Admin Kelompok";
  if (normalized.startsWith("pengajar")) return "Pengajar";
  if (normalized.startsWith("viewer")) return "Viewer";
  return "Viewer";
};

export const getUserDetails = (user: string): UserDetails | null => {
  const u = user.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (!u) return null;

  // 1. Super Admin
  const superAdmins = [
    "superadminharjito", "superadminaldi", "superadminwanda", "superadmindeni", "superadminoga",
    "superadmin", "superadmin1", "superadmin2", "superadmin3", "superadmin4"
  ];
  if (superAdmins.includes(u)) {
    let adminNum = 1;
    if (u === "superadminaldi" || u === "superadmin2") adminNum = 2;
    else if (u === "superadminwanda" || u === "superadmin3") adminNum = 3;
    else if (u === "superadmindeni" || u === "superadmin4") adminNum = 4;
    else if (u === "superadminoga") adminNum = 5;
    return { username: u, role: "Super Admin", level: "global", scope: "Semua", adminNum };
  }

  // 2. Admin Daerah Magetan Timur (daerah1, daerah2)
  if (u === "daerah1" || u === "daerah2") {
    return { username: u, role: "Admin Daerah", level: "daerah", scope: "Daerah Magetan Timur", adminNum: u === "daerah2" ? 2 : 1 };
  }

  // 3. Admin Desa (desaselatan1, desaselatan2, etc.)
  const desas = [
    { key: "selatan", name: "Desa Selatan" },
    { key: "tengah", name: "Desa Tengah" },
    { key: "utara", name: "Desa Utara" },
    { key: "timur", name: "Desa Timur" }
  ];

  for (const d of desas) {
    if (u === `desa${d.key}1` || u === `desa${d.key}2`) {
      return { username: u, role: "Admin Desa", level: "desa", scope: d.name, adminNum: u.endsWith("2") ? 2 : 1 };
    }
  }

  // 4. Admin Kelompok (adminkaras1, adminkaras2, etc.)
  const kelompoks = getKelompok();
  for (const k of kelompoks) {
    const kNameOnly = k.namaKelompok.replace("Kelompok ", "");
    const normalizedKName = kNameOnly.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const matchStandard = (u === `admin${normalizedKName}1` || u === `admin${normalizedKName}2`);
    
    // Fuzzy mapping for typos
    let matchTypo = false;
    if (normalizedKName === "karasan" && (u === "adminkanasan1" || u === "adminkanasan2")) {
      matchTypo = true;
    }
    if (normalizedKName === "panggangung" && (u === "adminpanggung1" || u === "adminpanggung2")) {
      matchTypo = true;
    }

    if (matchStandard || matchTypo) {
      return { username: u, role: "Admin Kelompok", level: "kelompok", scope: k.namaKelompok, adminNum: u.endsWith("2") ? 2 : 1 };
    }
  }

  // 5. Pengajar (pengajar1, pengajar2)
  if (u === "pengajar1" || u === "pengajar2") {
    return { username: u, role: "Pengajar", level: "kelompok", scope: "Kelompok Karas", adminNum: u === "pengajar2" ? 2 : 1 };
  }

  // 6. Viewer (viewer1, viewer2)
  if (u === "viewer1" || u === "viewer2") {
    return { username: u, role: "Viewer", level: "global", scope: "Semua", adminNum: u === "viewer2" ? 2 : 1 };
  }

  return null;
};

export const verifyCredentials = (user: string, pass: string): AuthResult | null => {
  const u = user.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const p = pass.trim().toLowerCase();

  if (p !== "admin123") return null;

  // 1. Super Admin
  const superAdmins = [
    "superadminharjito", "superadminaldi", "superadminwanda", "superadmindeni", "superadminoga",
    "superadmin", "superadmin1", "superadmin2", "superadmin3", "superadmin4"
  ];
  if (superAdmins.includes(u)) {
    let adminNum = 1;
    if (u === "superadminaldi" || u === "superadmin2") adminNum = 2;
    else if (u === "superadminwanda" || u === "superadmin3") adminNum = 3;
    else if (u === "superadmindeni" || u === "superadmin4") adminNum = 4;
    else if (u === "superadminoga") adminNum = 5;
    return { success: true, role: "Super Admin", level: "global", scope: "Semua", adminNum };
  }

  // 2. Admin Daerah Magetan Timur (daerah1, daerah2)
  if (u === "daerah1" || u === "daerah2") {
    return { success: true, role: "Admin Daerah", level: "daerah", scope: "Daerah Magetan Timur", adminNum: u === "daerah2" ? 2 : 1 };
  }

  // 3. Admin Desa (desaselatan1, desaselatan2, etc.)
  const desas = [
    { key: "selatan", name: "Desa Selatan" },
    { key: "tengah", name: "Desa Tengah" },
    { key: "utara", name: "Desa Utara" },
    { key: "timur", name: "Desa Timur" }
  ];

  for (const d of desas) {
    if (u === `desa${d.key}1` || u === `desa${d.key}2`) {
      return { success: true, role: "Admin Desa", level: "desa", scope: d.name, adminNum: u.endsWith("2") ? 2 : 1 };
    }
  }

  // 4. Admin Kelompok (adminkaras1, adminkaras2, etc.)
  const kelompoks = getKelompok();
  for (const k of kelompoks) {
    const kNameOnly = k.namaKelompok.replace("Kelompok ", "");
    const normalizedKName = kNameOnly.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const matchStandard = (u === `admin${normalizedKName}1` || u === `admin${normalizedKName}2`);
    
    // Fuzzy mapping for typos
    let matchTypo = false;
    if (normalizedKName === "karasan" && (u === "adminkanasan1" || u === "adminkanasan2")) {
      matchTypo = true;
    }
    if (normalizedKName === "panggangung" && (u === "adminpanggung1" || u === "adminpanggung2")) {
      matchTypo = true;
    }

    if (matchStandard || matchTypo) {
      return { success: true, role: "Admin Kelompok", level: "kelompok", scope: k.namaKelompok, adminNum: u.endsWith("2") ? 2 : 1 };
    }
  }

  // 5. Pengajar (pengajar1, pengajar2)
  if (u === "pengajar1" || u === "pengajar2") {
    return { success: true, role: "Pengajar", level: "kelompok", scope: "Kelompok Karas", adminNum: u === "pengajar2" ? 2 : 1 };
  }

  // 6. Viewer (viewer1, viewer2)
  if (u === "viewer1" || u === "viewer2") {
    return { success: true, role: "Viewer", level: "global", scope: "Semua", adminNum: u === "viewer2" ? 2 : 1 };
  }

  return null;
};


const INITIAL_GENERUS: Generus[] = [
  { id: "g-1", foto: "", namaLengkap: "Ahmad Bagus Pratama", nisInternal: "NIS-2026001", jenisKelamin: "Laki-laki", usia: 12, tanggalLahir: "2014-05-12", alamat: "Jl. Diponegoro No. 3, Takeran", namaOrangTua: "H. Joko Susilo", whatsappOrangTua: "081234567890", namaKelompok: INITIAL_KELOMPOK[0].namaKelompok, statusAktif: true, catatan: "Sangat antusias belajar Tahfidz", qrCode: "QR-Ahmad-Bagus-NIS-2026001", kategori: "Caberawit", rfidUid: "1020304001" },
  { id: "g-2", foto: "", namaLengkap: "Siti Rahmawati", nisInternal: "NIS-2026002", jenisKelamin: "Perempuan", usia: 9, tanggalLahir: "2017-08-22", alamat: "Ds. Gamping, Kawedanan", namaOrangTua: "Budi Utomo", whatsappOrangTua: "081398765432", namaKelompok: INITIAL_KELOMPOK[1].namaKelompok, statusAktif: true, catatan: "Perlu bimbingan ekstra pada makhraj", qrCode: "QR-Siti-Rama-NIS-2026002", kategori: "Caberawit", rfidUid: "1020304002" },
  { id: "g-3", foto: "", namaLengkap: "Muhammad Zaki", nisInternal: "NIS-2026003", jenisKelamin: "Laki-laki", usia: 15, tanggalLahir: "2011-02-14", alamat: "Perum Maospati Blok A", namaOrangTua: "Harianto", whatsappOrangTua: "085712345678", namaKelompok: INITIAL_KELOMPOK[2].namaKelompok, statusAktif: true, catatan: "Hafal juz 30 & 29", qrCode: "QR-Muhammad-Zaki-NIS-2026003", kategori: "Muda-Mudi", rfidUid: "1020304003" },
  { id: "g-4", foto: "", namaLengkap: "Aisyah Humaira", nisInternal: "NIS-2026004", jenisKelamin: "Perempuan", usia: 7, tanggalLahir: "2019-11-30", alamat: "Dsn. Kentangan, Sukomoro", namaOrangTua: "Dwi Cahyono", whatsappOrangTua: "082155443322", namaKelompok: INITIAL_KELOMPOK[3].namaKelompok, statusAktif: true, catatan: "Caberawit berprestasi mewarnai", qrCode: "QR-Aisyah-Humaira-NIS-2026004", kategori: "Caberawit", rfidUid: "1020304004" },
  { id: "g-5", foto: "", namaLengkap: "Rizky Ramadhan", nisInternal: "NIS-2026005", jenisKelamin: "Laki-laki", usia: 16, tanggalLahir: "2010-09-10", alamat: "Jl. Samudra No. 15, Bendo", namaOrangTua: "Agus Suprianto", whatsappOrangTua: "089988776655", namaKelompok: INITIAL_KELOMPOK[4].namaKelompok, statusAktif: true, catatan: "Muda-mudi teraktif kegiatan sosial", qrCode: "QR-Rizky-Rama-NIS-2026005", kategori: "Muda-Mudi", rfidUid: "1020304005" },
  { id: "g-6", foto: "", namaLengkap: "H. Joko Susilo", nisInternal: "NIS-2026006", jenisKelamin: "Laki-laki", usia: 45, tanggalLahir: "1981-03-20", alamat: "Jl. Diponegoro No. 3, Takeran", namaOrangTua: "Wali Internal", whatsappOrangTua: "081234567890", namaKelompok: INITIAL_KELOMPOK[0].namaKelompok, statusAktif: true, catatan: "Pemberi fasilitas tempat wudhu baru", qrCode: "QR-Joko-Susilo-NIS-2026006", kategori: "Jama'ah Dewasa", rfidUid: "1020304006" },
  { id: "g-7", foto: "", namaLengkap: "Budi Utomo", nisInternal: "NIS-2026007", jenisKelamin: "Laki-laki", usia: 39, tanggalLahir: "1987-05-15", alamat: "Ds. Gamping, Kawedanan", namaOrangTua: "Wali Internal", whatsappOrangTua: "081398765432", namaKelompok: INITIAL_KELOMPOK[1].namaKelompok, statusAktif: true, catatan: "Aktif pengajian kelompok dewasa", qrCode: "QR-Budi-Utomo-NIS-2026007", kategori: "Jama'ah Dewasa", rfidUid: "1020304007" }
];

const INITIAL_ALUMNI: Alumni[] = [
  { id: "al-1", namaLengkap: "Faisal Rahman", nisInternal: "NIS-2024098", jenisKelamin: "Laki-laki", tahunLulus: 2025, tpqAsal: INITIAL_KELOMPOK[0].namaKelompok, nilaiTerakhir: 88, kontak: "081299998888" },
  { id: "al-2", namaLengkap: "Dewi Lestari", nisInternal: "NIS-2024102", jenisKelamin: "Perempuan", tahunLulus: 2025, tpqAsal: INITIAL_KELOMPOK[1].namaKelompok, nilaiTerakhir: 90, kontak: "081299998887" }
];

const INITIAL_DOCUMENTS: DocumentRecord[] = [
  { id: "doc-1", ownerId: "g-1", ownerName: "Ahmad Bagus Pratama", kategori: "KK", namaFile: "kk_ahmad_bagus.pdf", ukuran: "1.4 MB", tanggalUpload: "2026-07-01", versi: 1 },
  { id: "doc-2", ownerId: "g-1", ownerName: "Ahmad Bagus Pratama", kategori: "Akta Kelahiran", namaFile: "akta_ahmad_bagus.pdf", ukuran: "980 KB", tanggalUpload: "2026-07-01", versi: 1 },
  { id: "doc-3", ownerId: "g-2", ownerName: "Siti Rahmawati", kategori: "KTP", namaFile: "ktp_orangtua_siti.png", ukuran: "450 KB", tanggalUpload: "2026-07-02", versi: 1 }
];

const INITIAL_GALLERY: GalleryItem[] = [
  { id: "gal-1", kelompok: INITIAL_KELOMPOK[0].namaKelompok, kategori: "Belajar", url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=500", caption: "Kegiatan belajar makhraj santri caberawit", tanggal: "2026-07-01", tags: ["caberawit", "mengaji"], comments: [{ user: "Ust. Ali", text: "Santri sangat antusias", date: "2026-07-01" }] },
  { id: "gal-2", kelompok: INITIAL_KELOMPOK[1].namaKelompok, kategori: "Wisuda", url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500", caption: "Pemberian penghargaan hafalan juz 30", tanggal: "2026-06-25", tags: ["wisuda", "tahfidz"], comments: [] }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: "ann-1", judul: "Agenda Rapat Koordinasi Kurikulum Daerah", konten: "Diharapkan kehadiran seluruh divisi kurikulum PPG daerah pada tanggal 15 Juli 2026 di Sekretariat SIM TPQ Magetan.", sasaranTarget: "Pengajar", tanggal: "2026-07-06", metode: ["Dalam Aplikasi", "WhatsApp"], statusKirim: "Terkirim", jumlahDibaca: 12 },
  { id: "ann-2", judul: "Pemberitahuan Ujian Munaqosah Semester Ganjil", konten: "Disampaikan kepada seluruh pengurus kelompok, pendaftaran munaqosah telah dibuka hingga 20 Juli 2026.", sasaranTarget: "Semua", tanggal: "2026-07-05", metode: ["Dalam Aplikasi"], statusKirim: "Terkirim", jumlahDibaca: 34 }
];

const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  { id: "log-1", username: "superadmin", role: "Super Admin", aktivitas: "Melakukan backup database bulanan", ipAddress: "192.168.1.100", perangkat: "Chrome on Windows", tanggal: "2026-07-06", jam: "12:05:00" },
  { id: "log-2", username: "pengajar_klp1", role: "Pengajar", aktivitas: "Menambahkan santri baru: Ahmad Bagus", ipAddress: "192.168.1.102", perangkat: "Firefox on Android", tanggal: "2026-07-06", jam: "12:30:15" },
  { id: "log-3", username: "admindaerah", role: "Admin Daerah", aktivitas: "Mengirimkan siaran WhatsApp pengumuman rapat", ipAddress: "192.168.1.105", perangkat: "Safari on macOS", tanggal: "2026-07-06", jam: "13:10:00" }
];

const INITIAL_BACKUPS: BackupRecord[] = [
  { id: "b-1", namaFile: "sim_tpq_backup_2026_07_01.sql", ukuran: "4.8 MB", tanggal: "2026-07-01 00:00", status: "Berhasil" },
  { id: "b-2", namaFile: "sim_tpq_backup_2026_07_05.sql", ukuran: "4.9 MB", tanggal: "2026-07-05 00:00", status: "Berhasil" }
];

const INITIAL_MUBALIGH_SETEMPAT: MubalighSetempat[] = [
  { id: "ms-1", foto: "", nama: "Ust. Heri Susanto", kelompok: INITIAL_KELOMPOK[0].namaKelompok, jenisKelamin: "Laki-laki", usia: 32, namaOrangTua: "H. Sukarni", whatsapp: "08123456001", status: "Aktif", qrCode: "QR-Ust-Heri" },
  { id: "ms-2", foto: "", nama: "Usth. Fatmawati", kelompok: INITIAL_KELOMPOK[1].namaKelompok, jenisKelamin: "Perempuan", usia: 28, namaOrangTua: "Suwardi", whatsapp: "08123456002", status: "Aktif", qrCode: "QR-Usth-Fatma" }
];

const INITIAL_MUBALIGH_TUGASAN: MubalighTugasan[] = [
  { id: "mt-1", foto: "", nama: "Ust. M. Ridho", kelompok: INITIAL_KELOMPOK[2].namaKelompok, jenisKelamin: "Laki-laki", usia: 24, namaOrangTua: "H. Mulyadi", asalDaerah: "Kediri", whatsapp: "08123456003", masaTugasan: "Juli 2025 - Juli 2026", status: "Aktif", qrCode: "QR-Ust-Ridho" },
  { id: "mt-2", foto: "", nama: "Usth. Laila", kelompok: INITIAL_KELOMPOK[3].namaKelompok, jenisKelamin: "Perempuan", usia: 23, namaOrangTua: "Ahmad", asalDaerah: "Surabaya", whatsapp: "08123456004", masaTugasan: "Desember 2025 - Desember 2026", status: "Aktif", qrCode: "QR-Usth-Laila" }
];

const INITIAL_PENGURUS: Pengurus[] = [
  { id: "p-1", nama: "H. M. Syukur", asalKelompok: INITIAL_KELOMPOK[0].namaKelompok, dapukan: "Ketua Dewan Pembina", whatsapp: "0812555001", foto: "", tingkat: "Daerah", kategori: "Harian" },
  { id: "p-2", nama: "Drs. Budi Santoso", asalKelompok: INITIAL_KELOMPOK[1].namaKelompok, dapukan: "Sekretaris", whatsapp: "0812555002", foto: "", tingkat: "Daerah", kategori: "Harian" },
  { id: "p-3", nama: "H. Nurhadi", asalKelompok: INITIAL_KELOMPOK[2].namaKelompok, dapukan: "Ketua Korda", whatsapp: "0812555003", foto: "", tingkat: "Desa", kategori: "Harian" },
  { id: "p-4", nama: "Ust. Ali Mahmudi", asalKelompok: INITIAL_KELOMPOK[3].namaKelompok, dapukan: "Ketua PPG", whatsapp: "0812555004", foto: "", tingkat: "Daerah", kategori: "PPG" },
  { id: "p-5", nama: "Ust. Wahyudi", asalKelompok: INITIAL_KELOMPOK[4].namaKelompok, dapukan: "Divisi Kurikulum", whatsapp: "0812555005", foto: "", tingkat: "Daerah", kategori: "PPG" }
];

const INITIAL_PRESENSI: Presensi[] = [
  { id: "pr-1", generusId: "g-1", namaLengkap: "Ahmad Bagus Pratama", namaKelompok: INITIAL_KELOMPOK[0].namaKelompok, tanggal: "2026-07-06", statusKehadiran: "Hadir" },
  { id: "pr-2", generusId: "g-2", namaLengkap: "Siti Rahmawati", namaKelompok: INITIAL_KELOMPOK[1].namaKelompok, tanggal: "2026-07-06", statusKehadiran: "Izin" },
  { id: "pr-3", generusId: "g-3", namaLengkap: "Muhammad Zaki", namaKelompok: INITIAL_KELOMPOK[2].namaKelompok, tanggal: "2026-07-06", statusKehadiran: "Hadir" },
  { id: "pr-4", generusId: "g-4", namaLengkap: "Aisyah Humaira", namaKelompok: INITIAL_KELOMPOK[3].namaKelompok, tanggal: "2026-07-06", statusKehadiran: "Hadir" },
  { id: "pr-5", generusId: "g-5", namaLengkap: "Rizky Ramadhan", namaKelompok: INITIAL_KELOMPOK[4].namaKelompok, tanggal: "2026-07-06", statusKehadiran: "Hadir" }
];

const INITIAL_RAPORT: Raport[] = [
  { id: "r-1", generusId: "g-1", namaLengkap: "Ahmad Bagus Pratama", namaKelompok: INITIAL_KELOMPOK[0].namaKelompok, semester: 1, tahunAjaran: "2025/2026", tahsin: 85, tahfidz: 90, doaHarian: 88, akhlak: 92, ibadah: 85, keaktifan: 95, kedisiplinan: 90, catatanPengajar: "Sangat baik perkembangannya dalam hafalan", ttdDigital: "" },
  { id: "r-2", generusId: "g-2", namaLengkap: "Siti Rahmawati", namaKelompok: INITIAL_KELOMPOK[1].namaKelompok, semester: 1, tahunAjaran: "2025/2026", tahsin: 75, tahfidz: 78, doaHarian: 80, akhlak: 85, ibadah: 80, keaktifan: 80, kedisiplinan: 85, catatanPengajar: "Tolong di rumah dibimbing lagi hafalannya", ttdDigital: "" }
];

const INITIAL_KURIKULUM: Kurikulum[] = [
  { id: "k-1", materi: "Juz 30 (An-Naba s/d An-Nas)", kategori: "Al-Qur'an", semester: 1, target: "Hafal Lancar Tartil", subMateri: "Surah An-Naba, An-Naziat", checklistPenyelesaian: true, progress: 100 },
  { id: "k-2", materi: "Hadits Kutubus Sittah (Hadits Dasar)", kategori: "Hadits", semester: 1, target: "Paham Makna & Lafadz", subMateri: "Hadits Niat, Hadits Kebersihan", checklistPenyelesaian: false, progress: 65 },
  { id: "k-3", materi: "6 Tabiat Luhur Generus", kategori: "Karakter", semester: 1, target: "Penerapan Praktis", subMateri: "Jujur, Amanah, Mujhid Muzhid", checklistPenyelesaian: false, progress: 80 }
];

const INITIAL_SARPRAS: Sarpras[] = INITIAL_KELOMPOK.map((klp, idx) => ({
  id: `sp-${klp.id}`,
  kelompokId: klp.id,
  namaKelompok: klp.namaKelompok,
  gedung: idx % 3 !== 0,
  meja: true,
  kursi: idx % 2 === 0,
  karpet: true,
  papanTulis: true,
  alquran: true,
  iqro: true,
  soundSystem: idx % 4 !== 0,
  kipas: true,
  lcd: idx % 5 === 0,
  toilet: true,
  tempatWudhu: true,
  lampu: true,
  internet: idx % 6 === 0,
  kebersihan: true,
  fotoKondisi: "",
  catatan: idx % 3 === 0 ? "Beberapa meja perlu perbaikan" : "Kondisi fisik gedung sangat baik",
  statusLayak: idx % 10 !== 0,
  skorSarpras: 70 + (idx * 3) % 30
}));

const INITIAL_WA_TEMPLATES: WaTemplate[] = [
  { id: "t-1", nama: "Presensi Harian", pesan: "Assalamu'alaikum Wr. Wb. Yth Orang Tua dari *{Nama}*, menginfokan bahwa putra/putri anda hari ini tercatat: *{Status}* dalam kegiatan mengaji di {Kelompok} pada {Tanggal}. Terima kasih." },
  { id: "t-2", nama: "Reminder Pengisian Raport", pesan: "Assalamu'alaikum Yth Ust/Ustd *{Nama}*, dimohon untuk segera melengkapi nilai raport semester {Semester} untuk generus di kelompok {Kelompok}. Batas akhir pengisian adalah tanggal {Deadline}." },
  { id: "t-3", nama: "Broadcast Kegiatan Akbar", pesan: "Assalamu'alaikum Wr. Wb. Diinfokan kepada seluruh Generus {Sasaran} di kelompok {Kelompok}, diharapkan kehadirannya pada agenda *{NamaKegiatan}* yang insya Allah akan dilaksanakan pada {Tanggal} pukul {Waktu} di {Tempat}." }
];

// Data operations
export const getKelompok = (): Kelompok[] => loadData("sim_tpq_kelompok", INITIAL_KELOMPOK);
export const saveKelompok = (data: Kelompok[]): void => saveData("sim_tpq_kelompok", data);

export const getGenerus = (): Generus[] => {
  let loaded = loadData<Generus[]>("sim_tpq_generus", INITIAL_GENERUS);
  let updated = false;

  // 1. Ensure all loaded records have the kategori field populated
  loaded = loaded.map(g => {
    if (!g.kategori) {
      g.kategori = g.usia < 13 ? "Caberawit" : g.usia <= 22 ? "Muda-Mudi" : "Jama'ah Dewasa";
      updated = true;
    }
    return g;
  });

  // 2. Add any records from INITIAL_GENERUS that are missing (e.g. g-6 and g-7 for Jama'ah Dewasa)
  const missingRecords = INITIAL_GENERUS.filter(initial => !loaded.some(item => item.id === initial.id));
  if (missingRecords.length > 0) {
    loaded = [...loaded, ...missingRecords];
    updated = true;
  }

  if (updated) {
    saveData("sim_tpq_generus", loaded);
  }

  return loaded;
};
export const saveGenerus = (data: Generus[]): void => saveData("sim_tpq_generus", data);

export const getAlumni = (): Alumni[] => loadData("sim_tpq_alumni", INITIAL_ALUMNI);
export const saveAlumni = (data: Alumni[]): void => saveData("sim_tpq_alumni", data);

export const getDocuments = (): DocumentRecord[] => loadData("sim_tpq_documents", INITIAL_DOCUMENTS);
export const saveDocuments = (data: DocumentRecord[]): void => saveData("sim_tpq_documents", data);

export const getGallery = (): GalleryItem[] => loadData("sim_tpq_gallery", INITIAL_GALLERY);
export const saveGallery = (data: GalleryItem[]): void => saveData("sim_tpq_gallery", data);

export const getAnnouncements = (): Announcement[] => loadData("sim_tpq_announcements", INITIAL_ANNOUNCEMENTS);
export const saveAnnouncements = (data: Announcement[]): void => saveData("sim_tpq_announcements", data);

export const getAuditLogs = (): AuditLogRecord[] => loadData("sim_tpq_audit_logs", INITIAL_AUDIT_LOGS);
export const saveAuditLogs = (data: AuditLogRecord[]): void => saveData("sim_tpq_audit_logs", data);

export const getBackups = (): BackupRecord[] => loadData("sim_tpq_backups", INITIAL_BACKUPS);
export const saveBackups = (data: BackupRecord[]): void => saveData("sim_tpq_backups", data);

export const getMubalighSetempat = (): MubalighSetempat[] => loadData("sim_tpq_mubaligh_setempat", INITIAL_MUBALIGH_SETEMPAT);
export const saveMubalighSetempat = (data: MubalighSetempat[]): void => saveData("sim_tpq_mubaligh_setempat", data);

export const getMubalighTugasan = (): MubalighTugasan[] => loadData("sim_tpq_mubaligh_tugasan", INITIAL_MUBALIGH_TUGASAN);
export const saveMubalighTugasan = (data: MubalighTugasan[]): void => saveData("sim_tpq_mubaligh_tugasan", data);

export const getPengurus = (): Pengurus[] => loadData("sim_tpq_pengurus", INITIAL_PENGURUS);
export const savePengurus = (data: Pengurus[]): void => saveData("sim_tpq_pengurus", data);

export const getPresensi = (): Presensi[] => loadData("sim_tpq_presensi", INITIAL_PRESENSI);
export const savePresensi = (data: Presensi[]): void => saveData("sim_tpq_presensi", data);

export const getRaport = (): Raport[] => loadData("sim_tpq_raport", INITIAL_RAPORT);
export const saveRaport = (data: Raport[]): void => saveData("sim_tpq_raport", data);

export const getKurikulum = (): Kurikulum[] => loadData("sim_tpq_kurikulum", INITIAL_KURIKULUM);
export const saveKurikulum = (data: Kurikulum[]): void => saveData("sim_tpq_kurikulum", data);

export const getSarpras = (): Sarpras[] => loadData("sim_tpq_sarpras", INITIAL_SARPRAS);
export const saveSarpras = (data: Sarpras[]): void => saveData("sim_tpq_sarpras", data);

export const getWaTemplates = (): WaTemplate[] => loadData("sim_tpq_wa_templates", INITIAL_WA_TEMPLATES);
export const saveWaTemplates = (data: WaTemplate[]): void => saveData("sim_tpq_wa_templates", data);

export interface Kegiatan {
  id: string;
  nama: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  kategoriSasaran: string[];
  deskripsi: string;
  status: "Terjadwal" | "Berjalan" | "Selesai" | "Batal";
}

const INITIAL_KEGIATAN: Kegiatan[] = [
  { id: "keg-1", nama: "Pengajian Akbar Semesta Ganjil", tanggal: "2026-07-15", waktu: "08:00", lokasi: "Masjid Baitul Makmur, Desa Selatan", kategoriSasaran: ["Remaja", "Muda-Mudi", "Orang Tua"], deskripsi: "Pengajian akbar pembinaan karakter luhur generus.", status: "Terjadwal" },
  { id: "keg-2", nama: "Festival Anak Sholih (FAS) Magetan", tanggal: "2026-08-20", waktu: "07:30", lokasi: "AULA DPD Magetan", kategoriSasaran: ["Caberawit", "Pra-Remaja"], deskripsi: "Lomba mewarnai, adzan, cerdas cermat, dan hafalan doa.", status: "Terjadwal" }
];

export const getKegiatan = (): Kegiatan[] => loadData("sim_tpq_kegiatan", INITIAL_KEGIATAN);
export const saveKegiatan = (data: Kegiatan[]): void => saveData("sim_tpq_kegiatan", data);
