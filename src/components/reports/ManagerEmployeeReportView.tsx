import React, { useState, useEffect } from 'react';
import {
  User,
  Employee,
  TaskItem,
  WorkSession,
  DailyMetric,
  BurnoutPrediction,
  ModelFeatures,
  ApplicationUsage
} from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge, RiskBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import {
  formatDurationHMS,
  formatDurationHuman,
  formatDateTime
} from '../../utils/formatTime';
import {
  ArrowLeft,
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  Activity,
  AlertTriangle,
  TrendingUp,
  AppWindow,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Code2,
  Globe,
  Terminal,
  Database,
  Figma as FigmaIcon,
  Folder,
  MessageSquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Award,
  Flame,
  Zap,
  Info
} from 'lucide-react';

interface ManagerEmployeeReportViewProps {
  employeeId: string;
  employees: Employee[];
  currentUser: User;
  onBack: () => void;
  onSelectEmployee: (empId: string) => void;
}

export const ManagerEmployeeReportView: React.FC<ManagerEmployeeReportViewProps> = ({
  employeeId,
  employees,
  currentUser,
  onBack,
  onSelectEmployee,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'apps' | 'activity' | 'burnout'>('overview');
  const [appFilter, setAppFilter] = useState<'all' | 'live' | 'demo'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Telemetry & Assessment States
  const [prediction, setPrediction] = useState<BurnoutPrediction | null>(null);
  const [modelFeatures, setModelFeatures] = useState<ModelFeatures | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);

  // Find the current employee profile
  const employee = employees.find((e) => e.id === employeeId) || employees[0];

  useEffect(() => {
    if (employeeId) {
      loadEmployeeReport(employeeId);
    }
  }, [employeeId]);

  const loadEmployeeReport = async (empId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Burnout Prediction
      const predRes = await fetch(`/api/burnout/predictions/${empId}`, { headers });
      const predData = await predRes.json();
      if (predData.success && predData.prediction) {
        setPrediction(predData.prediction);
      }

      // 2. Fetch Model Features (15 raw inputs)
      const featRes = await fetch(`/api/metrics/model-features/${empId}`, { headers });
      const featData = await featRes.json();
      if (featData.success && featData.features) {
        setModelFeatures(featData.features);
      }

      // 3. Fetch Tasks
      const tasksRes = await fetch(`/api/tasks?employee_id=${empId}`, { headers });
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }

      // 4. Fetch Work Sessions (with nested application_usage)
      const sessionsRes = await fetch(`/api/work-sessions?employee_id=${empId}`, { headers });
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) {
        setWorkSessions(sessionsData.work_sessions || []);
      }

      // 5. Fetch Daily Metrics
      const metricsRes = await fetch(`/api/metrics/daily?employee_id=${empId}`, { headers });
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setDailyMetrics(metricsData.daily_metrics || metricsData.metrics || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load employee operational report.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper app icon
  const getAppIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('code') || lower.includes('vs')) return Code2;
    if (lower.includes('chrome') || lower.includes('safari') || lower.includes('browser')) return Globe;
    if (lower.includes('terminal') || lower.includes('iterm')) return Terminal;
    if (lower.includes('sql') || lower.includes('db') || lower.includes('workbench')) return Database;
    if (lower.includes('figma')) return FigmaIcon;
    if (lower.includes('finder')) return Folder;
    if (lower.includes('slack') || lower.includes('whatsapp') || lower.includes('chat')) return MessageSquare;
    return AppWindow;
  };

  // Aggregate application usage across work sessions
  const filteredSessions = workSessions.filter((ws) => {
    if (appFilter === 'live') return ws.is_demo_seed === 0;
    if (appFilter === 'demo') return ws.is_demo_seed === 1;
    return true;
  });

  const appUsageMap = new Map<string, {
    app_name: string;
    duration_seconds: number;
    active_seconds: number;
    idle_seconds: number;
    session_count: number;
    is_live: boolean;
    first_start?: string | null;
    last_end?: string | null;
  }>();

  filteredSessions.forEach((s) => {
    if (s.application_usage) {
      s.application_usage.forEach((au) => {
        const existing = appUsageMap.get(au.app_name);
        if (existing) {
          existing.duration_seconds += au.duration_seconds || 0;
          existing.active_seconds += au.active_seconds || 0;
          existing.idle_seconds += au.idle_seconds || 0;
          existing.session_count += 1;
          if (au.is_demo_seed === 0) existing.is_live = true;
          if (au.app_start_time && (!existing.first_start || au.app_start_time < existing.first_start)) {
            existing.first_start = au.app_start_time;
          }
          if (au.app_end_time && (!existing.last_end || au.app_end_time > existing.last_end)) {
            existing.last_end = au.app_end_time;
          }
        } else {
          appUsageMap.set(au.app_name, {
            app_name: au.app_name,
            duration_seconds: au.duration_seconds || 0,
            active_seconds: au.active_seconds || 0,
            idle_seconds: au.idle_seconds || 0,
            session_count: 1,
            is_live: au.is_demo_seed === 0,
            first_start: au.app_start_time || null,
            last_end: au.app_end_time || null
          });
        }
      });
    }
  });

  const aggregatedApps = Array.from(appUsageMap.values()).sort(
    (a, b) => b.duration_seconds - a.duration_seconds
  );

  // Task Statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Work Activity Totals
  const totalWorkingHours = filteredSessions.reduce((sum, s) => sum + (s.total_working_hours || 0), 0);
  const totalActiveHours = filteredSessions.reduce((sum, s) => sum + (s.active_hours || 0), 0);
  const totalIdleHours = filteredSessions.reduce((sum, s) => sum + (s.idle_hours || 0), 0);
  const activeFocusRatio = totalWorkingHours > 0 ? Math.round((totalActiveHours / totalWorkingHours) * 100) : 0;

  // Random Forest Probabilities
  const probHigh = prediction ? Math.round((prediction.prob_high || 0) * 1000) / 10 : 0;
  const probMed = prediction ? Math.round((prediction.prob_med || 0) * 1000) / 10 : 0;
  const probLow = prediction ? Math.round((prediction.prob_low || 0) * 1000) / 10 : 0;
  const predictedRisk = prediction?.predicted_risk || 'Low';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Manager Perspective Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E8E2D5] shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4 text-[#2D4A36]" />}
            onClick={onBack}
          >
            Back to Team Directory
          </Button>

          <div className="h-5 w-px bg-[#E8E2D5] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#57534E]">Manager Oversight:</span>
            <Badge variant="forest" size="sm">
              Logged in as Bob Manager (MANAGER)
            </Badge>
          </div>
        </div>

        <Button
          variant="light"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => loadEmployeeReport(employeeId)}
          disabled={isLoading}
        >
          Refresh Report
        </Button>
      </div>

      {/* Employee Quick Switcher (Navigate between Alice, Priya, Rahul, Sneha) */}
      <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
            Select Supervised Employee:
          </span>
          <span className="text-xs text-[#78716C]">
            Quick switcher preserves Manager session context
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {employees.map((emp) => {
            const isSelected = emp.id === employeeId;
            const empRisk = emp.name === 'Alice' ? 'High' : emp.name === 'Rahul' ? 'Medium' : 'Low';

            return (
              <button
                key={emp.id}
                onClick={() => onSelectEmployee(emp.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-[#2D4A36] bg-white ring-2 ring-[#2D4A36]/15 shadow-sm'
                    : 'border-[#E0D9C8] bg-white/70 hover:bg-white hover:border-[#B5A895]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Avatar name={emp.name} color={emp.avatar_color} size="sm" />
                  <div className="truncate">
                    <span className="font-bold text-xs text-[#1C1917] block truncate">
                      {emp.name}
                    </span>
                    <span className="text-[10px] text-[#78716C] block truncate">
                      {emp.department} • {emp.experience_years}y
                    </span>
                  </div>
                </div>

                <div className="shrink-0 ml-1">
                  <RiskBadge risk={empRisk as any} size="sm" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee Profile & Burnout Status Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-5 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={employee?.name || 'Employee'}
              color={employee?.avatar_color}
              size="lg"
              className="ring-4 ring-white/20"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {employee?.name}
                </h1>
                <Badge variant="sage" size="sm">
                  {employee?.department} Team
                </Badge>
                <span className="text-xs text-[#D8E2DC]">
                  ID: <code className="font-mono">{employee?.id}</code>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#D8E2DC] leading-relaxed">
                {employee?.experience_years} years industry experience • Age {employee?.age} • Professional Profile in SQLite
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-xs border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-[#A3B18A] block">
                Current ML Risk Tier
              </span>
              <div className="mt-0.5 flex items-center justify-end gap-1.5">
                <RiskBadge risk={predictedRisk} size="md" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/20 backdrop-blur-xs border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-[#A3B18A] block">
                Presentation Score
              </span>
              <span className="text-lg font-black font-mono text-white">
                {prediction?.continuous_risk_score ? `${Math.round(prediction.continuous_risk_score)}/100` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8E2D5] overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#2D4A36] text-white shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3EFE6]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Operational Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'bg-[#2D4A36] text-white shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3EFE6]'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Task Performance ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('apps')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'apps'
              ? 'bg-[#2D4A36] text-white shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3EFE6]'
          }`}
        >
          <AppWindow className="w-3.5 h-3.5" />
          <span>Application Usage ({aggregatedApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-[#2D4A36] text-white shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3EFE6]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Work Activity &amp; Daily Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab('burnout')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'burnout'
              ? 'bg-[#2D4A36] text-white shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F3EFE6]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Burnout-Risk Report &amp; RF Model</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <span className="text-[11px] uppercase font-bold text-[#78716C] block">Total Working Hours</span>
              <div className="text-2xl font-black text-[#1C1917] font-mono mt-1">
                {totalWorkingHours.toFixed(1)}h
              </div>
              <span className="text-xs text-[#78716C] mt-0.5 block">
                Across {filteredSessions.length} recorded sessions
              </span>
            </Card>

            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <span className="text-[11px] uppercase font-bold text-[#2D4A36] block">Active Focus Ratio</span>
              <div className="text-2xl font-black text-[#2D4A36] font-mono mt-1">
                {activeFocusRatio}%
              </div>
              <span className="text-xs text-[#588157] mt-0.5 block">
                {totalActiveHours.toFixed(1)}h active vs {totalIdleHours.toFixed(1)}h idle
              </span>
            </Card>

            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <span className="text-[11px] uppercase font-bold text-[#78716C] block">Task Completion Rate</span>
              <div className="text-2xl font-black text-[#1C1917] font-mono mt-1">
                {completionPercentage}%
              </div>
              <span className="text-xs text-[#78716C] mt-0.5 block">
                {completedTasks} completed of {totalTasks} assigned
              </span>
            </Card>

            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <span className="text-[11px] uppercase font-bold text-[#991B1B] block">Weekly Overtime Baseline</span>
              <div className="text-2xl font-black text-[#991B1B] font-mono mt-1">
                {modelFeatures ? `+${modelFeatures.Overtime_Hours_Per_Week}h` : '—'}
              </div>
              <span className="text-xs text-[#78716C] mt-0.5 block">
                Standard baseline: 40h/week
              </span>
            </Card>
          </div>

          {/* Burnout Risk Assessment Summary Card */}
          <Card variant="flat" padding="lg" className="border-[#DDD5C5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#DC2626]" />
                  Burnout Risk Summary &amp; Model Output
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Frozen Random Forest inference based on objective workload and telemetry inputs
                </p>
              </div>
              <RiskBadge risk={predictedRisk} size="md" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
              {/* Left: Probabilities */}
              <div className="space-y-3 p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wider">
                  Random Forest Probabilities
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#DC2626]">High Risk</span>
                      <strong className="font-mono text-[#DC2626]">{probHigh}%</strong>
                    </div>
                    <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#DC2626] h-full" style={{ width: `${probHigh}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#D97706]">Medium Risk</span>
                      <strong className="font-mono text-[#D97706]">{probMed}%</strong>
                    </div>
                    <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#D97706] h-full" style={{ width: `${probMed}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#16A34A]">Low Risk</span>
                      <strong className="font-mono text-[#16A34A]">{probLow}%</strong>
                    </div>
                    <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#16A34A] h-full" style={{ width: `${probLow}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E2D5] text-[11px] text-[#78716C]">
                  Presentation Score: <strong className="text-[#1C1917]">{prediction?.continuous_risk_score ? `${Math.round(prediction.continuous_risk_score)} / 100` : '—'}</strong>
                  <span className="block text-[10px] text-[#A8A29E] mt-0.5">Separate heuristic workload index</span>
                </div>
              </div>

              {/* Middle: Why this risk? */}
              <div className="space-y-3 p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] lg:col-span-2">
                <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#588157]" />
                  Why This Risk? (Authoritative Explanations)
                </h4>

                <div className="space-y-2">
                  {prediction?.top_contributing_factors && prediction.top_contributing_factors.length > 0 ? (
                    prediction.top_contributing_factors.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-[#44403C]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D4A36] shrink-0 mt-1.5" />
                        <span>{factor}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#78716C]">Workload telemetry within healthy baseline parameters.</p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[#EBF1ED] border border-[#D1E0D5] text-[11px] text-[#2D4A36] leading-relaxed">
                  <strong>Non-Clinical Operational Safeguard:</strong> This risk estimate is derived from 15 objective engineering metrics (overtime, shift length, task velocity). Individual metrics do not individually cause burnout; the multi-factor Random Forest pipeline assesses cumulative pattern density. Not a psychological diagnosis.
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Task Oversight & Top Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Applications */}
            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E2D5]">
                <h4 className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
                  <AppWindow className="w-4 h-4 text-[#588157]" />
                  Top Applications Used
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('apps')}>
                  View All ({aggregatedApps.length}) →
                </Button>
              </div>

              {aggregatedApps.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#78716C]">
                  No application activity recorded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {aggregatedApps.slice(0, 4).map((app) => {
                    const Icon = getAppIcon(app.app_name);
                    const ratio = app.duration_seconds > 0 ? Math.round((app.active_seconds / app.duration_seconds) * 100) : 0;
                    return (
                      <div key={app.app_name} className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white border border-[#DDD5C5] flex items-center justify-center text-[#2D4A36]">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#1C1917] block leading-tight">{app.app_name}</span>
                            <span className="text-[10px] text-[#78716C]">{ratio}% active focus</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs text-[#1C1917]">
                          {app.duration_seconds >= 360 ? `${(app.duration_seconds / 3600).toFixed(1)}h` : formatDurationHuman(app.duration_seconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Assigned Tasks */}
            <Card variant="flat" padding="md" className="border-[#DDD5C5]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E8E2D5]">
                <h4 className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#588157]" />
                  Recent Assigned Tasks
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>
                  View All ({tasks.length}) →
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#78716C]">
                  No tasks currently assigned.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] flex items-center justify-between">
                      <div className="space-y-0.5 truncate max-w-[70%]">
                        <span className="font-bold text-xs text-[#1C1917] block truncate">{task.title}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                          <PriorityBadge priority={task.priority} size="sm" />
                          <span>Due {task.deadline}</span>
                        </div>
                      </div>
                      <Badge variant={task.status === 'COMPLETED' ? 'forest' : task.status === 'IN_PROGRESS' ? 'yellow' : 'neutral'} size="sm">
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TASK PERFORMANCE */}
      {activeTab === 'tasks' && (
        <Card variant="flat" padding="lg" className="border-[#DDD5C5] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
            <div>
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#588157]" />
                Task Performance &amp; Evaluation Ledger
              </h3>
              <p className="text-xs text-[#78716C]">
                Detailed view of assigned, completed, and in-progress tasks with rule-based complexity benchmarks
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Badge variant="forest" size="sm">{completedTasks} Completed</Badge>
              <Badge variant="yellow" size="sm">{inProgressTasks} In Progress</Badge>
              <Badge variant="neutral" size="sm">{pendingTasks} Pending</Badge>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#78716C]">
              No tasks found for this employee.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8E2D5] text-[11px] uppercase tracking-wider text-[#78716C]">
                    <th className="py-3 px-3">Task Details</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Deadline</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actual Duration</th>
                    <th className="py-3 px-3 text-right">Benchmark Range</th>
                    <th className="py-3 px-3 text-center">On-Time Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D5]">
                  {tasks.map((task) => {
                    const actualHours = task.analysis_report?.actual_hours || ((task.total_active_seconds || 0) / 3600);
                    const minBench = task.analysis_report?.benchmark_min_hours;
                    const maxBench = task.analysis_report?.benchmark_max_hours;
                    const isOnTime = task.analysis_report?.is_on_time === 1;
                    const complexity = task.analysis_report?.complexity;

                    return (
                      <tr key={task.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="py-3.5 px-3 max-w-xs">
                          <strong className="font-bold text-xs text-[#1C1917] block leading-tight">
                            {task.title}
                          </strong>
                          <span className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                            {task.description}
                          </span>
                          {complexity && (
                            <span className="inline-block text-[10px] font-mono text-[#588157] mt-0.5">
                              Complexity: {complexity} ({task.analysis_report?.evaluation_engine_ver || 'rule-based'})
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <PriorityBadge priority={task.priority} size="sm" />
                        </td>

                        <td className="py-3.5 px-3 text-xs font-mono text-[#57534E]">
                          {task.deadline}
                        </td>

                        <td className="py-3.5 px-3">
                          <Badge
                            variant={
                              task.status === 'COMPLETED'
                                ? 'forest'
                                : task.status === 'IN_PROGRESS'
                                ? 'yellow'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {task.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-[#1C1917]">
                          {actualHours > 0 ? `${actualHours.toFixed(2)}h` : formatDurationHuman(task.total_active_seconds || 0)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-xs text-[#78716C]">
                          {minBench !== undefined && maxBench !== undefined
                            ? `${minBench.toFixed(1)}h – ${maxBench.toFixed(1)}h`
                            : 'Standard shift'}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {task.status === 'COMPLETED' && task.analysis_report ? (
                            isOnTime ? (
                              <Badge variant="forest" size="sm">Within Benchmark</Badge>
                            ) : (
                              <Badge variant="coral" size="sm">
                                Exceeded (+{task.analysis_report.variance_hours.toFixed(1)}h)
                              </Badge>
                            )
                          ) : (
                            <span className="text-[11px] text-[#A8A29E]">Pending Completion</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: APPLICATION USAGE */}
      {activeTab === 'apps' && (
        <Card variant="flat" padding="lg" className="border-[#DDD5C5] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
            <div>
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <AppWindow className="w-5 h-5 text-[#588157]" />
                Actual Permitted Application Usage
              </h3>
              <p className="text-xs text-[#78716C]">
                Objective software title telemetry collected via macOS NSWorkspace. Zero fabricated usage; zero private content recorded.
              </p>
            </div>

            {/* Scope Filter: All vs Live vs Demo Seed */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF9F5] border border-[#DDD5C5] text-xs">
              <button
                onClick={() => setAppFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  appFilter === 'all' ? 'bg-[#2D4A36] text-white shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                All Data
              </button>
              <button
                onClick={() => setAppFilter('live')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  appFilter === 'live' ? 'bg-[#2D4A36] text-white shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Live Records (0)
              </button>
              <button
                onClick={() => setAppFilter('demo')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  appFilter === 'demo' ? 'bg-[#2D4A36] text-white shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Seeded Demo (1)
              </button>
            </div>
          </div>

          {aggregatedApps.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#78716C]">
              No application usage records found under this filter scope.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatedApps.map((app) => {
                const Icon = getAppIcon(app.app_name);
                const activeRatio = app.duration_seconds > 0
                  ? Math.round((app.active_seconds / app.duration_seconds) * 100)
                  : 0;

                return (
                  <div
                    key={app.app_name}
                    className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD5C5] flex items-center justify-center text-[#2D4A36]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#1C1917] block leading-tight">
                            {app.app_name}
                          </span>
                          <span className="text-[10px] text-[#78716C]">
                            {app.session_count} {app.session_count === 1 ? 'session' : 'sessions'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-[#1C1917] block">
                          {app.duration_seconds >= 360 ? `${(app.duration_seconds / 3600).toFixed(2)}h` : formatDurationHuman(app.duration_seconds)}
                        </span>
                        {app.is_live ? (
                          <Badge variant="forest" size="sm">Live</Badge>
                        ) : (
                          <Badge variant="sage" size="sm">Demo Seed</Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden flex">
                      <div className="bg-[#16A34A] h-full" style={{ width: `${activeRatio}%` }} />
                      <div className="bg-[#FDBA74] h-full" style={{ width: `${100 - activeRatio}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                      <span>Active: <strong className="text-[#2D4A36]">
                        {app.active_seconds >= 360 ? `${(app.active_seconds / 3600).toFixed(2)}h` : formatDurationHuman(app.active_seconds)}
                      </strong></span>
                      <span>Idle: <strong className="text-[#856404]">
                        {app.idle_seconds >= 360 ? `${(app.idle_seconds / 3600).toFixed(2)}h` : formatDurationHuman(app.idle_seconds)}
                      </strong></span>
                    </div>

                    {(app.first_start || app.last_end) && (
                      <div className="pt-2 border-t border-[#E8E2D5] text-[10px] text-[#78716C] font-mono flex items-center justify-between">
                        <span>Start: {app.first_start ? app.first_start.substring(11, 16) : '—'}</span>
                        <span>End: {app.last_end ? app.last_end.substring(11, 16) : 'In Session'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: WORK ACTIVITY & DAILY METRICS */}
      {activeTab === 'activity' && (
        <Card variant="flat" padding="lg" className="border-[#DDD5C5] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
            <div>
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#588157]" />
                Daily Work Activity &amp; Metric Telemetry
              </h3>
              <p className="text-xs text-[#78716C]">
                Deterministic daily aggregates of work duration, active focus, idle breaks, and overtime
              </p>
            </div>
          </div>

          {dailyMetrics.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#78716C]">
              No daily metrics recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8E2D5] text-[11px] uppercase tracking-wider text-[#78716C]">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Total Working</th>
                    <th className="py-3 px-3 text-right">Active Focus</th>
                    <th className="py-3 px-3 text-right">Idle Time</th>
                    <th className="py-3 px-3 text-right">Overtime</th>
                    <th className="py-3 px-3 text-center">Task Completion</th>
                    <th className="py-3 px-3 text-right">Productivity Score</th>
                    <th className="py-3 px-3 text-center">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D5]">
                  {dailyMetrics.map((dm) => (
                    <tr key={dm.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-xs text-[#1C1917]">
                        {dm.date}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-[#1C1917]">
                        {dm.working_hours.toFixed(1)}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-[#2D4A36]">
                        {dm.active_hours.toFixed(1)}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-[#856404]">
                        {dm.idle_hours.toFixed(1)}h
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-[#DC2626]">
                        {dm.overtime_hours > 0 ? `+${dm.overtime_hours.toFixed(1)}h` : '0h'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge variant={dm.task_completion_rate >= 80 ? 'forest' : 'yellow'} size="sm">
                          {Math.round(dm.task_completion_rate)}%
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-xs text-[#2D4A36]">
                        {dm.productivity_score.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {dm.is_demo_seed === 1 ? (
                          <Badge variant="sage" size="sm">Demo Baseline</Badge>
                        ) : (
                          <Badge variant="forest" size="sm">Live Session</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: BURNOUT RISK REPORT & RF MODEL INFERENCE */}
      {activeTab === 'burnout' && (
        <div className="space-y-6">
          <Card variant="flat" padding="lg" className="border-[#DDD5C5] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#DC2626]" />
                  Burnout Risk Inference &amp; Random Forest Diagnostics
                </h3>
                <p className="text-xs text-[#78716C]">
                  Audited frozen Random Forest pipeline (15 telemetry inputs) with calibrated objective probabilities
                </p>
              </div>
              <RiskBadge risk={predictedRisk} size="md" />
            </div>

            {/* Model Probabilities Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-2">
                <span className="text-[11px] uppercase font-bold text-[#991B1B]">High Burnout Probability</span>
                <div className="text-3xl font-black text-[#991B1B] font-mono">
                  {probHigh}%
                </div>
                <div className="w-full bg-[#FCA5A5]/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#DC2626] h-full" style={{ width: `${probHigh}%` }} />
                </div>
                <span className="text-[11px] text-[#7F1D1D] block">
                  Probability of severe workplace exhaustion pattern
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
                <span className="text-[11px] uppercase font-bold text-[#92400E]">Medium Burnout Probability</span>
                <div className="text-3xl font-black text-[#92400E] font-mono">
                  {probMed}%
                </div>
                <div className="w-full bg-[#FDE68A]/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#D97706] h-full" style={{ width: `${probMed}%` }} />
                </div>
                <span className="text-[11px] text-[#78350F] block">
                  Probability of moderate workload strain
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
                <span className="text-[11px] uppercase font-bold text-[#166534]">Low Burnout Probability</span>
                <div className="text-3xl font-black text-[#166534] font-mono">
                  {probLow}%
                </div>
                <div className="w-full bg-[#BBF7D0]/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#16A34A] h-full" style={{ width: `${probLow}%` }} />
                </div>
                <span className="text-[11px] text-[#14532D] block">
                  Probability of sustainable workload rhythm
                </span>
              </div>
            </div>

            {/* Separated Presentation Score */}
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-[#1C1917] block">
                  Application-Derived Presentation Score: <span className="font-mono text-base text-[#2D4A36]">{prediction?.continuous_risk_score ? `${Math.round(prediction.continuous_risk_score)} / 100` : '—'}</span>
                </span>
                <span className="text-[#78716C]">
                  This heuristic index is maintained strictly separate from the Random Forest probabilities.
                </span>
              </div>
              <Badge variant="sage" size="sm">Presentation Metric</Badge>
            </div>

            {/* 15 Model Inputs Display */}
            {modelFeatures && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#44403C]">
                  Authoritative 15-Feature Model Contract Inputs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Working Hours / Day</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.Working_Hours_Per_Day}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Weekly Overtime</span>
                    <strong className="font-mono text-xs text-[#DC2626]">+{modelFeatures.Overtime_Hours_Per_Week}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Workload Level</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.Workload_Level} / 10</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Deadline Pressure</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.Deadline_Pressure} / 10</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Task Completion Rate</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.Task_Completion_Rate}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Productivity Score</span>
                    <strong className="font-mono text-xs text-[#2D4A36]">{modelFeatures.Productivity_Score}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Active Work Hours</span>
                    <strong className="font-mono text-xs text-[#2D4A36]">{modelFeatures.Active_Work_Hours}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Idle Hours</span>
                    <strong className="font-mono text-xs text-[#856404]">{modelFeatures.Idle_Hours}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">App Usage / Day</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.App_Usage_Hours_Per_Day}h</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                    <span className="text-[10px] text-[#78716C] block">Leave Days Taken</span>
                    <strong className="font-mono text-xs text-[#1C1917]">{modelFeatures.Leave_Days_Taken}d</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Practical Operational Recommendations for the Manager */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#588157]" />
                Practical Manager Support Actions
              </h4>

              <div className="space-y-2">
                {prediction?.recommendations && prediction.recommendations.length > 0 ? (
                  prediction.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] flex items-start gap-2.5 text-xs text-[#292524]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#EBF1ED] text-[#2D4A36] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#78716C]">Maintain standard check-ins and support channels.</p>
                )}
              </div>
            </div>

            {/* Non-Clinical Safeguard Notice */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E0D9C8] flex items-start gap-3 text-xs text-[#57534E]">
              <Info className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>MindWork Non-Clinical Operational Guarantee:</strong> This report is intended strictly for proactive engineering team workload balancing and early warning. It does not provide medical, psychological, or diagnostic evaluations. Individual features do not individually cause burnout.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
