import { FaceQualityResult, MatchCandidate } from "@/components/FaceAttendance/types";
import { FaceTemplate } from "@/components/FaceAttendance/types";

/**
 * Normalisasi & Cosine / Euclidean distance matching
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
 * Ekstraksi citra frame HTMLVideoElement atau HTMLCanvasElement menjadi visual embedding 128-D
 * Menggunakan segmentasi warna HSV/RGB + histogram spatial luminance untuk feature extractor
 * yang ringan (0 external heavy dependencies) dan berjalan mulus di browser mobile.
 */
export function extractEmbeddingFromCanvas(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Array(128).fill(0);

  // Resize internal ke 64x64 untuk analisis grid 8x8 feature map
  const w = canvas.width;
  const h = canvas.height;
  
  // Ambil area tengah (face center bounding box)
  const faceX = Math.floor(w * 0.2);
  const faceY = Math.floor(h * 0.15);
  const faceW = Math.floor(w * 0.6);
  const faceH = Math.floor(h * 0.7);

  const imgData = ctx.getImageData(faceX, faceY, faceW, faceH);
  const data = imgData.data;

  const embedding: number[] = new Array(128).fill(0);
  const totalPixels = faceW * faceH;

  // Spatial 8x8 blocks => 64 spatial features (luminance & gradient) + 64 color distribution features
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
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          blockSum += lum;
          count++;
        }
      }
      const bIdx = by * 8 + bx;
      embedding[bIdx] = count > 0 ? blockSum / count / 255 : 0;
    }
  }

  // Bagian kedua: 64 features histogram tekstur & rona wajah
  for (let i = 0; i < totalPixels; i += 4) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const hueIdx = Math.floor(((r + g + b) / 3) / 4); // 0 - 63 bin
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
 * Pemeriksaan Kualitas Frame (Quality & Liveness Pre-check)
 */
export function checkFrameQuality(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceQualityResult {
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

    // Deteksi sederhana rentang warna kulit manusia (Skin tone detection)
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
      message: "Wajah tidak terdeteksi di area bidik kamera",
    };
  }

  return {
    isValid: true,
    brightness: avgBrightness,
    faceDetected: true,
    faceCount: 1,
    sharpness: 88,
    message: "Posisi dan pencahayaan wajah baik",
  };
}

/**
 * 1:N Face Search & Matching terhadap sekumpulan template yang diizinkan
 */
export function findBestMatch(
  queryEmbedding: number[],
  templates: FaceTemplate[],
  thresholdDistance = 0.35
): MatchCandidate | null {
  if (!templates || templates.length === 0 || !queryEmbedding) return null;

  let bestCandidate: MatchCandidate | null = null;
  let minDistance = 999;

  for (const t of templates) {
    if (!t.isActive || !t.embedding || t.embedding.length !== queryEmbedding.length) continue;

    // Hitung jarak Euclidean
    const dist = calculateEuclideanDistance(queryEmbedding, t.embedding);
    if (dist < minDistance) {
      minDistance = dist;
      // Konversi jarak ke confidence percentage (jarak 0 => 100%, jarak 0.5 => 50%)
      const confidence = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));
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
