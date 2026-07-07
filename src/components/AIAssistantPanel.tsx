import React, { useState } from "react";
import { getGenerus, getPresensi, getRaport, getKelompok, Generus } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User, HelpCircle, ArrowRight, CornerDownRight } from "lucide-react";
import { toast } from "sonner";

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", text: "Assalamu'alaikum! Saya Asisten AI SIM TPQ Magetan Timur. Saya dapat membantu Anda menganalisis absensi santri, memantau pengisian raport pengajar, mendeteksi kelayakan sarana kelompok, atau membuat rancangan draf pengumuman daerah menggunakan bahasa alami. Silakan tanyakan sesuatu atau klik rekomendasi di bawah ini!" }
  ]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const presets = [
    "Tampilkan Generus yang sering alfa.",
    "Kelompok mana yang presensinya menurun?",
    "Siapa saja yang belum mengisi raport?",
    "Draf pengumuman libur semester ganjil."
  ];

  // AI query logic simulating responses based on database state
  const handleQuery = (queryText: string) => {
    if (!queryText.trim()) return;
    
    // Add user message
    const userMsg = { role: "user", text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setAnalyzing(true);

    setTimeout(() => {
      let reply = "";
      const query = queryText.toLowerCase();

      if (query.includes("alfa") || query.includes("bolos") || query.includes("absen")) {
        reply = `### Laporan Santri dengan Tingkat Ketidakhadiran (Alfa) Tertinggi:
Berdasarkan log data presensi bulan ini, berikut santri terdeteksi tidak hadir tanpa keterangan (Alfa):

| Nama Santri | Kelompok TPQ | Jumlah Alfa | Kontak Wali Murid |
| :--- | :--- | :---: | :--- |
| **Siti Rahmawati** | TPQ Al-Hikmah Kelompok 2 | 2 Kali | 081398765432 |
| **Muhammad Zaki** | TPQ Al-Hikmah Kelompok 3 | 1 Kali | 085712345678 |

**Rekomendasi AI:**
Segera kirim pesan WhatsApp pengingat otomatis melalui menu **WhatsApp Center** kepada Orang Tua **Siti Rahmawati** untuk mengklarifikasi alasan ketidakhadiran berturut-turut.`;
      } 
      else if (query.includes("raport") || query.includes("rapor")) {
        const generus = getGenerus();
        const raports = getRaport();
        const filledIds = raports.map(r => r.generusId);
        const unfilled = generus.filter(g => !filledIds.includes(g.id));

        reply = `### Laporan Guru/Pengajar yang Belum Melengkapi Raport Santri:
Terdapat **${unfilled.length} santri** yang nilai raport semester aktifnya belum diinput oleh pengajar kelas.

| Nama Santri | Kelompok TPQ | Wali Kelas / Pengajar |
| :--- | :--- | :--- |
| **Muhammad Zaki** | TPQ Al-Hikmah Kelompok 3 | Ust. M. Ridho |
| **Aisyah Humaira** | TPQ Al-Hikmah Kelompok 4 | Usth. Laila |
| **Rizky Ramadhan** | TPQ Al-Hikmah Kelompok 5 | Ust. Pengajar |

**Rekomendasi AI:**
Gunakan template *Reminder Pengisian Raport* di menu **WhatsApp Center** untuk mengirim pengingat otomatis ke pengajar yang bersangkutan sebelum batas waktu pengisian berakhir.`;
      } 
      else if (query.includes("menurun") || query.includes("presensi")) {
        reply = `### Analisis Penurunan Persentase Kehadiran Kelompok TPQ:
Berdasarkan perbandingan presensi Minggu 1 vs Minggu 2 semester ini, kelompok berikut mengalami penurunan keaktifan:

* **TPQ Al-Hikmah Kelompok 4 (Kec. Bendo):** Turun dari **92% ke 85%** (Penurunan terkuat, terdeteksi 3 santri izin sakit).
* **TPQ Al-Hikmah Kelompok 12 (Kec. Sukomoro):** Turun dari **90% ke 87%** (Sering terkendala hujan sore hari).

**Rekomendasi AI:**
Disarankan Kepala Desa melakukan monitoring khusus sarana gedung kelas pada kelompok 4 untuk memastikan fasilitas belajar tetap kondusif.`;
      } 
      else if (query.includes("pengumuman") || query.includes("draf")) {
        reply = `### Draf Pengumuman Libur Semester Ganjil SIM TPQ:
Berikut draf surat maklumat yang siap disalin dan diterbitkan melalui menu **Pengumuman**:

\`\`\`text
PENGUMUMAN DAERAH
Nomor: 04/PPG-MGT/VII/2026

Assalamu'alaikum Wr. Wb.
Diberitahukan kepada seluruh Pengurus Kelompok, Pengajar, Wali Santri, dan Generus, bahwa sehubungan dengan selesainya evaluasi Ujian Munaqosah, maka kegiatan belajar mengajar TPQ diliburkan mulai:
Tanggal: 10 Juli 2026 s/d 17 Juli 2026.
Kegiatan KBM akan aktif kembali pada hari Senin, 20 Juli 2026.

Demikian maklumat ini disampaikan. Atas perhatiannya diucapkan Jazakumullahu Khoiro.
Wassalamu'alaikum Wr. Wb.
\`\`\`

*Apakah Anda ingin langsung menyiarkan draf pengumuman ini melalui WhatsApp Center?*`;
      }
      else {
        reply = `Maaf, saya tidak menemukan pola data khusus untuk pertanyaan tersebut. Coba tanyakan hal berikut:
1. "Siapa saja yang belum melengkapi raport?"
2. "Kelompok mana yang presensinya menurun?"
3. "Tampilkan santri yang sering alfa."
4. "Buat draf pengumuman rapat."`;
      }

      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      setAnalyzing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">AI Assistant Analitik</h2>
        <p className="text-slate-500 text-sm">Gunakan kecerdasan buatan internal untuk menganalisis data kehadiran, raport, dan kelayakan operasional dengan bahasa alami.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Chat Window Container */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch flex flex-col justify-between min-h-[480px]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="font-display text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Obrolan Konsultasi AI
            </CardTitle>
          </CardHeader>

          {/* Messages viewport */}
          <div className="flex-grow p-6 overflow-y-auto space-y-4 max-h-[340px]">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 text-xs leading-relaxed max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className={`p-4 rounded-3xl ${
                  msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none text-left" : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none markdown-chat text-left"
                }`}>
                  {msg.role === "user" ? (
                    <p>{msg.text}</p>
                  ) : (
                    <div className="space-y-2 whitespace-pre-wrap">
                      {/* Simple custom markdown renderer representation */}
                      {msg.text.split("\n").map((line: string, i: number) => {
                        if (line.startsWith("###")) {
                          return <h4 key={i} className="font-display text-xs font-extrabold text-slate-900 mt-2 mb-1">{line.replace("###", "")}</h4>;
                        }
                        if (line.startsWith("|")) {
                          return <div key={i} className="font-mono text-[10px] text-slate-500">{line}</div>;
                        }
                        if (line.startsWith("*")) {
                          return <div key={i} className="flex gap-1.5 items-start pl-2"><CornerDownRight className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" /> <span className="text-slate-600">{line.replace("*", "")}</span></div>;
                        }
                        return <p key={i} className="text-slate-600 leading-relaxed font-medium">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {analyzing && (
              <div className="flex gap-3 text-xs text-slate-400 font-bold items-center">
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center animate-spin">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span>AI sedang menganalisis data transaksi & presensi daerah...</span>
              </div>
            )}
          </div>

          {/* Form chat inputs */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleQuery(input); }} 
            className="p-4 border-t border-slate-100 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan analisis data, draf surat, atau kelayakan TPQ di sini..."
              className="rounded-xl border-slate-200 text-xs py-3 flex-grow"
            />
            <Button type="submit" disabled={analyzing} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold py-3 px-6 text-xs shrink-0 flex items-center gap-1.5 shadow-sm">
              Kirim <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </Card>

        {/* Suggestions Column */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 self-stretch flex flex-col justify-start text-left">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><HelpCircle className="h-4.5 w-4.5 text-slate-400" /> Contoh Pertanyaan Cepat</h3>
          
          <div className="space-y-2 flex-grow">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleQuery(p)}
                className="w-full text-left p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/30 hover:border-emerald-200 transition-all text-xs font-bold text-slate-700 flex items-center justify-between group"
              >
                <span>{p}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
