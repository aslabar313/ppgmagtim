import React, { useState, useEffect, useMemo } from "react";
import {
  MonevPeriod,
  MonevMonitoringItem,
  MonevAgendaCompletionStatus,
  DesaSubmissionSummary,
  MASTER_WILAYAH_CONFIG,
  normalizeDesaName,
  formatDesaShort,
  formatDesaLabel,
  formatKelompokShort,
  formatKelompokLabel,
  formatKelompokDesaInline,
  formatApprovalStatusLabel
} from "@/lib/monev/types";
import {
  updateMonitoringItem,
  batchUpdateMonitoringItems,
  getDesaSubmissionSummary,
  canEditMonitoring,
  validateVillageAccess,
  canApproveReport,
  addEvidence,
  getEvidenceList
} from "@/lib/monev/monevService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Save,
  Building2,
  Sparkles,
  RefreshCw,
  Link2,
  Plus,
  ChevronDown,
  ChevronUp,
  Lock,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

interface MonevChecklistInputViewProps {
  activePeriod: MonevPeriod;
  loggedUser: string;
  userRole: string;
  userScope: string;
  selectedWilayah: string;
  selectedDesa: string;
  onChangeWilayah: (wilayah: string) => void;
  onChangeDesa: (desa: string) => void;
  onRefresh: () => void;
  onOpenSubmitModal: (desa: string) => void;
  onOpenVerifyModal: (desa: string) => void;
  onOpenCreateFollowUp?: (item: MonevMonitoringItem) => void;
}

const QUICK_REASONS = [
  "Jadwal bentrok kegiatan daerah/sekolah",
  "SDM / Pengajar berhalangan",
  "Koordinasi pengurus belum terlaksana",
  "Kehadiran santri/MM belum memenuhi kuota",
  "Sarana / tempat belum siap"
];

