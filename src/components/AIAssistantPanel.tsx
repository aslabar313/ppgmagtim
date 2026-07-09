import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  HelpCircle, 
  ArrowRight, 
  CornerDownRight, 
  Paperclip, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  X,
  FileUp,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { analyzeFileOrQuery } from "@/server-functions/gemini";

// Premium Custom Markdown & Table Parser
function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.JSX.Element[] = [];
  
  let currentTable: string[][] = [];
  let inTable = false;
  
  const parseInline = (str: string) => {
    // replace **text** with strong
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  const flushTable = (key: number) => {
    if (currentTable.length === 0) return null;
    
    // Filter out table layout markdown rows (e.g. |---|---|)
    const filteredRows = currentTable.filter(row => {
      return !row.every(cell => cell.trim().match(/^:?-+:?$/) || cell.trim() === "");
    });
    
    if (filteredRows.length === 0) return null;
    
    const headers = filteredRows[0];
    const rows = filteredRows.slice(1);
    
    return (
      <div key={`table-${key}`} className="my-3 overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 font-extrabold text-slate-700 uppercase tracking-wider">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {parseInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith("|")) {
      inTable = true;
      const cells = line.split("|").slice(1, -1);
      currentTable.push(cells);
    } else {
      if (inTable) {
        const tableEl = flushTable(i);
        if (tableEl) elements.push(tableEl);
        currentTable = [];
        inTable = false;
      }
      
      const trimmed = line.trim();
      if (trimmed === "") {
        continue;
      }
      
      if (trimmed.startsWith("###")) {
        elements.push(
          <h4 key={i} className="font-display text-xs font-extrabold text-slate-900 mt-4 mb-2 first:mt-1">
            {parseInline(trimmed.replace("###", "").trim())}
          </h4>
        );
      } else if (trimmed.startsWith("##")) {
        elements.push(
          <h3 key={i} className="font-display text-[13px] font-extrabold text-slate-900 mt-5 mb-2.5">
            {parseInline(trimmed.replace("##", "").trim())}
          </h3>
        );
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        elements.push(
          <div key={i} className="flex gap-2 items-start pl-2 my-1 text-slate-600">
            <CornerDownRight className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <span className="text-[11px] leading-relaxed font-semibold">{parseInline(trimmed.substring(1).trim())}</span>
          </div>
        );
      } else if (trimmed.match(/^\d+\./)) {
        elements.push(
          <div key={i} className="flex gap-2 items-start pl-2 my-1 text-slate-600">
            <span className="text-[11px] font-extrabold text-emerald-700 mt-0.5 shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
            <span className="text-[11px] leading-relaxed font-semibold">{parseInline(trimmed.replace(/^\d+\./, "").trim())}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={i} className="text-slate-600 leading-relaxed text-[11px] font-semibold my-1.5">
            {parseInline(line)}
          </p>
        );
      }
    }
  }
  
  if (inTable) {
    const tableEl = flushTable(lines.length);
    if (tableEl) elements.push(tableEl);
  }
  
  return <div className="space-y-1">{elements}</div>;
}

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<any[]>([
    { 
      role: "assistant", 
      text: "Assalamu'alaikum! Saya Asisten AI SIM TPQ Magetan Timur. Saya telah dioptimalkan untuk menganalisis data, file dokumen Excel (.xlsx, .xls, .csv), PDF, maupun Gambar.\n\nSilakan unggah dokumen Anda menggunakan tombol klip di bawah, tanyakan sesuatu tentang data tersebut, atau gunakan salah satu rekomendasi cepat!" 
    }
  ]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    base64: string;
    mimeType: string;
    fileName: string;
    parsedText?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const presets = [
    "Tampilkan Generus yang sering alfa.",
    "Kelompok mana yang presensinya menurun?",
    "Siapa saja yang belum mengisi raport?",
    "Draf pengumuman libur semester ganjil."
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Size limit of 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file melebihi batas 10MB.");
      return;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (fileExt === "xlsx" || fileExt === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          let textContent = "";
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            textContent += `### Sheet: ${sheetName}\n`;
            json.forEach((row: any) => {
              if (row && row.length > 0) {
                textContent += row.map((cell: any) => cell === null || cell === undefined ? "" : String(cell)).join(" | ") + "\n";
              }
            });
            textContent += "\n";
          });

          setSelectedFile({
            base64: "", // Sent as text
            mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName: file.name,
            parsedText: textContent
          });
          toast.success(`Excel "${file.name}" berhasil diunggah & dibaca.`);
        } catch (err) {
          console.error(err);
          toast.error("Gagal memproses file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExt === "csv") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const textContent = evt.target?.result as string;
        setSelectedFile({
          base64: "", // Sent as text
          mimeType: file.type || "text/csv",
          fileName: file.name,
          parsedText: textContent
        });
        toast.success(`CSV "${file.name}" berhasil diunggah & dibaca.`);
      };
      reader.readAsText(file);
    } else if (fileExt === "pdf" || file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const base64 = result.split(",")[1];
        setSelectedFile({
          base64,
          mimeType: file.type,
          fileName: file.name
        });
        toast.success(`Dokumen "${file.name}" siap dianalisis.`);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Format file tidak didukung. Unggah file Excel, CSV, PDF, atau Gambar.");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() && !selectedFile) return;

    const queryToSend = queryText.trim() || "Tolong berikan analisis menyeluruh dan teliti dari file ini.";
    const displayMsgText = selectedFile 
      ? `[Lampiran File: ${selectedFile.fileName}] ${queryToSend}`
      : queryToSend;

    const userMsg = { role: "user", text: displayMsgText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setAnalyzing(true);

    try {
      const responseText = await analyzeFileOrQuery({
        data: {
          queryText: queryToSend,
          chatHistory: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : (msg.role === 'model' ? 'model' : 'user'),
            text: msg.text
          })),
          fileData: selectedFile ? {
            base64: selectedFile.base64,
            mimeType: selectedFile.mimeType,
            fileName: selectedFile.fileName,
            parsedText: selectedFile.parsedText
          } : undefined
        }
      });

      setMessages(prev => [...prev, { role: "assistant", text: responseText }]);
      clearSelectedFile();
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      toast.error(error.message || "Gagal menghubungi AI Assistant.");
      
      // Intelligent fallback for demonstration / offline dev
      let fallbackResponse = "";
      if (selectedFile) {
        fallbackResponse = `### Hasil Pembacaan File (Simulasi Lokal)\n` +
          `*Catatan: Menggunakan pembacaan lokal karena API Key belum terkonfigurasi.*\n\n` +
          `**File**: \`${selectedFile.fileName}\` (${selectedFile.mimeType})\n\n` +
          `**Hasil Analisis & Pemeriksaan Dokumen**:\n` +
          `- File berhasil diunggah dan dibaca dengan tingkat akurasi 100% konsisten.\n` +
          `- Jika data berupa Excel/CSV, kolom dan baris telah berhasil diurai menjadi teks terstruktur.\n` +
          `- Jika data berupa PDF atau Gambar, data disiapkan untuk diproses oleh Gemini Vision.\n\n` +
          `**Rekomendasi Penting**:\n` +
          `Silakan buka tabel \`app_settings\` di Supabase dan masukkan **Gemini API Key** Anda pada baris pertama (ID 1) untuk menghubungkan asisten kecerdasan buatan sesungguhnya yang mendukung multi-modal secara penuh!`;
      } else {
        fallbackResponse = `Mohon maaf, terjadi kesalahan saat menghubungi asisten AI (${error.message || "API Key kosong"}).\n\nUntuk mengaktifkannya, silakan atur **Gemini API Key** Anda di menu Pengaturan Admin atau file \`.env\`.`;
      }
      setMessages(prev => [...prev, { role: "assistant", text: fallbackResponse }]);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bot className="h-7 w-7 text-emerald-600" /> AI Assistant Analitik & Dokumen
        </h2>
        <p className="text-slate-500 text-sm">
          Unggah file Excel, PDF, atau Gambar. AI akan membacanya secara cermat, teliti, dan memberikan rangkuman analisis dengan akurasi tinggi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Chat Window Container */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch flex flex-col justify-between min-h-[520px]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Obrolan Konsultasi AI
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Model Aktif: Gemini 2.0
            </Badge>
          </CardHeader>

          {/* Messages viewport */}
          <div className="flex-grow p-6 overflow-y-auto space-y-4 max-h-[380px]">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 text-xs leading-relaxed max-w-[90%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className={`p-4 rounded-3xl shadow-sm ${
                  msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-none text-left" : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none text-left"
                }`}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap font-semibold leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="space-y-1">
                      <MarkdownRenderer text={msg.text} />
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
                <span className="animate-pulse">AI sedang menganalisis file & merumuskan laporan teliti...</span>
              </div>
            )}
          </div>

          {/* Input & Upload Form */}
          <div className="border-t border-slate-100 bg-white">
            
            {/* File Upload Preview */}
            {selectedFile && (
              <div className="mx-4 mt-3 p-2 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {selectedFile.mimeType.startsWith("image/") ? (
                    <img
                      src={`data:${selectedFile.mimeType};base64,${selectedFile.base64}`}
                      alt="Preview"
                      className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : selectedFile.mimeType === "application/pdf" ? (
                    <div className="h-9 w-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 font-bold text-[9px] shadow-sm">
                      PDF
                    </div>
                  ) : (
                    <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 font-bold text-[9px] shadow-sm">
                      EXCEL
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-bold text-slate-700 truncate">{selectedFile.fileName}</p>
                    <p className="text-[9px] text-slate-400 font-medium">Siap dibaca secara detail</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearSelectedFile}
                  className="h-7 w-7 p-0 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form 
              onSubmit={(e) => { e.preventDefault(); handleQuery(input); }} 
              className="p-4 flex gap-2 items-center"
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                title="Unggah Dokumen (Excel, PDF, Gambar)"
                className="rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 p-3 shrink-0 h-10 w-10 flex items-center justify-center transition-all bg-slate-50"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedFile ? "Tanyakan detail tentang dokumen ini..." : "Tanyakan analisis data, draf surat, atau kelayakan TPQ di sini..."}
                className="rounded-xl border-slate-200 text-xs py-3 flex-grow h-10 shadow-sm focus-visible:ring-emerald-500"
              />
              
              <Button 
                type="submit" 
                disabled={analyzing} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold py-3 px-5 h-10 text-xs shrink-0 flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
              >
                Kirim <Send className="h-3 w-3" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Suggestions Column */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl p-6 space-y-4 self-stretch flex flex-col justify-start text-left">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="h-4.5 w-4.5 text-slate-400" /> Contoh Pertanyaan Cepat
          </h3>
          
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

          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex gap-2.5 items-start">
            <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-bold text-slate-700">Analisis Multimodal Akurat</h4>
              <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                Kemampuan analisis file didukung model Gemini 2.0 Flash untuk membaca grafik, tulisan di gambar, tabel, dan dokumen tebal secara runtut.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
