import { createServerFn } from '@tanstack/react-start';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../integrations/supabase/client.server';

export const generateQuestions = createServerFn({ method: 'POST' })
  .validator((data: { categoryId: string; ageGroup: string; language: string; islamicContent: boolean }) => data)
  .handler(async ({ data }) => {
    const { categoryId, ageGroup, language, islamicContent } = data;

    const { data: settings } = await supabaseAdmin.from('app_settings').select('gemini_api_key, gemini_model').eq('id', 1).single();

    if (!settings || !settings.gemini_api_key) {
      throw new Error("Gemini API Key belum dikonfigurasi di Pengaturan Admin.");
    }

    const genAI = new GoogleGenerativeAI(settings.gemini_api_key);
    const model = genAI.getGenerativeModel({ model: settings.gemini_model || "gemini-2.0-flash-exp" });

    const prompt = `
      Buat 5 soal kuis pilihan ganda edukasi untuk anak-anak.
      Target pengguna: Kelompok usia ${ageGroup} (toddler: 2-3 tahun, kindergarten: 4-6 tahun, elementary_low: 7-9 tahun, elementary_high: 10-12 tahun).
      Kategori: ${categoryId} (misal: math, reading, science, islamic).
      Bahasa: ${language === 'en' ? 'English' : 'Bahasa Indonesia'}.
      Konten Islami: ${islamicContent ? 'Ya, selipkan nilai/contoh islami ringan jika relevan.' : 'Tidak perlu spesifik islami'}.

      Pastikan:
      1. Soal sangat mudah dipahami dan sesuai umur anak.
      2. Gunakan emoji untuk menarik perhatian anak.
      3. Harus ada 3 pilihan jawaban.
      4. Kembalikan HASIL HANYA dalam format JSON array yang valid. Tanpa markdown backticks, tanpa kata pengantar.

      Format:
      [
        {
          "q": "Pertanyaan dengan emoji?",
          "a": ["Jawaban 1", "Jawaban 2", "Jawaban 3"],
          "c": "Jawaban yang benar persis sama dengan salah satu nilai di 'a'",
          "type": "tap"
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
