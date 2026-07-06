import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, Copy, Terminal, Link, Globe, Shield } from "lucide-react";
import { toast } from "sonner";

export function APIDocsPanel() {
  const [activeEndpoint, setActiveEndpoint] = useState("login");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Contoh cURL berhasil disalin ke clipboard!");
  };

  const endpoints = [
    {
      id: "login",
      method: "POST",
      path: "/api/v1/auth/login",
      desc: "Autentikasi operator SSO untuk mendapatkan token JWT Bearer.",
      req: `{\n  "username": "superadmin",\n  "password": "encrypted_password_hash"\n}`,
      res: `{\n  "success": true,\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "user": {\n    "username": "superadmin",\n    "role": "Super Admin"\n  }\n}`
    },
    {
      id: "generus",
      method: "GET",
      path: "/api/v1/generus",
      desc: "Mengambil daftar seluruh santri generus binaan dengan filter wilayah.",
      req: "None (Query params: ?tpq_id=klp-1&page=1)",
      res: `{\n  "success": true,\n  "data": [\n    {\n      "id": "g-1",\n      "nis_internal": "NIS-2026001",\n      "nama_lengkap": "Ahmad Bagus Pratama",\n      "nama_kelompok": "TPQ Al-Hikmah Kelompok 1"\n    }\n  ],\n  "pagination": {\n    "total_records": 550\n  }\n}`
    },
    {
      id: "transaksi",
      method: "POST",
      path: "/api/v1/keuangan/transaksi",
      desc: "Pencatatan transaksi SPP, Infaq, atau Donasi digital baru.",
      req: `{\n  "tpq_id": "klp-1",\n  "kategori": "SPP",\n  "tipe": "Pemasukan",\n  "jumlah": 150000,\n  "metode_pembayaran": "Transfer Bank"\n}`,
      res: `{\n  "success": true,\n  "transaction_id": "tx-98765",\n  "status": "Verified"\n}`
    },
    {
      id: "whatsapp",
      method: "POST",
      path: "/api/v1/whatsapp/send",
      desc: "Kirim siaran notifikasi WhatsApp Gateway melalui API Fonnte/Wablas.",
      req: `{\n  "recipient_number": "081234567890",\n  "message_text": "Assalamu'alaikum Yth Wali Santri..."\n}`,
      res: `{\n  "success": true,\n  "message_id": "msg-99887",\n  "status": "Sent"\n}`
    }
  ];

  const active = endpoints.find(e => e.id === activeEndpoint) || endpoints[0];
  const curlCmd = `curl -X ${active.method} \\
  https://api.simtpq-magetan.net${active.path} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  ${active.method === "POST" ? `-d '${active.req}'` : ""}`;

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-800">REST API & Integrasi Eksternal</h2>
        <p className="text-slate-500 text-sm">Dokumentasi integrasi API untuk menghubungkan platform SIM TPQ dengan aplikasi Android/iOS mobile, Google Calendar, dan Payment Gateway.</p>
      </div>

      {/* Info card banner */}
      <Card className="bg-slate-900 border-slate-800 shadow-sm rounded-3xl p-6 text-white flex flex-col sm:flex-row items-center gap-6 justify-between">
        <div className="space-y-2 flex-1">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><Shield className="h-4.5 w-4.5 text-emerald-500" /> Keamanan API Bearer Token JWT</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xl font-medium">
            Seluruh permintaan HTTP ke API SIM TPQ wajib menyertakan token JWT pada header otentikasi. Token didapatkan melalui pemanggilan endpoint login operator SSO.
          </p>
        </div>
        <Button onClick={() => toast.success("Kunci API baru (API Key) didelegasikan!")} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-6 rounded-xl shrink-0 flex items-center gap-1.5">
          <Key className="h-4 w-4" /> Dapatkan API Key
        </Button>
      </Card>

      {/* Layout documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Endpoint navigation menu */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden self-stretch">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="font-display text-sm font-bold text-slate-800 flex items-center gap-1.5"><Globe className="h-4.5 w-4.5 text-slate-500" /> Rute Endpoint v1</CardTitle>
          </CardHeader>
          <div className="p-0 divide-y divide-slate-100">
            {endpoints.map(e => (
              <button
                key={e.id}
                onClick={() => setActiveEndpoint(e.id)}
                className={`w-full p-4 text-left transition-colors flex items-center justify-between ${
                  activeEndpoint === e.id ? "bg-emerald-50/50 border-r-4 border-emerald-600" : "hover:bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge className={`font-bold text-[8px] rounded px-1.5 py-0.5 ${
                      e.method === "POST" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>{e.method}</Badge>
                    <span className="font-mono text-[10px] text-slate-700 font-bold">{e.path}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[200px]">{e.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Dynamic cURL and JSON code view console */}
        <Card className="lg:col-span-8 bg-slate-950 text-slate-300 border-slate-850 shadow-inner rounded-3xl p-6 space-y-4 self-stretch flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-850 pb-4">
            <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Terminal className="h-4.5 w-4.5 text-emerald-500" /> Konsol Uji Pemanggilan (cURL)</h3>
            <Button onClick={() => handleCopy(curlCmd)} variant="ghost" size="sm" className="text-slate-400 hover:text-white rounded-lg text-xs gap-1 py-1 px-2.5">
              <Copy className="h-3.5 w-3.5" /> Salin cURL
            </Button>
          </div>

          {/* cURL Display */}
          <pre className="bg-slate-900/50 p-4 border border-slate-850 rounded-2xl text-[10px] font-mono leading-relaxed text-left whitespace-pre-wrap select-all font-bold text-slate-400">
            {curlCmd}
          </pre>

          {/* Request and response structure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Payload Request Body</span>
              <pre className="bg-slate-900/50 p-4 border border-slate-850 rounded-2xl text-[9px] font-mono leading-relaxed text-left text-slate-400 select-all font-bold">
                {active.req}
              </pre>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Payload Response Body</span>
              <pre className="bg-slate-900/50 p-4 border border-slate-850 rounded-2xl text-[9px] font-mono leading-relaxed text-left text-slate-400 select-all font-bold">
                {active.res}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
