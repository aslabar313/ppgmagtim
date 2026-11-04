import React, { useState, useMemo, useEffect } from "react";
import { 
  getPeriods, 
  getActivePeriod, 
  createPeriod, 
  updatePeriodStatus, 
  getMasterAgendas, 
  updateMasterAgenda,
  generatePeriodMonitoringItems, 
  getMonitoringItems, 
  getSubmissions, 
  submitDesaReport, 
  verifyDesaReport,
  getCommandCenterData,
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  canManagePeriods, 
  canManageMasterAgenda, 
  canVerify, 
  canApproveReport,
  getDesaSubmissionSummary,
  getAnalyticsData,
  getScopedExportData,
  findWilayahByDesa,
  pullMonevFromMainDatabase
} from "@/lib/monev/monevService";
import { 
  MonevPeriod, 
  MonevPeriodStatus, 
  MonevMasterAgenda, 
  MonevMonitoringItem, 
  MonevSubmission, 
  MonevFollowUp,
  MonevFollowUpStatus,
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
import { getUserDetails } from "@/lib/mockData";
import { MonevChecklistInputView } from "./monev/MonevChecklistInputView";
import { MonevAnalyticsReportView } from "./monev/MonevAnalyticsReportView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, Plus, 
  Search, Target, TrendingUp, FileText, Edit2, Download,
  BarChart3, Layers, Building2, CheckSquare,
  Lock, Shield, Eye, RefreshCw, FileSpreadsheet, Printer, AlertCircle, Send,
  ArrowUpDown, ChevronLeft, ChevronRight, ClipboardCheck, ListChecks
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MonevAgendaBulananPanelProps {
  userRole: string;
}

const STATUS_PERIOD_BADGES: Record<MonevPeriodStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft Persiapan", color: "bg-slate-100 text-slate-700 border-slate-300" },
  OPEN: { label: "Pelaporan Terbuka (Open)", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  VERIFICATION: { label: "Tahap Verifikasi", color: "bg-amber-100 text-amber-800 border-amber-300" },
  LOCKED: { label: "Terkunci (Locked)", color: "bg-purple-100 text-purple-800 border-purple-300" },
  ARCHIVED: { label: "Diarsipkan (Archived)", color: "bg-zinc-100 text-zinc-700 border-zinc-300" }
};

const KATEGORI_COLORS: Record<string, string> = {
  "Kurikulum": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pembinaan Mubaligh": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Musyawarah 5 Unsur": "bg-amber-50 text-amber-700 border-amber-200",
  "Evaluasi": "bg-pink-50 text-pink-700 border-pink-200",
  "KBM Caberawit": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Muda-Mudi": "bg-violet-50 text-violet-700 border-violet-200",
  "Administrasi & BK": "bg-blue-50 text-blue-700 border-blue-200",
  "Lainnya": "bg-slate-50 text-slate-700 border-slate-200"
};

export function MonevAgendaBulananPanel({ userRole }: MonevAgendaBulananPanelProps) {
  // Current user & scope
  const [loggedUser] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sim_tpq_logged_user") || "superadminaldi";
    }
    return "superadminaldi";
  });

  const userDetails = useMemo(() => getUserDetails(loggedUser), [loggedUser]);
  const userScope = userDetails?.scope || "Semua";

  // State: Periods
  const [periods, setPeriods] = useState<MonevPeriod[]>(() => getPeriods());
  const [activePeriod, setActivePeriod] = useState<MonevPeriod>(() => getActivePeriod());
  const [dataTick, setDataTick] = useState<number>(0);

  // State: Master Agendas
  const [masterAgendas, setMasterAgendas] = useState<MonevMasterAgenda[]>(() => getMasterAgendas());

  // State: Submissions, Items, FollowUps
  const [submissions, setSubmissions] = useState<MonevSubmission[]>([]);
  const [items, setItems] = useState<MonevMonitoringItem[]>([]);
  const [followUps, setFollowUps] = useState<MonevFollowUp[]>([]);

  // Main Navigation Tab
  const isCoordinator = userRole === "Admin Kelompok" || userRole === "Admin Desa" || userRole === "Pengajar";
  const [activeTabMode, setActiveTabMode] = useState<
    "command_center" | "checklist_input" | "follow_up" | "analytics" | "reporting" | "master_agenda"
  >(() => (isCoordinator ? "checklist_input" : "command_center"));

  // Filters for Command Center & Village Monitoring Table
  const [filterWilayah, setFilterWilayah] = useState<string>(() => {
    if (userScope.startsWith("Desa ")) return userScope;
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      return findWilayahByDesa(userScope);
    }
    return "Semua";
  });
  const [filterDesa, setFilterDesa] = useState<string>(() => {
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      return normalizeDesaName(userScope);
    }
    return "Semua";
  });
  const [filterSubmissionStatus, setFilterSubmissionStatus] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"desa" | "wilayah" | "completion" | "status" | "attention">("desa");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Follow-up filters & modal state
  const [fuStatusFilter, setFuStatusFilter] = useState<string>("Semua");
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [fuDesa, setFuDesa] = useState<string>("Soco");
  const [fuWilayah, setFuWilayah] = useState<string>("Desa Selatan");
  const [fuItemId, setFuItemId] = useState<string>("");
  const [fuAgendaJudul, setFuAgendaJudul] = useState<string>("");
  const [fuNomorUrut, setFuNomorUrut] = useState<number>(1);
  const [fuAlasan, setFuAlasan] = useState<string>("");
  const [fuMasalah, setFuMasalah] = useState<string>("");
  const [fuRencana, setFuRencana] = useState<string>("");
  const [fuPic, setFuPic] = useState<string>("");
  const [fuTargetDate, setFuTargetDate] = useState<string>("2026-10-31");

  // Modal Create Period + Select Agenda & Villages + Preview
  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [newPeriodNama, setNewPeriodNama] = useState("");
  const [newPeriodTahun, setNewPeriodTahun] = useState(2026);
  const [newPeriodBulan, setNewPeriodBulan] = useState(11);
  const [newPeriodTglMulai, setNewPeriodTglMulai] = useState("2026-11-01");
  const [newPeriodTglSelesai, setNewPeriodTglSelesai] = useState("2026-11-30");
  const [selectedNewAgendas, setSelectedNewAgendas] = useState<string[]>(() =>
    getMasterAgendas().filter(a => a.isActive).map(a => a.id)
  );
  const [selectedNewWilayahs, setSelectedNewWilayahs] = useState<string[]>([
    "Desa Selatan", "Desa Tengah", "Desa Utara", "Desa Timur"
  ]);
  const [autoGenerateOnCreate, setAutoGenerateOnCreate] = useState<boolean>(true);

  // Modal Status Transition
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<MonevPeriodStatus>("OPEN");

  // Modal Master Agenda Edit
  const [isMasterAgendaModalOpen, setIsMasterAgendaModalOpen] = useState(false);
  const [selectedMasterAgenda, setSelectedMasterAgenda] = useState<MonevMasterAgenda | null>(null);
  const [editMasterJudul, setEditMasterJudul] = useState("");
  const [editMasterDeskripsi, setEditMasterDeskripsi] = useState("");

  // Modal Verifikasi Laporan & Ketercapaian Desa (PPG Admin)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedSubForVerify, setSelectedSubForVerify] = useState<MonevSubmission | null>(null);
  const [verifySummary, setVerifySummary] = useState<DesaSubmissionSummary | null>(null);
  const [verifyCatatan, setVerifyCatatan] = useState("");

  // Modal Konfirmasi Pengiriman Laporan Desa (Koordinator Desa)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedDesaForSubmit, setSelectedDesaForSubmit] = useState<string | null>(null);
  const [submitSummary, setSubmitSummary] = useState<DesaSubmissionSummary | null>(null);

  // Modal Notifikasi Apresiasi & Avatar Animasi Setelah Submit Berhasil
  const [isAppreciationModalOpen, setIsAppreciationModalOpen] = useState(false);
  const [appreciatedSubmissionInfo, setAppreciatedSubmissionInfo] = useState<{
    desa: string;
    wilayah: string;
    completedMandatory: number;
    totalMandatory: number;
    avgKetercapaian: number;
    submittedAt: string;
  } | null>(null);

  // Modal Detail Ketercapaian 18 Agenda per Desa
  const [isDetailDesaModalOpen, setIsDetailDesaModalOpen] = useState(false);
  const [detailSummary, setDetailSummary] = useState<DesaSubmissionSummary | null>(null);

  const authScope = useMemo(
    () => ({ username: loggedUser, role: userRole, scope: userScope }),
    [loggedUser, userRole, userScope]
  );

  // Load items and submissions whenever activePeriod changes
  const refreshData = () => {
    if (!activePeriod) return;
    // Auto-ensure initial items exist for the active period if none generated yet
    const existingSubs = getSubmissions(activePeriod.id, undefined, authScope);
    if (existingSubs.length === 0 && canManagePeriods(userRole) && activePeriod.status !== "LOCKED" && activePeriod.status !== "ARCHIVED") {
      try {
        generatePeriodMonitoringItems(activePeriod.id, loggedUser, userRole);
      } catch {
        // ignore
      }
    }
    setSubmissions(getSubmissions(activePeriod.id, undefined, authScope));
    setItems(getMonitoringItems(activePeriod.id, undefined, undefined, authScope));
    setFollowUps(getFollowUps(activePeriod.id, undefined, undefined, authScope));
    setDataTick(t => t + 1);
  };

  useEffect(() => {
    refreshData();
  }, [activePeriod.id, activePeriod.status, userRole, userScope]);

  // Synchronize with Main Database (Source of Truth) so Superadmin immediately sees Admin Kelompok updates
  useEffect(() => {
    let mounted = true;
    const syncFromServer = async () => {
      const updated = await pullMonevFromMainDatabase(loggedUser);
      if (mounted && updated) {
        const latestPeriods = getPeriods();
        setPeriods(latestPeriods);
        const currentP = latestPeriods.find(p => p.id === activePeriod.id) || getActivePeriod();
        setActivePeriod(currentP);
        refreshData();
      }
    };
    syncFromServer();

    const handleStorageOrFocus = () => {
      refreshData();
      syncFromServer();
    };
    window.addEventListener("storage", handleStorageOrFocus);
    window.addEventListener("focus", handleStorageOrFocus);
    const interval = setInterval(syncFromServer, 8000);
    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorageOrFocus);
      window.removeEventListener("focus", handleStorageOrFocus);
      clearInterval(interval);
    };
  }, [loggedUser, activePeriod.id, activeTabMode]);

  // Command Center & Analytics Data (Strictly Scoped to User Role & Scope)
  const cmdData = useMemo(
    () => getCommandCenterData(activePeriod.id, authScope),
    [activePeriod.id, submissions, items, followUps, dataTick, authScope]
  );

  const analyticsData = useMemo(
    () => getAnalyticsData(activePeriod.id, authScope),
    [activePeriod.id, submissions, items, followUps, dataTick, authScope]
  );

  // Filtered & Sorted Village Monitoring Rows (Section 23)
  const filteredVillages = useMemo(() => {
    let list = [...analyticsData.villagePerformance];

    // Enforce coordinator scope visibility if coordinator
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      const myDesa = normalizeDesaName(userScope);
      list = list.filter(v => normalizeDesaName(v.desa) === myDesa);
    } else if (userRole === "Admin Desa" && userScope.startsWith("Desa ")) {
      list = list.filter(v => v.wilayah === userScope);
    }

    if (filterWilayah !== "Semua") {
      list = list.filter(v => v.wilayah === filterWilayah);
    }
    if (filterDesa !== "Semua") {
      list = list.filter(v => normalizeDesaName(v.desa) === normalizeDesaName(filterDesa));
    }
    if (filterSubmissionStatus !== "Semua") {
      if (filterSubmissionStatus === "ATTENTION") {
        list = list.filter(v => v.attentionRequired);
      } else {
        list = list.filter(v => v.submissionStatus === filterSubmissionStatus);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        v => v.desa.toLowerCase().includes(q) || v.wilayah.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "desa") cmp = a.desa.localeCompare(b.desa);
      else if (sortBy === "wilayah") cmp = a.wilayah.localeCompare(b.wilayah);
      else if (sortBy === "completion") cmp = a.completionRate - b.completionRate;
      else if (sortBy === "status") cmp = a.submissionStatus.localeCompare(b.submissionStatus);
      else if (sortBy === "attention") cmp = (a.attentionRequired ? 1 : 0) - (b.attentionRequired ? 1 : 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [analyticsData.villagePerformance, filterWilayah, filterDesa, filterSubmissionStatus, searchQuery, sortBy, sortDir, userRole, userScope]);

  const totalPages = Math.max(1, Math.ceil(filteredVillages.length / pageSize));
  const paginatedVillages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVillages.slice(start, start + pageSize);
  }, [filteredVillages, currentPage]);

  // Filtered Follow-ups
  const filteredFollowUps = useMemo(() => {
    let list = getFollowUps(activePeriod.id, filterDesa, fuStatusFilter);
    if (userRole === "Admin Kelompok" || userRole === "Pengajar") {
      const myDesa = normalizeDesaName(userScope);
      list = list.filter(f => normalizeDesaName(f.desa) === myDesa);
    } else if (userRole === "Admin Desa" && userScope.startsWith("Desa ")) {
      list = list.filter(f => f.wilayah === userScope);
    } else if (filterWilayah !== "Semua") {
      list = list.filter(f => f.wilayah === filterWilayah);
    }
    return list;
  }, [activePeriod.id, filterWilayah, filterDesa, fuStatusFilter, followUps, userRole, userScope, dataTick]);

  // Handle Idempotent Generation
  const handleGenerateItems = () => {
    try {
      const res = generatePeriodMonitoringItems(activePeriod.id, loggedUser, userRole);
      refreshData();
      toast.success(
        `Berhasil memproses monitoring periode: ${res.totalVillages} Desa × ${res.totalAgendas} Agenda = ${res.totalExpectedItems} Item.` +
        (res.createdItems > 0 ? ` (${res.createdItems} item baru dibuat)` : " (Seluruh item sudah tersinkron tanpa duplikasi)")
      );
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat item monitoring");
    }
  };

  // Submit Desa Report Handlers
  const handleOpenSubmitModal = (desa: string) => {
    try {
      const sum = getDesaSubmissionSummary(activePeriod.id, desa, authScope);
      setSelectedDesaForSubmit(desa);
      setSubmitSummary(sum);
      setIsSubmitModalOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat ringkasan laporan");
    }
  };

  const handleConfirmSubmit = () => {
    if (!selectedDesaForSubmit) return;
    try {
      const submittedSub = submitDesaReport(activePeriod.id, selectedDesaForSubmit, loggedUser, userRole, userScope);
      setIsSubmitModalOpen(false);
      refreshData();
      setAppreciatedSubmissionInfo({
        desa: submittedSub.desa,
        wilayah: submittedSub.wilayah,
        completedMandatory: submittedSub.agendaSelesai,
        totalMandatory: submittedSub.agendaTotal,
        avgKetercapaian: submittedSub.progressPersen,
        submittedAt: new Date(submittedSub.submittedAt || Date.now()).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit"
        })
      });
      setIsAppreciationModalOpen(true);
      toast.success("Laporan berhasil dikirim! 🎉 Terima kasih atas kontribusi Anda.");
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim laporan desa");
    }
  };

  // Verify Desa Report Handlers
  const handleOpenVerifyModal = (desa: string) => {
    const sub = submissions.find(s => s.periodId === activePeriod.id && normalizeDesaName(s.desa) === normalizeDesaName(desa));
    if (!sub) {
      toast.error(`Submission desa ${desa} tidak ditemukan.`);
      return;
    }
    const sum = getDesaSubmissionSummary(activePeriod.id, desa, authScope);
    setSelectedSubForVerify(sub);
    setVerifySummary(sum);
    setVerifyCatatan(sub.verificationNote || sub.rejectionReason || sub.catatanVerifikasi || "");
    setIsVerifyModalOpen(true);
  };

  const handleConfirmVerify = (status: "VERIFIED" | "REJECTED") => {
    if (!selectedSubForVerify) return;
    if (status === "REJECTED" && !verifyCatatan.trim()) {
      toast.error("Alasan penolakan / perbaikan (Rejection Reason) wajib diisi saat menolak laporan.");
      return;
    }
    const finalCatatan = verifyCatatan.trim();
    try {
      verifyDesaReport(selectedSubForVerify.id, status, finalCatatan, loggedUser, userRole, userScope);
      toast.success(
        `Laporan ${formatKelompokDesaInline(selectedSubForVerify.desa, selectedSubForVerify.wilayah)} berhasil ${
          status === "VERIFIED" ? "Disetujui (VERIFIED)" : "dikembalikan untuk Perbaikan (REJECTED)"
        }!`
      );
      setIsVerifyModalOpen(false);
      refreshData();
    } catch (e: any) {
      toast.error(e.message || "Gagal memverifikasi laporan");
    }
  };

  // Village Detail Modal Handler
  const handleOpenDetailDesaModal = (desa: string) => {
    try {
      const sum = getDesaSubmissionSummary(activePeriod.id, desa, authScope);
      setDetailSummary(sum);
      setIsDetailDesaModalOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Akses ditolak untuk melihat rincian desa tersebut");
    }
  };

  // Open Create Follow-up Modal
  const handleOpenCreateFollowUpFromItem = (item: MonevMonitoringItem) => {
    setFuDesa(item.desa);
    setFuWilayah(item.wilayah);
    setFuItemId(item.id);
    setFuAgendaJudul(item.judulAgenda);
    setFuNomorUrut(item.nomorUrut);
    setFuAlasan(item.kendala || "Kendala pelaksanaan agenda bulanan");
    setFuMasalah(`Agenda #${item.nomorUrut} (${item.judulAgenda}) berstatus ${item.statusKetercapaian || "Belum Selesai"}`);
    setFuRencana(item.tindakLanjut || "Pendampingan dan penjadwalan ulang bersama pengurus desa");
    setFuPic(item.penanggungJawab || `Koordinator ${item.desa}`);
    setFuTargetDate(activePeriod.tanggalSelesai || "2026-10-31");
    setIsFollowUpModalOpen(true);
  };

  const handleCreateFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      createFollowUp(
        {
          monitoringItemId: fuItemId || `item-${activePeriod.id}-${fuDesa.toLowerCase()}-mag-01`,
          periodId: activePeriod.id,
          wilayah: fuWilayah,
          desa: fuDesa,
          agendaJudul: fuAgendaJudul || "Musyawarah guru",
          nomorUrut: fuNomorUrut,
          alasanKendala: fuAlasan,
          deskripsiMasalah: fuMasalah,
          rencanaTindakan: fuRencana,
          pic: fuPic,
          targetPenyelesaian: fuTargetDate,
          status: "OPEN"
        },
        loggedUser,
        userRole,
        userScope
      );
      toast.success(`Tindak lanjut (Follow-up) untuk Desa ${fuDesa} berhasil dibuat!`);
      setIsFollowUpModalOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat tindak lanjut");
    }
  };

  const handleUpdateFollowUpStatus = (fuId: string, nextStatus: MonevFollowUpStatus) => {
    try {
      updateFollowUp(fuId, { status: nextStatus }, loggedUser, userRole, userScope);
      toast.success(`Status tindak lanjut diperbarui menjadi ${nextStatus}. (Status agenda historis tetap terjaga)`);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status tindak lanjut");
    }
  };

  // Status Change
  const handleChangeStatus = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = updatePeriodStatus(activePeriod.id, targetStatus, loggedUser, userRole);
      setActivePeriod(updated);
      setPeriods(getPeriods());
      toast.success(`Status periode berhasil diubah menjadi: ${targetStatus}`);
      setIsStatusModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status periode");
    }
  };

  // Create Period Wizard Preview Calculation
  const previewVillageCount = useMemo(() => {
    return MASTER_WILAYAH_CONFIG
      .filter(w => selectedNewWilayahs.includes(w.wilayah))
      .reduce((acc, w) => acc + w.desas.length, 0);
  }, [selectedNewWilayahs]);

  const previewAgendaCount = selectedNewAgendas.length;
  const previewTotalItems = previewVillageCount * previewAgendaCount;

  // Create Period Submit
  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNewAgendas.length === 0) {
      toast.error("Pilih minimal 1 agenda untuk periode ini.");
      return;
    }
    if (selectedNewWilayahs.length === 0) {
      toast.error("Pilih minimal 1 wilayah cakupan.");
      return;
    }
    try {
      const created = createPeriod({
        namaPeriode: newPeriodNama,
        tahun: Number(newPeriodTahun),
        bulan: Number(newPeriodBulan),
        tanggalMulai: newPeriodTglMulai,
        tanggalSelesai: newPeriodTglSelesai,
        cakupanWilayah: selectedNewWilayahs,
        selectedAgendaIds: selectedNewAgendas
      }, loggedUser, userRole);

      if (autoGenerateOnCreate) {
        generatePeriodMonitoringItems(created.id, loggedUser, userRole, {
          selectedAgendaIds: selectedNewAgendas
        });
      }

      toast.success(
        `Periode baru ${created.namaPeriode} berhasil dibuat (${previewVillageCount} Desa × ${previewAgendaCount} Agenda = ${previewTotalItems} Item).`
      );
      setPeriods(getPeriods());
      setActivePeriod(created);
      setIsNewPeriodModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat periode");
    }
  };

  // Update Master Agenda
  const handleSaveMasterAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterAgenda) return;
    try {
      updateMasterAgenda(selectedMasterAgenda.id, {
        judulAgenda: editMasterJudul,
        deskripsi: editMasterDeskripsi
      }, loggedUser, userRole);
      setMasterAgendas(getMasterAgendas());
      toast.success(`Master agenda "${editMasterJudul}" berhasil diperbarui.`);
      setIsMasterAgendaModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal memperbarui master agenda");
    }
  };

  // ==========================================
  // EXPORT CSV, EXCEL & PDF (Section 12 & 30)
  // ==========================================

  const handleExportCSV = () => {
    const scopedExport = getScopedExportData(activePeriod.id, authScope, filterDesa, filterWilayah);
    if (scopedExport.villages.length === 0) {
      toast.error("Tidak ada data sesuai scope/filter untuk diekspor ke CSV.");
      return;
    }

    const lines: string[] = [];
    lines.push("RINGKASAN HASIL LAPORAN MONEV AGENDA BULANAN PPG");
    lines.push([
      "No",
      "Report ID",
      "Desa",
      "Kelompok",
      "Periode",
      "TOTAL AGENDA",
      "SELESAI",
      "SEBAGIAN",
      "BELUM SELESAI",
      "BELUM DIMULAI",
      "PROGRESS (%)",
      "Status",
      "STATUS LAPORAN",
      "STATUS VERIFIKASI",
      "Disetujui Oleh (Verified By)",
      "Tanggal Persetujuan (Verified At)",
      "Catatan Persetujuan (Verification Note)",
      "Rejected By",
      "Rejected At",
      "Rejection Reason"
    ].join(","));

    scopedExport.villages.forEach((v, idx) => {
      const sum = getDesaSubmissionSummary(activePeriod.id, v.desa, authScope);
      lines.push([
        idx + 1,
        `"${sum.reportId}"`,
        `"Desa : ${formatDesaShort(v.wilayah)}"`,
        `"Kelompok : ${formatKelompokShort(v.desa)}"`,
        `"${activePeriod.namaPeriode}"`,
        sum.totalAgendas,
        sum.completedMandatory,
        sum.agendaPartial,
        sum.agendaNotCompleted,
        sum.agendaNotStarted,
        `${sum.avgKetercapaian}%`,
        `"${formatApprovalStatusLabel(sum.statusLaporan)}"`,
        sum.statusLaporan,
        sum.statusVerifikasi,
        `"${v.verifiedBy || "-"}"`,
        `"${v.verifiedAt || "-"}"`,
        `"${(v.verificationNote || "").replace(/"/g, '""')}"`,
        `"${v.rejectedBy || "-"}"`,
        `"${v.rejectedAt || "-"}"`,
        `"${(v.rejectionReason || "").replace(/"/g, '""')}"`
      ].join(","));
    });

    lines.push("");
    lines.push("DETAIL 18 AGENDA BULANAN PPG");
    lines.push([
      "No",
      "Desa",
      "Kelompok",
      "Periode",
      "Agenda ID",
      "No Agenda",
      "Nama Agenda",
      "Kategori",
      "Status",
      "Hasil / Laporan Pelaksanaan",
      "Kendala",
      "Evidence Count",
      "Updated By",
      "Updated At"
    ].join(","));

    scopedExport.items.forEach((i, idx) => {
      const padded = String(i.nomorUrut).padStart(2, "0");
      const laporan = (i.laporanPelaksanaan || i.catatanEvaluasi || "-").replace(/"/g, '""');
      const kendala = (i.kendala || "-").replace(/"/g, '""');
      lines.push([
        idx + 1,
        `"Desa : ${formatDesaShort(i.wilayah)}"`,
        `"Kelompok : ${formatKelompokShort(i.desa)}"`,
        `"${activePeriod.namaPeriode}"`,
        `AGENDA #${padded}`,
        i.nomorUrut,
        `"${i.judulAgenda.replace(/"/g, '""')}"`,
        `"${i.kategori}"`,
        i.statusKetercapaian || (i.terlaksana ? "COMPLETED" : "NOT_STARTED"),
        `"${laporan}"`,
        `"${kendala}"`,
        (i.evidenceUrls || []).length,
        `"${i.updatedBy || "-"}"`,
        `"${i.updatedAt || "-"}"`
      ].join(","));
    });

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const scopeSuffix = userRole === "Admin Kelompok" || userRole === "Pengajar" ? `_Kelompok_${formatKelompokShort(userScope)}` : "";
    link.setAttribute("download", `Monev_PPG_${activePeriod.periodeKode}${scopeSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File CSV Monev PPG sesuai scope berhasil diunduh.");
  };

  const handleExportExcel = () => {
    const scopedExport = getScopedExportData(activePeriod.id, authScope, filterDesa, filterWilayah);
    if (scopedExport.villages.length === 0) {
      toast.error("Belum ada data monitoring sesuai scope untuk diekspor.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Hasil Laporan (Section 6 & 30 Format)
    const rekapData = scopedExport.villages.map((v, idx) => {
      const sum = getDesaSubmissionSummary(activePeriod.id, v.desa, authScope);
      return {
        "No": idx + 1,
        "Report ID": sum.reportId,
        "Desa": `Desa : ${formatDesaShort(v.wilayah)}`,
        "Kelompok": `Kelompok : ${formatKelompokShort(v.desa)}`,
        "Periode": activePeriod.namaPeriode,
        "TOTAL AGENDA": sum.totalAgendas,
        "SELESAI": sum.completedMandatory,
        "SEBAGIAN": sum.agendaPartial,
        "BELUM SELESAI": sum.agendaNotCompleted,
        "BELUM DIMULAI": sum.agendaNotStarted,
        "PROGRESS": `${sum.avgKetercapaian}%`,
        "Status": formatApprovalStatusLabel(sum.statusLaporan),
        "STATUS LAPORAN": sum.statusLaporan,
        "STATUS VERIFIKASI": sum.statusVerifikasi,
        "Disetujui Oleh (Verified By)": v.verifiedBy || "-",
        "Tanggal Persetujuan (Verified At)": v.verifiedAt || "-",
        "Catatan Persetujuan (Verification Note)": v.verificationNote || "-",
        "Rejected By": v.rejectedBy || "-",
        "Rejected At": v.rejectedAt || "-",
        "Rejection Reason": v.rejectionReason || "-"
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rekapData), "Ringkasan Laporan");

    // Sheet 2: Detail 18 Agenda Individual Reports
    const itemData = scopedExport.items.map((i, idx) => {
      const padded = String(i.nomorUrut).padStart(2, "0");
      return {
        "No": idx + 1,
        "Desa": `Desa : ${formatDesaShort(i.wilayah)}`,
        "Kelompok": `Kelompok : ${formatKelompokShort(i.desa)}`,
        "Periode": activePeriod.namaPeriode,
        "Agenda ID": `AGENDA #${padded}`,
        "No Agenda": i.nomorUrut,
        "Nama Agenda": i.judulAgenda,
        "Kategori": i.kategori,
        "Status": i.statusKetercapaian || (i.terlaksana ? "COMPLETED" : "NOT_STARTED"),
        "Hasil / Laporan Pelaksanaan": i.laporanPelaksanaan || i.catatanEvaluasi || "-",
        "Kendala": i.kendala || "-",
        "Rencana Tindak Lanjut": i.tindakLanjut || "-",
        "PJ": i.penanggungJawab || "-",
        "Tgl Pelaksanaan": i.tanggalPelaksanaan || "-",
        "Bukti / Evidence": (i.evidenceUrls || []).join("; ") || "-",
        "Updated By": i.updatedBy || "-",
        "Updated At": i.updatedAt || "-"
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemData), "Detail 18 Agenda");

    const scopeSuffix = userRole === "Admin Kelompok" || userRole === "Pengajar" ? `_Kelompok_${formatKelompokShort(userScope)}` : "_Magetan_Timur";
    XLSX.writeFile(wb, `Laporan_Monev_PPG_${activePeriod.periodeKode}${scopeSuffix}.xlsx`);
    toast.success("Laporan Excel Monev Agenda Bulanan PPG sesuai scope berhasil diunduh.");
  };

  const handleExportPDF = () => {
    const scopedExport = getScopedExportData(activePeriod.id, authScope, filterDesa, filterWilayah);
    if (scopedExport.villages.length === 0) {
      toast.error("Belum ada data sesuai scope untuk laporan PDF.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");

    doc.setFontSize(15);
    doc.text("PENGURUS PPG DAERAH MAGETAN TIMUR", 14, 14);
    doc.setFontSize(11);
    doc.text(`LAPORAN MONITORING & EVALUASI AGENDA BULANAN — ${activePeriod.namaPeriode.toUpperCase()}`, 14, 21);
    doc.setFontSize(9);
    doc.setTextColor(90);
    const scopeHeader =
      userRole === "Admin Kelompok" || userRole === "Pengajar"
        ? `Desa : ${formatDesaShort(findWilayahByDesa(userScope))} | Kelompok : ${formatKelompokShort(userScope)}`
        : userRole === "Admin Desa"
          ? `Desa : ${formatDesaShort(userScope)}`
          : `Daerah : Magetan Timur`;
    doc.text(
      `Role: ${userRole} (${scopeHeader}) | Periode : ${activePeriod.namaPeriode} | Cetak: ${new Date().toLocaleDateString("id-ID")}`,
      14,
      27
    );
    doc.setTextColor(0);

    // Table 1: Section 6 & 30 Summary Format per Kelompok & Desa
    const summaryRows = scopedExport.villages.map((v, idx) => {
      const sum = getDesaSubmissionSummary(activePeriod.id, v.desa, authScope);
      return [
        idx + 1,
        `Desa : ${formatDesaShort(v.wilayah)}`,
        `Kelompok : ${formatKelompokShort(v.desa)}`,
        activePeriod.namaPeriode,
        sum.totalAgendas,
        sum.completedMandatory,
        sum.agendaPartial,
        sum.agendaNotCompleted,
        `${sum.avgKetercapaian}%`,
        formatApprovalStatusLabel(sum.statusLaporan),
        v.verifiedBy || v.rejectedBy || "-",
        v.verificationNote || v.rejectionReason || v.catatanVerifikasi || "-"
      ];
    });

    autoTable(doc, {
      startY: 32,
      head: [[
        "No", "Desa", "Kelompok", "Periode", "Total", "Selesai", "Sebagian",
        "Belum Selesai", "Progress", "Status", "Disetujui/Direview Oleh", "Catatan Persetujuan / Alasan Reject"
      ]],
      body: summaryRows as any,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2 }
    });

    // Table 2: Individual 18 Agenda Reports (Section 21 & 30)
    const itemRows = scopedExport.items.map((i) => [
      `Desa : ${formatDesaShort(i.wilayah)}`,
      `Kelompok : ${formatKelompokShort(i.desa)}`,
      `AGENDA #${String(i.nomorUrut).padStart(2, "0")}`,
      i.judulAgenda,
      i.statusKetercapaian || (i.terlaksana ? "COMPLETED" : "NOT_STARTED"),
      i.laporanPelaksanaan || i.catatanEvaluasi || "-",
      i.kendala || "-",
      i.updatedBy || "-"
    ]);

    const finalY = (doc as any).lastAutoTable?.finalY || 75;
    autoTable(doc, {
      startY: finalY + 8,
      head: [["Desa", "Kelompok", "Agenda", "Nama Agenda", "Status", "Hasil / Laporan Pelaksanaan", "Kendala", "Updated By"]],
      body: itemRows,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.8 }
    });

    const scopeSuffix = userRole === "Admin Kelompok" || userRole === "Pengajar" ? `_Kelompok_${formatKelompokShort(userScope)}` : "";
    doc.save(`Laporan_Monev_PPG_${activePeriod.periodeKode}${scopeSuffix}.pdf`);
    toast.success("Dokumen resmi PDF Monev PPG sesuai scope berhasil diunduh.");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-emerald-800/40">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              MONEV PPG • 1. Monev Agenda Bulanan PPG
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PERIOD_BADGES[activePeriod.status].color}`}>
              {STATUS_PERIOD_BADGES[activePeriod.status].label}
            </span>
            <span className="text-xs text-slate-300">
              Peran: <strong className="text-emerald-300">{userRole}</strong>{" "}
              ({userRole === "Admin Kelompok" || userRole === "Pengajar"
                ? `Desa : ${formatDesaShort(findWilayahByDesa(userScope))} • Kelompok : ${formatKelompokShort(userScope)}`
                : userRole === "Admin Desa"
                  ? `Desa : ${formatDesaShort(userScope)}`
                  : "Daerah : Magetan Timur"})
            </span>
          </div>

          <h2 className="font-display text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-emerald-400" />
            {activePeriod.namaPeriode}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Sistem Monitoring Digital Terstruktur PPG Daerah Magetan Timur (4 Desa • {activePeriod.totalDesa || 30} Kelompok • {activePeriod.totalAgenda || 18} Master Agenda).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={activePeriod.id}
              onChange={(e) => {
                const found = periods.find(p => p.id === e.target.value);
                if (found) setActivePeriod(found);
              }}
              className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id} className="text-slate-900 font-bold">
                  {p.namaPeriode} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Admin Management Tools */}
          {canManagePeriods(userRole) && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setTargetStatus(activePeriod.status);
                  setIsStatusModalOpen(true);
                }}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold"
              >
                <Shield className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Status Periode
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleGenerateItems}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Generate / Sync Item
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsNewPeriodModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Periode Baru
              </Button>
            </>
          )}

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold"
              title="Unduh CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold"
              title="Unduh Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportPDF}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl text-xs font-bold"
              title="Unduh PDF Resmi PPG"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2.5">
        <button
          type="button"
          onClick={() => setActiveTabMode("command_center")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "command_center"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          PPG Command Center & Desa
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode("checklist_input")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "checklist_input"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Input Cepat 18 Agenda (One-Tap)
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode("follow_up")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "follow_up"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Tindak Lanjut ({cmdData.openFollowUps + cmdData.inProgressFollowUps})
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode("analytics")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "analytics"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analitik & Heatmap
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode("reporting")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "reporting"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          Laporan & Audit Log
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode("master_agenda")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTabMode === "master_agenda"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          18 Master Agenda
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: PPG COMMAND CENTER & VILLAGE MONITORING (Sections 15-25)   */}
      {/* ================================================================= */}
      {activeTabMode === "command_center" && (
        <div className="space-y-6">
          {/* 10 KPI Command Center Cards (Section 21) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Card
              onClick={() => {
                setFilterSubmissionStatus("Semua");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "Semua"
                  ? "border-slate-800 ring-2 ring-slate-800/10 bg-white"
                  : "border-slate-200 hover:border-slate-400 bg-white"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-400">Total Kelompok</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{cmdData.totalDesa}</div>
              <span className="text-[10px] text-slate-500">Klik: Tampilkan Semua</span>
            </Card>

            <Card
              onClick={() => {
                setFilterSubmissionStatus(filterSubmissionStatus === "NOT_STARTED" ? "Semua" : "NOT_STARTED");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "NOT_STARTED"
                  ? "border-slate-600 ring-2 ring-slate-500/20 bg-slate-100/80"
                  : "border-slate-200 hover:border-slate-400 bg-slate-50/60"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-slate-500">Not Started</div>
              <div className="text-2xl font-black text-slate-700 mt-0.5">{cmdData.belumDimulai}</div>
              <span className="text-[10px] text-slate-500">Klik untuk filter</span>
            </Card>

            <Card
              onClick={() => {
                setFilterSubmissionStatus(filterSubmissionStatus === "DRAFT" ? "Semua" : "DRAFT");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "DRAFT"
                  ? "border-amber-500 ring-2 ring-amber-500/25 bg-amber-100/50"
                  : "border-amber-200 hover:border-amber-400 bg-amber-50/40"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-amber-700">Draft</div>
              <div className="text-2xl font-black text-amber-800 mt-0.5">{cmdData.draft}</div>
              <span className="text-[10px] text-amber-700">Klik untuk filter</span>
            </Card>

            <Card
              onClick={() => {
                setFilterSubmissionStatus(filterSubmissionStatus === "SUBMITTED" ? "Semua" : "SUBMITTED");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "SUBMITTED"
                  ? "border-cyan-600 ring-2 ring-cyan-500/30 bg-cyan-100/60 shadow-sm"
                  : "border-cyan-200 hover:border-cyan-400 bg-cyan-50/40"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-cyan-700">Menunggu Persetujuan</div>
              <div className="text-2xl font-black text-cyan-800 mt-0.5">{cmdData.submitted}</div>
              <span className="text-[10px] text-cyan-700 font-bold">Status: SUBMITTED (Klik Filter)</span>
            </Card>

            <Card
              onClick={() => {
                setFilterSubmissionStatus(filterSubmissionStatus === "VERIFIED" ? "Semua" : "VERIFIED");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "VERIFIED"
                  ? "border-purple-600 ring-2 ring-purple-500/25 bg-purple-100/60"
                  : "border-purple-200 hover:border-purple-400 bg-purple-50/40"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-purple-700">Disetujui (Verified)</div>
              <div className="text-2xl font-black text-purple-800 mt-0.5">{cmdData.verified}</div>
              <span className="text-[10px] text-purple-700">Disahkan ({cmdData.verificationRate}%)</span>
            </Card>

            <Card
              onClick={() => {
                setFilterSubmissionStatus(filterSubmissionStatus === "REJECTED" ? "Semua" : "REJECTED");
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-3.5 cursor-pointer transition-all ${
                filterSubmissionStatus === "REJECTED"
                  ? "border-red-600 ring-2 ring-red-500/25 bg-red-100/60"
                  : "border-red-200 hover:border-red-400 bg-red-50/40"
              }`}
            >
              <div className="text-[10px] font-black uppercase text-red-700">Perlu Perbaikan</div>
              <div className="text-2xl font-black text-red-800 mt-0.5">{cmdData.rejected}</div>
              <span className="text-[10px] text-red-700">Status: REJECTED</span>
            </Card>

            <Card className="rounded-2xl border-orange-200 p-3.5 bg-orange-50/40">
              <div className="text-[10px] font-black uppercase text-orange-700">Belum Melapor</div>
              <div className="text-2xl font-black text-orange-800 mt-0.5">{cmdData.desaBelumMelapor}</div>
              <span className="text-[10px] text-orange-700">Not started + Draft + Rejected</span>
            </Card>

            <Card className="rounded-2xl border-emerald-200 p-3.5 bg-emerald-50/40">
              <div className="text-[10px] font-black uppercase text-emerald-700">Average Completion</div>
              <div className="text-2xl font-black text-emerald-800 mt-0.5">{cmdData.rataRataProgres}%</div>
              <span className="text-[10px] text-emerald-700">Penyelesaian agenda wajib</span>
            </Card>

            <Card className="rounded-2xl border-rose-200 p-3.5 bg-rose-50/40">
              <div className="text-[10px] font-black uppercase text-rose-700">Agenda Bermasalah</div>
              <div className="text-2xl font-black text-rose-800 mt-0.5">{cmdData.agendaBermasalah.length}</div>
              <span className="text-[10px] text-rose-700">Memiliki kendala / belum selesai</span>
            </Card>

            <Card className="rounded-2xl border-indigo-200 p-3.5 bg-indigo-50/40">
              <div className="text-[10px] font-black uppercase text-indigo-700">Open Follow-ups</div>
              <div className="text-2xl font-black text-indigo-800 mt-0.5">
                {cmdData.openFollowUps + cmdData.inProgressFollowUps}
              </div>
              <span className="text-[10px] text-indigo-700">
                {cmdData.overdueFollowUps > 0 ? `⚠️ ${cmdData.overdueFollowUps} Overdue` : "Tindak lanjut aktif"}
              </span>
            </Card>
          </div>

          {/* Desa Performance Summary (Section 11 & 22: Desa : Selatan, Tengah, Utara, Timur) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {cmdData.wilayahSummaries.map(reg => (
              <Card
                key={reg.wilayah}
                onClick={() => {
                  setFilterWilayah(filterWilayah === reg.wilayah ? "Semua" : reg.wilayah);
                  setCurrentPage(1);
                }}
                className={`rounded-2xl p-4 cursor-pointer transition-all border ${
                  filterWilayah === reg.wilayah
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                    : "border-slate-200 hover:border-emerald-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-slate-900">{formatDesaLabel(reg.wilayah)}</h4>
                  <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold">{reg.totalDesa} Kelompok</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Reporting Rate</span>
                    <strong className="text-cyan-700 text-sm">{reg.reportingRate}%</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Completion Rate</span>
                    <strong className="text-emerald-700 text-sm">{reg.avgProgress}%</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-bold">
                  <span className="text-purple-700">Disetujui: {reg.verifiedCount}</span>
                  <span className={reg.attentionRequiredCount > 0 ? "text-rose-600" : "text-slate-400"}>
                    Attention: {reg.attentionRequiredCount}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Antrean Cepat Laporan Menunggu Persetujuan (Status: SUBMITTED) */}
          {(cmdData.villagePerformance || []).some(v => v.submissionStatus === "SUBMITTED") && (
            <div className="bg-cyan-50/70 border-2 border-cyan-300 rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-cyan-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                    Antrean Laporan Menunggu Persetujuan (Status: SUBMITTED)
                  </h3>
                  <p className="text-[11px] text-cyan-800 font-medium">
                    Laporan berikut telah dikirim oleh Admin Kelompok dan siap ditinjau serta disetujui oleh Admin Desa (sesuai Desa) atau Superadmin / Admin Daerah.
                  </p>
                </div>
                <Badge className="bg-cyan-600 text-white text-xs font-black px-3 py-1">
                  {(cmdData.villagePerformance || []).filter(v => v.submissionStatus === "SUBMITTED").length} Laporan Menunggu
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(cmdData.villagePerformance || [])
                  .filter(v => v.submissionStatus === "SUBMITTED")
                  .map(v => {
                    const canApproveCard = canApproveReport(userRole, userScope, v.desa, v.wilayah).allowed;
                    return (
                      <div
                        key={`queue-${v.desa}`}
                        className="bg-white rounded-2xl border border-cyan-200 p-3.5 shadow-sm flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-600">{formatDesaLabel(v.wilayah)}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300">
                              Menunggu Persetujuan
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900">{formatKelompokLabel(v.desa)}</div>
                          <div className="text-[11px] text-slate-500">
                            Periode : <strong>{activePeriod.namaPeriode}</strong> • Progress :{" "}
                            <strong className="text-emerald-700">{v.completionRate}% ({v.completedCount}/{v.totalMandatory})</strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetailDesaModal(v.desa)}
                            className="rounded-xl text-[11px] font-bold h-8 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 flex-1"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Tinjau Detail
                          </Button>

                          {canApproveCard ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenVerifyModal(v.desa)}
                              className="rounded-xl text-[11px] font-black h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Setujui Laporan
                            </Button>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                              Menunggu Approval Admin {v.wilayah} / Superadmin
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Kelompok & Desa Monitoring Table (Section 15, 20, 22, 23) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Monitoring Ketercapaian & Persetujuan Laporan ({filteredVillages.length} Kelompok)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik "Isi 18 Agenda" untuk input laporan, "Detail" untuk rincian, atau "Setujui Laporan" untuk menyetujui laporan berstatus Menunggu Persetujuan.
                </p>
              </div>

              {/* Filter & Search Controls (Section 20: Desa, Kelompok, Periode, Status) */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Desa:</span>
                  <select
                    value={filterWilayah}
                    disabled={userRole === "Admin Kelompok" || userRole === "Pengajar" || (userRole === "Admin Desa" && userScope.startsWith("Desa "))}
                    onChange={(e) => {
                      setFilterWilayah(e.target.value);
                      setFilterDesa("Semua");
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold bg-transparent outline-none disabled:opacity-75"
                  >
                    {!(userRole === "Admin Kelompok" || userRole === "Pengajar" || (userRole === "Admin Desa" && userScope.startsWith("Desa "))) && (
                      <option value="Semua">Semua Desa</option>
                    )}
                    <option value="Desa Selatan">Desa : Selatan</option>
                    <option value="Desa Tengah">Desa : Tengah</option>
                    <option value="Desa Utara">Desa : Utara</option>
                    <option value="Desa Timur">Desa : Timur</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Kelompok:</span>
                  <select
                    value={filterDesa}
                    disabled={userRole === "Admin Kelompok" || userRole === "Pengajar"}
                    onChange={(e) => {
                      setFilterDesa(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold bg-transparent outline-none disabled:opacity-75"
                  >
                    {!(userRole === "Admin Kelompok" || userRole === "Pengajar") && (
                      <option value="Semua">Semua Kelompok</option>
                    )}
                    {(filterWilayah === "Semua"
                      ? MASTER_WILAYAH_CONFIG.flatMap(w => w.desas)
                      : MASTER_WILAYAH_CONFIG.find(w => w.wilayah === filterWilayah)?.desas || []
                    ).map(d => {
                      const norm = normalizeDesaName(d);
                      return (
                        <option key={norm} value={norm}>
                          Kelompok : {formatKelompokShort(norm)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
                  <select
                    value={filterSubmissionStatus}
                    onChange={(e) => {
                      setFilterSubmissionStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-xs font-bold bg-transparent outline-none"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="NOT_STARTED">Belum Dimulai</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Menunggu Persetujuan</option>
                    <option value="VERIFIED">Disetujui</option>
                    <option value="REJECTED">Perlu Perbaikan</option>
                    <option value="ATTENTION">⚠️ Perlu Perhatian</option>
                  </select>
                </div>

                <div className="relative min-w-[170px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari Kelompok / Desa..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "wilayah") setSortDir(d => (d === "asc" ? "desc" : "asc"));
                          else { setSortBy("wilayah"); setSortDir("asc"); }
                        }}
                        className="flex items-center gap-1 uppercase font-black"
                      >
                        Desa <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "desa") setSortDir(d => (d === "asc" ? "desc" : "asc"));
                          else { setSortBy("desa"); setSortDir("asc"); }
                        }}
                        className="flex items-center gap-1 uppercase font-black"
                      >
                        Kelompok <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5">Periode</th>
                    <th className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "status") setSortDir(d => (d === "asc" ? "desc" : "asc"));
                          else { setSortBy("status"); setSortDir("asc"); }
                        }}
                        className="inline-flex items-center gap-1 uppercase font-black"
                      >
                        Status <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "completion") setSortDir(d => (d === "asc" ? "desc" : "asc"));
                          else { setSortBy("completion"); setSortDir("desc"); }
                        }}
                        className="inline-flex items-center gap-1 uppercase font-black"
                      >
                        Progress <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3.5">Attention</th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedVillages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                        Tidak ada kelompok yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedVillages.map((v) => {
                      const canApproveRow = canApproveReport(userRole, userScope, v.desa, v.wilayah).allowed;
                      return (
                        <tr key={v.desa} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 font-semibold text-slate-700">{formatDesaLabel(v.wilayah)}</td>
                          <td className="py-3 px-3.5 font-black text-slate-900">{formatKelompokLabel(v.desa)}</td>
                          <td className="py-3 px-3.5 text-[11px] font-medium text-slate-600">{activePeriod.namaPeriode}</td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border inline-block ${
                              v.submissionStatus === "VERIFIED" ? "bg-purple-100 text-purple-800 border-purple-300" :
                              v.submissionStatus === "SUBMITTED" ? "bg-cyan-100 text-cyan-800 border-cyan-300" :
                              v.submissionStatus === "REJECTED" ? "bg-red-100 text-red-800 border-red-300" :
                              v.submissionStatus === "LOCKED" ? "bg-zinc-200 text-zinc-800 border-zinc-400" :
                              v.submissionStatus === "DRAFT" ? "bg-amber-100 text-amber-800 border-amber-300" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {formatApprovalStatusLabel(v.submissionStatus)} ({v.submissionStatus})
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="font-black text-xs text-slate-900">
                              {v.completionRate}% <span className="text-[10px] font-normal text-slate-400">({v.completedCount}/{v.totalMandatory})</span>
                            </div>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  v.completionRate >= 80 ? "bg-emerald-500" :
                                  v.completionRate >= 50 ? "bg-amber-500" : "bg-slate-300"
                                }`}
                                style={{ width: `${v.completionRate}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3.5 max-w-[200px]">
                            {v.attentionRequired ? (
                              <span className="text-[11px] font-bold text-rose-600 block truncate" title={v.attentionReasons.join(", ")}>
                                ⚠️ {v.attentionReasons[0]}
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold">✓ Normal</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFilterWilayah(v.wilayah);
                                  setFilterDesa(v.desa);
                                  setActiveTabMode("checklist_input");
                                }}
                                className="rounded-xl text-[10px] font-bold h-7 px-2.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              >
                                <ClipboardCheck className="w-3 h-3 mr-1" />
                                Isi 18 Agenda
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDetailDesaModal(v.desa)}
                                className="rounded-xl text-[10px] font-bold h-7 px-2 text-slate-700 hover:bg-slate-100"
                              >
                                <Eye className="w-3 h-3 mr-1 text-slate-500" />
                                Detail
                              </Button>

                              {canApproveRow && v.submissionStatus === "SUBMITTED" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleOpenVerifyModal(v.desa)}
                                  className="rounded-xl text-[10px] font-black h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Setujui Laporan
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Menampilkan <strong>{paginatedVillages.length}</strong> dari <strong>{filteredVillages.length}</strong> Kelompok (Halaman {currentPage} dari {totalPages})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 px-2.5 rounded-xl text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 px-2.5 rounded-xl text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: MOBILE-FIRST ONE-TAP CHECKLIST INPUT (Sections 15-18)      */}
      {/* ================================================================= */}
      {activeTabMode === "checklist_input" && (
        <MonevChecklistInputView
          activePeriod={activePeriod}
          loggedUser={loggedUser}
          userRole={userRole}
          userScope={userScope}
          selectedWilayah={filterWilayah}
          selectedDesa={filterDesa}
          onChangeWilayah={setFilterWilayah}
          onChangeDesa={setFilterDesa}
          onRefresh={refreshData}
          onOpenSubmitModal={handleOpenSubmitModal}
          onOpenVerifyModal={handleOpenVerifyModal}
          onOpenCreateFollowUp={handleOpenCreateFollowUpFromItem}
        />
      )}

      {/* ================================================================= */}
      {/* TAB 3: FOLLOW-UP SYSTEM (Section 26)                              */}
      {/* ================================================================= */}
      {activeTabMode === "follow_up" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-indigo-600" />
                Pusat Tindak Lanjut (Follow-Up Center) Agenda Bermasalah
              </h3>
              <p className="text-[11px] text-slate-500">
                Catatan Penting: Penyelesaian Follow-Up (COMPLETED) tidak mengubah status historis agenda awal secara otomatis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["Semua", "OPEN", "IN_PROGRESS", "OVERDUE", "COMPLETED", "CANCELLED"].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFuStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    fuStatusFilter === st
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "OVERDUE" ? "⚠️ Overdue" : st}
                </button>
              ))}

              {userRole !== "Viewer" && activePeriod.status !== "LOCKED" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setFuDesa(filterDesa !== "Semua" ? filterDesa : "Soco");
                    setFuWilayah(filterWilayah !== "Semua" ? filterWilayah : "Desa Selatan");
                    setFuAgendaJudul("Musyawarah guru");
                    setFuAlasan("");
                    setFuMasalah("");
                    setFuRencana("");
                    setFuPic(`Koordinator Desa`);
                    setIsFollowUpModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Follow-up
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">Kelompok & Desa</th>
                    <th className="py-3 px-3.5">Agenda</th>
                    <th className="py-3 px-3.5">Masalah & Alasan</th>
                    <th className="py-3 px-3.5">Rencana Tindakan (Action Plan)</th>
                    <th className="py-3 px-3.5">PIC & Due Date</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center">Ubah Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                        Belum ada item tindak lanjut (Follow-up) untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredFollowUps.map(fu => (
                      <tr key={fu.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5">
                          <div className="font-black text-slate-900">{formatKelompokLabel(fu.desa)}</div>
                          <span className="text-[10px] text-slate-400">{formatDesaLabel(fu.wilayah)}</span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">{fu.agendaJudul}</td>
                        <td className="py-3 px-3.5 max-w-[220px]">
                          <div className="font-bold text-rose-700">{fu.alasanKendala}</div>
                          <div className="text-[11px] text-slate-500">{fu.deskripsiMasalah}</div>
                        </td>
                        <td className="py-3 px-3.5 max-w-[220px] font-medium text-slate-700">{fu.rencanaTindakan}</td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{fu.pic}</div>
                          <div className={`text-[10px] font-bold ${fu.isOverdue ? "text-rose-600" : "text-slate-400"}`}>
                            Target: {fu.targetPenyelesaian} {fu.isOverdue ? "(OVERDUE)" : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <Badge className={`text-[10px] font-black ${
                            fu.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                            fu.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-800" :
                            fu.status === "CANCELLED" ? "bg-slate-100 text-slate-500" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {fu.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {userRole !== "Viewer" && (
                            <select
                              value={fu.status}
                              onChange={(e) => handleUpdateFollowUpStatus(fu.id, e.target.value as MonevFollowUpStatus)}
                              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1"
                            >
                              <option value="OPEN">OPEN</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4 & 5: ANALYTICS & REPORTING                                  */}
      {/* ================================================================= */}
      {(activeTabMode === "analytics" || activeTabMode === "reporting") && (
        <MonevAnalyticsReportView
          activePeriod={activePeriod}
          userRole={userRole}
          userScope={userScope}
          loggedUser={loggedUser}
          mode={activeTabMode}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onSelectVillageDetail={handleOpenDetailDesaModal}
        />
      )}

      {/* ================================================================= */}
      {/* TAB 6: KATALOG 18 MASTER AGENDA                                   */}
      {/* ================================================================= */}
      {activeTabMode === "master_agenda" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                18 Master Agenda Resmi PPG Magetan Timur
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Katalog master agenda yang diturunkan ke seluruh periode bulanan PPG. Perubahan pada katalog master terisolasi dari snapshot periode historis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {masterAgendas.map((mag) => (
              <Card key={mag.id} className="rounded-2xl border-slate-200 p-4 hover:shadow-md transition-shadow relative">
                <div className="flex items-start justify-between gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                    {mag.nomorUrut}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${KATEGORI_COLORS[mag.kategori] || "bg-slate-50 text-slate-600"}`}>
                    {mag.kategori}
                  </span>
                </div>

                <div className="mt-2.5">
                  <h4 className="font-black text-sm text-slate-900 leading-snug">{mag.judulAgenda}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {mag.deskripsi || "Agenda evaluasi dan pembinaan program kerja bulanan."}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Sasaran: <strong className="text-slate-700">{mag.sasaran}</strong></span>
                  {canManageMasterAgenda(userRole) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedMasterAgenda(mag);
                        setEditMasterJudul(mag.judulAgenda);
                        setEditMasterDeskripsi(mag.deskripsi || "");
                        setIsMasterAgendaModalOpen(true);
                      }}
                      className="h-6 px-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit Master
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CREATE FOLLOW-UP                                           */}
      {/* ================================================================= */}
      <Dialog open={isFollowUpModalOpen} onOpenChange={setIsFollowUpModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-indigo-600" />
              Buat Rencana Tindak Lanjut (Follow-Up)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Desa {fuDesa} ({fuWilayah}) • Agenda: {fuAgendaJudul}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFollowUpSubmit} className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Alasan / Kendala Utama</label>
              <input
                type="text"
                required
                value={fuAlasan}
                onChange={(e) => setFuAlasan(e.target.value)}
                placeholder="Misal: Jadwal bentrok kegiatan daerah"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Masalah</label>
              <input
                type="text"
                required
                value={fuMasalah}
                onChange={(e) => setFuMasalah(e.target.value)}
                placeholder="Rincian masalah di lapangan..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rencana Tindakan (Action Plan)</label>
              <input
                type="text"
                required
                value={fuRencana}
                onChange={(e) => setFuRencana(e.target.value)}
                placeholder="Langkah konkret penyelesaian..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">PIC / Penanggung Jawab</label>
                <input
                  type="text"
                  required
                  value={fuPic}
                  onChange={(e) => setFuPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Batas Waktu (Due Date)</label>
                <input
                  type="date"
                  required
                  value={fuTargetDate}
                  onChange={(e) => setFuTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsFollowUpModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                Simpan Tindak Lanjut
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: UBAH STATUS PERIODE */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Ubah Status Periode
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mengontrol alur siklus kerja pelaporan (Draft &rarr; Open &rarr; Verification &rarr; Locked &rarr; Archived).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangeStatus} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Status Baru</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as MonevPeriodStatus)}
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
              >
                <option value="DRAFT">DRAFT (Persiapan Master & Pengaturan)</option>
                <option value="OPEN">OPEN (Pelaporan Dibuka untuk Seluruh Desa)</option>
                <option value="VERIFICATION">VERIFICATION (Tahap Pemeriksaan & Verifikasi PPG)</option>
                <option value="LOCKED">LOCKED (Terkunci Permanen, Tidak Dapat Diedit)</option>
                <option value="ARCHIVED">ARCHIVED (Diarsipkan)</option>
              </select>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 text-[11px] text-slate-600 leading-relaxed">
              Status saat ini: <strong className="text-slate-900">{activePeriod.status}</strong>. Saat berstatus <strong>LOCKED</strong>, seluruh pengisian dan perubahan data oleh koordinator desa dikunci otomatis.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                Perbarui Status
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: BUAT PERIODE BARU + SELECT AGENDA & DESA + PREVIEW (Section 13) */}
      <Dialog open={isNewPeriodModalOpen} onOpenChange={setIsNewPeriodModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Buat Periode Monev & Generate Monitoring
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih bulan, cakupan wilayah/desa, dan agenda wajib yang akan dimonitor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePeriod} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Periode</label>
              <input
                type="text"
                placeholder="Misal: Monev PPG Periode November 2026"
                value={newPeriodNama}
                onChange={(e) => setNewPeriodNama(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bulan (1-12)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={newPeriodBulan}
                  onChange={(e) => setNewPeriodBulan(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tahun</label>
                <input
                  type="number"
                  value={newPeriodTahun}
                  onChange={(e) => setNewPeriodTahun(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={newPeriodTglMulai}
                  onChange={(e) => setNewPeriodTglMulai(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  value={newPeriodTglSelesai}
                  onChange={(e) => setNewPeriodTglSelesai(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Cakupan Wilayah Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Pilih Cakupan Wilayah & Desa</label>
              <div className="grid grid-cols-2 gap-2">
                {MASTER_WILAYAH_CONFIG.map(w => {
                  const checked = selectedNewWilayahs.includes(w.wilayah);
                  return (
                    <label
                      key={w.wilayah}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        checked ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNewWilayahs(prev => [...prev, w.wilayah]);
                          else setSelectedNewWilayahs(prev => prev.filter(x => x !== w.wilayah));
                        }}
                      />
                      <span>{w.wilayah} ({w.desas.length} Desa)</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Select Agendas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Pilih Agenda ({selectedNewAgendas.length} dipilih)</label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedNewAgendas(
                      selectedNewAgendas.length === masterAgendas.length ? [] : masterAgendas.map(a => a.id)
                    )
                  }
                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                >
                  {selectedNewAgendas.length === masterAgendas.length ? "Reset Pilihan" : "Pilih Semua 18 Agenda"}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                {masterAgendas.map(mag => {
                  const checked = selectedNewAgendas.includes(mag.id);
                  return (
                    <label key={mag.id} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNewAgendas(prev => [...prev, mag.id]);
                          else setSelectedNewAgendas(prev => prev.filter(x => x !== mag.id));
                        }}
                      />
                      <span className="font-bold text-slate-700">#{mag.nomorUrut}. {mag.judulAgenda}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <div className="font-black text-emerald-950">Preview Generate Monitoring:</div>
              <div className="text-emerald-800 font-bold">
                {previewVillageCount} Desa × {previewAgendaCount} Agenda = <strong>{previewTotalItems} Monitoring Items</strong>
              </div>
              <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenerateOnCreate}
                  onChange={(e) => setAutoGenerateOnCreate(e.target.checked)}
                />
                Langsung generate item monitoring secara idempotent saat periode dibuat
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsNewPeriodModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black">
                Konfirmasi & Buat Periode
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT MASTER AGENDA */}
      <Dialog open={isMasterAgendaModalOpen} onOpenChange={setIsMasterAgendaModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-600" />
              Kelola Master Agenda Resmi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Agenda No. {selectedMasterAgenda?.nomorUrut} • Kategori: {selectedMasterAgenda?.kategori}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMasterAgenda} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Judul Agenda</label>
              <input
                type="text"
                value={editMasterJudul}
                onChange={(e) => setEditMasterJudul(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi & Panduan Pelaksanaan</label>
              <textarea
                rows={3}
                value={editMasterDeskripsi}
                onChange={(e) => setEditMasterDeskripsi(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsMasterAgendaModalOpen(false)} className="rounded-xl text-xs font-bold">
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VERIFIKASI LAPORAN & PERSETUJUAN DESA / DAERAH (Section 14, 21, 22, 23, 24, 25) */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Persetujuan Laporan MONEV — {verifySummary ? formatKelompokDesaInline(verifySummary.desa, verifySummary.wilayah) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Report ID: <code className="text-slate-700 font-mono">{verifySummary?.reportId}</code> • Desa : <strong>{formatDesaShort(verifySummary?.wilayah || "")}</strong> • Kelompok : <strong>{formatKelompokShort(verifySummary?.desa || "")}</strong> • Status : <strong className="text-purple-700">{formatApprovalStatusLabel(verifySummary?.statusLaporan)} ({verifySummary?.statusLaporan})</strong>
            </DialogDescription>
          </DialogHeader>

          {verifySummary && (
            <div className="space-y-4 mt-2">
              {/* Section 14 & 21: Format Header Laporan */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-black border-b border-slate-200 pb-2">
                  <span className="uppercase text-slate-800">LAPORAN MONEV — MONEV AGENDA BULANAN PPG</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                      Status : {formatApprovalStatusLabel(verifySummary.statusLaporan)} ({verifySummary.statusLaporan})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-purple-800">
                      Verifikasi : {verifySummary.statusVerifikasi}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 bg-white border border-slate-200/80 rounded-xl p-2.5">
                  <div><span className="text-slate-500 font-semibold">Desa :</span> <strong className="text-slate-900">{formatDesaShort(verifySummary.wilayah)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Kelompok :</span> <strong className="text-slate-900">{formatKelompokShort(verifySummary.desa)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Periode :</span> <strong className="text-slate-900">{activePeriod.namaPeriode}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Admin :</span> <strong className="text-slate-900">{verifySummary.submission?.submittedBy || verifySummary.submission?.updatedBy || "-"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Status :</span> <strong className="text-cyan-700">{formatApprovalStatusLabel(verifySummary.statusLaporan)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Progress :</span> <strong className="text-emerald-700">{verifySummary.avgKetercapaian}%</strong></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black text-slate-400 uppercase">TOTAL AGENDA</div>
                    <div className="text-base font-black text-slate-900">{verifySummary.totalAgendas}</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <div className="text-[9px] font-black text-emerald-700 uppercase">SELESAI</div>
                    <div className="text-base font-black text-emerald-800">{verifySummary.completedMandatory}</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <div className="text-[9px] font-black text-amber-700 uppercase">SEBAGIAN</div>
                    <div className="text-base font-black text-amber-800">{verifySummary.agendaPartial}</div>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <div className="text-[9px] font-black text-rose-700 uppercase">BELUM SELESAI</div>
                    <div className="text-base font-black text-rose-800">{verifySummary.agendaNotCompleted}</div>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black text-slate-600 uppercase">BELUM DIMULAI</div>
                    <div className="text-base font-black text-slate-800">{verifySummary.agendaNotStarted}</div>
                  </div>
                  <div className="bg-emerald-600 text-white p-2 rounded-xl">
                    <div className="text-[9px] font-black text-emerald-100 uppercase">PROGRESS</div>
                    <div className="text-base font-black">{verifySummary.avgKetercapaian}%</div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>Daftar Realisasi & Hasil Laporan 18 Agenda</span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Submitted By: {verifySummary.submission?.submittedBy || "-"}
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {verifySummary.items.map((item) => {
                    const laporanText = item.laporanPelaksanaan || item.catatanEvaluasi || "";
                    const padded = String(item.nomorUrut).padStart(2, "0");
                    const itemSt = item.statusKetercapaian || (item.terlaksana ? "COMPLETED" : "NOT_STARTED");
                    return (
                      <div key={item.id} className="p-3 hover:bg-slate-50/60 flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              AGENDA #{padded}
                            </span>
                            <span>{item.judulAgenda}</span>
                            <span className="text-[10px] text-slate-400 font-medium">• {item.kategori}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-semibold">
                            Status: <strong className="text-slate-900">{itemSt}</strong>
                          </div>
                          <div className="text-[11px] text-slate-800 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5">
                            <strong className="text-slate-600">Hasil: </strong>
                            {laporanText ? laporanText : <span className="italic text-slate-400">Belum ada catatan laporan tertulis</span>}
                          </div>
                          {item.kendala && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                              ⚠️ Kendala: {item.kendala}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                            {item.penanggungJawab && <span>PJ: {item.penanggungJawab}</span>}
                            {item.updatedBy && <span>Updated By: {item.updatedBy}</span>}
                            {item.updatedAt && <span>Updated At: {new Date(item.updatedAt).toLocaleString("id-ID")}</span>}
                            {item.evidenceUrls && item.evidenceUrls.length > 0 && (
                              <span className="text-emerald-700 font-bold">📎 {item.evidenceUrls.length} Bukti</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge className={`text-[10px] font-black ${
                            item.statusKetercapaian === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                            item.statusKetercapaian === "PARTIAL" ? "bg-amber-100 text-amber-800" :
                            item.statusKetercapaian === "NOT_COMPLETED" ? "bg-rose-100 text-rose-800" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {itemSt} ({item.ketercapaianPersen}%)
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Persetujuan / Verification Note (Opsional saat Setujui) — Alasan Penolakan (Wajib diisi jika Tolak)
                </label>
                <textarea
                  rows={2}
                  value={verifyCatatan}
                  onChange={(e) => setVerifyCatatan(e.target.value)}
                  placeholder="Isi catatan persetujuan (opsional) atau alasan perbaikan (wajib jika menolak laporan)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsVerifyModalOpen(false)} className="rounded-xl text-xs font-bold">
                  Batal
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleConfirmVerify("REJECTED")}
                    className="rounded-xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Tolak (Perlu Perbaikan)
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleConfirmVerify("VERIFIED")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Setujui Laporan
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: KONFIRMASI PENGIRIMAN LAPORAN KELOMPOK */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Submit Laporan Monev — {submitSummary ? formatKelompokDesaInline(submitSummary.desa, submitSummary.wilayah) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Desa : {formatDesaShort(submitSummary?.wilayah || "")} • Kelompok : {formatKelompokShort(submitSummary?.desa || "")} • Periode : {activePeriod.namaPeriode}
            </DialogDescription>
          </DialogHeader>

          {submitSummary && (
            <div className="space-y-4 mt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Desa :</span>
                  <strong className="text-slate-900">{formatDesaShort(submitSummary.wilayah)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Kelompok :</span>
                  <strong className="text-slate-900">{formatKelompokShort(submitSummary.desa)}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Agenda Telah Diisi:</span>
                  <strong className="text-slate-900">{submitSummary.agendaTerisi} dari {submitSummary.totalAgendas} Agenda</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Agenda Wajib Selesai:</span>
                  <strong className="text-slate-900">{submitSummary.completedMandatory} dari {submitSummary.totalMandatory} Agenda</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress:</span>
                  <strong className="text-emerald-700">{submitSummary.avgKetercapaian}%</strong>
                </div>
              </div>

              {submitSummary.incompleteAgendas && submitSummary.incompleteAgendas.length > 0 ? (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2 text-xs text-rose-900">
                  <div className="font-black flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Masih ada {submitSummary.incompleteAgendas.length} agenda yang belum diisi:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 max-h-36 overflow-y-auto text-[11px] font-semibold">
                    {submitSummary.incompleteAgendas.map(a => (
                      <li key={a.nomorUrut}>
                        Agenda {String(a.nomorUrut).padStart(2, "0")} — {a.judulAgenda}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-700 pt-1">
                    Silakan pilih status (Selesai / Sebagian / Tidak Selesai) pada seluruh agenda di atas sebelum melakukan Submit.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-2xl leading-relaxed">
                  ℹ️ Seluruh 18 agenda telah diisi. Setelah di-submit, laporan berstatus <strong>Menunggu Persetujuan (SUBMITTED)</strong> dan siap direview oleh Admin Desa / Superadmin.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsSubmitModalOpen(false)} className="rounded-xl text-xs font-bold">
                  {submitSummary.incompleteAgendas && submitSummary.incompleteAgendas.length > 0 ? "Kembali Lengkapi" : "Batal"}
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(submitSummary.incompleteAgendas && submitSummary.incompleteAgendas.length > 0)}
                  onClick={handleConfirmSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit Sekarang
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* MODAL: NOTIFIKASI APRESIASI & AVATAR ANIMASI SETELAH SUBMIT SUKSES */}
      {/* ================================================================= */}
      <Dialog open={isAppreciationModalOpen} onOpenChange={setIsAppreciationModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 text-center overflow-hidden border-emerald-200">
          <DialogHeader className="sr-only">
            <DialogTitle>Laporan Berhasil Dikirim</DialogTitle>
            <DialogDescription>Apresiasi penyelesaian laporan MONEV Agenda Bulanan PPG</DialogDescription>
          </DialogHeader>

          {/* Animated Avatar Visual Element (Lightweight SVG + Smooth CSS Animation) */}
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center my-1">
            {/* Subtle glowing background rings */}
            <div className="absolute inset-0 rounded-full bg-emerald-100/80 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300/70 shadow-inner" />

            {/* Subtle Celebration Sparkles */}
            <span className="absolute -top-1 left-3 text-amber-400 text-base animate-bounce" style={{ animationDuration: "2.2s" }}>✦</span>
            <span className="absolute top-2 -right-1 text-emerald-500 text-sm animate-bounce" style={{ animationDuration: "1.8s" }}>★</span>
            <span className="absolute bottom-2 -left-1 text-teal-500 text-xs animate-bounce" style={{ animationDuration: "2.5s" }}>✦</span>

            {/* Smiling PPG Coordinator Avatar with Waving / Thumbs-Up Appreciation Gesture */}
            <svg
              viewBox="0 0 120 120"
              className="relative z-10 w-28 h-28 drop-shadow-sm"
              role="img"
              aria-label="Avatar Apresiasi Pengiriman Laporan MONEV PPG"
            >
              {/* Shoulders / Baju Koko Emerald */}
              <path
                d="M26 108 C26 84, 94 84, 94 108 Z"
                fill="#059669"
              />
              {/* Collar / Kerah Koko */}
              <path
                d="M46 86 L60 98 L74 86 L68 83 L60 91 L52 83 Z"
                fill="#ecfdf5"
              />
              {/* Neck */}
              <rect x="53" y="74" width="14" height="12" rx="4" fill="#fcd34d" />
              {/* Head / Face */}
              <circle cx="60" cy="54" r="22" fill="#fde68a" />
              {/* Warm Cheeks */}
              <circle cx="46" cy="58" r="3.2" fill="#fda4af" opacity="0.65" />
              <circle cx="74" cy="58" r="3.2" fill="#fda4af" opacity="0.65" />
              {/* Happy Smiling Eyes */}
              <path d="M48 51 Q51 47 54 51" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
              <path d="M66 51 Q69 47 72 51" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
              {/* Warm Appreciative Smile */}
              <path d="M50 60 Q60 69 70 60" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" fill="none" />
              {/* Peci / Kopiah Hitam Berlist Emerald */}
              <path
                d="M37 42 C38 26, 82 26, 83 42 Z"
                fill="#1e293b"
              />
              <rect x="37" y="39" width="46" height="4" rx="2" fill="#10b981" />

              {/* Animated Thumbs-Up / Waving Hand Badge */}
              <g className="origin-bottom-right animate-bounce" style={{ animationDuration: "1.6s" }}>
                <circle cx="92" cy="78" r="15" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                {/* Thumbs-up icon */}
                <path
                  d="M89 79 V72 C89 70.5 90.5 69.5 91.8 70.2 L92.5 70.6 C93.2 71 93.6 71.8 93.4 72.6 L92.8 75 H96.5 C97.9 75 98.9 76.3 98.5 77.7 L97.1 82.7 C96.8 83.6 96 84.2 95.1 84.2 H89 C87.9 84.2 87 83.3 87 82.2 V79.8 C87 79.3 87.4 79 88 79 Z"
                  fill="#ffffff"
                />
                <rect x="84.5" y="76.5" width="3" height="7.5" rx="1" fill="#ecfdf5" />
              </g>
            </svg>
          </div>

          {/* Warm, Positive & Professional Appreciation Message */}
          <div className="space-y-2.5 mt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Status: Laporan berhasil dikirim
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Laporan berhasil dikirim! 🎉
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Terima kasih atas kontribusi dan ketelitian Anda dalam menyelesaikan laporan MONEV bulan ini.
            </p>
          </div>

          {appreciatedSubmissionInfo && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 mt-3 text-xs space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Desa :</span>
                <strong className="text-slate-900">
                  {formatDesaShort(appreciatedSubmissionInfo.wilayah)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kelompok :</span>
                <strong className="text-slate-900">
                  {formatKelompokShort(appreciatedSubmissionInfo.desa)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Periode :</span>
                <strong className="text-slate-800">{activePeriod.namaPeriode}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Progress :</span>
                <strong className="text-emerald-700">
                  {appreciatedSubmissionInfo.avgKetercapaian}% ({appreciatedSubmissionInfo.completedMandatory} / {appreciatedSubmissionInfo.totalMandatory} Selesai)
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status :</span>
                <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-300 text-[10px] font-black">
                  Menunggu Persetujuan (SUBMITTED)
                </Badge>
              </div>
            </div>
          )}

          <div className="pt-3">
            <Button
              type="button"
              onClick={() => setIsAppreciationModalOpen(false)}
              className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20"
            >
              Selesai & Kembali ke Halaman MONEV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: DETAIL LAPORAN MONEV 18 AGENDA (Section 14, 15, 21 & 24) */}
      <Dialog open={isDetailDesaModalOpen} onOpenChange={setIsDetailDesaModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              LAPORAN MONEV — {detailSummary ? formatKelompokDesaInline(detailSummary.desa, detailSummary.wilayah) : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Report ID: <code className="text-slate-700 font-mono">{detailSummary?.reportId}</code> • Desa : <strong>{formatDesaShort(detailSummary?.wilayah || "")}</strong> • Kelompok : <strong>{formatKelompokShort(detailSummary?.desa || "")}</strong> • Periode : <strong>{activePeriod.namaPeriode}</strong> • Status : <strong>{formatApprovalStatusLabel(detailSummary?.statusLaporan)} ({detailSummary?.statusLaporan})</strong>
            </DialogDescription>
          </DialogHeader>

          {detailSummary && (
            <div className="space-y-4 mt-2">
              {/* Section 14, 15 & 21: Header Laporan MONEV */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-black border-b border-slate-200 pb-2">
                  <span className="uppercase text-slate-800">LAPORAN MONEV — RINGKASAN HASIL LAPORAN</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                      Status : {formatApprovalStatusLabel(detailSummary.statusLaporan)} ({detailSummary.statusLaporan})
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${
                      detailSummary.statusVerifikasi === "VERIFIED"
                        ? "bg-purple-100 border-purple-200 text-purple-800"
                        : detailSummary.statusVerifikasi === "REJECTED"
                          ? "bg-red-100 border-red-200 text-red-800"
                          : "bg-amber-100 border-amber-200 text-amber-800"
                    }`}>
                      STATUS VERIFIKASI: {detailSummary.statusVerifikasi}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700 bg-white border border-slate-200/80 rounded-xl p-2.5">
                  <div><span className="text-slate-500 font-semibold">Desa :</span> <strong className="text-slate-900">{formatDesaShort(detailSummary.wilayah)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Kelompok :</span> <strong className="text-slate-900">{formatKelompokShort(detailSummary.desa)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Periode :</span> <strong className="text-slate-900">{activePeriod.namaPeriode}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Admin :</span> <strong className="text-slate-900">{detailSummary.submission?.submittedBy || detailSummary.submission?.updatedBy || "-"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Status :</span> <strong className="text-slate-900">{detailSummary.submission?.status === "VERIFIED" ? "DISETUJUI" : formatApprovalStatusLabel(detailSummary.statusLaporan)}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Progress :</span> <strong className="text-emerald-700">{detailSummary.avgKetercapaian}%</strong></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black text-slate-400 uppercase">TOTAL AGENDA</div>
                    <div className="text-base font-black text-slate-900">{detailSummary.totalAgendas}</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <div className="text-[9px] font-black text-emerald-700 uppercase">SELESAI</div>
                    <div className="text-base font-black text-emerald-800">{detailSummary.completedMandatory}</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <div className="text-[9px] font-black text-amber-700 uppercase">SEBAGIAN</div>
                    <div className="text-base font-black text-amber-800">{detailSummary.agendaPartial}</div>
                  </div>
                  <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <div className="text-[9px] font-black text-rose-700 uppercase">BELUM SELESAI</div>
                    <div className="text-base font-black text-rose-800">{detailSummary.agendaNotCompleted}</div>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black text-slate-600 uppercase">BELUM DIMULAI</div>
                    <div className="text-base font-black text-slate-800">{detailSummary.agendaNotStarted}</div>
                  </div>
                  <div className="bg-emerald-600 text-white p-2 rounded-xl">
                    <div className="text-[9px] font-black text-emerald-100 uppercase">PROGRESS</div>
                    <div className="text-base font-black">{detailSummary.avgKetercapaian}%</div>
                  </div>
                </div>
              </div>

              {detailSummary.submission?.status === "VERIFIED" && (
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>Status :</strong> DISETUJUI •{" "}
                    <strong>Disetujui oleh :</strong> {detailSummary.submission.verifiedBy || "-"} •{" "}
                    <strong>Tanggal :</strong> {detailSummary.submission.verifiedAt ? new Date(detailSummary.submission.verifiedAt).toLocaleString("id-ID") : "-"}
                  </div>
                  <div>
                    <strong>Catatan :</strong> {detailSummary.submission.verificationNote || detailSummary.submission.catatanVerifikasi || "-"}
                  </div>
                </div>
              )}

              {detailSummary.submission?.status === "REJECTED" && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                  <div>
                    <strong>Status :</strong> PERLU PERBAIKAN (REJECTED) •{" "}
                    <strong>Rejected By:</strong> {detailSummary.submission.rejectedBy || detailSummary.submission.verifiedBy || "-"} •{" "}
                    <strong>Rejected At:</strong> {detailSummary.submission.rejectedAt ? new Date(detailSummary.submission.rejectedAt).toLocaleString("id-ID") : "-"}
                  </div>
                  <div>
                    <strong>REJECTION REASON:</strong> {detailSummary.submission.rejectionReason || detailSummary.submission.catatanVerifikasi || "-"}
                  </div>
                </div>
              )}

              {/* Section 21: Detail Report Format per Agenda */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-24">Agenda</th>
                      <th className="py-2.5 px-3">Nama Agenda & Kategori</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Hasil / Laporan Pelaksanaan & Kendala</th>
                      <th className="py-2.5 px-3">Audit Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailSummary.items.map((item) => {
                      const padded = String(item.nomorUrut).padStart(2, "0");
                      const laporanVal = item.laporanPelaksanaan || item.catatanEvaluasi || "";
                      const itemSt = item.statusKetercapaian || (item.terlaksana ? "COMPLETED" : "NOT_STARTED");
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 text-center font-black text-slate-700">
                            AGENDA #{padded}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.judulAgenda}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${KATEGORI_COLORS[item.kategori] || "bg-slate-50"}`}>
                                {item.kategori}
                              </span>
                              {item.tanggalPelaksanaan && (
                                <span className="text-[10px] text-emerald-600">• {item.tanggalPelaksanaan}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className={`text-[10px] font-black ${
                              item.statusKetercapaian === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                              item.statusKetercapaian === "PARTIAL" ? "bg-amber-100 text-amber-800" :
                              item.statusKetercapaian === "NOT_COMPLETED" && item.updatedBy ? "bg-rose-100 text-rose-800" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              Status: {itemSt}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-700 space-y-0.5">
                            <div>
                              <strong className="text-slate-800">Hasil: </strong>
                              {laporanVal ? laporanVal : <span className="italic text-slate-400">-</span>}
                            </div>
                            {item.kendala && <div className="text-amber-600">⚠️ Kendala: {item.kendala}</div>}
                            {item.tindakLanjut && <div className="text-indigo-600 text-[10px]">Aksi: {item.tindakLanjut}</div>}
                            {item.evidenceUrls && item.evidenceUrls.length > 0 && (
                              <div className="text-emerald-700 text-[10px] font-bold">
                                📎 {item.evidenceUrls.length} Lampiran Bukti
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-slate-500">
                            <div>By: <strong className="text-slate-700">{item.updatedBy || "-"}</strong></div>
                            {item.updatedAt && <div>{new Date(item.updatedAt).toLocaleString("id-ID")}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDetailDesaModalOpen(false);
                    setFilterWilayah(detailSummary.wilayah);
                    setFilterDesa(detailSummary.desa);
                    setActiveTabMode("checklist_input");
                  }}
                  className="rounded-xl text-xs font-bold border-emerald-200 text-emerald-700"
                >
                  Buka di Checklist Input
                </Button>

                <div className="flex items-center gap-2">
                  {canApproveReport(userRole, userScope, detailSummary.desa, detailSummary.wilayah).allowed &&
                    detailSummary.submission?.status === "SUBMITTED" && (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsDetailDesaModalOpen(false);
                          handleOpenVerifyModal(detailSummary.desa);
                        }}
                        className="rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Setujui Laporan
                      </Button>
                    )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDetailDesaModalOpen(false)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
