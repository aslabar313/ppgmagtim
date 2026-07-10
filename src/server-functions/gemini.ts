import { createServerFn } from '@tanstack/react-start';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../integrations/supabase/client.server';
import { z } from 'zod';

export const generateQuestions = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    categoryId: z.string(),
    ageGroup: z.string(),
    language: z.string(),
    islamicContent: z.boolean(),
    difficulty: z.string().optional(),
    topic: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { categoryId, ageGroup, language, islamicContent, difficulty = "normal", topic = "General" } = data;

    // 1. Check Cache first
    const { data: cached } = await supabaseAdmin
      .from('ai_content_cache')
      .select('payload')
      .eq('category', categoryId as any)
      .eq('age_group', ageGroup as any)
      .eq('topic', topic)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached && Math.random() > 0.3) { // 70% chance to use cache to save API, 30% to refresh
      return cached.payload;
    }

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
      
      // Extract only the JSON array part [ ... ]
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Format soal AI tidak valid. Coba lagi.");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);

      // Save to cache asynchronously (don't block response)
      supabaseAdmin.from('ai_content_cache').insert({
        category: categoryId as any,
        age_group: ageGroup as any,
        topic: topic,
        payload: parsed
      }).then(({ error }) => {
        if (error) console.error("Cache Save Error:", error);
      });

      return parsed;
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw new Error("Gagal mengambil soal dari AI Tutor. Cek kuota API atau koneksi.");
    }
  });

export const analyzeFileOrQuery = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    queryText: z.string(),
    chatHistory: z.array(z.object({
      role: z.enum(['user', 'model', 'assistant']),
      text: z.string()
    })),
    fileData: z.object({
      base64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
      parsedText: z.string().optional()
    }).optional()
  }))
  .handler(async ({ data }) => {
    const { queryText, chatHistory = [], fileData } = data;

    const { data: settings } = await supabaseAdmin.from('app_settings').select('gemini_api_key, gemini_model').eq('id', 1).single();

    let apiKey = settings?.gemini_api_key || process.env.GEMINI_API_KEY;
    let modelName = settings?.gemini_model || process.env.GEMINI_MODEL || "gemini-2.0-flash";

    if (!apiKey) {
      throw new Error("Gemini API Key belum dikonfigurasi di Pengaturan Admin atau .env.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.0-flash as it is fast, highly accurate, and supports multimodal (PDFs, images)
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = `
Anda adalah Asisten AI Analitis untuk SIM Kelompok PintarYuk (Sistem Informasi Monitoring Kelompok TPQ).
Tugas utama Anda adalah menganalisis data, file (Excel, PDF, Gambar), absensi santri, kinerja pengajar, laporan keuangan, sarpras, dan data lainnya dengan akurasi 100% sempurna.

Aturan Analisis Data & File:
1. **Ketelitian & Akurasi Mutlak**: Jangan pernah berasumsi, menebak, atau memalsukan data (hallucinate). Jika data tidak ada atau tidak lengkap, sampaikan dengan jelas dan jujur. Jika menganalisis tabel data atau laporan keuangan, pastikan hitungan matematika Anda 100% tepat.
2. **Multimodal**: Anda dapat menerima data teks hasil ekstraksi Excel, file PDF (dikirim sebagai dokumen), atau Gambar (grafik, foto tabel, dokumen scan).
3. **Struktur Output**: Gunakan format Markdown yang rapi dan mudah dibaca:
   - Gunakan tabel untuk menyajikan data terstruktur atau angka.
   - Gunakan list/bullet points untuk poin-poin analisis penting.
   - Gunakan tebal (bold) untuk menyoroti hal kritis seperti nama santri bermasalah atau nilai di bawah rata-rata.
4. **Analisis Mendalam**: Jangan hanya menyalin ulang data. Berikan rangkuman statistik penting (misal: rata-rata kehadiran, total dana, rasio santri dibanding guru).
5. **Rekomendasi Aksi**: Di akhir analisis, berikan rekomendasi aksi konkret yang relevan untuk pengurus kelompok/daerah (misal: "Kirim WhatsApp Center pengingat ke wali murid", "Lakukan pengecekan sarpras di Kelompok 4").
6. **Bahasa**: Jawab selalu menggunakan Bahasa Indonesia yang sopan, profesional, dan bersahabat.
`;

    // Map history to Google Generative AI format
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // Start a chat session with history and system instruction
    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: systemPrompt,
    });

    const parts: any[] = [];

    // If there is file data
    if (fileData) {
      if (fileData.parsedText) {
        // For Excel or parsed text
        parts.push(`[Lampiran Dokumen: ${fileData.fileName}]\nBerikut adalah isi data dari file tersebut:\n\n${fileData.parsedText}\n\n`);
      } else if (fileData.base64 && fileData.mimeType) {
        // For PDF or Images sent as base64 inlineData
        parts.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType
          }
        });
        parts.push(`[Lampiran Dokumen: ${fileData.fileName} (${fileData.mimeType})]\n`);
      }
    }

    parts.push(queryText || "Tolong lakukan analisis mendalam terhadap file yang dilampirkan.");

    try {
      const result = await chat.sendMessage(parts);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      throw new Error(`Gagal melakukan analisis AI: ${error.message || error}`);
    }
  });
