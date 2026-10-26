import React, { useState, useEffect } from 'react';
import { User, WorkSession, ApplicationUsage, TelemetryState, TrackerStatusResponse } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { formatDurationHMS, formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock,
  LogIn,
  LogOut,
  AppWindow,
  Monitor,
  CheckCircle2,
  Lock,
  Layers,
  RefreshCw,
  Plus,
  Play,
  Terminal,
  Code2,
  Globe,
  Database,
  Figma as FigmaIcon,
  Folder,
  MessageSquare,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

interface EmployeeWorkActivityViewProps {
  currentUser: User;
}

const PERMITTED_APPS = [
  { name: 'VS Code', category: 'Development', icon: Code2, color: 'text-sky-600 bg-sky-50' },
  { name: 'Chrome', category: 'Browser / Research', icon: Globe, color: 'text-amber-600 bg-amber-50' },
  { name: 'Safari', category: 'Browser', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  { name: 'Terminal', category: 'CLI / System', icon: Terminal, color: 'text-stone-700 bg-stone-100' },
  { name: 'MySQL', category: 'Database', icon: Database, color: 'text-emerald-600 bg-emerald-50' },
  { name: 'Figma', category: 'UI / Design', icon: FigmaIcon, color: 'text-rose-600 bg-rose-50' },
  { name: 'Finder', category: 'System Navigation', icon: Folder, color: 'text-indigo-600 bg-indigo-50' },
  { name: 'Slack', category: 'Team Communication', icon: MessageSquare, color: 'text-teal-600 bg-teal-50' },
];

export const EmployeeWorkActivityView: React.FC<EmployeeWorkActivityViewProps> = ({ currentUser }) => {
  const employeeId = currentUser.employee_id || 'emp_alice';

  // Tracker & State
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatusResponse | null>(null);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [allSessions, setAllSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View Scope Tab: 'live' (0) vs 'demo' (1)
  const [scopeTab, setScopeTab] = useState<'live' | 'demo'>('live');

  // Modals
  const [isLogAppModalOpen, setIsLogAppModalOpen] = useState<boolean>(false);
  const [isMacPermModalOpen, setIsMacPermModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Form for logging permitted app usage
  const [selectedApp, setSelectedApp] = useState<string>('VS Code');
  const [logActiveMinutes, setLogActiveMinutes] = useState<number>(45);
  const [logIdleMinutes, setLogIdleMinutes] = useState<number>(10);
  const [testProhibitedToggle, setTestProhibitedToggle] = useState<boolean>(false);

  useEffect(() => {
    loadData(true);
    let interval: NodeJS.Timeout | null = null;
    if (scopeTab === 'live') {
      interval = setInterval(() => {
        loadData(false);
      }, 3000);
    }
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [employeeId, scopeTab]);

  const loadData = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Tracker status
      const statusRes = await fetch(`/api/telemetry/tracker-status?employee_id=${employeeId}`, { headers });
      const statusData = await statusRes.json();
      if (statusData.success) {
        setTrackerStatus(statusData);
      }

      // 2. Current active live session
      const currentRes = await fetch(`/api/work-sessions/current?employee_id=${employeeId}`, { headers });
      const currentData = await currentRes.json();
      if (currentData.success) {
        setActiveSession(currentData.active_session || null);
      }

      // 3. Work sessions list for current scope
      const seedFilter = scopeTab === 'demo' ? 1 : 0;
      const sessionsRes = await fetch(`/api/work-sessions?employee_id=${employeeId}&is_demo_seed=${seedFilter}`, { headers });
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) {
        setAllSessions(sessionsData.work_sessions || []);
      }
    } catch (err: any) {
      if (showLoading) {
        setErrorMessage(err.message || 'Failed to load telemetry data.');
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Start a new live work session
  const handleStartWorkSession = async () => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch('/api/work-sessions/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to start session.');
        return;
      }
      setSuccessMessage('Live desktop work session started.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Logout / finalize current work session
  const handleLogoutWorkSession = async () => {
    if (!activeSession) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`/api/work-sessions/${activeSession.id}/logout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: employeeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to logout session.');
        return;
      }
      setSuccessMessage('Work session finalized and logged out.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Record permitted application telemetry
  const handleRecordAppUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      setErrorMessage('Please start a live work session before recording application usage.');
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    const payload: any = {
      work_session_id: activeSession.id,
      employee_id: employeeId,
      app_name: selectedApp,
      active_seconds: logActiveMinutes * 60,
      idle_seconds: logIdleMinutes * 60,
    };

    // If user clicked test prohibited injection to verify backend security
    if (testProhibitedToggle) {
      payload.keystroke_log = 'PROHIBITED_KEYSTROKE_ATTEMPT_123';
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch('/api/telemetry/app-usage', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to record application telemetry.');
        return;
      }
      setSuccessMessage(`Application telemetry recorded for ${selectedApp}.`);
      setIsLogAppModalOpen(false);
      setTestProhibitedToggle(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Re-check and refresh tracker status from backend
  const handleRefreshTrackerStatus = async () => {
    setIsActionLoading(true);
    try {
      await loadData(true);
      setSuccessMessage('Desktop tracker status verified.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Get app icon helper
  const getAppIcon = (appName: string) => {
    const found = PERMITTED_APPS.find((a) => a.name.toLowerCase() === appName.toLowerCase());
    return found ? found.icon : AppWindow;
  };

  const currentTelemetryState = trackerStatus?.telemetry_state || 'Live Tracking Active';

  return (
    <div className="space-y-7">
      {/* Top Banner: Work Activity Telemetry */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF7F0]/15 text-[#FAF7F0] backdrop-blur-xs border border-[#FAF7F0]/20">
                <Activity className="w-3.5 h-3.5 text-[#A3B18A]" />
                Phase 6 Telemetry
              </span>

              {/* Explicit Telemetry State Pill */}
              {currentTelemetryState === 'Live Tracking Active' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#16A34A] text-white">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Live Tracking Active
                </span>
              ) : currentTelemetryState === 'Tracking Permission Required' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F97316] text-white">
                  <AlertTriangle className="w-3 h-3" />
                  Tracking Permission Required
                </span>
              ) : currentTelemetryState === 'Tracking Unavailable' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#78716C] text-white">
                  <Lock className="w-3 h-3" />
                  Tracking Unavailable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#606C38] text-white">
                  <Sparkles className="w-3 h-3" />
                  Demo Data Mode
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Desktop Work Activity Telemetry
            </h1>
            <p className="text-sm text-[#D8E2DC] leading-relaxed">
              Privacy-preserving application-level metadata tracking for your daily work sessions. Objective active focus and idle duration without capturing keystrokes, URLs, or screen contents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="light"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4 text-[#1E3525]" />}
              onClick={() => setIsPrivacyModalOpen(true)}
            >
              Privacy Policy
            </Button>
            <Button
              variant="light"
              size="sm"
              icon={<Monitor className="w-4 h-4 text-[#1E3525]" />}
              onClick={() => setIsMacPermModalOpen(true)}
            >
              macOS Permissions
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-[#EBF1ED] border border-[#A3B18A] text-xs font-semibold text-[#2D4A36] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#588157]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[#588157] font-bold">×</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-semibold text-[#991B1B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[#DC2626] font-bold">×</button>
        </div>
      )}

      {/* macOS Accessibility Permission Guidance Banner */}
      {currentTelemetryState === 'Tracking Permission Required' && (
        <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-[#9A3412]">
                macOS Accessibility Permission Required (AXIsProcessTrusted)
              </h4>
              <p className="text-xs text-[#7C2D12] leading-relaxed">
                macOS requires authorization to observe the active application name via NSWorkspace. MindWork strictly queries application metadata only — zero keystrokes, URLs, documents, or screenshots.
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 border border-[#FDBA74] text-[11px] text-[#7C2D12] space-y-1">
                <strong>How to enable on macOS:</strong>
                <ol className="list-decimal list-inside pl-1 space-y-0.5">
                  <li>Open <strong>System Settings &gt; Privacy &amp; Security &gt; Accessibility</strong></li>
                  <li>Enable permission for <strong>Terminal</strong>, <strong>iTerm</strong>, or <strong>Node</strong></li>
                  <li>Click <em>Re-check Permission</em> below to activate real-time telemetry</li>
                </ol>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs border-[#EA580C] text-[#C2410C] hover:bg-[#FFEDD5]"
            onClick={handleRefreshTrackerStatus}
            disabled={isActionLoading}
          >
            Re-check Permission
          </Button>
        </div>
      )}

      {/* macOS Tracking Unavailable Banner */}
      {currentTelemetryState === 'Tracking Unavailable' && (
        <div className="p-4 rounded-2xl bg-[#F5F2EB] border border-[#DDD5C5] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#78716C] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#1C1917]">
                macOS Desktop Tracker Offline
              </h4>
              <p className="text-xs text-[#57534E] leading-relaxed">
                Live desktop application tracking queries permitted applications on macOS. When running MindWork on a Mac or in local development, run <code>npm run tracker</code> in your terminal to start the background companion agent.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            onClick={handleRefreshTrackerStatus}
            disabled={isActionLoading}
          >
            Check Tracker Status
          </Button>
        </div>
      )}

      {/* Live Active Telemetry Info Strip */}
      {currentTelemetryState === 'Live Tracking Active' && (
        <Card variant="flat" padding="sm" className="bg-[#EBF1ED] border-[#C5D6C9]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#2D4A36]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse shrink-0" />
              <span className="font-bold">Live macOS Desktop Tracking Active:</span>
              <span>
                Currently Frontmost: <strong className="font-mono text-[#1C1917] bg-white px-2 py-0.5 rounded border border-[#C5D6C9]">{trackerStatus?.active_app || 'Monitoring desktop...'}</strong>
              </span>
              <span className="text-[#588157]">
                ({trackerStatus?.is_active_input ? 'Active focus' : 'Idle input'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#588157]">Permitted apps only • Zero keystrokes</span>
              <Button variant="ghost" size="sm" onClick={handleRefreshTrackerStatus} disabled={isActionLoading}>
                <RefreshCw className="w-3 h-3 text-[#2D4A36]" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Scope Navigation Tabs: Live Telemetry vs Demo Historical Telemetry */}
      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScopeTab('live')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              scopeTab === 'live'
                ? 'bg-[#2D4A36] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EA]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Work Sessions (is_demo_seed = 0)</span>
            {activeSession && (
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            )}
          </button>

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
            <Badge variant="sage" size="sm">Historical</Badge>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => loadData(true)}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Notice of Isolation */}
      {scopeTab === 'demo' ? (
        <div className="p-4 rounded-2xl bg-[#EFF1E8] border border-[#DCE2CD] flex items-center gap-3 text-xs text-[#2D4A36]">
          <Info className="w-4 h-4 text-[#606C38] shrink-0" />
          <p>
            <strong>Displaying 7-Day Demo Baseline Telemetry (Sept 30 – Oct 6, 2026):</strong> This historical dataset represents baseline pre-seeded work activity. It is completely isolated from live employee work sessions.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#EBF1ED] border border-[#D1E0D5] flex items-center gap-3 text-xs text-[#2D4A36]">
          <CheckCircle2 className="w-4 h-4 text-[#588157] shrink-0" />
          <p>
            <strong>Live Telemetry Mode (is_demo_seed = 0):</strong> Persisting directly to SQLite table <code>work_sessions</code> and <code>application_usage</code>. Refreshing the browser does not reset or fabricate telemetry.
          </p>
        </div>
      )}

      {/* Current Work Session Card (Live scope only) */}
      {scopeTab === 'live' && (
        <Card variant="flat" padding="lg" className="border-[#DDD5C5] shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E8E2D5]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1C1917] tracking-tight">
                  Today's Active Work Session
                </h3>
                {activeSession ? (
                  <Badge variant="forest" size="sm" dot>
                    In Session (Live)
                  </Badge>
                ) : (
                  <Badge variant="yellow" size="sm">
                    No Active Session
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#78716C]">
                {activeSession
                  ? `Logged in at ${formatDateTime(activeSession.login_time)} • Session ID: ${activeSession.id}`
                  : 'Start your desktop session to begin logging permitted application focus time.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {activeSession ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsLogAppModalOpen(true)}
                  >
                    Log Application Focus
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    className="border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2]"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={handleLogoutWorkSession}
                    disabled={isActionLoading}
                  >
                    Logout Work Session
                  </Button>
                </>
              ) : (
                <Button
                  variant="forest"
                  size="md"
                  icon={<LogIn className="w-4 h-4" />}
                  onClick={handleStartWorkSession}
                  disabled={isActionLoading}
                >
                  Start Work Session
                </Button>
              )}
            </div>
          </div>

          {activeSession ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-[#FBF9F4] border border-[#E8E2D5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase font-bold text-[#78716C]">Total Working Duration</span>
                  <Clock className="w-4 h-4 text-[#588157]" />
                </div>
                <div className="text-2xl font-black text-[#1C1917] font-mono">
                  {activeSession.total_working_hours.toFixed(2)}h
                </div>
                <div className="text-xs text-[#78716C] mt-0.5">
                  {(activeSession.total_working_hours * 60).toFixed(0)} minutes total
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EBF1ED] border border-[#D1E0D5]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase font-bold text-[#2D4A36]">Active Working Time</span>
                  <Activity className="w-4 h-4 text-[#16A34A]" />
                </div>
                <div className="text-2xl font-black text-[#2D4A36] font-mono">
                  {activeSession.active_hours.toFixed(2)}h
                </div>
                <div className="text-xs text-[#588157] mt-0.5">
                  {(activeSession.active_hours * 60).toFixed(0)} active focus minutes
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FDF6E2] border border-[#F0E6B8]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase font-bold text-[#856404]">Idle / Paused Time</span>
                  <Clock className="w-4 h-4 text-[#B45309]" />
                </div>
                <div className="text-2xl font-black text-[#856404] font-mono">
                  {activeSession.idle_hours.toFixed(2)}h
                </div>
                <div className="text-xs text-[#B45309] mt-0.5">
                  {(activeSession.idle_hours * 60).toFixed(0)} idle duration minutes
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#78716C]">
              No work session is currently running. Click <strong>Start Work Session</strong> above to begin recording objective application metadata.
            </div>
          )}

          {/* Active Session's Application Usage List */}
          {activeSession && activeSession.application_usage && activeSession.application_usage.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#E8E2D5] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
                <AppWindow className="w-4 h-4 text-[#588157]" />
                Applications Active in Current Session
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeSession.application_usage.map((app) => {
                  const Icon = getAppIcon(app.app_name);
                  const activeMins = Math.round(app.active_seconds / 60);
                  const idleMins = Math.round(app.idle_seconds / 60);
                  const totalMins = Math.round(app.duration_seconds / 60);

                  return (
                    <div key={app.id} className="p-3.5 rounded-xl bg-white border border-[#DDD5C5] shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#FAF7F0] border border-[#E8E2D5] flex items-center justify-center text-[#2D4A36]">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-[#1C1917]">{app.app_name}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#57534E]">
                          {totalMins > 0 ? `${totalMins}m` : formatDurationHuman(app.duration_seconds)}
                        </span>
                      </div>

                      <div className="w-full bg-[#E8E2D5] h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-[#16A34A] h-full"
                          style={{ width: `${app.duration_seconds > 0 ? (app.active_seconds / app.duration_seconds) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-[#FDBA74] h-full"
                          style={{ width: `${app.duration_seconds > 0 ? (app.idle_seconds / app.duration_seconds) * 100 : 0}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                        <span>Active: <strong className="text-[#2D4A36]">{activeMins > 0 ? `${activeMins}m` : formatDurationHuman(app.active_seconds)}</strong></span>
                        <span>Idle: <strong className="text-[#856404]">{idleMins > 0 ? `${idleMins}m` : formatDurationHuman(app.idle_seconds)}</strong></span>
                      </div>

                      {app.app_start_time && (
                        <div className="text-[10px] text-[#78716C] pt-1 border-t border-[#F5F2EB] flex items-center justify-between font-mono">
                          <span>Start: {app.app_start_time.substring(11, 19)}</span>
                          <span>{app.app_end_time ? `End: ${app.app_end_time.substring(11, 19)}` : 'Active'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Work Sessions History & Application Usage Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#588157]" />
            {scopeTab === 'demo' ? '7-Day Baseline Seed Telemetry' : 'Persisted Work Sessions Log'}
          </h2>
          <span className="text-xs text-[#78716C]">
            Total Sessions: <strong>{allSessions.length}</strong>
          </span>
        </div>

        {allSessions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#DDD5C5] text-xs text-[#78716C]">
            No work sessions recorded under this scope yet.
          </div>
        ) : (
          <div className="space-y-4">
            {allSessions.map((session) => (
              <Card key={session.id} variant="flat" padding="md" className="border-[#DDD5C5]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D5]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#588157]" />
                        {session.date}
                      </span>
                      {session.is_demo_seed === 1 ? (
                        <Badge variant="sage" size="sm">Demo Seed</Badge>
                      ) : (
                        <Badge variant="forest" size="sm">Live Session</Badge>
                      )}
                      {(!session.logout_time || session.logout_time === '') && (
                        <Badge variant="peach" size="sm" dot>Active Now</Badge>
                      )}
                    </div>
                    <div className="text-xs text-[#78716C] flex flex-wrap items-center gap-3">
                      <span>Login: <strong>{formatDateTime(session.login_time)}</strong></span>
                      <span>Logout: <strong>{session.logout_time ? formatDateTime(session.logout_time) : 'Session Active'}</strong></span>
                      <span>ID: <code className="text-[10px] text-[#A3B18A]">{session.id}</code></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#78716C] block">Total Duration</span>
                      <span className="text-base font-extrabold font-mono text-[#1C1917]">
                        {session.total_working_hours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#2D4A36] block">Active Focus</span>
                      <span className="text-base font-extrabold font-mono text-[#2D4A36]">
                        {session.active_hours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#856404] block">Idle</span>
                      <span className="text-base font-extrabold font-mono text-[#856404]">
                        {session.idle_hours.toFixed(2)}h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Applications Breakdown */}
                {session.application_usage && session.application_usage.length > 0 && (
                  <div className="pt-4 space-y-2">
                    <span className="text-[11px] uppercase font-bold text-[#78716C] block">
                      Permitted Application Breakdown ({session.application_usage.length} apps):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {session.application_usage.map((app) => {
                        const Icon = getAppIcon(app.app_name);
                        const durHrs = (app.duration_seconds / 3600).toFixed(2);
                        const actHrs = (app.active_seconds / 3600).toFixed(2);
                        const idlHrs = (app.idle_seconds / 3600).toFixed(2);

                        return (
                          <div
                            key={app.id}
                            className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 truncate">
                                <Icon className="w-3.5 h-3.5 text-[#588157] shrink-0" />
                                <strong className="text-[#1C1917] truncate">{app.app_name}</strong>
                              </div>
                              <span className="font-mono font-bold text-[#2D4A36]">
                                {app.duration_seconds >= 360 ? `${durHrs}h` : formatDurationHuman(app.duration_seconds)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#78716C]">
                              <span>Act: {app.active_seconds >= 360 ? `${actHrs}h` : formatDurationHuman(app.active_seconds)}</span>
                              <span>Idl: {app.idle_seconds >= 360 ? `${idlHrs}h` : formatDurationHuman(app.idle_seconds)}</span>
                            </div>
                            {app.app_start_time && (
                              <div className="text-[9px] text-[#78716C] font-mono pt-0.5 border-t border-[#E8E2D5] flex items-center justify-between">
                                <span>{app.app_start_time.substring(11, 16)}</span>
                                <span>{app.app_end_time ? app.app_end_time.substring(11, 16) : 'now'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Log Permitted Application Focus */}
      <Modal
        isOpen={isLogAppModalOpen}
        onClose={() => setIsLogAppModalOpen(false)}
        title="Log Permitted Application Focus"
        subtitle="Records objective application-level active and idle telemetry to application_usage"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#78716C]">
              Only application title and timestamps recorded
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsLogAppModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRecordAppUsage}
                disabled={isActionLoading}
              >
                Save Application Telemetry
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleRecordAppUsage} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
              Select Permitted Application
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERMITTED_APPS.map((app) => {
                const Icon = app.icon;
                const isSelected = selectedApp === app.name;
                return (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => setSelectedApp(app.name)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-[#2D4A36] bg-[#EBF1ED] ring-2 ring-[#2D4A36]'
                        : 'border-[#DDD5C5] bg-white hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${app.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#1C1917] text-center">{app.name}</span>
                    <span className="text-[10px] text-[#78716C] text-center">{app.category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
                Active Focus Minutes
              </label>
              <input
                type="number"
                min="0"
                max="600"
                value={logActiveMinutes}
                onChange={(e) => setLogActiveMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-sm font-mono font-semibold"
              />
              <span className="text-[11px] text-[#588157] mt-0.5 block">
                {(logActiveMinutes / 60).toFixed(2)} active hours
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
                Idle / Paused Minutes
              </label>
              <input
                type="number"
                min="0"
                max="600"
                value={logIdleMinutes}
                onChange={(e) => setLogIdleMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-sm font-mono font-semibold"
              />
              <span className="text-[11px] text-[#856404] mt-0.5 block">
                {(logIdleMinutes / 60).toFixed(2)} idle hours
              </span>
            </div>
          </div>

          {/* Test Prohibited Telemetry Rejection Box */}
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-2">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="testProhibited"
                checked={testProhibitedToggle}
                onChange={(e) => setTestProhibitedToggle(e.target.checked)}
                className="mt-0.5 rounded cursor-pointer"
              />
              <label htmlFor="testProhibited" className="text-xs text-[#991B1B] font-semibold cursor-pointer">
                Security Test: Inject Prohibited Telemetry (Keystroke log)
              </label>
            </div>
            <p className="text-[11px] text-[#7F1D1D] leading-relaxed">
              Enables testing the backend validation: when checked, payload includes a prohibited <code>keystroke_log</code> field. The backend MUST reject this with HTTP 400 Privacy Violation.
            </p>
          </div>
        </form>
      </Modal>

      {/* Modal: macOS Accessibility Permission Documentation */}
      <Modal
        isOpen={isMacPermModalOpen}
        onClose={() => setIsMacPermModalOpen(false)}
        title="macOS Accessibility & Screen Time Permissions"
        subtitle="Technical privacy and permission architecture on Apple macOS"
        maxWidth="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsMacPermModalOpen(false)}>
            Close Overview
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-[#57534E] leading-relaxed">
          <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5] space-y-2">
            <h4 className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-[#588157]" />
              macOS Accessibility API (AXIsProcessTrusted)
            </h4>
            <p>
              On macOS, native desktop daemons query the currently active foreground application using the standard Accessibility framework (<code>NSWorkspace.shared.frontmostApplication</code>).
            </p>
            <p>
              Under macOS security policy (macOS Ventura, Sonoma, Sequoia), the system requires user authorization under:
            </p>
            <div className="p-2.5 rounded-lg bg-white border border-[#DDD5C5] font-mono text-[11px] text-[#1C1917]">
              System Settings &gt; Privacy &amp; Security &gt; Accessibility &gt; MindWork Daemon
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#EBF1ED] border border-[#D1E0D5] space-y-1.5 text-[#2D4A36]">
            <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#588157]" />
              Non-Invasive Architecture Guarantee
            </h5>
            <p>
              The MindWork tracker queries only <code>localizedName</code> or <code>bundleIdentifier</code>. It does NOT register event taps for keystrokes, does not capture screen buffers, and does not inspect browser DOM or URL bars.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal: Strict Privacy Guarantees */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="MindWork Privacy Architecture"
        subtitle="Application-Level Metadata Only — Zero Invasive Surveillance"
        maxWidth="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsPrivacyModalOpen(false)}>
            Close Policy
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#EBF1ED] border border-[#A3B18A] space-y-2">
            <h4 className="font-bold text-sm text-[#2D4A36] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              Permitted Telemetry (Objective Workload Only)
            </h4>
            <ul className="space-y-1 text-[#2D4A36] list-disc list-inside">
              <li>Application Name (e.g., VS Code, Chrome, Terminal, Slack)</li>
              <li>Application / Session Start &amp; End Timestamps</li>
              <li>Total Duration</li>
              <li>Active Duration (focus seconds)</li>
              <li>Idle Duration (paused/unfocused seconds)</li>
              <li>Overall Work-Session Login &amp; Logout Timestamps</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] space-y-2">
            <h4 className="font-bold text-sm text-[#991B1B] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
              Strictly Prohibited &amp; Programmatically Blocked
            </h4>
            <ul className="space-y-1 text-[#991B1B] list-disc list-inside">
              <li>❌ No keystroke logging or typing cadence</li>
              <li>❌ No keyboard content or passwords</li>
              <li>❌ No screenshots or screen recording</li>
              <li>❌ No clipboard contents</li>
              <li>❌ No private messages or email text</li>
              <li>❌ No document or file contents</li>
              <li>❌ No URLs or browser page contents</li>
              <li>❌ No microphone or audio recording</li>
              <li>❌ No camera or video access</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
