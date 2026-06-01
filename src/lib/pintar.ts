// PintarYuk shared constants & helpers

export type AgeGroup = "toddler" | "kindergarten" | "elementary_low" | "elementary_high";

export const AGE_GROUPS: { value: AgeGroup; label: string; range: string; emoji: string }[] = [
  { value: "toddler", label: "Balita", range: "2-4 tahun", emoji: "🧒" },
  { value: "kindergarten", label: "TK", range: "4-6 tahun", emoji: "🎈" },
  { value: "elementary_low", label: "SD Kelas 1-3", range: "6-9 tahun", emoji: "📚" },
  { value: "elementary_high", label: "SD Kelas 4-6", range: "9-12 tahun", emoji: "🎓" },
];

export const AVATARS = [
  { id: "rabbit", emoji: "🐰", name: "Kelinci" },
  { id: "bear", emoji: "🐻", name: "Beruang" },
  { id: "bird", emoji: "🐤", name: "Burung" },
  { id: "cat", emoji: "🐱", name: "Kucing" },
  { id: "fox", emoji: "🦊", name: "Rubah" },
  { id: "panda", emoji: "🐼", name: "Panda" },
  { id: "lion", emoji: "🦁", name: "Singa" },
  { id: "tiger", emoji: "🐯", name: "Harimau" },
  { id: "monkey", emoji: "🐵", name: "Monyet" },
  { id: "unicorn", emoji: "🦄", name: "Unicorn" },
];

export type GameCategory =
  | "math"
  | "reading"
  | "science"
  | "creative"
  | "english"
  | "music"
  | "islamic";

export const CATEGORIES: {
  id: GameCategory;
  name: string;
  emoji: string;
  desc: string;
  colorVar: string;
  islamicOnly?: boolean;
}[] = [
  {
    id: "math",
    name: "Angka & Matematika",
    emoji: "🔢",
    desc: "Berhitung jadi seru!",
    colorVar: "cat-math",
  },
  {
    id: "reading",
    name: "Huruf & Membaca",
    emoji: "📖",
    desc: "Belajar baca yuk!",
    colorVar: "cat-reading",
  },
  {
    id: "science",
    name: "Pengetahuan Umum",
    emoji: "🌍",
    desc: "Jelajahi dunia!",
    colorVar: "cat-science",
  },
  {
    id: "creative",
    name: "Kreativitas & Seni",
    emoji: "🎨",
    desc: "Berkreasi bebas!",
    colorVar: "cat-creative",
  },
  {
    id: "english",
    name: "Bahasa Inggris",
    emoji: "🗣️",
    desc: "Let's learn English!",
    colorVar: "cat-english",
  },
  { id: "music", name: "Lagu & Musik", emoji: "🎵", desc: "Nyanyi bareng!", colorVar: "cat-music" },
  {
    id: "islamic",
    name: "Islami",
    emoji: "☪️",
    desc: "Belajar agama",
    colorVar: "cat-islamic",
    islamicOnly: true,
  },
];

export const LEVEL_NAMES = [
  "Bintang Kecil",
  "Bintang Bersinar",
  "Bintang Merah",
  "Bintang Emas",
  "Pahlawan Belajar",
  "Juara Indonesia",
];

export function xpToLevel(xp: number): {
  level: number;
  name: string;
  nextLevelXp: number;
  currentLevelXp: number;
} {
  // Levels at 0, 100, 300, 700, 1500, 3000, 6000+
  const thresholds = [0, 100, 300, 700, 1500, 3000, 6000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  const idx = Math.min(level - 1, LEVEL_NAMES.length - 1);
  const nextLevelXp = thresholds[Math.min(level, thresholds.length - 1)] ?? 6000;
  const currentLevelXp = thresholds[level - 1] ?? 0;
  return { level, name: LEVEL_NAMES[idx], nextLevelXp, currentLevelXp };
}

export function ageGroupFromAge(age: number): AgeGroup {
  if (age <= 4) return "toddler";
  if (age <= 6) return "kindergarten";
  if (age <= 9) return "elementary_low";
  return "elementary_high";
}

export function getButtonSizeForAge(g: AgeGroup): "sm" | "md" | "lg" | "xl" {
  if (g === "toddler") return "xl";
  if (g === "kindergarten") return "lg";
  return "md";
}

export const ENCOURAGEMENTS = [
  "Wah hebat sekali! 🌟",
  "Kamu pintar banget! 💪",
  "Luar biasa! Terus semangat ya! 🎉",
  "Yes! Kamu bisa! ✨",
  "Keren! Mantap! 🚀",
  "Wow, kamu cepat sekali! ⚡",
  "Bagus! Lanjut terus! 🌈",
  "Hebat! Aku bangga padamu! 💖",
];

export const RETRY_MESSAGES = [
  "Coba lagi yuk! 💪",
  "Hampir benar! Sekali lagi ya 🌟",
  "Tidak apa-apa, coba lagi yuk! 🤗",
  "Yuk kita coba lagi! ✨",
];

export const BADGES = [
  { key: "first_steps", name: "Pemula Hebat", emoji: "🌟", desc: "Selesaikan 10 game pertama" },
  {
    key: "math_expert",
    name: "Ahli Matematika",
    emoji: "🔢",
    desc: "Selesaikan 20 game matematika",
  },
  { key: "bookworm", name: "Kutu Buku", emoji: "📖", desc: "Selesaikan 20 game membaca" },
  { key: "explorer", name: "Penjelajah", emoji: "🌍", desc: "Selesaikan 20 game pengetahuan" },
  { key: "artist", name: "Seniman Cilik", emoji: "🎨", desc: "Selesaikan 10 aktivitas kreatif" },
  { key: "english_star", name: "Bintang Inggris", emoji: "🗣️", desc: "Selesaikan 20 game Inggris" },
  { key: "singer", name: "Penyanyi Berbakat", emoji: "🎵", desc: "Dengarkan 20 lagu" },
  { key: "streak_3", name: "Semangat 3 Hari", emoji: "🔥", desc: "Streak 3 hari" },
  { key: "streak_7", name: "Juara Seminggu", emoji: "🏆", desc: "Streak 7 hari" },
  { key: "streak_30", name: "Super Konsisten", emoji: "💎", desc: "Streak 30 hari" },
  { key: "fifty_games", name: "Rajin Belajar", emoji: "🚀", desc: "Total 50 game selesai" },
  { key: "ten_badges", name: "Sang Juara", emoji: "👑", desc: "Raih 10 badge" },
];
