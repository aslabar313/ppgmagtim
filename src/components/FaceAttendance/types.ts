export interface FaceEnrollment {
  id: string;
  generusId: string;
  status: "active" | "inactive" | "revoked";
  modelVersion: string;
  enrolledBy: string;
  consentAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaceTemplate {
  id: string;
  enrollmentId: string;
  generusId: string;
  embedding: number[];
  qualityScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface FaceScanEvent {
  id: string;
  sessionName: string;
  kelompok: string;
  tanggal: string;
  matchedGenerusId?: string;
  matchedNama?: string;
  confidenceScore?: number;
  statusResult: "success" | "already_present" | "unrecognized" | "poor_quality" | "manual_fallback";
  scannedBy?: string;
  deviceInfo?: string;
  createdAt: string;
}

export interface AttendanceCorrection {
  id: string;
  presensiId: string;
  generusId: string;
  oldStatus: string;
  newStatus: string;
  reason: string;
  correctedBy: string;
  createdAt: string;
}

export interface FaceQualityResult {
  isValid: boolean;
  brightness: number; // 0 - 255
  faceDetected: boolean;
  faceCount: number;
  sharpness: number;
  message?: string;
}

export interface MatchCandidate {
  generusId: string;
  distance: number;
  confidence: number; // 0 - 100%
}
