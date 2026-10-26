import React, { useState, useEffect } from 'react';
import { TaskItem, TaskSession, Priority, TaskAnalysisReport } from '../../types';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { TaskAnalysisReportModal } from './TaskAnalysisReportModal';
import { formatDurationHMS, formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Timer,
  AlertCircle,
  Coffee,
  Check,
  Flame,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';

interface TaskStopwatchWidgetProps {
  task: TaskItem;
  currentUserId?: string;
  onSessionUpdated?: () => void;
  compact?: boolean;
}

export const TaskStopwatchWidget: React.FC<TaskStopwatchWidgetProps> = ({
  task,
  currentUserId,
  onSessionUpdated,
  compact = false,
}) => {
  const [session, setSession] = useState<TaskSession | null>(task.sessions?.[0] || null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(task.status === 'COMPLETED');

  // Live timer counters
  const [activeSeconds, setActiveSeconds] = useState<number>(task.total_active_seconds || 0);
  const [pausedSeconds, setPausedSeconds] = useState<number>(task.total_paused_seconds || 0);

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);

  // Post-completion Task Analysis Report state (Phase 5)
  const [analysisReport, setAnalysisReport] = useState<TaskAnalysisReport | null>(task.analysis_report || null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  // Helper to retrieve auth token or trigger visible message
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
    if (!token) {
      setConflictError('Authentication token missing. Please sign in again.');
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch latest session for this task
  const fetchSessionStatus = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/session`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server HTTP ${res.status}`);
      }
      if (data.success) {
        console.log(`[Diagnostic Log - Widget Fetch] Task ID: ${task.id} ("${task.title}") API session:`, data.session, { is_running: data.is_running, is_paused: data.is_paused });
        if (data.session) {
          setSession(data.session);
          setIsRunning(data.is_running);
          setIsPaused(data.is_paused);
          setIsCompleted(data.is_completed || task.status === 'COMPLETED');
        } else {
          setSession(null);
          setIsRunning(false);
          setIsPaused(false);
          setIsCompleted(task.status === 'COMPLETED');
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch session:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Failed to synchronize stopwatch session.');
      }
    }
  };

  const parseTimestamp = (dateStr?: string | null): number => {
    if (!dateStr) return 0;
    let s = dateStr.trim();
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T');
    }
    if (!s.endsWith('Z') && !/[+\-]\d{2}:?\d{2}$/.test(s)) {
      s += 'Z';
    }
    const t = new Date(s).getTime();
    return isNaN(t) ? 0 : t;
  };

  useEffect(() => {
    console.log(`[Diagnostic Log - Widget Prop Effect] Task ID: ${task.id} ("${task.title}") status: "${task.status}" session_pause: "${task.session_pause_time}" session_resume: "${task.session_resume_time}"`);
    if (task) {
      if (task.status === 'COMPLETED') {
        setIsCompleted(true);
        setIsRunning(false);
        setIsPaused(false);
      } else {
        const pTime = task.session_pause_time;
        const rTime = task.session_resume_time;
        const isPausedState = pTime && (!rTime || parseTimestamp(pTime) >= parseTimestamp(rTime));
        if (isPausedState) {
          setIsPaused(true);
          setIsRunning(false);
          setIsCompleted(false);
        } else if (task.status === 'IN_PROGRESS' || task.session_start_time || rTime) {
          if (!pTime || (rTime && parseTimestamp(rTime) > parseTimestamp(pTime))) {
            setIsRunning(true);
            setIsPaused(false);
            setIsCompleted(false);
          } else {
            setIsPaused(true);
            setIsRunning(false);
            setIsCompleted(false);
          }
        }
      }
    }
    fetchSessionStatus();
  }, [task?.id, task?.status, task?.session_pause_time, task?.session_resume_time, task?.total_active_seconds]);

  // Live 1-second interval ticker synced to timestamps
  useEffect(() => {
    if (isCompleted) {
      setActiveSeconds(session?.total_active_seconds || task.total_active_seconds || 0);
      setPausedSeconds(session?.total_paused_seconds || task.total_paused_seconds || 0);
      return;
    }

    const updateTimer = () => {
      if (!session) {
        setActiveSeconds(0);
        setPausedSeconds(0);
        return;
      }

      if (isRunning) {
        const refTime = session.resume_time || session.start_time;
        const elapsedSinceRef = refTime
          ? Math.max(0, Math.floor((Date.now() - parseTimestamp(refTime)) / 1000))
          : 0;
        setActiveSeconds((session.total_active_seconds || 0) + elapsedSinceRef);
        setPausedSeconds(session.total_paused_seconds || 0);
      } else if (isPaused) {
        const elapsedSincePause = session.pause_time
          ? Math.max(0, Math.floor((Date.now() - parseTimestamp(session.pause_time)) / 1000))
          : 0;
        setActiveSeconds(session.total_active_seconds || 0);
        setPausedSeconds((session.total_paused_seconds || 0) + elapsedSincePause);
      } else {
        setActiveSeconds(session.total_active_seconds || 0);
        setPausedSeconds(session.total_paused_seconds || 0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, isRunning, isPaused, isCompleted, task]);

  // Action handlers
  const handleStart = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setConflictError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflictError(data.error);
        } else {
          setConflictError(data.error || `Failed to start task (HTTP ${res.status}).`);
        }
        return;
      }

      if (data.success) {
        await fetchSessionStatus();
        onSessionUpdated?.();
      }
    } catch (err: any) {
      console.error('Error starting task:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Network error starting task.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setConflictError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/pause`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConflictError(data.error || `Failed to stop stopwatch (HTTP ${res.status}).`);
        return;
      }

      if (data.success) {
        await fetchSessionStatus();
        onSessionUpdated?.();
      }
    } catch (err: any) {
      console.error('Error stopping task:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Network error stopping stopwatch.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setConflictError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/resume`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflictError(data.error);
        } else {
          setConflictError(data.error || `Failed to resume stopwatch (HTTP ${res.status}).`);
        }
        return;
      }

      if (data.success) {
        await fetchSessionStatus();
        onSessionUpdated?.();
      }
    } catch (err: any) {
      console.error('Error resuming task:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Network error resuming stopwatch.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setConflictError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConflictError(data.error || `Failed to complete task (HTTP ${res.status}).`);
        return;
      }

      if (data.success) {
        setIsCompleteModalOpen(false);
        setIsCompleted(true);
        setIsRunning(false);
        setIsPaused(false);
        if (data.analysis_report) {
          setAnalysisReport(data.analysis_report);
          setIsAnalysisModalOpen(true);
        }
        await fetchSessionStatus();
        onSessionUpdated?.();
      }
    } catch (err: any) {
      console.error('Error completing task:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Network error completing task.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAnalysis = async () => {
    if (analysisReport) {
      setIsAnalysisModalOpen(true);
      return;
    }
    setIsLoading(true);
    setConflictError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/tasks/${task.id}/analysis`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server HTTP ${res.status}`);
      }
      if (data.success && data.report) {
        setAnalysisReport(data.report);
        setIsAnalysisModalOpen(true);
      } else {
        setConflictError(data.error || 'Failed to load task analysis report.');
      }
    } catch (err: any) {
      console.error('Error fetching analysis report:', err);
      if (err.message !== 'Authentication required') {
        setConflictError(err.message || 'Network error loading analysis report.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalSessionSeconds = activeSeconds + pausedSeconds;

  // COMPACT VIEW (used on cards and list items)
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E8E2D5]">
        {/* Timing Pill */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-xs text-[#2D4A36] bg-[#EBF1ED] px-2.5 py-1 rounded-lg border border-[#D1E0D5]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#588157]" />
              <span className="font-semibold">{formatDurationHuman(activeSeconds)} logged</span>
              {pausedSeconds > 0 && (
                <span className="text-[#78716C]">({formatDurationHuman(pausedSeconds)} paused)</span>
              )}
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2 bg-[#EBF1ED] text-[#2D4A36] px-3 py-1 rounded-lg border border-[#588157]/40 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16A34A]"></span>
              </span>
              <span className="font-mono font-bold text-xs">{formatDurationHMS(activeSeconds)}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#588157]">Active</span>
            </div>
          ) : isPaused ? (
            <div className="flex items-center gap-2 bg-[#FFF7ED] text-[#C2410C] px-3 py-1 rounded-lg border border-[#FDBA74]">
              <span className="h-2 w-2 rounded-full bg-[#EA580C]"></span>
              <span className="font-mono font-bold text-xs">{formatDurationHMS(activeSeconds)}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#EA580C]">Paused</span>
            </div>
          ) : (
            <div className="text-xs text-[#78716C] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Not started</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {(task.status === 'PENDING' || task.status === 'ASSIGNED') && (
            <Button
              variant="forest"
              size="sm"
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
              isLoading={isLoading}
              onClick={handleStart}
            >
              Start Stopwatch
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<Pause className="w-3.5 h-3.5" />}
                isLoading={isLoading}
                onClick={handlePause}
                className="text-[#EA580C] hover:bg-[#FFF7ED] border-[#FDBA74]"
              >
                Stop Stopwatch
              </Button>
              <Button
                variant="forest"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => setIsCompleteModalOpen(true)}
              >
                Complete
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
                isLoading={isLoading}
                onClick={handleResume}
              >
                Resume
              </Button>
              <Button
                variant="forest"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => setIsCompleteModalOpen(true)}
              >
                Complete
              </Button>
            </>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<FileCheck2 className="w-3.5 h-3.5 text-[#588157]" />}
                className="border-[#D1E0D5] text-[#2D4A36] hover:bg-[#EBF1ED]"
                onClick={handleOpenAnalysis}
              >
                Analysis Report
              </Button>
            </div>
          )}
        </div>

        {/* Post-Completion Task Analysis Report Modal (Phase 5) */}
        <TaskAnalysisReportModal
          task={task}
          report={analysisReport}
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
        />

        {/* Single active task conflict alert modal */}
        {conflictError && (
          <Modal
            isOpen={true}
            onClose={() => setConflictError(null)}
            title="Single Active Task Required"
            subtitle="Authoritative Workload Policy"
            maxWidth="md"
            footer={
              <Button variant="primary" size="sm" onClick={() => setConflictError(null)}>
                Understood
              </Button>
            }
          >
            <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#9A3412]">Only one active task permitted at a time</p>
                <p className="text-xs text-[#7C2D12] leading-relaxed">{conflictError}</p>
                <p className="text-[11px] text-[#9A3412] mt-2 italic">
                  To preserve accurate telemetry, please pause or complete your ongoing task before starting a new one.
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Completion Confirmation Modal */}
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title="Complete Task Execution?"
          subtitle={`Task: "${task.title}"`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button variant="secondary" size="sm" onClick={() => setIsCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="forest"
                size="sm"
                isLoading={isLoading}
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleComplete}
              >
                Confirm Completion
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-[#57534E] leading-relaxed">
              Completing this task will halt the stopwatch, finalize your recorded working duration, and mark the task status as <strong>COMPLETED</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E4DECFA] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#78716C]">Active Focus Duration:</span>
                <span className="font-mono font-bold text-[#1C1917]">{formatDurationHMS(activeSeconds)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#78716C]">Paused Rest Duration:</span>
                <span className="font-mono text-[#78716C]">{formatDurationHMS(pausedSeconds)}</span>
              </div>
              <div className="border-t border-[#DDD5C5] pt-2 flex justify-between text-xs font-bold">
                <span className="text-[#2D4A36]">Total Session Time:</span>
                <span className="font-mono text-[#2D4A36]">{formatDurationHMS(totalSessionSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
              <ShieldCheck className="w-4 h-4 text-[#588157]" />
              <span>Session record will be permanently saved to SQLite task_sessions.</span>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // HERO / EXPANDED WIDGET (used for the focused active stopwatch banner)
  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 transition-all border ${
        isRunning
          ? 'bg-gradient-to-br from-[#F4F7F4] via-[#EBF1ED] to-[#E3EBE6] border-[#588157] shadow-md'
          : isPaused
          ? 'bg-gradient-to-br from-[#FFFBF5] via-[#FFF7ED] to-[#FFEDD5] border-[#FDBA74] shadow-md'
          : isCompleted
          ? 'bg-[#F9F7F2] border-[#E8E2D5]'
          : 'bg-[#FAF8F3] border-[#E8E2D5]'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isRunning
                ? 'bg-[#2D4A36] text-[#A3B18A]'
                : isPaused
                ? 'bg-[#EA580C] text-white'
                : isCompleted
                ? 'bg-[#588157] text-white'
                : 'bg-[#E8E2D5] text-[#57534E]'
            }`}
          >
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
                Task Stopwatch
              </span>
              {isRunning && (
                <Badge variant="forest" size="sm" dot>
                  Active Focus
                </Badge>
              )}
              {isPaused && (
                <Badge variant="peach" size="sm">
                  Paused Break
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="sage" size="sm">
                  Completed
                </Badge>
              )}
              {task.status === 'PENDING' && (
                <Badge variant="yellow" size="sm">
                  Pending Start
                </Badge>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1C1917] mt-0.5 line-clamp-1">
              {task.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} size="sm" />
          <span className="text-xs text-[#78716C] font-mono">Due: {task.deadline.split(' ')[0]}</span>
        </div>
      </div>

      {/* Main Digital Clock Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center my-4 py-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-white/80 p-4">
        {/* Big Monospace Counter */}
        <div className="md:col-span-2 flex flex-col items-start sm:items-center md:items-start justify-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] mb-1">
            Active Working Duration
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${
                isRunning
                  ? 'text-[#2D4A36]'
                  : isPaused
                  ? 'text-[#C2410C]'
                  : isCompleted
                  ? 'text-[#588157]'
                  : 'text-[#78716C]'
              }`}
            >
              {formatDurationHMS(activeSeconds)}
            </span>
            <span className="text-xs font-semibold text-[#78716C]">
              {isRunning ? 'accumulating' : isPaused ? 'paused' : isCompleted ? 'finalized' : 'ready'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#78716C]">
            <span>
              Paused Rest: <strong className="font-mono text-[#44403C]">{formatDurationHMS(pausedSeconds)}</strong>
            </span>
            <span>•</span>
            <span>
              Total Session: <strong className="font-mono text-[#44403C]">{formatDurationHMS(totalSessionSeconds)}</strong>
            </span>
            {session?.start_time && (
              <>
                <span>•</span>
                <span>Started: {formatDateTime(session.start_time)}</span>
              </>
            )}
          </div>
        </div>

        {/* Stopwatch Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-center md:items-end">
          {(task.status === 'PENDING' || task.status === 'ASSIGNED') && (
            <Button
              variant="forest"
              size="lg"
              className="w-full sm:w-auto md:w-full justify-center shadow-md"
              icon={<Play className="w-4 h-4 fill-current" />}
              isLoading={isLoading}
              onClick={handleStart}
            >
              Start Task Timer
            </Button>
          )}

          {isRunning && (
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                size="md"
                className="flex-1 justify-center text-[#EA580C] hover:bg-[#FFF7ED] border-[#FDBA74]"
                icon={<Pause className="w-4 h-4" />}
                isLoading={isLoading}
                onClick={handlePause}
              >
                Stop Stopwatch
              </Button>
              <Button
                variant="forest"
                size="md"
                className="flex-1 justify-center shadow-md"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setIsCompleteModalOpen(true)}
              >
                Complete
              </Button>
            </div>
          )}

          {isPaused && (
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center shadow-sm"
                icon={<Play className="w-4 h-4 fill-current" />}
                isLoading={isLoading}
                onClick={handleResume}
              >
                Resume Work
              </Button>
              <Button
                variant="forest"
                size="md"
                className="flex-1 justify-center shadow-md"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setIsCompleteModalOpen(true)}
              >
                Complete
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <Button
                variant="forest"
                size="md"
                className="w-full justify-center shadow-sm"
                icon={<FileCheck2 className="w-4 h-4 text-[#A3B18A]" />}
                onClick={handleOpenAnalysis}
              >
                View Post-Completion Analysis
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Description & Objective Snippet */}
      {task.description && (
        <div className="mt-3 pt-3 border-t border-[#E8E2D5]/60 text-xs text-[#57534E] leading-relaxed line-clamp-2">
          <strong className="text-[#2D4A36]">Task Objective:</strong> {task.description}
        </div>
      )}

      {/* Single active task conflict alert modal */}
      {conflictError && (
        <Modal
          isOpen={true}
          onClose={() => setConflictError(null)}
          title="Single Active Task Required"
          subtitle="Authoritative Workload Policy"
          maxWidth="md"
          footer={
            <Button variant="primary" size="sm" onClick={() => setConflictError(null)}>
              Understood
            </Button>
          }
        >
          <div className="p-4 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#9A3412]">Only one active task permitted at a time</p>
              <p className="text-xs text-[#7C2D12] leading-relaxed">{conflictError}</p>
              <p className="text-[11px] text-[#9A3412] mt-2 italic">
                To preserve accurate telemetry, please pause or complete your ongoing task before starting a new one.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Completion Confirmation Modal */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title="Complete Task Execution?"
        subtitle={`Task: "${task.title}"`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="forest"
              size="sm"
              isLoading={isLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleComplete}
            >
              Confirm Completion
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-[#57534E] leading-relaxed">
            Completing this task will halt the stopwatch, finalize your recorded working duration, and mark the task status as <strong>COMPLETED</strong>.
          </p>

          <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E4DECFA] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#78716C]">Active Focus Duration:</span>
              <span className="font-mono font-bold text-[#1C1917]">{formatDurationHMS(activeSeconds)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#78716C]">Paused Rest Duration:</span>
              <span className="font-mono text-[#78716C]">{formatDurationHMS(pausedSeconds)}</span>
            </div>
            <div className="border-t border-[#DDD5C5] pt-2 flex justify-between text-xs font-bold">
              <span className="text-[#2D4A36]">Total Session Time:</span>
              <span className="font-mono text-[#2D4A36]">{formatDurationHMS(totalSessionSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
            <ShieldCheck className="w-4 h-4 text-[#588157]" />
            <span>Session record will be permanently saved to SQLite task_sessions.</span>
          </div>
        </div>
      </Modal>

      {/* Post-Completion Task Analysis Report Modal (Phase 5) */}
      <TaskAnalysisReportModal
        task={task}
        report={analysisReport}
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />
    </div>
  );
};
