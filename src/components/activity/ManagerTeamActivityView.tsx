import React, { useState, useEffect } from 'react';
import { User, WorkSession, ApplicationUsage, TelemetryState } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { formatDurationHMS, formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  Activity,
  ShieldCheck,
  Users,
  Clock,
  Calendar,
  Layers,
  AppWindow,
  Monitor,
  RefreshCw,
  Code2,
  Globe,
  Terminal,
  Database,
  Figma as FigmaIcon,
  Folder,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface ManagerTeamActivityViewProps {
  currentUser: User;
}

interface AppSummary {
  app_name: string;
  session_count: number;
  employee_count: number;
  total_duration_seconds: number;
  total_active_seconds: number;
  total_idle_seconds: number;
  total_duration_hours: number;
  total_active_hours: number;
  total_idle_hours: number;
}

interface EmployeeSummary {
  employee_id: string;
  employee_name: string;
  department: string;
  avatar_color: string;
  session_count: number;
  total_working_hours: number;
  total_active_hours: number;
  total_idle_hours: number;
  avg_active_hours_per_session: number;
}

export const ManagerTeamActivityView: React.FC<ManagerTeamActivityViewProps> = ({ currentUser }) => {
  const [scopeTab, setScopeTab] = useState<'demo' | 'live'>('demo');
  const [appSummaries, setAppSummaries] = useState<AppSummary[]>([]);
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
  const [selectedEmployeeSessions, setSelectedEmployeeSessions] = useState<WorkSession[]>([]);
  const [drilldownEmployee, setDrilldownEmployee] = useState<EmployeeSummary | null>(null);
  const [isDrilldownModalOpen, setIsDrilldownModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData(true);
    let interval: NodeJS.Timeout | null = null;
    if (scopeTab === 'live') {
      interval = setInterval(() => {
        loadTeamData(false);
      }, 3000);
    }
    const handleFocus = () => loadTeamData(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [scopeTab, drilldownEmployee?.employee_id]);

  const loadTeamData = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const seedFilter = scopeTab === 'demo' ? '1' : '0';
      const res = await fetch(`/api/telemetry/team-summary?is_demo_seed=${seedFilter}`);
      const data = await res.json();
      if (data.success) {
        setAppSummaries(data.app_usage_summary || []);
        setEmployeeSummaries(data.employee_summary || []);

        // Also refresh open employee drilldown if active
        if (drilldownEmployee) {
          const sessionsRes = await fetch(`/api/work-sessions?employee_id=${drilldownEmployee.employee_id}&is_demo_seed=${seedFilter}`);
          const sessionsData = await sessionsRes.json();
          if (sessionsData.success) {
            setSelectedEmployeeSessions(sessionsData.work_sessions || []);
          }
        }
      } else {
        setError(data.error || 'Failed to load team activity.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading team telemetry.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const handleOpenEmployeeDrilldown = async (emp: EmployeeSummary) => {
    setDrilldownEmployee(emp);
    setIsDrilldownModalOpen(true);
    try {
      const seedFilter = scopeTab === 'demo' ? '1' : '0';
      const res = await fetch(`/api/work-sessions?employee_id=${emp.employee_id}&is_demo_seed=${seedFilter}`);
      const data = await res.json();
      if (data.success) {
        setSelectedEmployeeSessions(data.work_sessions || []);
      }
    } catch (err) {
      console.error('Error fetching employee sessions:', err);
    }
  };

  // Helper app icon
  const getAppIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('code') || lower.includes('vs')) return Code2;
    if (lower.includes('chrome') || lower.includes('safari') || lower.includes('browser')) return Globe;
    if (lower.includes('terminal')) return Terminal;
    if (lower.includes('sql') || lower.includes('db')) return Database;
    if (lower.includes('figma')) return FigmaIcon;
    if (lower.includes('finder')) return Folder;
    if (lower.includes('slack')) return MessageSquare;
    return AppWindow;
  };

  const totalTeamWorkingHours = employeeSummaries.reduce((sum, e) => sum + (e.total_working_hours || 0), 0);
  const totalTeamActiveHours = employeeSummaries.reduce((sum, e) => sum + (e.total_active_hours || 0), 0);
  const totalTeamIdleHours = employeeSummaries.reduce((sum, e) => sum + (e.total_idle_hours || 0), 0);
  const overallActiveRatio = totalTeamWorkingHours > 0
    ? Math.round((totalTeamActiveHours / totalTeamWorkingHours) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Top Banner: Team Activity Oversight */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-4 sm:p-5 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF7F0]/15 text-[#FAF7F0] backdrop-blur-xs border border-[#FAF7F0]/20">
                <Users className="w-3.5 h-3.5 text-[#A3B18A]" />
                Team Activity Telemetry
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF1ED] text-[#2D4A36]">
                <ShieldCheck className="w-3 h-3 text-[#588157]" />
                Application Metadata Only
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Team Work Activity &amp; Desktop Telemetry
            </h1>
            <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
              Objective visibility into engineering and product work sessions. Monitored through privacy-preserving desktop application metadata — zero surveillance of keystrokes, URLs, or documents.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="light"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-[#1E3525]" />}
              onClick={() => loadTeamData(true)}
              disabled={isLoading}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Strict Privacy Compliance Assurance Strip */}
      <Card variant="flat" padding="sm" className="bg-[#FAF8F2] border-[#E0D9C8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#2D4A36]">
            <ShieldCheck className="w-4 h-4 text-[#588157] shrink-0" />
            <span className="font-bold">Manager Privacy Audit:</span>
            <span className="text-[#57534E]">
              Allowed: Application names, duration, active/idle time. Strictly blocked: Keystrokes, screen captures, URLs, documents, messages.
            </span>
          </div>
          <Badge variant="forest" size="sm">Audited &amp; Compliant</Badge>
        </div>
      </Card>

      {/* Scope Navigation Tabs: Demo Baseline vs Live Telemetry */}
      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScopeTab('demo')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              scopeTab === 'demo'
                ? 'bg-[#606C38] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EA]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>7-Day Demo Baseline Data (is_demo_seed = 1)</span>
            <Badge variant="sage" size="sm">Historical Seed</Badge>
          </button>

          <button
            onClick={() => setScopeTab('live')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              scopeTab === 'live'
                ? 'bg-[#2D4A36] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EA]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Team Telemetry (is_demo_seed = 0)</span>
            <Badge variant="forest" size="sm">Active</Badge>
          </button>
        </div>
      </div>

      {/* Scope Disclaimer */}
      {scopeTab === 'demo' ? (
        <div className="p-3.5 rounded-2xl bg-[#EFF1E8] border border-[#DCE2CD] text-xs text-[#2D4A36] flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#606C38] shrink-0" />
          <p>
            <strong>Displaying 7-Day Demo Historical Telemetry (Sept 30 – Oct 6, 2026):</strong> Authoritative baseline telemetry for all 4 team members across 20 seeded work sessions.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-[#EBF1ED] border border-[#D1E0D5] text-xs text-[#2D4A36] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#588157] shrink-0" />
          <p>
            <strong>Displaying Live Desktop Telemetry (is_demo_seed = 0):</strong> Real employee sessions recorded via live work session initiation and permitted application tracking.
          </p>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="flat" padding="md" className="border-[#DDD5C5]">
          <span className="text-[11px] uppercase font-bold text-[#78716C] block">Total Team Working Time</span>
          <div className="text-2xl font-black text-[#1C1917] font-mono mt-1">
            {totalTeamWorkingHours.toFixed(1)}h
          </div>
          <span className="text-xs text-[#78716C] mt-0.5 block">
            Across {employeeSummaries.reduce((sum, e) => sum + e.session_count, 0)} recorded sessions
          </span>
        </Card>

        <Card variant="flat" padding="md" className="border-[#DDD5C5]">
          <span className="text-[11px] uppercase font-bold text-[#2D4A36] block">Active Focus Time</span>
          <div className="text-2xl font-black text-[#2D4A36] font-mono mt-1">
            {totalTeamActiveHours.toFixed(1)}h
          </div>
          <span className="text-xs text-[#588157] mt-0.5 block">
            {overallActiveRatio}% active focus ratio
          </span>
        </Card>

        <Card variant="flat" padding="md" className="border-[#DDD5C5]">
          <span className="text-[11px] uppercase font-bold text-[#856404] block">Idle / Paused Time</span>
          <div className="text-2xl font-black text-[#856404] font-mono mt-1">
            {totalTeamIdleHours.toFixed(1)}h
          </div>
          <span className="text-xs text-[#B45309] mt-0.5 block">
            {100 - overallActiveRatio}% idle / break duration
          </span>
        </Card>

        <Card variant="flat" padding="md" className="border-[#DDD5C5]">
          <span className="text-[11px] uppercase font-bold text-[#78716C] block">Applications Tracked</span>
          <div className="text-2xl font-black text-[#1C1917] font-mono mt-1">
            {appSummaries.length}
          </div>
          <span className="text-xs text-[#78716C] mt-0.5 block">
            Permitted software titles only
          </span>
        </Card>
      </div>

      {/* Team Application Usage Distribution */}
      <Card variant="flat" padding="lg" className="border-[#DDD5C5]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <AppWindow className="w-5 h-5 text-[#588157]" />
              Team Application Usage Distribution
            </h3>
            <p className="text-xs text-[#78716C]">
              Aggregated time spent per software application across all employees
            </p>
          </div>
          <Badge variant="sage" size="sm">Application Metadata</Badge>
        </div>

        {appSummaries.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#78716C]">
            No application usage recorded for this scope.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {appSummaries.map((app) => {
              const Icon = getAppIcon(app.app_name);
              const activeRatio = app.total_duration_seconds > 0
                ? Math.round((app.total_active_seconds / app.total_duration_seconds) * 100)
                : 0;

              return (
                <div
                  key={app.app_name}
                  className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#DDD5C5] flex items-center justify-center text-[#2D4A36]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-[#1C1917] block leading-tight">
                          {app.app_name}
                        </span>
                        <span className="text-[10px] text-[#78716C]">
                          {app.employee_count} {app.employee_count === 1 ? 'employee' : 'employees'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-base text-[#1C1917]">
                      {app.total_duration_hours >= 0.1
                        ? `${app.total_duration_hours.toFixed(1)}h`
                        : formatDurationHuman(app.total_duration_seconds)}
                    </span>
                  </div>

                  {/* Active vs Idle bar */}
                  <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#16A34A] h-full" style={{ width: `${activeRatio}%` }} />
                    <div className="bg-[#FDBA74] h-full" style={{ width: `${100 - activeRatio}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                    <span>Active: <strong className="text-[#2D4A36]">
                      {app.total_active_hours >= 0.1 ? `${app.total_active_hours.toFixed(1)}h` : formatDurationHuman(app.total_active_seconds)}
                    </strong></span>
                    <span>Idle: <strong className="text-[#856404]">
                      {app.total_idle_hours >= 0.1 ? `${app.total_idle_hours.toFixed(1)}h` : formatDurationHuman(app.total_idle_seconds)}
                    </strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Per-Employee Work Session & Telemetry Table */}
      <Card variant="flat" padding="lg" className="border-[#DDD5C5]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#588157]" />
              Employee Work Activity Directory
            </h3>
            <p className="text-xs text-[#78716C]">
              Aggregated work session metrics and duration breakdown by employee
            </p>
          </div>
          <span className="text-xs text-[#78716C]">
            {employeeSummaries.length} Employees Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8E2D5] text-[11px] uppercase tracking-wider text-[#78716C]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-center">Sessions</th>
                <th className="py-3 px-3 text-right">Total Duration</th>
                <th className="py-3 px-3 text-right">Active Focus</th>
                <th className="py-3 px-3 text-right">Idle Time</th>
                <th className="py-3 px-3 text-center">Active Ratio</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D5]">
              {employeeSummaries.map((emp) => {
                const ratio = emp.total_working_hours > 0
                  ? Math.round((emp.total_active_hours / emp.total_working_hours) * 100)
                  : 0;

                return (
                  <tr key={emp.employee_id} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.employee_name} color={emp.avatar_color} size="sm" />
                        <div>
                          <span className="font-bold text-[#1C1917] block leading-tight">
                            {emp.employee_name}
                          </span>
                          <span className="text-[11px] text-[#78716C]">
                            ID: {emp.employee_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs text-[#57534E]">
                      {emp.department}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono text-xs font-semibold text-[#1C1917]">
                      {emp.session_count}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-sm text-[#1C1917]">
                      {emp.total_working_hours >= 0.1
                        ? `${emp.total_working_hours.toFixed(2)}h`
                        : formatDurationHuman(Math.round(emp.total_working_hours * 3600))}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-sm text-[#2D4A36]">
                      {emp.total_active_hours >= 0.1
                        ? `${emp.total_active_hours.toFixed(2)}h`
                        : formatDurationHuman(Math.round(emp.total_active_hours * 3600))}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-sm text-[#856404]">
                      {emp.total_idle_hours >= 0.1
                        ? `${emp.total_idle_hours.toFixed(2)}h`
                        : formatDurationHuman(Math.round(emp.total_idle_hours * 3600))}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <Badge variant={ratio >= 70 ? 'forest' : 'yellow'} size="sm">
                        {ratio}%
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5 text-[#2D4A36]" />}
                        onClick={() => handleOpenEmployeeDrilldown(emp)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drill-down Modal: Detailed Permitted Work Sessions */}
      <Modal
        isOpen={isDrilldownModalOpen}
        onClose={() => setIsDrilldownModalOpen(false)}
        title={drilldownEmployee ? `${drilldownEmployee.employee_name} — Permitted Work Sessions` : 'Work Sessions'}
        subtitle={`Department: ${drilldownEmployee?.department || ''} • Permitted Application Metadata`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#78716C]">
              Zero private content or keystrokes exposed to manager
            </span>
            <Button variant="primary" size="sm" onClick={() => setIsDrilldownModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedEmployeeSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#78716C]">
              No work sessions found for this employee under the selected scope.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedEmployeeSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D5]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#588157]" />
                      <strong className="text-[#1C1917]">{session.date}</strong>
                      {session.is_demo_seed === 1 ? (
                        <Badge variant="sage" size="sm">Demo Seed</Badge>
                      ) : (
                        <Badge variant="forest" size="sm">Live Session</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Total: <strong className="font-mono text-[#1C1917]">{session.total_working_hours.toFixed(2)}h</strong></span>
                      <span>Active: <strong className="font-mono text-[#2D4A36]">{session.active_hours.toFixed(2)}h</strong></span>
                      <span>Idle: <strong className="font-mono text-[#856404]">{session.idle_hours.toFixed(2)}h</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                    <span>Login: {formatDateTime(session.login_time)}</span>
                    <span>Logout: {session.logout_time ? formatDateTime(session.logout_time) : 'In Session'}</span>
                  </div>

                  {session.application_usage && session.application_usage.length > 0 && (
                    <div className="pt-1.5 flex flex-wrap gap-1.5">
                      {session.application_usage.map((app) => (
                        <span
                          key={app.id}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD5C5] text-[11px] font-medium text-[#292524] flex items-center gap-1.5"
                        >
                          <span className="font-bold text-[#1C1917]">{app.app_name}</span>
                          <span className="text-[#57534E]">
                            {app.duration_seconds >= 360 ? `${(app.duration_seconds / 3600).toFixed(1)}h` : formatDurationHuman(app.duration_seconds)}
                          </span>
                          <span className="text-[#2D4A36]">
                            (Act: {app.active_seconds >= 360 ? `${(app.active_seconds / 3600).toFixed(1)}h` : formatDurationHuman(app.active_seconds)})
                          </span>
                          {app.app_start_time && (
                            <span className="text-[10px] text-[#78716C]">
                              [{app.app_start_time.substring(11, 16)}–{app.app_end_time ? app.app_end_time.substring(11, 16) : 'now'}]
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
