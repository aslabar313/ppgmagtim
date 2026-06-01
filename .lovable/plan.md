# Rencana Build PintarYuk

Karena kamu pilih "bangun semuanya sekaligus", ini akan dikerjakan bertahap dalam SATU build besar dengan urutan strict. Konten game pakai Gemini API kamu (disimpan di admin), aset visual pakai placeholder dulu sampai kamu sediakan API image generation.

## Stack & Pondasi

- TanStack Start + Tailwind + shadcn (sudah ada)
- Lovable Cloud (Supabase) untuk DB + auth
- Bahasa UI: Indonesia
- Font: Nunito (body) + Fredoka (display)
- Design tokens: warm white bg, cheerful blue, sunny yellow, green, coral, purple, orange — semua rounded besar

## Tahap 1 — Pondasi (Database + Auth)

- Enable Lovable Cloud
- Schema:
  - `profiles` (parent: id, email, name, pin_hash, plan, gemini_api_key, image_api_key, image_api_provider)
  - `children` (id, parent_id, name, avatar, age_group, gender, fav_topics[], islamic_content, language_mode, daily_limit_min, allowed_hours)
  - `child_progress` (xp, level, current_streak, longest_streak, last_active_date)
  - `game_sessions` (child_id, category, topic, score, stars, duration, played_at)
  - `badges_earned` (child_id, badge_key, earned_at)
  - `daily_challenges` (child_id, date, challenge_key, completed)
  - `screen_time_logs` (child_id, started_at, ended_at, duration_sec)
  - `weekly_reports` (child_id, week_start, summary_json)
  - `app_settings` (admin: api keys terenkripsi, model preferences)
- RLS: parent hanya akses data anak sendiri; admin role untuk app_settings
- Auth: email/password + Google OAuth

## Tahap 2 — Landing Page (untuk orang tua)

Sesuai brief PART 5: navbar sticky, hero dengan headline "Biarkan anak main HP — asal yang dimainkan PintarYuk", interactive dashboard preview (HP mockup dengan home anak), logo bar kota, problem section (3 pain points), solution transition, 4 fitur alternating, testimonial masonry, pricing (Free vs Pro Rp29rb, button "Coming Soon"), FAQ 7 pertanyaan, final CTA gradient, footer.

## Tahap 3 — Auth Pages

Split layout 40/60: kiri branding panel gradient + maskot, kanan form clean. Login, register, lupa password, reset password.

## Tahap 4 — Onboarding Wizard (3 langkah)

Step 1 identitas anak → Step 2 preferensi (toggle islami, bahasa) → Step 3 parental control (PIN, batas waktu, jam). Multi-child up to 5.

## Tahap 5 — Child Home Screen (`/play`)

- Sapaan personal + avatar + level badge
- Streak counter animasi api 🔥
- XP progress bar
- Daily challenge card kuning prominent
- Grid kategori 2 kolom (warna berbeda + progress ring)
- Recently played row
- Badge terbaru sparkle
- Maskot di corner (tap untuk encouragement)
- Tombol "Kembali ke Orang Tua" kecil di pojok (butuh PIN)
- UI adaptive per age group (button size, density)

## Tahap 6 — Game Engine + Kategori

Game engine generic dengan format: tap-answer, drag-drop, fill-in, visual-counting, tracing, matching, audio-listen-pick. Tidak ada kata "salah", adaptive difficulty (5 benar berturut naik, 3 salah turun), hint setelah salah 2x, AI tutor explain setelah salah 3x.

Kategori dibangun bertahap dengan konten per age group:

1. 🔢 Angka & Matematika
2. 🔤 Huruf & Membaca
3. 🌍 Pengetahuan Umum & Sains
4. 🎨 Kreativitas (mewarnai canvas, puzzle, melukis bebas, pola)
5. 🗣️ Bahasa Inggris
6. 🎵 Lagu & Musik (audio + karaoke teks per kata)
7. ☪️ Islami (hidden kalau toggle OFF)

Konten soal: di-generate via Gemini API kamu (admin) dengan caching ke DB supaya hemat. Fallback ke seed konten kecil bila API belum diisi.

## Tahap 7 — Gamification

- Streak harian + streak freeze 1x/minggu
- XP system + level dengan nama lucu (Bintang Kecil → Juara Indonesia)
- Bintang per sesi (1-3 ⭐) dengan animasi confetti untuk perfect
- Badge collection (per subjek, konsistensi, pencapaian)
- Daily challenge dengan bonus XP 2x sebelum jam 20:00
- Reward virtual: unlock maskot, tema warna, frame foto

## Tahap 8 — AI Tutor (Gemini)

- Server function aman pakai Gemini API key dari `app_settings` (bukan client)
- Trigger: salah 3x → penjelasan ramah anak; idle 10 detik → hint visual; jawaban benar → pujian variatif
- Maskot animasi (kelinci default, bisa ganti beruang/burung/kucing)
- Weekly encouragement message Senin pagi

## Tahap 9 — Parent Dashboard (`/parent`, gated PIN)

- Tab per anak
- Tab Progress: grafik 7 hari, progress kategori, topik kuasai vs perlu latihan
- Tab Screen Time: timer hari ini vs batas, grafik, edit batas
- Tab Laporan Mingguan: AI summary, share ke WA (deep link)
- Tab Settings Anak: edit profil, toggle islami, reset progress, notifikasi
- Notifikasi: in-app (toast + bell), browser push opsional

## Tahap 10 — Admin Settings

Halaman `/parent/settings/admin` untuk input:

- Gemini API key (untuk AI tutor + content generation)
- Image API key + provider (untuk maskot & ilustrasi)
- Test connection button

## Tahap 11 — Polish

- Audio TTS untuk instruksi game (web Speech API + opsi audio file)
- Loading state: maskot berputar
- Empty state: ilustrasi + CTA
- Error state: maskot sedih + pesan friendly
- Responsive tablet landscape untuk child mode
- Tombol minimum 80x80px di balita/TK mode
- Hilangkan placeholder index page

## Catatan Teknis

- Pembayaran: belum aktif, button "Coming Soon" + waitlist email
- Aset visual: pakai emoji + SVG/CSS sederhana sampai kamu set image API → halaman regenerate maskot otomatis
- Konten game: seed minimal hardcoded (10-20 soal/topik) sebagai fallback, sisanya Gemini
- TIDAK ADA iklan, TIDAK ADA link eksternal dari child mode
- PIN orang tua di-hash (bcrypt server-side)

## Yang TIDAK termasuk build ini

- Mode offline / PWA download (Pro feature, butuh service worker setup terpisah)
- Push notification native (hanya in-app + web push basic)
- Aktual integrasi WA Business API (cuma deep link `wa.me`)
- Konten lengkap semua subjek untuk semua usia (akan auto-generate via Gemini saat kamu pakai)

Setelah kamu approve, saya mulai dari Tahap 1 dan jalan terus sampai semua tahap selesai.
