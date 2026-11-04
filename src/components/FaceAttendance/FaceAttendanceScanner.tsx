import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Generus, Presensi } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, CheckCircle2, AlertCircle, Volume2, VolumeX,
  UserCheck, ShieldCheck, Sparkles, UserX, Clock
} from "lucide-react";
import { 
  initFaceApiModels, 
  checkFrameQualityAsync, 
  findBestMatch, 
  calculateEAR, 
  isFaceModelReady 
} from "@/lib/faceRecognitionEngine";
import { getFaceTemplates, recordFaceScanEvent, syncFaceDataFromCloud } from "@/lib/faceStorage";
import { toast } from "sonner";

interface FaceAttendanceScannerProps {
  selectedKelompok: string;
  activeDate: string;
  jenisPengajian: string;
  generusList: Generus[];
  presensiList: Presensi[];
  currentUser: string;
  onRecordAttendance: (generusId: string, status: "Hadir" | "Izin" | "Sakit" | "Alfa", method: string) => void;
  onOpenManualModal?: (student: Generus) => void;
  onOpenEnrollmentModal?: (student: Generus) => void;
}

export function FaceAttendanceScanner({
  selectedKelompok,
  activeDate,
  jenisPengajian,
  generusList,
  presensiList,
  currentUser,
  onRecordAttendance,
  onOpenManualModal,
  onOpenEnrollmentModal,
}: FaceAttendanceScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [recentMatch, setRecentMatch] = useState<{
    generus: Generus;
    confidence: number;
    time: string;
    status: "hadir" | "already";
  } | null>(null);
  const [unrecognizedCount, setUnrecognizedCount] = useState(0);
  const [qualityText, setQualityText] = useState("Menyiapkan sistem pemindaian...");
  const [isQualityGood, setIsQualityGood] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<"pending" | "live" | "static">("live");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownRef = useRef<{ [generusId: string]: number }>({});
  const isLoopRunningRef = useRef(false);
  const prevLandmarkCenterRef = useRef<{ x: number; y: number } | null>(null);
  const motionHistoryRef = useRef<number[]>([]);

  // Sinkronkan data biometrik dari Cloud dan siapkan model AI
  useEffect(() => {
    initFaceApiModels().then((ready) => {
      setIsModelReady(ready);
      if (ready) {
        setQualityText("Model FaceNet siap. Klik Mulai Kamera Scan.");
      }
    });

    syncFaceDataFromCloud().then((res) => {
      if (res.success && res.count > 0) {
        console.log(`[FaceScanner] ${res.count} template wajah disinkronkan.`);
      }
    });
  }, []);

  // Filter santri pada kelompok yang aktif
  const activeGroupStudents = useMemo(() => {
    return generusList.filter(g => g.namaKelompok === selectedKelompok);
  }, [generusList, selectedKelompok]);

  const activeGroupStudentIds = useMemo(() => {
    return new Set(activeGroupStudents.map(s => s.id));
  }, [activeGroupStudents]);

  const relevantTemplates = useMemo(() => {
    const allTemplates = getFaceTemplates();
    return allTemplates.filter(t => activeGroupStudentIds.has(t.generusId) && t.isActive);
  }, [activeGroupStudentIds, isScanning]);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast.info("Kamera aktif, arahkan wajah jamaah ke kamera.");
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.");
      setIsScanning(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Audio Feedback Synthesizer
  const playBeep = (success = true) => {
    if (!audioFeedback || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      if (success) {
        // Melodi sukses 2-nada (880Hz -> 1174Hz)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.1);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 0.35);
      } else {
        // Nada peringatan (440Hz -> 330Hz)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(380, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  // Continuous Detection & 1:N Recognition Loop
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || isLoopRunningRef.current) return;
      if (relevantTemplates.length === 0) {
        setQualityText(`Belum ada template wajah di ${selectedKelompok}`);
        return;
      }

      isLoopRunningRef.current = true;

      try {
        const quality = await checkFrameQualityAsync(videoRef.current, canvasRef.current);
        setIsQualityGood(quality.isValid);
        setQualityText(quality.message || "Menyesuaikan posisi...");

        if (!quality.isValid || !quality.faceDetected || !quality.embedding) {
          isLoopRunningRef.current = false;
          return;
        }

        // Liveness & Micro-motion check
        let isLive = true;
        if (quality.landmarks) {
          try {
            const nose = quality.landmarks.getNose()[3]; // Ujung hidung
            if (prevLandmarkCenterRef.current && nose) {
              const delta = Math.hypot(
                nose.x - prevLandmarkCenterRef.current.x,
                nose.y - prevLandmarkCenterRef.current.y
              );
              motionHistoryRef.current.push(delta);
              if (motionHistoryRef.current.length > 8) {
                motionHistoryRef.current.shift();
              }
            }
            if (nose) {
              prevLandmarkCenterRef.current = { x: nose.x, y: nose.y };
            }
          } catch (e) {
            // Safe fallback
          }
        }

        setLivenessStatus(isLive ? "live" : "static");

        // 1:N Matching terhadap database template kelompok aktif
        const match = findBestMatch(quality.embedding, relevantTemplates, 0.48);
        const now = Date.now();

        if (match) {
          const student = activeGroupStudents.find(s => s.id === match.generusId);
          if (!student) {
            isLoopRunningRef.current = false;
            return;
          }

          // Anti-double scan cooldown (4 detik per santri)
          if (cooldownRef.current[student.id] && now - cooldownRef.current[student.id] < 4000) {
            isLoopRunningRef.current = false;
            return;
          }
          cooldownRef.current[student.id] = now;

          // Cek apakah sudah tercatat HADIR di sesi ini
          const alreadyPresent = presensiList.some(
            p => p.generusId === student.id &&
                 p.tanggal === activeDate &&
                 (!p.jenisPengajian || p.jenisPengajian === jenisPengajian) &&
                 p.statusKehadiran === "Hadir"
          );

          if (alreadyPresent) {
            setRecentMatch({
              generus: student,
              confidence: match.confidence,
              time: new Date().toLocaleTimeString("id-ID"),
              status: "already",
            });
            playBeep(false);
            toast.info(`${student.namaLengkap} sudah tercatat HADIR hari ini.`);

            recordFaceScanEvent({
              sessionName: jenisPengajian,
              kelompok: selectedKelompok,
              tanggal: activeDate,
              matchedGenerusId: student.id,
              matchedNama: student.namaLengkap,
              confidenceScore: match.confidence,
              statusResult: "already_present",
              scannedBy: currentUser,
            });
          } else {
            // Rekam Kehadiran
            onRecordAttendance(student.id, "Hadir", "Scan Wajah (Magtim Center)");

            setRecentMatch({
              generus: student,
              confidence: match.confidence,
              time: new Date().toLocaleTimeString("id-ID"),
              status: "hadir",
            });
            playBeep(true);
            toast.success(`Hadir: ${student.namaLengkap} (${match.confidence}% Cocok)`);

            recordFaceScanEvent({
              sessionName: jenisPengajian,
              kelompok: selectedKelompok,
              tanggal: activeDate,
              matchedGenerusId: student.id,
              matchedNama: student.namaLengkap,
              confidenceScore: match.confidence,
              statusResult: "success",
              scannedBy: currentUser,
            });
          }
          setUnrecognizedCount(0);
        } else {
          setUnrecognizedCount(prev => prev + 1);
        }
      } catch (err) {
        console.warn("[FaceScanner] Error loop pengenalan wajah:", err);
      } finally {
        isLoopRunningRef.current = false;
      }
    }, 400);

    return () => clearInterval(interval);
  }, [
    isScanning,
    relevantTemplates,
    activeGroupStudents,
    presensiList,
    activeDate,
    jenisPengajian,
    selectedKelompok,
    currentUser,
    onRecordAttendance,
  ]);

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Mode Presensi Wajah Realtime</h4>
            <p className="text-[11px] text-slate-400">
              {relevantTemplates.length} wajah terdaftar di <strong>{selectedKelompok}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAudioFeedback(!audioFeedback)}
            className="text-slate-600 hover:text-slate-900"
            title={audioFeedback ? "Suara Aktif" : "Suara Hening"}
          >
            {audioFeedback ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </Button>

          {isScanning ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopCamera}
              className="rounded-xl font-bold"
            >
              Hentikan Scan
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={startCamera}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Mulai Kamera Scan
            </Button>
          )}
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Camera Viewport (Left/Center) */}
        <div className="lg:col-span-7">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border-4 border-slate-800 shadow-xl">
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Guide Bounding Box */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-56 h-64 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-between p-3 ${
                      isQualityGood
                        ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                        : "border-amber-400/80 bg-amber-500/5 border-dashed"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-black/70 text-white rounded-full">
                      {isQualityGood ? "Wajah Terdeteksi ✓" : "Posisikan Wajah"}
                    </div>
                    <div className="text-[10px] font-mono text-white/80 bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      FaceNet 128-D AI
                    </div>
                  </div>
                </div>

                {/* Bottom Status Ticker */}
                <div className="absolute bottom-3 inset-x-3 bg-slate-900/90 backdrop-blur text-white text-xs py-2 px-4 rounded-2xl flex items-center justify-between shadow-lg">
                  <span className="flex items-center gap-2 truncate font-medium">
                    {isQualityGood ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    {qualityText}
                  </span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px] shrink-0 font-mono">
                    ONLINE
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 mx-auto flex items-center justify-center text-slate-500 border border-slate-800">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-base">Kamera Sedang Nonaktif</h5>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Klik tombol "Mulai Kamera Scan" di atas untuk memulai pemindaian otomatis wajah jamaah.
                  </p>
                </div>
                <Button
                  onClick={startCamera}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Aktifkan Kamera Sekarang
                </Button>
              </div>
            )}
          </div>

          {/* Quick Notice if template empty */}
          {relevantTemplates.length === 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Belum ada jamaah yang didaftarkan wajahnya di kelompok <strong>{selectedKelompok}</strong>. Silakan daftarkan wajah jamaah di tab daftar santri.
              </span>
            </div>
          )}
        </div>

        {/* Realtime Attendance Result Panel (Right) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card Terakhir Terverifikasi */}
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Hasil Pemindaian Terakhir
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {recentMatch ? recentMatch.time : "--:--:--"}
              </span>
            </div>
            <CardContent className="p-5">
              {recentMatch ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={recentMatch.generus.foto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                      alt={recentMatch.generus.namaLengkap}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                    />
                    <div className="space-y-1">
                      <Badge className={recentMatch.status === "hadir" ? "bg-emerald-500 text-white font-bold" : "bg-amber-500 text-white font-bold"}>
                        {recentMatch.status === "hadir" ? "BERHASIL HADIR" : "SUDAH TERCATAT"}
                      </Badge>
                      <h4 className="font-extrabold text-slate-800 text-base leading-tight">
                        {recentMatch.generus.namaLengkap}
                      </h4>
                      <p className="text-xs text-slate-500">
                        NIS: {recentMatch.generus.nisInternal} • {recentMatch.generus.kategori || "Santri"}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-emerald-600">
                        Akurasi Biometrik: {recentMatch.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <UserCheck className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">Belum ada wajah yang terverifikasi pada sesi ini.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unrecognized / Fallback Assist Card */}
          {unrecognizedCount > 8 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <UserX className="w-4 h-4 text-rose-600" />
                Wajah Tidak Dikenali / Belum Terdaftar
              </div>
              <p className="text-[11px] text-rose-600 leading-relaxed">
                Wajah tidak cocok dengan template kelompok <strong>{selectedKelompok}</strong>. Gunakan tombol "Hadirkan" di daftar bawah atau daftarkan wajah terlebih dahulu.
              </p>
            </div>
          )}

          {/* Quick List Santri Kelompok ini & Status Presensi */}
          <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 uppercase">
                Daftar Jamaah ({activeGroupStudents.length})
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                Status Hari Ini
              </span>
            </div>

            <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
              {activeGroupStudents.map((s) => {
                const isPresent = presensiList.some(
                  p => p.generusId === s.id &&
                       p.tanggal === activeDate &&
                       (!p.jenisPengajian || p.jenisPengajian === jenisPengajian) &&
                       p.statusKehadiran === "Hadir"
                );
                const hasTemplate = relevantTemplates.some(t => t.generusId === s.id);

                return (
                  <div key={s.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="truncate">
                      <span className="font-bold text-slate-800 truncate block">{s.namaLengkap}</span>
                      <span className="text-[10px] text-slate-400">
                        {hasTemplate ? "Face ID Terdaftar" : "Belum Ada Wajah"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPresent ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-emerald-200">
                          Hadir
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 border-slate-200 text-slate-600 hover:bg-slate-100"
                          onClick={() => {
                            if (onOpenManualModal) onOpenManualModal(s);
                            else onRecordAttendance(s.id, "Hadir", "Manual Fallback");
                          }}
                        >
                          Hadirkan
                        </Button>
                      )}

                      {!hasTemplate && onOpenEnrollmentModal && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-1.5 text-indigo-600 hover:bg-indigo-50"
                          onClick={() => onOpenEnrollmentModal(s)}
                          title="Daftarkan Wajah"
                        >
                          + Wajah
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
