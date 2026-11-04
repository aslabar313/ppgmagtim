import { FaceQualityResult, MatchCandidate } from "@/components/FaceAttendance/types";
import { FaceTemplate } from "@/components/FaceAttendance/types";

/**
 * Singleton state untuk Face-API client
 */
let faceapi: any = null;
let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Load face-api secara dinamis di browser (client-side only)
 * Mencegah error SSR saat build Vite / Nitro / TanStack Start
 */
export async function getFaceApi(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (faceapi) return faceapi;

  try {
    const mod = await import("@vladmandic/face-api");
    faceapi = mod.default || mod;
    return faceapi;
  } catch (err) {
    console.error("[FaceEngine] Gagal mengimpor @vladmandic/face-api:", err);
    return null;
  }
}

/**
 * Inisialisasi model pre-trained dari /models/ (100% Offline Capability)
 */
export async function initFaceApiModels(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const api = await getFaceApi();
      if (!api) return false;

      const MODEL_URL = "/models";
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log("[FaceEngine] Model TinyFace + Landmark68 + FaceNet 128-D siap digunakan.");
      return true;
    } catch (err) {
      console.warn("[FaceEngine] Gagal memuat neural network dari /models, menggunakan model fallback:", err);
      modelsLoaded = false;
      return false;
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

export function isFaceModelReady(): boolean {
  return modelsLoaded;
}

/**
 * Normalisasi & Jarak Euclidean (L2 Distance) untuk FaceNet
 * Nilai 0.0 = Identik persis, Nilai < 0.45 = Orang yang sama (High Confidence)
 */
export function calculateEuclideanDistance(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 999;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function calculateCosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

/**
 * Hitung Eye Aspect Ratio (EAR) untuk deteksi kedipan (Liveness / Anti-spoofing)
 */
export function calculateEAR(eyePoints: { x: number; y: number }[]): number {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.hypot(p1.x - p2.x, p1.y - p2.y);

  // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
  const vertical1 = dist(eyePoints[1], eyePoints[5]);
  const vertical2 = dist(eyePoints[2], eyePoints[4]);
  const horizontal = dist(eyePoints[0], eyePoints[3]);

  if (horizontal === 0) return 0.3;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Pemeriksaan Kualitas Frame dan Deteksi Wajah (Hybrid AI + Heuristic Fallback)
 */
export async function checkFrameQualityAsync(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<FaceQualityResult & { embedding?: number[]; landmarks?: any }> {
  if (!video.videoWidth || !video.videoHeight) {
    return {
      isValid: false,
      brightness: 0,
      faceDetected: false,
      faceCount: 0,
      sharpness: 0,
      message: "Kamera belum siap atau terputus",
    };
  }

  // Sinkronkan dimensi canvas
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      isValid: false,
      brightness: 0,
      faceDetected: false,
      faceCount: 0,
      sharpness: 0,
      message: "Canvas kontek tidak tersedia",
    };
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const api = await getFaceApi();
  if (api && modelsLoaded) {
    try {
      const options = new api.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      });

      const detection = await api
        .detectSingleFace(video, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        return {
          isValid: false,
          brightness: 120,
          faceDetected: false,
          faceCount: 0,
          sharpness: 60,
          message: "Arahkan wajah tegak lurus ke tengah lensa kamera",
        };
      }

      const box = detection.detection.box;
      const frameArea = video.videoWidth * video.videoHeight;
      const faceArea = box.width * box.height;
      const areaRatio = faceArea / Math.max(1, frameArea);

      // Cek jarak wajah
      if (areaRatio < 0.06) {
        return {
          isValid: false,
          brightness: 130,
          faceDetected: true,
          faceCount: 1,
          sharpness: 70,
          message: "Dekatkan posisi wajah Anda ke kamera",
        };
      }

      if (areaRatio > 0.75) {
        return {
          isValid: false,
          brightness: 130,
          faceDetected: true,
          faceCount: 1,
          sharpness: 70,
          message: "Terlalu dekat, mundurkan sedikit posisi wajah Anda",
        };
      }

      // Hitung luminansi pada bounding box wajah
      const fX = Math.max(0, Math.floor(box.x));
      const fY = Math.max(0, Math.floor(box.y));
      const fW = Math.min(canvas.width - fX, Math.floor(box.width));
      const fH = Math.min(canvas.height - fY, Math.floor(box.height));

      let avgBrightness = 128;
      if (fW > 0 && fH > 0) {
        const faceImgData = ctx.getImageData(fX, fY, fW, fH);
        let totalLum = 0;
        let count = 0;
        for (let i = 0; i < faceImgData.data.length; i += 16) {
          totalLum += 0.299 * faceImgData.data[i] + 0.587 * faceImgData.data[i + 1] + 0.114 * faceImgData.data[i + 2];
          count++;
        }
        avgBrightness = Math.round(totalLum / Math.max(1, count));
      }

      if (avgBrightness < 40) {
        return {
          isValid: false,
          brightness: avgBrightness,
          faceDetected: true,
          faceCount: 1,
          sharpness: 60,
          message: "Pencahayaan wajah terlalu redup",
        };
      }

      if (avgBrightness > 230) {
        return {
          isValid: false,
          brightness: avgBrightness,
          faceDetected: true,
          faceCount: 1,
          sharpness: 60,
          message: "Cahaya terlalu silau (overexposure)",
        };
      }

      const embedding = Array.from(detection.descriptor) as number[];

      return {
        isValid: true,
        brightness: avgBrightness,
        faceDetected: true,
        faceCount: 1,
        sharpness: Math.round(detection.detection.score * 100),
        message: "Wajah terdeteksi dengan kualitas prima",
        embedding,
        landmarks: detection.landmarks,
      };
    } catch (e) {
      console.warn("[FaceEngine] Gagal mengeksekusi neural net, fallback ke deteksi kanvas:", e);
    }
  }

  // Fallback: Analisis frame berbasis piksel kanvas
  return checkFrameQualitySync(video, canvas);
}

/**
 * Pemeriksaan Kualitas Frame Sinkron (Fallback jika Neural Net belum siap)
 */
export function checkFrameQuality(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceQualityResult {
  return checkFrameQualitySync(video, canvas);
}

function checkFrameQualitySync(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceQualityResult {
  if (!video.videoWidth || !video.videoHeight) {
    return {
      isValid: false,
      brightness: 0,
      faceDetected: false,
      faceCount: 0,
      sharpness: 0,
      message: "Kamera belum siap atau terputus",
    };
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      isValid: false,
      brightness: 0,
      faceDetected: false,
      faceCount: 0,
      sharpness: 0,
      message: "Canvas kontek tidak tersedia",
    };
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Periksa area tengah
  const cx = Math.floor(canvas.width * 0.25);
  const cy = Math.floor(canvas.height * 0.2);
  const cw = Math.floor(canvas.width * 0.5);
  const ch = Math.floor(canvas.height * 0.6);

  const imgData = ctx.getImageData(cx, cy, cw, ch);
  const data = imgData.data;

  let totalLum = 0;
  let skinPixelCount = 0;
  const sampleStep = 8;
  let totalSamples = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLum += lum;
    totalSamples++;

    if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 10) {
      skinPixelCount++;
    }
  }

  const avgBrightness = Math.round(totalLum / Math.max(1, totalSamples));
  const skinRatio = skinPixelCount / Math.max(1, totalSamples);

  if (avgBrightness < 45) {
    return {
      isValid: false,
      brightness: avgBrightness,
      faceDetected: skinRatio > 0.15,
      faceCount: 1,
      sharpness: 70,
      message: "Pencahayaan terlalu redup, arahkan ke tempat yang lebih terang",
    };
  }

  if (avgBrightness > 220) {
    return {
      isValid: false,
      brightness: avgBrightness,
      faceDetected: skinRatio > 0.15,
      faceCount: 1,
      sharpness: 70,
      message: "Cahaya terlalu silau (overexposure)",
    };
  }

  if (skinRatio < 0.12) {
    return {
      isValid: false,
      brightness: avgBrightness,
      faceDetected: false,
      faceCount: 0,
      sharpness: 50,
      message: "Arahkan wajah tepat di area bidik kamera",
    };
  }

  return {
    isValid: true,
    brightness: avgBrightness,
    faceDetected: true,
    faceCount: 1,
    sharpness: 88,
    message: modelsLoaded ? "Posisi wajah pas" : "Menyiapkan AI biometrik...",
  };
}

/**
 * Ekstraksi Vektor Embedding Biometrik 128-D
 * Prioritaskan Neural Network FaceNet (descriptor), fallback ke Canvas Spatial-Luminance
 */
export async function extractEmbedding(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement
): Promise<number[]> {
  const api = await getFaceApi();
  if (api && modelsLoaded) {
    try {
      const options = new api.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      });

      const detection = await api
        .detectSingleFace(videoOrCanvas, options)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection && detection.descriptor) {
        return Array.from(detection.descriptor) as number[];
      }
    } catch (err) {
      console.warn("[FaceEngine] Neural extraction gagal, menggunakan fallback canvas:", err);
    }
  }

  // Jika input adalah VideoElement, render ke kanvas terlebih dahulu
  let canvas: HTMLCanvasElement;
  if (videoOrCanvas instanceof HTMLVideoElement) {
    canvas = document.createElement("canvas");
    canvas.width = videoOrCanvas.videoWidth || 640;
    canvas.height = videoOrCanvas.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(videoOrCanvas, 0, 0, canvas.width, canvas.height);
  } else {
    canvas = videoOrCanvas;
  }

  return extractEmbeddingFromCanvas(canvas);
}

