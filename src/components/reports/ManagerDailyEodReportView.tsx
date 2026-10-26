import React, { useState, useEffect } from 'react';
import {
  User,
  EodDailyReportResponse,
  EodEmployeeReport,
  EodTaskAnalysisItem,
  EodAppUsageItem
} from '../../types';
import {
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpRight,
  Check,
  Activity,
  UserCheck,
  Info,
  Laptop,
  Flame,
  Lightbulb,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingState } from '../ui/LoadingState';
import { WellnessBannerWatermark, LeafIcon } from '../ui/BotanicalDecor';

interface ManagerDailyEodReportViewProps {
  currentUser: User;
}

export const ManagerDailyEodReportView: React.FC<ManagerDailyEodReportViewProps> = ({
  currentUser
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-06');
  const [availableDates, setAvailableDates] = useState<string[]>([
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06'
  ]);
  const [reportData, setReportData] = useState<EodDailyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchDates();
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, currentUser.id]);

  const fetchDates = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const res = await fetch('/api/reports/eod/dates', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.dates)) {
        setAvailableDates(data.dates);
        if (data.defaultDate) {
          setSelectedDate(data.defaultDate);
        }
      }
    } catch (err) {
      console.error('Failed to load report dates:', err);
    }
  };

  const fetchReport = async (date: string) => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const res = await fetch(`/api/reports/eod?date=${date}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id
        }
      });
      if (res.status === 403) {
        throw new Error('Access restricted: Only Bob Manager can view the 4-employee EOD report.');
      }
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err: any) {
      console.error('Failed to load EOD report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser.role !== 'MANAGER') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center bg-[#FFF8F6] border-[#F2C4B8]">
          <ShieldAlert className="w-12 h-12 text-[#E76F51] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#1C1917]">Access Restricted</h2>
          <p className="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
            The Daily End-of-Day 4-Employee Manager Report is strictly accessible to management personnel.
            Individual employees can view their personal telemetry via the Employee Dashboard.
          </p>
        </Card>
      </div>
    );
  }

  const summary = reportData?.summary;
  const reports = reportData?.employeeReports || [];
  const attentionList = reportData?.employeesRequiringAttention || [];

  const filteredReports =
    selectedEmployeeFilter === 'ALL'
      ? reports
      : reports.filter((r) => r.employeeId === selectedEmployeeFilter);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Compact SaaS Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-4 sm:p-5 shadow-sm">
        <WellnessBannerWatermark className="top-1 right-1 w-48 h-28 opacity-10" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="forest" size="sm" dot>
                Daily EOD Closure
              </Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#2D4A36] border border-[#D1E0D5]">
                {reportData?.isDemoSeed ? 'Historical Demo Period (Sept 30–Oct 6)' : 'Live Operations'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Daily End-of-Day Team Report
            </h1>
            <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
              4-employee operational wellbeing and workload closure dynamically derived from work sessions, tasks, desktop telemetry, and ML burnout risk.
            </p>
          </div>

          {/* Date Selector Pill */}
          <div className="shrink-0 bg-[#FAF7F0] p-2.5 rounded-xl shadow-xs border border-[#E0D9C8] flex flex-row lg:flex-col items-center lg:items-start gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D4A36]">
              <Calendar className="w-3.5 h-3.5 text-[#588157]" />
              <span>Report Date:</span>
            </div>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-[#DDD5C5] text-[#1C1917] font-semibold text-xs rounded-lg px-2.5 py-1.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2D4A36] cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === '2026-10-06' ? '(Latest Baseline)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Compiling daily operational metrics across 4 employees..." />
      ) : !reportData || reports.length === 0 ? (
        <Card className="p-8 text-center bg-[#FAF7F0] border-[#E8E2D5]">
          <Info className="w-10 h-10 text-[#78716C] mx-auto mb-2" />
          <h3 className="text-base font-bold text-[#1C1917]">No Report Available</h3>
          <p className="text-xs text-[#78716C] mt-1">
            No telemetry or metrics could be aggregated for {selectedDate}.
          </p>
        </Card>
      ) : (
        <>
          {/* MANAGER SUMMARY STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Team Size
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#1C1917]">
                  {summary?.totalEmployees ?? 4}
                </span>
                <span className="text-xs font-semibold text-[#588157]">
                  {summary?.employeesActive}/{summary?.totalEmployees} Active
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Tasks Done / Assigned
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#1C1917]">
                  {summary?.tasksCompleted} <span className="text-sm font-medium text-[#78716C]">/ {summary?.tasksAssigned}</span>
                </span>
                <span className="text-xs font-bold text-[#2D4A36]">
                  {summary?.teamCompletionRate}%
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Avg Work Hours
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#1C1917]">
                  {summary?.avgWorkingHours}h
                </span>
                <span className="text-xs font-medium text-[#78716C]">/ active emp</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Total Overtime
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#D97706]">
                  +{summary?.totalOvertime}h
                </span>
                <span className="text-xs font-semibold text-[#78716C]">above 8h base</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Team Productivity
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#1C1917]">
                  {summary?.avgProductivity}
                </span>
                <span className="text-xs font-semibold text-[#588157]">/ 100</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Burnout Distribution
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-[#EBF1ED] text-[#2D4A36]" title="Low Risk">
                  L: {summary?.burnoutDistribution.Low}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-[#FEF3C7] text-[#92400E]" title="Medium Risk">
                  M: {summary?.burnoutDistribution.Medium}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-[#FEE2E2] text-[#991B1B]" title="High Risk">
                  H: {summary?.burnoutDistribution.High}
                </span>
              </div>
            </Card>
          </div>

          {/* EMPLOYEES REQUIRING ATTENTION SECTION */}
          {attentionList.length > 0 && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                <h2 className="text-base font-extrabold text-[#78350F]">
                  Employees Requiring Attention ({attentionList.length})
                </h2>
                <span className="text-xs font-medium text-[#92400E] ml-auto">
                  Deterministic operational threshold triggers (non-medical)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {attentionList.map((att) => (
                  <div
                    key={att.employeeId}
                    className="p-4 rounded-xl bg-white border border-[#F3EFE6] shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={att.employeeName}
                          color={att.avatarColor}
                          size="md"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-[#1C1917]">{att.employeeName}</h4>
                          <p className="text-xs text-[#78716C]">{att.department}</p>
                        </div>
                      </div>
                      <Badge
                        variant={att.predictedRisk === 'High' ? 'coral' : 'peach'}
                        size="sm"
                      >
                        {att.predictedRisk} Risk
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                        Recorded Trigger Factors:
                      </p>
                      {att.triggers.map((trig, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-[#78350F]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                          <span>{trig}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMPLOYEE FILTER TABS */}
          <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#78716C]" />
              <span className="text-xs font-bold text-[#44403C]">Filter Employee:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedEmployeeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedEmployeeFilter === 'ALL'
                    ? 'bg-[#2D4A36] text-white shadow-sm'
                    : 'bg-[#F3EFE6] text-[#57534E] hover:bg-[#EAE4D5]'
                }`}
              >
                All 4 Employees
              </button>
              {reports.map((r) => (
                <button
                  key={r.employeeId}
                  onClick={() => setSelectedEmployeeFilter(r.employeeId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedEmployeeFilter === r.employeeId
                      ? 'bg-[#2D4A36] text-white shadow-sm'
                      : 'bg-[#F3EFE6] text-[#57534E] hover:bg-[#EAE4D5]'
                  }`}
                >
                  {r.employeeName}
                </button>
              ))}
            </div>
          </div>

          {/* INDIVIDUAL EMPLOYEE REPORTS (EXACTLY 4 EMPLOYEES) */}
          <div className="space-y-6">
            {filteredReports.map((emp) => (
              <Card
                key={emp.employeeId}
                className="p-6 bg-white border-[#E8E2D5] shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Employee Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
                  <div className="flex items-center gap-3.5">
                    <Avatar
                      name={emp.employeeName}
                      color={emp.avatarColor}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#1C1917] tracking-tight">
                          {emp.employeeName}
                        </h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#57534E] border border-[#E5DFD1]">
                          {emp.department}
                        </span>
                        {emp.requiresAttention && (
                          <Badge variant="coral" size="sm">
                            Requires Attention
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        Employee ID: <code className="font-mono text-[#44403C]">{emp.employeeId}</code>
                      </p>
                    </div>
                  </div>

                  {/* Burnout Risk Badge & Application-Derived Presentation Score */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                        Burnout Risk
                      </p>
                      <p className="text-sm font-extrabold text-[#1C1917]">
                        {emp.burnoutRisk.predictedRisk}
                      </p>
                    </div>
                    <Badge
                      variant={
                        emp.burnoutRisk.predictedRisk === 'High'
                          ? 'coral'
                          : emp.burnoutRisk.predictedRisk === 'Medium'
                          ? 'peach'
                          : 'sage'
                      }
                      size="md"
                    >
                      {emp.burnoutRisk.predictedRisk}
                    </Badge>
                  </div>
                </div>

                {/* Grid: Timing, Duration, Tasks, and Risk */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-5 border-b border-[#F0EBE1]">
                  {/* 1. Login / Logout Timing */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#57534E]">
                      <Clock className="w-3.5 h-3.5 text-[#588157]" />
                      <span>Login / Logout</span>
                    </div>
                    {emp.hasRecordedSession ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#78716C]">Login:</span>
                          <span className="font-bold text-[#1C1917]">
                            {emp.loginTime ? emp.loginTime.split(' ')[1] ?? emp.loginTime : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#78716C]">Logout:</span>
                          <span className="font-bold text-[#1C1917]">
                            {emp.isSessionOngoing ? (
                              <span className="text-[#16A34A] font-extrabold animate-pulse">Ongoing</span>
                            ) : emp.logoutTime ? (
                              emp.logoutTime.split(' ')[1] ?? emp.logoutTime
                            ) : (
                              'Logged Out'
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#78716C] italic">No recorded session</p>
                    )}
                  </div>

                  {/* 2. Duration Breakdown */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#57534E]">
                      <Activity className="w-3.5 h-3.5 text-[#588157]" />
                      <span>Duration Breakdown</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Total Work:</span>
                        <span className="font-extrabold text-[#1C1917]">{emp.totalWorkingHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Active / Idle:</span>
                        <span className="font-medium text-[#44403C]">{emp.activeHours}h / {emp.idleHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Overtime:</span>
                        <span className={`font-bold ${emp.overtimeHours > 0 ? 'text-[#D97706]' : 'text-[#588157]'}`}>
                          {emp.overtimeHours > 0 ? `+${emp.overtimeHours}h` : '0h'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Task Summary */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#57534E]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#588157]" />
                      <span>Task Progression</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Assigned / Done:</span>
                        <span className="font-extrabold text-[#1C1917]">{emp.tasksAssigned} / {emp.tasksCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Pending in Queue:</span>
                        <span className="font-bold text-[#D97706]">{emp.tasksPending}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Completion Rate:</span>
                        <span className="font-bold text-[#2D4A36]">{emp.taskCompletionRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Burnout Probability Split */}
                  <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#57534E]">
                      <Flame className="w-3.5 h-3.5 text-[#E76F51]" />
                      <span>Model Probabilities</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Low:</span>
                        <span className="font-mono font-bold text-[#2D4A36]">
                          {(emp.burnoutRisk.probLow * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">Medium:</span>
                        <span className="font-mono font-bold text-[#D97706]">
                          {(emp.burnoutRisk.probMed * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#78716C]">High:</span>
                        <span className="font-mono font-bold text-[#DC2626]">
                          {(emp.burnoutRisk.probHigh * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Completed Task Analyses & App Usage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-5 border-b border-[#F0EBE1]">
                  {/* Completed Task Analysis (Rule-Based Task Evaluation Engine v1.0) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#588157]" />
                        <span>Completed Task Analysis</span>
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F3EFE6] text-[#57534E] border border-[#E0D9C8]">
                        Rule-Based Task Evaluation Engine v1.0
                      </span>
                    </div>

                    {emp.completedTaskAnalyses.length === 0 ? (
                      <p className="text-xs text-[#78716C] italic p-3 bg-[#FAF7F0] rounded-xl">
                        No completed task analyses recorded on this date.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {emp.completedTaskAnalyses.map((t) => (
                          <div
                            key={t.taskId}
                            className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#1C1917] truncate max-w-[240px]">
                                {t.taskTitle}
                              </span>
                              <Badge
                                variant={t.priority === 'Urgent' ? 'coral' : t.priority === 'High' ? 'peach' : 'sage'}
                                size="sm"
                              >
                                {t.priority}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-[#78716C] pt-1">
                              <div>
                                <span>Complexity: </span>
                                <strong className="text-[#1C1917]">{t.complexity}</strong>
                              </div>
                              <div>
                                <span>Benchmark: </span>
                                <strong className="text-[#1C1917]">{t.benchmarkRange}</strong>
                              </div>
                              <div>
                                <span>Actual: </span>
                                <strong className="text-[#1C1917]">{t.actualHours}h</strong>
                                <span className={t.varianceHours > 0 ? ' text-[#D97706]' : ' text-[#588157]'}>
                                  {' '}({t.varianceHours > 0 ? `+${t.varianceHours}h` : `${t.varianceHours}h`})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Application Usage (Private Metadata Only) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                        <Laptop className="w-4 h-4 text-[#588157]" />
                        <span>Desktop Application Activity</span>
                      </h4>
                      <span className="text-[10px] text-[#78716C] font-semibold">
                        Privacy Compliant (Duration Metadata Only)
                      </span>
                    </div>

                    {emp.applicationUsage.length === 0 ? (
                      <p className="text-xs text-[#78716C] italic p-3 bg-[#FAF7F0] rounded-xl">
                        No desktop application telemetry logged on this date.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {emp.applicationUsage.map((app, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#1C1917]">{app.appName}</span>
                              <p className="text-[11px] text-[#78716C]">
                                Active: {(app.activeSeconds / 3600).toFixed(1)}h | Idle: {(app.idleSeconds / 3600).toFixed(1)}h
                              </p>
                            </div>
                            <span className="font-mono font-bold text-[#2D4A36]">
                              {(app.durationSeconds / 3600).toFixed(1)} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Daily Contributing Factors & Operational Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
                  {/* Daily Contributing Work-Pattern Factors */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#588157]" />
                      <span>Associated Work-Pattern Indicators</span>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-1.5">
                      {emp.dailyContributingFactors.map((fact, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#57534E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#588157] mt-1.5 shrink-0" />
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-[#D97706]" />
                      <span>Manager Operational Recommendations</span>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-1.5">
                      {emp.operationalRecommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#57534E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Application-Derived Presentation Score Footer Note */}
                {emp.burnoutRisk.continuousRiskScore !== null && (
                  <div className="mt-4 pt-3 border-t border-[#F5F0E6] flex flex-wrap items-center justify-between text-[11px] text-[#78716C]">
                    <span>
                      Application-Derived Presentation Score:{' '}
                      <strong className="text-[#1C1917]">{emp.burnoutRisk.continuousRiskScore}/100</strong>
                    </span>
                    <span className="italic">
                      *Presentation aid only. Not an output of the Random Forest model.
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Model Disclaimer Footer */}
          <div className="p-4 rounded-2xl bg-[#F3EFE6] border border-[#E0D9C8] text-xs text-[#78716C] leading-relaxed">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#588157] mt-0.5 shrink-0" />
              <div>
                <strong className="text-[#44403C]">Operational System Disclaimer: </strong>
                MindWork is an operational workload-pattern early warning tool. It is not a clinical or psychological diagnostic system.
                The model provides statistical risk estimates, not safety guarantees. Recommendations are strictly workplace-oriented.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