export function MonevChecklistInputView({
  activePeriod,
  loggedUser,
  userRole,
  userScope,
  selectedWilayah,
  selectedDesa,
  onChangeWilayah,
  onChangeDesa,
  onRefresh,
  onOpenSubmitModal,
  onOpenVerifyModal,
  onOpenCreateFollowUp
}: MonevChecklistInputViewProps) {
  // Determine default accessible village if selectedDesa === "Semua"
  const accessibleWilayahs = useMemo(() => {
    if (userRole === "Admin Desa" && userScope.startsWith("Desa ")) {
      return MASTER_WILAYAH_CONFIG.filter(w => w.wilayah === userScope);
    }
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      const norm = normalizeDesaName(userScope);
      return MASTER_WILAYAH_CONFIG.filter(w => w.desas.map(normalizeDesaName).includes(norm));
    }
    return MASTER_WILAYAH_CONFIG;
  }, [userRole, userScope]);

  const activeDesa = useMemo(() => {
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      return normalizeDesaName(userScope);
    }
    if (selectedDesa !== "Semua") {
      return normalizeDesaName(selectedDesa);
    }
    const firstWilayah = accessibleWilayahs[0] || MASTER_WILAYAH_CONFIG[0];
    return normalizeDesaName(firstWilayah.desas[0]);
  }, [selectedDesa, userRole, userScope, accessibleWilayahs]);

  const activeWilayahForDesa = useMemo(() => {
    const found = MASTER_WILAYAH_CONFIG.find(w =>
      w.desas.map(normalizeDesaName).includes(activeDesa)
    );
    return found ? found.wilayah : "Desa Selatan";
  }, [activeDesa]);

  // Autosave indicator state: "SAVED" | "SAVING" | "FAILED"
  const [saveState, setSaveState] = useState<"SAVED" | "SAVING" | "FAILED">("SAVED");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Local draft edits for notes/reasons before blur/autosave
  const [localNotes, setLocalNotes] = useState<Record<string, {
    kendala: string;
    catatanEvaluasi: string;
    laporanPelaksanaan: string;
    tindakLanjut: string;
    penanggungJawab: string;
    tanggalPelaksanaan: string;
    jumlahPeserta: number;
    ketercapaianPersen: number;
    evidenceUrlInput: string;
  }>>({});

  const summary: DesaSubmissionSummary = useMemo(() => {
    return getDesaSubmissionSummary(activePeriod.id, activeDesa, {
      username: loggedUser,
      role: userRole,
      scope: userScope
    });
  }, [activePeriod.id, activeDesa, lastSavedAt, activePeriod.status, loggedUser, userRole, userScope]);

  // Populate local notes when switching village or period
  useEffect(() => {
    const map: typeof localNotes = {};
    summary.items.forEach(item => {
      const existingLaporan = item.laporanPelaksanaan || item.catatanEvaluasi || "";
      map[item.id] = {
        kendala: item.kendala || "",
        catatanEvaluasi: existingLaporan,
        laporanPelaksanaan: existingLaporan,
        tindakLanjut: item.tindakLanjut || "",
        penanggungJawab: item.penanggungJawab || "",
        tanggalPelaksanaan: item.tanggalPelaksanaan || new Date().toISOString().slice(0, 10),
        jumlahPeserta: item.jumlahPeserta || 0,
        ketercapaianPersen: item.ketercapaianPersen || (item.statusKetercapaian === "PARTIAL" ? 50 : 0),
        evidenceUrlInput: ""
      };
    });
    setLocalNotes(map);
  }, [activePeriod.id, activeDesa, summary.items.length]);

  const canEdit = useMemo(() => {
    return canEditMonitoring(
      userRole,
      activePeriod.status,
      activeWilayahForDesa,
      activeDesa,
      userScope,
      summary.submission?.status
    );
  }, [userRole, activePeriod.status, activeWilayahForDesa, activeDesa, userScope, summary.submission?.status]);

  const accessCheck = useMemo(() => {
    return validateVillageAccess(userRole, userScope, activeDesa, activeWilayahForDesa);
  }, [userRole, userScope, activeDesa, activeWilayahForDesa]);

  const canApproveCurrentReport = useMemo(() => {
    return canApproveReport(userRole, userScope, activeDesa, activeWilayahForDesa).allowed;
  }, [userRole, userScope, activeDesa, activeWilayahForDesa]);

  // One-Tap Status Handler with immediate Autosave
  const handleOneTapStatus = (item: MonevMonitoringItem, nextStatus: MonevAgendaCompletionStatus) => {
    if (!canEdit) {
      toast.error("Data terkunci atau Anda tidak memiliki akses edit untuk desa ini.");
      return;
    }

    setSaveState("SAVING");
    try {
      const nextPersen =
        nextStatus === "COMPLETED" ? 100 :
        nextStatus === "PARTIAL" ? (localNotes[item.id]?.ketercapaianPersen > 0 && localNotes[item.id]?.ketercapaianPersen < 100 ? localNotes[item.id].ketercapaianPersen : 50) :
        0;

      updateMonitoringItem(
        item.id,
        {
          statusKetercapaian: nextStatus,
          terlaksana: nextStatus === "COMPLETED" || nextStatus === "PARTIAL",
          ketercapaianPersen: nextPersen,
          tanggalPelaksanaan: (nextStatus === "COMPLETED" || nextStatus === "PARTIAL")
            ? (item.tanggalPelaksanaan || new Date().toISOString().slice(0, 10))
            : undefined
        },
        loggedUser,
        userRole,
        userScope
      );

      // Auto-expand notes section if PARTIAL or NOT_COMPLETED so coordinator can tap/enter reason
      if (nextStatus === "PARTIAL" || nextStatus === "NOT_COMPLETED") {
        setExpandedItemId(item.id);
      }

      const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedAt(nowStr);
      setSaveState("SAVED");
      onRefresh();
    } catch (err: any) {
      setSaveState("FAILED");
      toast.error(err.message || "Gagal menyimpan perubahan otomatis");
    }
  };

  // Autosave notes/details for a single item
  const handleAutosaveItemDetails = (item: MonevMonitoringItem, overrideKendala?: string, overrideLaporan?: string) => {
    if (!canEdit) return;
    const draft = localNotes[item.id];
    if (!draft) return;

    setSaveState("SAVING");
    try {
      const kendalaVal = overrideKendala !== undefined ? overrideKendala : draft.kendala;
      const laporanVal = overrideLaporan !== undefined ? overrideLaporan : (draft.laporanPelaksanaan ?? draft.catatanEvaluasi);
      updateMonitoringItem(
        item.id,
        {
          kendala: kendalaVal,
          catatanEvaluasi: laporanVal,
          laporanPelaksanaan: laporanVal,
          tindakLanjut: draft.tindakLanjut,
          penanggungJawab: draft.penanggungJawab,
          tanggalPelaksanaan: draft.tanggalPelaksanaan,
          jumlahPeserta: Number(draft.jumlahPeserta) || 0,
          ketercapaianPersen: item.statusKetercapaian === "PARTIAL" ? Number(draft.ketercapaianPersen) || 50 : item.ketercapaianPersen
        },
        loggedUser,
        userRole,
        userScope
      );
      const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedAt(nowStr);
      setSaveState("SAVED");
      onRefresh();
    } catch (err: any) {
      setSaveState("FAILED");
      toast.error(err.message || "Gagal menyimpan catatan");
    }
  };

  // Save All Draft Explicitly
  const handleSaveAllDraft = () => {
    if (!canEdit) {
      toast.error("Tidak dapat menyimpan draft: Status laporan atau periode terkunci.");
      return;
    }
    setSaveState("SAVING");
    try {
      const payload = summary.items.map(item => {
        const d = localNotes[item.id];
        const st: MonevAgendaCompletionStatus = item.statusKetercapaian || (item.terlaksana ? "COMPLETED" : "NOT_STARTED");
        const laporanVal = d?.laporanPelaksanaan ?? d?.catatanEvaluasi ?? item.laporanPelaksanaan ?? item.catatanEvaluasi ?? "";
        return {
          itemId: item.id,
          judulAgenda: item.judulAgenda,
          nomorUrut: item.nomorUrut,
          kategori: item.kategori,
          isMandatory: item.isMandatory ?? true,
          statusKetercapaian: st,
          ketercapaianPersen: st === "COMPLETED" ? 100 : st === "PARTIAL" ? (d?.ketercapaianPersen || 50) : 0,
          tanggalPelaksanaan: d?.tanggalPelaksanaan || item.tanggalPelaksanaan,
          jumlahPeserta: d?.jumlahPeserta ?? item.jumlahPeserta,
          penanggungJawab: d?.penanggungJawab ?? item.penanggungJawab,
          kendala: d?.kendala ?? item.kendala,
          rencanaTindakan: d?.tindakLanjut ?? item.tindakLanjut,
          catatanEvaluasi: laporanVal,
          laporanPelaksanaan: laporanVal,
          evidenceUrls: item.evidenceUrls
        };
      });

      batchUpdateMonitoringItems(activePeriod.id, activeDesa, payload, loggedUser, userRole, userScope);
      const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedAt(nowStr);
      setSaveState("SAVED");
      onRefresh();
      toast.success(`Draft 18 agenda Kelompok/Desa ${activeDesa} berhasil disimpan!`);
    } catch (err: any) {
      setSaveState("FAILED");
      toast.error(err.message || "Gagal menyimpan draft");
    }
  };

  const handleAddEvidence = (item: MonevMonitoringItem) => {
    const url = localNotes[item.id]?.evidenceUrlInput?.trim();
    if (!url) {
      toast.error("Masukkan tautan/URL dokumentasi terlebih dahulu.");
      return;
    }
    try {
      addEvidence(
        {
          monitoringItemId: item.id,
          periodId: activePeriod.id,
          wilayah: item.wilayah,
          desa: item.desa,
          judulDokumentasi: `Dokumentasi ${item.judulAgenda}`,
          fileUrl: url,
          fileType: "link",
          uploadedBy: loggedUser
        },
        loggedUser,
        userRole,
        userScope
      );
      setLocalNotes(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], evidenceUrlInput: "" }
      }));
      const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedAt(nowStr);
      onRefresh();
      toast.success("Bukti dokumentasi berhasil ditambahkan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah bukti dokumentasi");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Desa & Kelompok Selector + Section 14 Format Header Laporan + Autosave Status */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Desa & Kelompok Selector (Section 11, 12, 13, 16) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-500">Desa :</span>
              <select
                value={activeWilayahForDesa}
                disabled={userRole === "Admin Kelompok" || userRole === "Pengajar" || (userRole === "Admin Desa" && userScope.startsWith("Desa "))}
                onChange={(e) => {
                  const nextW = e.target.value;
                  onChangeWilayah(nextW);
                  const foundW = MASTER_WILAYAH_CONFIG.find(w => w.wilayah === nextW);
                  if (foundW && foundW.desas.length > 0) {
                    onChangeDesa(foundW.desas[0]);
                  }
                }}
                className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
              >
                {accessibleWilayahs.map(w => (
                  <option key={w.wilayah} value={w.wilayah}>
                    {formatDesaShort(w.wilayah)} ({w.desas.length} Kelompok)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 rounded-2xl px-3.5 py-2">
              <span className="text-xs font-bold text-emerald-800">Kelompok :</span>
              <select
                value={activeDesa}
                disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                onChange={(e) => onChangeDesa(e.target.value)}
                className="text-sm font-black text-emerald-950 bg-transparent outline-none cursor-pointer"
              >
                {(MASTER_WILAYAH_CONFIG.find(w => w.wilayah === activeWilayahForDesa)?.desas || []).map(d => {
                  const norm = normalizeDesaName(d);
                  return (
                    <option key={norm} value={norm}>
                      {formatKelompokShort(norm)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Submission Status Badge (Section 19) */}
            <Badge className={`text-xs font-black px-3 py-1 rounded-xl ${
              summary.submission?.status === "VERIFIED" ? "bg-purple-100 text-purple-800 border border-purple-300" :
              summary.submission?.status === "SUBMITTED" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
              summary.submission?.status === "REJECTED" ? "bg-red-100 text-red-800 border border-red-300" :
              summary.submission?.status === "LOCKED" ? "bg-zinc-200 text-zinc-800 border border-zinc-400" :
              "bg-slate-100 text-slate-700 border border-slate-300"
            }`}>
              Status : {
                summary.submission?.status === "VERIFIED" ? "Disetujui (VERIFIED)" :
                summary.submission?.status === "SUBMITTED" ? "Menunggu Persetujuan (SUBMITTED)" :
                summary.submission?.status === "REJECTED" ? "Perlu Perbaikan (REJECTED)" :
                summary.submission?.status === "LOCKED" ? "Dikunci (LOCKED)" :
                summary.agendaTerisi > 0 ? "Draft" : "Belum Dimulai (NOT STARTED)"
              }
            </Badge>
          </div>

          {/* Autosave Indicator */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {saveState === "SAVING" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Menyimpan otomatis...
              </span>
            )}
            {saveState === "SAVED" && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tersimpan {lastSavedAt ? `(${lastSavedAt})` : "Otomatis"}
              </span>
            )}
            {saveState === "FAILED" && (
              <button
                type="button"
                onClick={handleSaveAllDraft}
                className="inline-flex items-center gap-1.5 text-xs font-black text-red-700 bg-red-50 border border-red-300 px-3 py-1.5 rounded-xl hover:bg-red-100"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Gagal Simpan — Ketuk Coba Lagi
              </button>
            )}
          </div>
        </div>

        {/* Section 14: Format Header Laporan */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-7 space-y-1 text-xs">
            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              MONEV AGENDA BULANAN PPG — {formatKelompokDesaInline(activeDesa, activeWilayahForDesa)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-slate-700 pt-1">
              <div><span className="text-slate-500 font-semibold">Periode :</span> <strong className="text-slate-900">{activePeriod.namaPeriode}</strong></div>
              <div><span className="text-slate-500 font-semibold">Desa :</span> <strong className="text-slate-900">{formatDesaShort(activeWilayahForDesa)}</strong></div>
              <div><span className="text-slate-500 font-semibold">Kelompok :</span> <strong className="text-slate-900">{formatKelompokShort(activeDesa)}</strong></div>
              <div><span className="text-slate-500 font-semibold">Admin :</span> <strong className="text-slate-900">{summary.submission?.submittedBy || summary.submission?.updatedBy || loggedUser}</strong></div>
              <div>
                <span className="text-slate-500 font-semibold">Status :</span>{" "}
                <strong className={
                  summary.submission?.status === "VERIFIED" ? "text-purple-700" :
                  summary.submission?.status === "SUBMITTED" ? "text-cyan-700" :
                  summary.submission?.status === "REJECTED" ? "text-red-700" :
                  "text-slate-900"
                }>
                  {summary.submission?.status === "VERIFIED" ? "DISETUJUI" : formatApprovalStatusLabel(summary.submission?.status)}
                </strong>
              </div>
              <div><span className="text-slate-500 font-semibold">Progress :</span> <strong className="text-emerald-700">{summary.avgKetercapaian}%</strong></div>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col sm:items-end justify-center gap-1 text-xs">
            <div className="text-[10px] font-bold text-slate-400">
              Report ID: <code className="text-slate-600 font-mono">{summary.reportId}</code>
            </div>
            {summary.submission?.status === "VERIFIED" && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 text-[11px] text-purple-900 space-y-0.5 w-full sm:w-auto">
                <div><span className="font-semibold">Status :</span> <strong>DISETUJUI</strong></div>
                <div><span className="font-semibold">Disetujui oleh :</span> <strong>{summary.submission.verifiedBy || "-"}</strong></div>
                <div><span className="font-semibold">Tanggal :</span> <strong>{summary.submission.verifiedAt ? new Date(summary.submission.verifiedAt).toLocaleString("id-ID") : "-"}</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* Rejection Alert if Rejected (Section 7) */}
        {summary.submission?.status === "REJECTED" && (
          <div className="bg-red-50 border-2 border-red-200 text-red-900 p-4 rounded-2xl text-xs flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-black text-sm text-red-900">
                STATUS LAPORAN: PERLU PERBAIKAN (REJECTED)
              </div>
              <div className="font-bold text-red-800 bg-white/80 border border-red-200 rounded-xl p-2.5 mt-1">
                <span className="uppercase text-[10px] font-black text-red-600 block mb-0.5">
                  ALASAN PENOLAKAN / REJECTION REASON:
                </span>
                {summary.submission.rejectionReason || summary.submission.catatanVerifikasi || "Mohon lengkapi catatan agenda yang belum terlaksana."}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-red-700 font-semibold pt-1">
                <span>Ditolak Oleh: <strong>{summary.submission.rejectedBy || summary.submission.verifiedBy || "Admin"}</strong></span>
                {summary.submission.rejectedAt && (
                  <span>Waktu: <strong>{new Date(summary.submission.rejectedAt).toLocaleString("id-ID")}</strong></span>
                )}
                <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                  Silakan perbaiki laporan agenda di bawah lalu klik RESUBMIT / SUBMIT LAPORAN
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Verified Info Box if Verified (Section 8 & 14) */}
        {summary.submission?.status === "VERIFIED" && (
          <div className="bg-purple-50 border-2 border-purple-200 text-purple-950 p-4 rounded-2xl text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-black text-sm text-purple-900">
                STATUS LAPORAN: DISETUJUI (VERIFIED)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white/80 border border-purple-200 rounded-xl px-3 py-2">
                  <span className="text-purple-600 font-bold block text-[10px] uppercase">Disetujui Oleh (Verified By)</span>
                  <span className="font-black text-slate-900">{summary.submission.verifiedBy || "-"}</span>
                </div>
                <div className="bg-white/80 border border-purple-200 rounded-xl px-3 py-2">
                  <span className="text-purple-600 font-bold block text-[10px] uppercase">Tanggal Persetujuan (Verified At)</span>
                  <span className="font-black text-slate-900">
                    {summary.submission.verifiedAt ? new Date(summary.submission.verifiedAt).toLocaleString("id-ID") : "-"}
                  </span>
                </div>
                <div className="bg-white/80 border border-purple-200 rounded-xl px-3 py-2">
                  <span className="text-purple-600 font-bold block text-[10px] uppercase">Catatan Persetujuan (Note)</span>
                  <span className="font-semibold text-slate-800">
                    {summary.submission.verificationNote || summary.submission.catatanVerifikasi || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Access Warning if Coordinator tries to view another village */}
        {!accessCheck.allowed && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{accessCheck.reason}</span>
          </div>
        )}

        {/* Completion Progress Bar & Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-100">
          <div className="lg:col-span-7 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-600">
                Penyelesaian Wajib (Completed Required):{" "}
                <strong className="text-slate-900">
                  {summary.completedMandatory} / {summary.totalMandatory} Agenda
                </strong>
              </span>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="text-emerald-700">✓ Selesai: {summary.completedMandatory}</span>
                <span className="text-amber-700">◐ Sebagian: {summary.agendaPartial}</span>
                <span className="text-rose-700">✕ Tidak Selesai: {Math.max(0, summary.agendaBelumTerlaksana - summary.agendaPartial)}</span>
                <span className="text-slate-500">○ Belum Diisi: {summary.agendaNotStarted}</span>
              </div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex items-center">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${summary.avgKetercapaian}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Rumus: (Agenda Wajib Selesai ÷ {summary.totalMandatory}) × 100 • Terisi: {summary.agendaTerisi}/{summary.totalAgendas}</span>
              <span className="text-sm font-black text-emerald-700">{summary.avgKetercapaian}% Selesai</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSaveAllDraft}
                className="rounded-xl text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Simpan Draft
              </Button>
            )}

            {canApproveCurrentReport && summary.submission?.status === "SUBMITTED" && (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenVerifyModal(activeDesa)}
                className="rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Setujui / Tolak Laporan
              </Button>
            )}
          </div>
        </div>

        {/* Incomplete Agenda Warning Banner (Section 22) */}
        {canEdit && summary.incompleteAgendas && summary.incompleteAgendas.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black">
                  Masih ada {summary.incompleteAgendas.length} agenda yang belum diisi:{" "}
                </span>
                <span className="text-amber-800 font-medium">
                  {summary.incompleteAgendas.slice(0, 6).map(a => `Agenda ${String(a.nomorUrut).padStart(2, "0")} (${a.judulAgenda})`).join(", ")}
                  {summary.incompleteAgendas.length > 6 ? `, dan ${summary.incompleteAgendas.length - 6} agenda lainnya.` : "."}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
              Langsung isi tanpa perlu approval Admin
            </span>
          </div>
        )}
      </div>

      {/* 18 Agendas Individual Input Cards (AGENDA 01 — AGENDA 18) */}
      {summary.items.length === 0 ? (
        <Card className="p-10 text-center rounded-3xl border-slate-200">
          <p className="text-sm font-black text-slate-700">Memuat daftar 18 agenda untuk {activeDesa}...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {summary.items.map((item) => {
            const currentStatus: MonevAgendaCompletionStatus =
              item.statusKetercapaian ||
              (item.terlaksana && item.ketercapaianPersen === 100
                ? "COMPLETED"
                : item.terlaksana && item.ketercapaianPersen > 0
                  ? "PARTIAL"
                  : item.updatedBy
                    ? "NOT_COMPLETED"
                    : "NOT_STARTED");

            const isProblematic = currentStatus === "PARTIAL" || currentStatus === "NOT_COMPLETED";
            const isExpanded = expandedItemId === item.id;
            const existingLaporan = item.laporanPelaksanaan || item.catatanEvaluasi || "";
            const draft = localNotes[item.id] || {
              kendala: item.kendala || "",
              catatanEvaluasi: existingLaporan,
              laporanPelaksanaan: existingLaporan,
              tindakLanjut: item.tindakLanjut || "",
              penanggungJawab: item.penanggungJawab || "",
              tanggalPelaksanaan: item.tanggalPelaksanaan || new Date().toISOString().slice(0, 10),
              jumlahPeserta: item.jumlahPeserta || 0,
              ketercapaianPersen: item.ketercapaianPersen || 50,
              evidenceUrlInput: ""
            };
            const paddedNum = String(item.nomorUrut).padStart(2, "0");

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all p-4 bg-white shadow-xs space-y-3 ${
                  currentStatus === "COMPLETED"
                    ? "border-emerald-200 bg-emerald-50/15"
                    : currentStatus === "PARTIAL"
                      ? "border-amber-300 bg-amber-50/20"
                      : currentStatus === "NOT_COMPLETED"
                        ? "border-rose-300 bg-rose-50/20"
                        : "border-slate-200"
                }`}
              >
                {/* Header Row: AGENDA XX + Title + Individual Status Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Agenda Number, Title & Category */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`px-2.5 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        currentStatus === "COMPLETED"
                          ? "bg-emerald-600 text-white"
                          : currentStatus === "PARTIAL"
                            ? "bg-amber-500 text-white"
                            : currentStatus === "NOT_COMPLETED"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      AGENDA {paddedNum}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="font-black text-sm text-slate-900">{item.judulAgenda}</h4>
                        {item.isMandatory !== false && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Wajib
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-500">• Kategori: {item.kategori}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          currentStatus === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                          currentStatus === "PARTIAL" ? "bg-amber-100 text-amber-800" :
                          currentStatus === "NOT_COMPLETED" ? "bg-rose-100 text-rose-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {currentStatus === "COMPLETED" ? "Selesai" :
                           currentStatus === "PARTIAL" ? "Sebagian" :
                           currentStatus === "NOT_COMPLETED" ? "Tidak Selesai" :
                           "Belum Diisi"}
                        </span>
                      </div>
                      {item.kendala && (
                        <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                          ⚠️ Kendala: {item.kendala}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Individual Status Control per Agenda (Selesai / Sebagian / Tidak Selesai) */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 mr-1 hidden xl:inline">Status:</span>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleOneTapStatus(item, "COMPLETED")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 min-h-[38px] ${
                        currentStatus === "COMPLETED"
                          ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                          : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai
                    </button>

                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleOneTapStatus(item, "PARTIAL")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 min-h-[38px] ${
                        currentStatus === "PARTIAL"
                          ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                      } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Sebagian
                    </button>

                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleOneTapStatus(item, "NOT_COMPLETED")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 min-h-[38px] ${
                        currentStatus === "NOT_COMPLETED"
                          ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                          : "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                      } ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Tidak Selesai
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                      className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold flex items-center gap-1"
                      title="Opsi Tambahan & Bukti Dokumentasi"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Always-Visible Individual Report Input per Agenda (Section 5, 14 & 15) */}
                <div className="pt-2 border-t border-slate-100/80 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="text-xs font-black text-slate-700 shrink-0 min-w-[70px]">
                      Laporan:
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      placeholder={`Input laporan / catatan kegiatan untuk Agenda ${paddedNum} (${item.judulAgenda})...`}
                      value={draft.laporanPelaksanaan ?? draft.catatanEvaluasi}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalNotes(prev => ({
                          ...prev,
                          [item.id]: { ...draft, catatanEvaluasi: val, laporanPelaksanaan: val }
                        }));
                      }}
                      onBlur={() => handleAutosaveItemDetails(item)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium bg-slate-50/70 text-slate-900"
                    />
                  </div>
                  {(item.updatedBy || item.updatedAt) && (
                    <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] text-slate-400 font-medium px-1">
                      <span>Agenda ID: <strong className="text-slate-600">AGENDA_{paddedNum}</strong></span>
                      {item.updatedBy && <span>Diperbarui oleh: <strong className="text-slate-600">{item.updatedBy}</strong></span>}
                      {item.updatedAt && <span>Waktu: <strong className="text-slate-600">{new Date(item.updatedAt).toLocaleString("id-ID")}</strong></span>}
                    </div>
                  )}
                </div>

                {/* Guided Problem / Obstacle Section when PARTIAL or NOT_COMPLETED, or when Expanded */}
                {(isProblematic || isExpanded) && (
                  <div className="pt-2 border-t border-slate-100 space-y-3 animate-fade-in">
                    {isProblematic && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-700 block">
                          Pilih Cepat Alasan / Kendala (Atau ketik di bawah):
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_REASONS.map(reason => (
                            <button
                              key={reason}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                setLocalNotes(prev => ({
                                  ...prev,
                                  [item.id]: { ...draft, kendala: reason }
                                }));
                                handleAutosaveItemDetails(item, reason);
                              }}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                                draft.kendala === reason
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50"
                              }`}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Alasan / Kendala {isProblematic && <span className="text-rose-600">*</span>}
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          placeholder="Alasan belum selesai penuh..."
                          value={draft.kendala}
                          onChange={(e) =>
                            setLocalNotes(prev => ({
                              ...prev,
                              [item.id]: { ...draft, kendala: e.target.value }
                            }))
                          }
                          onBlur={() => handleAutosaveItemDetails(item)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium bg-slate-50/50"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Rencana Tindak Lanjut & PJ
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="Tindak lanjut..."
                            value={draft.tindakLanjut}
                            onChange={(e) =>
                              setLocalNotes(prev => ({
                                ...prev,
                                [item.id]: { ...draft, tindakLanjut: e.target.value }
                              }))
                            }
                            onBlur={() => handleAutosaveItemDetails(item)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium bg-slate-50/50"
                          />
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="Nama PJ"
                            value={draft.penanggungJawab}
                            onChange={(e) =>
                              setLocalNotes(prev => ({
                                ...prev,
                                [item.id]: { ...draft, penanggungJawab: e.target.value }
                              }))
                            }
                            onBlur={() => handleAutosaveItemDetails(item)}
                            className="w-28 px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium bg-slate-50/50 shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extra Metadata & Evidence Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {currentStatus === "PARTIAL" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-500">Persentase Sebagian:</span>
                            <input
                              type="number"
                              min={1}
                              max={99}
                              disabled={!canEdit}
                              value={draft.ketercapaianPersen}
                              onChange={(e) =>
                                setLocalNotes(prev => ({
                                  ...prev,
                                  [item.id]: { ...draft, ketercapaianPersen: Number(e.target.value) }
                                }))
                              }
                              onBlur={() => handleAutosaveItemDetails(item)}
                              className="w-16 px-2 py-1 text-xs border border-amber-300 rounded-lg font-black text-amber-800"
                            />
                            <span className="text-[11px] font-bold text-slate-500">%</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="Link foto/dokumen bukti (opsional)..."
                            value={draft.evidenceUrlInput}
                            onChange={(e) =>
                              setLocalNotes(prev => ({
                                ...prev,
                                [item.id]: { ...draft, evidenceUrlInput: e.target.value }
                              }))
                            }
                            className="w-48 px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg"
                          />
                          {canEdit && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddEvidence(item)}
                              className="h-6 px-2 text-[10px] font-bold rounded-lg"
                            >
                              + Lampirkan
                            </Button>
                          )}
                        </div>

                        {item.evidenceUrls && item.evidenceUrls.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            📎 {item.evidenceUrls.length} Bukti Terlampir
                          </span>
                        )}
                      </div>

                      {isProblematic && onOpenCreateFollowUp && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenCreateFollowUp(item)}
                          className="h-7 px-2.5 text-[11px] font-bold rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Buat Tindak Lanjut (Follow-up)
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ============================================================== */}
          {/* FINAL ACTION & SECTION 6 RINGKASAN HASIL LAPORAN (AT BOTTOM)   */}
          {/* ============================================================== */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-emerald-200/80 space-y-4 mt-2">
            {/* Section 6: Format Ringkasan Hasil Laporan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Ringkasan Hasil Laporan — {formatKelompokDesaInline(activeDesa, activeWilayahForDesa)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                    STATUS LAPORAN : {formatApprovalStatusLabel(summary.statusLaporan)} ({summary.statusLaporan})
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border ${
                    summary.statusVerifikasi === "VERIFIED"
                      ? "bg-purple-100 border-purple-300 text-purple-800"
                      : summary.statusVerifikasi === "REJECTED"
                        ? "bg-red-100 border-red-300 text-red-800"
                        : "bg-amber-100 border-amber-300 text-amber-800"
                  }`}>
                    STATUS VERIFIKASI : {summary.statusVerifikasi}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-slate-400 uppercase">TOTAL AGENDA</div>
                  <div className="text-lg font-black text-slate-900">{summary.totalAgendas}</div>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-emerald-700 uppercase">SELESAI</div>
                  <div className="text-lg font-black text-emerald-800">{summary.completedMandatory}</div>
                </div>
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-amber-700 uppercase">SEBAGIAN</div>
                  <div className="text-lg font-black text-amber-800">{summary.agendaPartial}</div>
                </div>
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-rose-700 uppercase">BELUM SELESAI</div>
                  <div className="text-lg font-black text-rose-800">{summary.agendaNotCompleted}</div>
                </div>
                <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-slate-600 uppercase">BELUM DIMULAI</div>
                  <div className="text-lg font-black text-slate-800">{summary.agendaNotStarted}</div>
                </div>
                <div className="bg-emerald-600 text-white rounded-xl p-2.5">
                  <div className="text-[10px] font-black text-emerald-100 uppercase">PROGRESS</div>
                  <div className="text-lg font-black">{summary.avgKetercapaian}%</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  Progress Pengisian Laporan
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900 flex flex-wrap items-center gap-2">
                  <span>{summary.agendaTerisi} / {summary.totalAgendas} agenda</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                    {summary.completedMandatory} Selesai ({summary.avgKetercapaian}%)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Formula: Progress = COMPLETED ({summary.completedMandatory}) / TOTAL REQUIRED AGENDA ({summary.totalMandatory}) × 100 = {summary.avgKetercapaian}% (PARTIAL tidak dihitung sebagai COMPLETED).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200">
                <span className="text-emerald-700">✓ Selesai: {summary.completedMandatory}</span>
                <span className="text-amber-700">◐ Sebagian: {summary.agendaPartial}</span>
                <span className="text-rose-700">✕ Belum Selesai: {summary.agendaNotCompleted}</span>
                <span className="text-slate-500">○ Belum Dimulai: {summary.agendaNotStarted}</span>
              </div>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex items-center">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((summary.agendaTerisi / (summary.totalAgendas || 18)) * 100))}%` }}
              />
            </div>

            {/* Indicator if incomplete agendas remain */}
            {canEdit && summary.incompleteAgendas && summary.incompleteAgendas.length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black">
                    Masih ada {summary.incompleteAgendas.length} agenda wajib yang belum diisi:
                  </div>
                  <div className="mt-0.5 text-amber-800 font-medium">
                    {summary.incompleteAgendas.map(a => `Agenda ${String(a.nomorUrut).padStart(2, "0")} (${a.judulAgenda})`).join(", ")}
                  </div>
                </div>
              </div>
            ) : canEdit ? (
              <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seluruh {summary.totalAgendas} agenda telah diisi lengkap dan siap dikirim ({summary.submission?.status === "REJECTED" ? "Resubmit Laporan" : "Submit Laporan"}).</span>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 text-slate-700 p-3.5 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
                <span>
                  Status Laporan Saat Ini:{" "}
                  <strong className="text-emerald-700">
                    {summary.submission?.status === "SUBMITTED"
                      ? "Menunggu Persetujuan (SUBMITTED)"
                      : summary.submission?.status === "VERIFIED"
                        ? "Disetujui (VERIFIED)"
                        : summary.submission?.status || "TERKUNCI"}
                  </strong>
                </span>
                {canApproveCurrentReport && summary.submission?.status === "SUBMITTED" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenVerifyModal(activeDesa)}
                    className="rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Setujui Laporan / Verifikasi
                  </Button>
                )}
              </div>
            )}

            {/* Final Submit Action Button (Mobile-First Full Width on Small Screens) */}
            {canEdit && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAllDraft}
                  className="rounded-2xl text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 h-11 px-5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Draft
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    handleSaveAllDraft();
                    if (summary.incompleteAgendas && summary.incompleteAgendas.length > 0) {
                      toast.warning(`Masih ada ${summary.incompleteAgendas.length} agenda yang belum diisi. Silakan lengkapi seluruh 18 agenda sebelum Submit.`);
                    }
                    onOpenSubmitModal(activeDesa);
                  }}
                  className="rounded-2xl text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 h-12 px-7"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {summary.submission?.status === "REJECTED" ? "RESUBMIT LAPORAN" : "SUBMIT LAPORAN"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
