import { createServerFn } from '@tanstack/react-start';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../integrations/supabase/client.server';

export const generateQuestions = createServerFn({ method: 'POST' })
  .validator((data: { categoryId: string; ageGroup: string; language: string; islamicContent: boolean; difficulty?: string }) => data)
  .handler(async ({ data }) => {
    const { categoryId, ageGroup, language, islamicContent, difficulty = "normal" } = data;

    const { data: settings } = await supabaseAdmin.from('app_settings').select('gemini_api_key, gemini_model').eq('id', 1).single();

    if (!settings || !settings.gemini_api_key) {
      throw new Error("Gemini API Key belum dikonfigurasi di Pengaturan Admin.");
    }

    const genAI = new GoogleGenerativeAI(settings.gemini_api_key);
    const model = genAI.getGenerativeModel({ model: settings.gemini_model || "gemini-2.0-flash-exp" });

    const prompt = `
      Buat 5 soal edukasi interaktif untuk anak-anak.
      Target pengguna: Kelompok usia ${ageGroup} (toddler: 2-3 tahun, kindergarten: 4-6 tahun, elementary_low: 7-9 tahun, elementary_high: 10-12 tahun).
      Kategori: ${categoryId} (misal: math, reading, science, creative, english, islamic).
      Bahasa: ${language === 'en' ? 'English' : 'Bahasa Indonesia'}.
      Konten Islami: ${islamicContent ? 'Ya, selipkan nilai/contoh islami ringan jika relevan.' : 'Tidak perlu spesifik islami'}.
      Tingkat Kesulitan: ${difficulty}. (Sesuaikan kerumitan soal dengan tingkat kesulitan ini).

      Variasikan tipe soal ("type") menjadi:
      - "tap": Pilihan ganda dasar (3 pilihan).
      - "true-false": Benar atau Salah (2 pilihan: Benar, Salah).
      - "fill-in": Isian singkat (jawaban berupa kata/angka pendek, jangan berikan pilihan "a").
      - "visual": Menghitung objek/emoji (misal: 🍎🍎🍎, ada berapa apel?).

      Pastikan:
      1. Soal sangat mudah dipahami dan sesuai umur anak.
      2. Gunakan emoji secara melimpah untuk menarik perhatian anak.
      3. Berikan "hint" (petunjuk singkat) jika anak salah menjawab.
      4. Berikan "explanation" (penjelasan lucu dan mudah dimengerti) dari AI Tutor jika anak masih salah.
      5. Kembalikan HASIL HANYA dalam format JSON array yang valid tanpa markdown backticks.

      Contoh Format JSON:
      [
        {
          "q": "Ada berapa bintang di langit malam ini? ⭐⭐⭐",
          "a": ["2", "3", "4"],
          "c": "3",
          "type": "visual",
          "hint": "Coba hitung lagi perlahan-lahan: satu, dua...",
          "explanation": "Wah, bintangnya ada 3! Sama seperti jari tiga ini 🤟."
        },
        {
          "q": "Sapi 🐄 suaranya meong. Benar atau Salah?",
          "a": ["Benar", "Salah"],
          "c": "Salah",
          "type": "true-false",
          "hint": "Coba ingat-ingat lagi suara hewan yang suka makan rumput.",
          "explanation": "Sapi itu suaranya Moooo! Kalau meong itu suara kucing 🐱."
        },
        {
          "q": "Lengkapi kata ini: B _ K U 📖",
          "a": [],
          "c": "U",
          "type": "fill-in",
          "hint": "Huruf vokal yang mulutnya monyong.",
          "explanation": "Itu adalah huruf U! Dibaca jadi B-U-K-U, BUKU!"
        }
      ]
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw new Error("Gagal mengambil soal dari AI Tutor. Cek kuota API atau koneksi.");
    }
  });
