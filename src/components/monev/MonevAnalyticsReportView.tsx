import React, { useState, useMemo } from "react";
import {
  MonevPeriod,
  MonevAnalyticsData,
  MonevExecutiveReport,
  MonevAuditLog,
  formatDesaLabel,
  formatDesaShort,
  formatKelompokLabel,
  formatKelompokShort,
  formatKelompokDesaInline,
  formatApprovalStatusLabel
} from "@/lib/monev/types";
import {
  getAnalyticsData,
  getExecutiveReport,
  getMonevAuditLogs,
  canManagePeriods
} from "@/lib/monev/monevService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Layers,
  FileText,
  History,
  Download,
  FileSpreadsheet,
  Printer,
  Grid,
  Award
} from "lucide-react";

interface MonevAnalyticsReportViewProps {
  activePeriod: MonevPeriod;
  userRole: string;
  userScope?: string;
  loggedUser?: string;
  mode: "analytics" | "reporting";
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onSelectVillageDetail?: (desa: string) => void;
}

export function MonevAnalyticsReportView({
  activePeriod,
  userRole,
  userScope = "Semua",
  loggedUser,
  mode,
  onExportCSV,
  onExportExcel,
  onExportPDF,
  onSelectVillageDetail
}: MonevAnalyticsReportViewProps) {
  const [heatmapRegionFilter, setHeatmapRegionFilter] = useState<string>("Semua");
  const [reportSubSection, setReportSubSection] = useState<
    "executive" | "regional" | "village" | "agenda" | "followup" | "audit"
  >("executive");

  const authScope = useMemo(
    () => ({ username: loggedUser, role: userRole, scope: userScope }),
    [loggedUser, userRole, userScope]
  );

  const analytics: MonevAnalyticsData = useMemo(
    () => getAnalyticsData(activePeriod.id, authScope),
    [activePeriod.id, activePeriod.updatedAt, activePeriod.status, authScope]
  );

  const report: MonevExecutiveReport = useMemo(
    () => getExecutiveReport(activePeriod.id, authScope),
    [activePeriod.id, activePeriod.updatedAt, activePeriod.status, authScope]
  );

  const auditLogs: MonevAuditLog[] = useMemo(
    () => (canManagePeriods(userRole) ? getMonevAuditLogs() : []),
    [userRole, activePeriod.id, activePeriod.updatedAt]
  );

  const filteredHeatmapRows = useMemo(() => {
    if (heatmapRegionFilter === "Semua") return analytics.heatmapMatrix;
    return analytics.heatmapMatrix.filter(r => r.wilayah === heatmapRegionFilter);
  }, [analytics.heatmapMatrix, heatmapRegionFilter]);

  if (mode === "analytics") {
    return (
      <div className="space-y-6">
        {/* 1. Desa Performance Comparison */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Performa Desa (Selatan, Tengah, Utara, Timur)
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan tingkat pelaporan (Reporting Rate) dan penyelesaian agenda wajib (Completion Rate) antar Desa.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {analytics.regionPerformance.map((reg) => (
              <Card key={reg.wilayah} className="rounded-2xl p-4 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900">{formatDesaLabel(reg.wilayah)}</span>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
                    {reg.totalDesa} Kelompok
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Completion Rate:</span>
                    <strong className="text-emerald-700">{reg.avgProgress}%</strong>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${reg.avgProgress}%` }} />
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Reporting Rate:</span>
                    <strong className="text-indigo-700">{reg.reportingRate}%</strong>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${reg.reportingRate}%` }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-purple-700 font-bold">Sah: {reg.verifiedCount}</span>
                  <span className="text-cyan-700 font-bold">Setor: {reg.submittedCount}</span>
                  <span className={reg.attentionRequiredCount > 0 ? "text-amber-700 font-black" : "text-slate-400"}>
                    Perlu Atensi: {reg.attentionRequiredCount}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 2. Agenda Performance (Highest Completion, Highest Partial, Highest Not Completed) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-3xl p-5 border-emerald-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              Agenda Completion Tertinggi
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.highestCompletionAgendas.slice(0, 5).map(ag => (
                <div key={ag.nomorUrut} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">#{ag.nomorUrut}. {ag.judulAgenda}</div>
                    <span className="text-[10px] text-slate-400">{ag.completedCount} dari {ag.totalVillages} desa selesai</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs shrink-0">
                    {ag.completionRate}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl p-5 border-amber-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              Agenda Partial (Sebagian) Tertinggi
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.highestPartialAgendas.slice(0, 5).map(ag => (
                <div key={ag.nomorUrut} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">#{ag.nomorUrut}. {ag.judulAgenda}</div>
                    <span className="text-[10px] text-slate-400">{ag.partialCount} desa terlaksana sebagian</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-black text-xs shrink-0">
                    {ag.partialCount} Desa
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl p-5 border-rose-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Agenda Belum Terlaksana / Kendala Tertinggi
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.highestNotCompletedAgendas.slice(0, 5).map(ag => (
                <div key={ag.nomorUrut} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">#{ag.nomorUrut}. {ag.judulAgenda}</div>
                    <span className="text-[10px] text-slate-400">
                      Belum: {ag.notCompletedCount} • Sebagian: {ag.partialCount}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-black text-xs shrink-0">
                    {ag.notCompletedCount + ag.partialCount} Isu
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 3. Kelompok Performance (Highest, Lowest, Attention Required) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-3xl p-5 border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Kelompok Capaian Tertinggi
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.highestVillages.slice(0, 5).map((v, i) => (
                <div key={v.desa} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900">{i + 1}. {formatKelompokLabel(v.desa)}</span>
                    <span className="text-[10px] text-slate-400 block">{formatDesaLabel(v.wilayah)} • {v.completedCount}/{v.totalMandatory} selesai</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 font-black text-xs">{v.completionRate}%</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl p-5 border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-slate-600 font-black text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              Kelompok Capaian Terendah
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.lowestVillages.slice(0, 5).map((v, i) => (
                <div key={v.desa} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900">{i + 1}. {formatKelompokLabel(v.desa)}</span>
                    <span className="text-[10px] text-slate-400 block">{formatDesaLabel(v.wilayah)} • Status: {formatApprovalStatusLabel(v.submissionStatus)}</span>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 font-black text-xs">{v.completionRate}%</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl p-5 border-amber-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Kelompok Membutuhkan Perhatian ({analytics.attentionVillages.length})
            </div>
            <div className="divide-y divide-slate-100 text-xs max-h-56 overflow-y-auto">
              {analytics.attentionVillages.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">Seluruh kelompok berjalan lancar tanpa isu kritikal.</p>
              ) : (
                analytics.attentionVillages.slice(0, 6).map(v => (
                  <div key={v.desa} className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-black text-slate-900">{formatKelompokDesaInline(v.desa, v.wilayah)}</span>
                      <span className="text-[10px] text-amber-700 block font-semibold">
                        {v.attentionReasons.join(" • ")}
                      </span>
                    </div>
                    {onSelectVillageDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectVillageDetail(v.desa)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                      >
                        Detail
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 4. HEATMAP: Kelompok × 18 Agenda */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 text-emerald-600" />
                Matriks Heatmap: Kelompok × 18 Agenda Bulanan PPG
              </h3>
              <p className="text-xs text-slate-500">
                Visualisasi lintas kelompok dan agenda. Hijau = Selesai (100%), Kuning = Sebagian, Merah = Belum Terlaksana, Abu = Belum Diisi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Desa :</span>
              <select
                value={heatmapRegionFilter}
                onChange={(e) => setHeatmapRegionFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
              >
                <option value="Semua">Semua Desa ({analytics.heatmapMatrix.length} Kelompok)</option>
                <option value="Desa Selatan">Desa : Selatan</option>
                <option value="Desa Tengah">Desa : Tengah</option>
                <option value="Desa Utara">Desa : Utara</option>
                <option value="Desa Timur">Desa : Timur</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-10">Kelompok (Desa)</th>
                  <th className="py-2.5 px-2 text-center">%</th>
                  {analytics.agendaPerformance.map(ag => (
                    <th
                      key={ag.nomorUrut}
                      className="py-2.5 px-1.5 text-center w-8"
                      title={`#${ag.nomorUrut}. ${ag.judulAgenda}`}
                    >
                      A{ag.nomorUrut}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHeatmapRows.map(row => (
                  <tr key={row.desa} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-black text-slate-900 sticky left-0 bg-white whitespace-nowrap">
                      <span>{formatKelompokShort(row.desa)}</span>
                      <span className="text-[9px] text-slate-400 font-normal ml-1.5">({formatDesaLabel(row.wilayah)})</span>
                    </td>
                    <td className="py-2 px-2 text-center font-black text-emerald-700">{row.completionRate}%</td>
                    {row.cells.map(cell => (
                      <td key={cell.nomorUrut} className="py-1.5 px-1 text-center">
                        <div
                          title={`Kelompok ${row.desa} (${formatDesaLabel(row.wilayah)}) - #${cell.nomorUrut} ${cell.judulAgenda}: ${cell.status} (${cell.persen}%)${cell.kendala ? ` | Kendala: ${cell.kendala}` : ""}`}
                          className={`w-6 h-6 rounded-md mx-auto flex items-center justify-center text-[9px] font-black ${
                            cell.status === "COMPLETED"
                              ? "bg-emerald-500 text-white"
                              : cell.status === "PARTIAL"
                                ? "bg-amber-400 text-slate-950"
                                : cell.status === "NOT_COMPLETED"
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {cell.status === "COMPLETED" ? "✓" : cell.status === "PARTIAL" ? "◐" : cell.status === "NOT_COMPLETED" ? "✕" : "-"}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Historical Comparable Period Trend */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Tren Historis Antar Periode (Comparable Periods: {activePeriod.totalAgenda} Agenda)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.periodTrends.map(pt => (
              <div key={pt.periodId} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="font-black text-xs text-slate-900">{pt.namaPeriode}</div>
                  <span className="text-[10px] text-slate-500">Kode: {pt.periodeKode} • Status: {pt.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-700">{pt.avgCompletionRate}% Capaian</div>
                  <div className="text-[10px] text-indigo-600 font-bold">Lapor: {pt.reportingRate}% • Sah: {pt.verificationRate}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE: REPORTING & AUDIT TRAIL (Section 30 & 27)
  // ==========================================
  return (
    <div className="space-y-5">
      {/* Sub-navigation & Export Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "executive", label: "1. Executive Summary" },
            { id: "regional", label: "2. Regional Report" },
            { id: "village", label: "3. Village Report" },
            { id: "agenda", label: "4. Agenda Report" },
            { id: "followup", label: "5. Follow-up Report" },
            ...(canManagePeriods(userRole) ? [{ id: "audit", label: "6. Audit Log Sistem" }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportSubSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                reportSubSection === tab.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onExportCSV} className="rounded-xl text-xs font-bold">
            <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
            CSV
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onExportExcel} className="rounded-xl text-xs font-bold">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Excel (.xlsx)
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onExportPDF} className="rounded-xl text-xs font-bold">
            <Printer className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            PDF Resmi
          </Button>
        </div>
      </div>

      {/* 1. EXECUTIVE SUMMARY */}
      {reportSubSection === "executive" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Executive Summary Report
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1.5">{report.period.namaPeriode}</h3>
              <p className="text-xs text-slate-500">
                Kode Periode: {report.period.periodeKode} • Status: {report.period.status} • Rentang: {report.period.tanggalMulai} s/d {report.period.tanggalSelesai}
              </p>
            </div>
            {report.period.lockedBy && (
              <div className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-3 py-2 rounded-xl">
                🔒 Dikunci oleh <strong>{report.period.lockedBy}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-black uppercase text-slate-400">Total Desa Cakupan</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{report.totalVillages} Desa</div>
              <div className="text-[11px] text-slate-500 mt-0.5">4 Wilayah Magetan Timur</div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200">
              <div className="text-[10px] font-black uppercase text-cyan-700">Reporting Rate</div>
              <div className="text-2xl font-black text-cyan-900 mt-1">{report.reportingRate}%</div>
              <div className="text-[11px] text-cyan-700 mt-0.5">{report.reportedVillages} dari {report.totalVillages} desa melapor</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="text-[10px] font-black uppercase text-emerald-700">Completion Rate</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{report.completionRate}%</div>
              <div className="text-[11px] text-emerald-700 mt-0.5">Rata-rata penyelesaian agenda wajib</div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
              <div className="text-[10px] font-black uppercase text-purple-700">Verification Rate</div>
              <div className="text-2xl font-black text-purple-900 mt-1">{report.verificationRate}%</div>
              <div className="text-[11px] text-purple-700 mt-0.5">{report.verifiedVillages} desa disahkan PPG Daerah</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REGIONAL REPORT */}
      {reportSubSection === "regional" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 overflow-x-auto">
          <h4 className="text-sm font-black text-slate-900 mb-3">Laporan Performa 4 Desa (Selatan, Tengah, Utara, Timur)</h4>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Desa</th>
                <th className="py-3 px-3.5 text-center">Total Kelompok</th>
                <th className="py-3 px-3.5 text-center">Reporting Rate</th>
                <th className="py-3 px-3.5 text-center">Completion Rate</th>
                <th className="py-3 px-3.5 text-center">Disetujui</th>
                <th className="py-3 px-3.5 text-center">Menunggu Persetujuan</th>
                <th className="py-3 px-3.5 text-center">Draft / Belum</th>
                <th className="py-3 px-3.5 text-center">Perlu Perhatian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.regionalReport.map(r => (
                <tr key={r.wilayah} className="hover:bg-slate-50">
                  <td className="py-3 px-3.5 font-black text-slate-900">{formatDesaLabel(r.wilayah)}</td>
                  <td className="py-3 px-3.5 text-center font-bold">{r.totalDesa}</td>
                  <td className="py-3 px-3.5 text-center font-black text-cyan-700">{r.reportingRate}%</td>
                  <td className="py-3 px-3.5 text-center font-black text-emerald-700">{r.avgProgress}%</td>
                  <td className="py-3 px-3.5 text-center font-bold text-purple-700">{r.verifiedCount}</td>
                  <td className="py-3 px-3.5 text-center font-bold text-cyan-700">{r.submittedCount}</td>
                  <td className="py-3 px-3.5 text-center text-slate-600">{r.draftCount + r.belumDimulaiCount}</td>
                  <td className="py-3 px-3.5 text-center font-black text-amber-700">{r.attentionRequiredCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. VILLAGE / KELOMPOK REPORT */}
      {reportSubSection === "village" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 overflow-x-auto">
          <h4 className="text-sm font-black text-slate-900 mb-3">Laporan Status Seluruh Kelompok & Desa</h4>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-center">No</th>
                <th className="py-3 px-3">Desa</th>
                <th className="py-3 px-3">Kelompok</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Progress (%)</th>
                <th className="py-3 px-3 text-center">Selesai / Wajib</th>
                <th className="py-3 px-3 text-center">Sebagian / Belum</th>
                <th className="py-3 px-3">Disetujui Oleh & Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.villageReport.map((v, idx) => (
                <tr key={v.desa} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-semibold">{formatDesaLabel(v.wilayah)}</td>
                  <td className="py-2.5 px-3 font-black text-slate-900">{formatKelompokLabel(v.desa)}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{formatApprovalStatusLabel(v.submissionStatus)} ({v.submissionStatus})</td>
                  <td className="py-2.5 px-3 text-center font-black text-emerald-700">{v.completionRate}%</td>
                  <td className="py-2.5 px-3 text-center font-bold">{v.completedCount} / {v.totalMandatory}</td>
                  <td className="py-2.5 px-3 text-center text-amber-700">{v.partialCount} / {v.notCompletedCount}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500">
                    {v.verifiedBy ? `${v.verifiedBy}: ${v.catatanVerifikasi || "-"}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. AGENDA REPORT */}
      {reportSubSection === "agenda" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 overflow-x-auto">
          <h4 className="text-sm font-black text-slate-900 mb-3">Laporan Performa 18 Master Agenda</h4>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-center">No</th>
                <th className="py-3 px-3">Judul Agenda</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3 text-center">Selesai (Desa)</th>
                <th className="py-3 px-3 text-center">Sebagian (Desa)</th>
                <th className="py-3 px-3 text-center">Belum (Desa)</th>
                <th className="py-3 px-3 text-center">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.agendaReport.map(ag => (
                <tr key={ag.nomorUrut} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center font-bold text-slate-400">#{ag.nomorUrut}</td>
                  <td className="py-2.5 px-3 font-black text-slate-900">{ag.judulAgenda}</td>
                  <td className="py-2.5 px-3 text-slate-600">{ag.kategori}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{ag.completedCount}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-amber-700">{ag.partialCount}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-700">{ag.notCompletedCount}</td>
                  <td className="py-2.5 px-3 text-center font-black text-slate-900">{ag.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. FOLLOW-UP REPORT */}
      {reportSubSection === "followup" && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-black uppercase text-amber-700">Open / In Progress</div>
              <div className="text-xl font-black text-amber-900">{report.followUpSummary.open + report.followUpSummary.inProgress}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-[10px] font-black uppercase text-rose-700">Overdue (Terlambat)</div>
              <div className="text-xl font-black text-rose-900">{report.followUpSummary.overdue}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-black uppercase text-emerald-700">Completed (Selesai)</div>
              <div className="text-xl font-black text-emerald-900">{report.followUpSummary.completed}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-black uppercase text-slate-500">Total Follow-Up</div>
              <div className="text-xl font-black text-slate-900">{report.followUpSummary.total}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Desa & Wilayah</th>
                  <th className="py-2.5 px-3">Agenda</th>
                  <th className="py-2.5 px-3">Masalah & Rencana</th>
                  <th className="py-2.5 px-3">PIC & Target</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.followUpSummary.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada data tindak lanjut pada periode ini.</td>
                  </tr>
                ) : (
                  report.followUpSummary.items.map(fu => (
                    <tr key={fu.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">Desa {fu.desa} ({fu.wilayah})</td>
                      <td className="py-2.5 px-3 font-semibold">{fu.agendaJudul}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-rose-700 font-medium">{fu.alasanKendala}</div>
                        <div className="text-slate-500 text-[11px]">Aksi: {fu.rencanaTindakan}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold">{fu.pic}</div>
                        <div className="text-[10px] text-slate-400">Due: {fu.targetPenyelesaian}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black">
                        {fu.isOverdue ? (
                          <span className="text-rose-600">OVERDUE ({fu.status})</span>
                        ) : (
                          <span>{fu.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. AUDIT LOG VIEWER */}
      {reportSubSection === "audit" && canManagePeriods(userRole) && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Rekam Jejak Audit Log MONEV PPG ({auditLogs.length} Aktivitas)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Aktor & Peran</th>
                  <th className="py-2.5 px-3">Aksi</th>
                  <th className="py-2.5 px-3">Entitas</th>
                  <th className="py-2.5 px-3">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 100).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-black text-slate-900">{log.actorUsername}</span>
                      <span className="text-[10px] text-slate-400 block">{log.actorRole}</span>
                    </td>
                    <td className="py-2 px-3">
                      <Badge className="bg-slate-100 text-slate-800 text-[10px] font-black">{log.action}</Badge>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">
                      {log.entityType} <span className="text-[10px] text-slate-400">({log.entityId})</span>
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-600 max-w-md truncate">
                      {JSON.stringify(log.newValue || log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
