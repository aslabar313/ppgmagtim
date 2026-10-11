import React, { useState, useRef, useEffect } from "react";
import { Generus } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, AlertTriangle, Trash2, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { checkFrameQuality, extractEmbeddingFromCanvas } from "@/lib/faceRecognitionEngine";
import { enrollGenerusFace, deleteFaceEnrollment, getFaceEnrollments } from "@/lib/faceStorage";
import { toast } from "sonner";

interface FaceEnrollmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  generus: Generus | null;
  currentUser: string;
  onEnrolled?: () => void;
}

export function FaceEnrollmentDialog({
  isOpen,
  onClose,
  generus,
  currentUser,
  onEnrolled,
}: FaceEnrollmentDialogProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualityFeedback, setQualityFeedback] = useState<string>("Arahkan wajah ke kamera");
  const [isFaceValid, setIsFaceValid] = useState(false);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (generus && isOpen) {
      const enrollments = getFaceEnrollments();
      const existing = enrollments.find(e => e.generusId === generus.id && e.status === "active");
      setIsAlreadyEnrolled(!!existing);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [generus, isOpen]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Gagal membuka kamera. Pastikan izin kamera aktif.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Frame check interval
  useEffect(() => {
    if (!isOpen || !isCameraActive) return;

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const quality = checkFrameQuality(videoRef.current, canvasRef.current);
        setIsFaceValid(quality.isValid);
        setQualityFeedback(quality.message || "Posisi wajah pas");
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen, isCameraActive]);

  const handleCaptureAndEnroll = () => {
    if (!generus || !canvasRef.current || !videoRef.current) return;
    setIsProcessing(true);

    try {
      const quality = checkFrameQuality(videoRef.current, canvasRef.current);
      if (!quality.isValid) {
        toast.error("Kualitas wajah belum memadai: " + (quality.message || "Ulangi lagi"));
        setIsProcessing(false);
        return;
      }

      const embedding = extractEmbeddingFromCanvas(canvasRef.current);
      enrollGenerusFace(generus.id, embedding, currentUser, quality.sharpness / 100);

      toast.success(`Wajah ${generus.namaLengkap} berhasil didaftarkan!`);
      setIsAlreadyEnrolled(true);
      if (onEnrolled) onEnrolled();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Enrollment error:", err);
      toast.error("Terjadi kesalahan saat menyimpan data biometrik.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTemplate = () => {
    if (!generus) return;
    if (confirm(`Hapus template wajah ${generus.namaLengkap}? Jamaah perlu didaftarkan ulang jika ingin scan wajah.`)) {
      deleteFaceEnrollment(generus.id);
      setIsAlreadyEnrolled(false);
      toast.success("Template biometrik berhasil dihapus.");
      if (onEnrolled) onEnrolled();
    }
  };

  if (!generus) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Registrasi Wajah (Enrollment)
            </DialogTitle>
            {isAlreadyEnrolled ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Terdaftar</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-500">Belum Terdaftar</Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Daftarkan pola wajah <strong>{generus.namaLengkap}</strong> ({generus.namaKelompok}) untuk presensi otomatis.
          </DialogDescription>
        </DialogHeader>

        {/* Camera Viewport */}
        <div className="relative mt-3 rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border-2 border-slate-100 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Oval Face Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center ${
                isFaceValid
                  ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : "border-amber-400/80 bg-amber-500/5 border-dashed"
              }`}
            >
              <div className="text-[11px] font-bold px-3 py-1 bg-black/60 text-white rounded-full backdrop-blur-sm shadow">
                {isFaceValid ? "Posisi Sesuai ✓" : "Posisikan Wajah Disini"}
              </div>
            </div>
          </div>

          {/* Feedback Banner */}
          <div className="absolute bottom-2 inset-x-2 bg-slate-900/85 backdrop-blur text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              {isFaceValid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              {qualityFeedback}
            </span>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Privasi Terjamin:</strong> Sistem hanya menyimpan vektor embedding matematis (bukan foto mentah), sesuai standar UU PDP.
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {isAlreadyEnrolled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteTemplate}
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Hapus Template
            </Button>
          )}

          <Button
            type="button"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            disabled={!isFaceValid || isProcessing}
            onClick={handleCaptureAndEnroll}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Mengekstrak Vektor...
              </>
            ) : isAlreadyEnrolled ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Perbarui Template Wajah
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Daftarkan Wajah Sekarang
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