/**
 * Ekstraksi 128-D kanvas sinkron (untuk backward compatibility)
 */
export function extractEmbeddingFromCanvas(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Array(128).fill(0);

  const w = canvas.width;
  const h = canvas.height;

  const faceX = Math.floor(w * 0.2);
  const faceY = Math.floor(h * 0.15);
  const faceW = Math.floor(w * 0.6);
  const faceH = Math.floor(h * 0.7);

  const imgData = ctx.getImageData(faceX, faceY, faceW, faceH);
  const data = imgData.data;

  const embedding: number[] = new Array(128).fill(0);
  const totalPixels = faceW * faceH;

  const blockW = Math.max(1, Math.floor(faceW / 8));
  const blockH = Math.max(1, Math.floor(faceH / 8));

  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let blockSum = 0;
      let count = 0;
      const startX = bx * blockW;
      const startY = by * blockH;

      for (let y = startY; y < Math.min(startY + blockH, faceH); y++) {
        for (let x = startX; x < Math.min(startX + blockW, faceW); x++) {
          const idx = (y * faceW + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          blockSum += lum;
          count++;
        }
      }
      const bIdx = by * 8 + bx;
      embedding[bIdx] = count > 0 ? blockSum / count / 255 : 0;
    }
  }

  for (let i = 0; i < totalPixels; i += 4) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const hueIdx = Math.floor((r + g + b) / 3 / 4);
    if (hueIdx >= 0 && hueIdx < 64) {
      embedding[64 + hueIdx] += 1;
    }
  }

  // Normalisasi L2 vector agar magnitude = 1
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < 128; i++) {
      embedding[i] = Number((embedding[i] / norm).toFixed(5));
    }
  }

  return embedding;
}

/**
 * 1:N Face Search & Matching terhadap sekumpulan template yang diizinkan
 * FaceNet L2 Distance Threshold:
 * - Distance <= 0.45: Sangat Akurat / Identik
 * - Distance <= 0.52: Cocok Normal
 * - Distance > 0.55: Berbeda
 */
export function findBestMatch(
  queryEmbedding: number[],
  templates: FaceTemplate[],
  thresholdDistance = 0.48
): MatchCandidate | null {
  if (!templates || templates.length === 0 || !queryEmbedding) return null;

  let bestCandidate: MatchCandidate | null = null;
  let minDistance = 999;

  for (const t of templates) {
    if (!t.isActive || !t.embedding || t.embedding.length !== queryEmbedding.length) continue;

    const dist = calculateEuclideanDistance(queryEmbedding, t.embedding);
    if (dist < minDistance) {
      minDistance = dist;
      // Konversi jarak euclidean (0..0.6) ke rentang persentase confidence 0..100%
      const confidence = Math.max(0, Math.min(100, Math.round((1 - dist / 0.6) * 100)));
      bestCandidate = {
        generusId: t.generusId,
        distance: dist,
        confidence,
      };
    }
  }

  if (bestCandidate && bestCandidate.distance <= thresholdDistance) {
    return bestCandidate;
  }

  return null;
}
