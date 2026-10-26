import React, { useState, useEffect } from 'react';
import { TaskItem, TaskSession, TaskStatus, Role, TaskAnalysisReport } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge, Badge } from '../ui/Badge';
import { TaskAnalysisReportModal } from './TaskAnalysisReportModal';
import { WorkSubmissionModal } from './WorkSubmissionModal';
import { formatDurationHMS, formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
  FileText,
  Tag,
  Timer,
  Play,
  Pause,
  ShieldCheck,
  History,
  Layers,
  FileCheck2,
  Scale,
  TrendingDown,
  TrendingUp,
  Activity,
  Download,
  FileArchive,
  RefreshCw,
} from 'lucide-react';

interface TaskDetailsModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserRole?: Role;
  onStatusUpdated?: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUserId,
  currentUserRole = 'MANAGER',
  onStatusUpdated,
}) => {
  const [sessions, setSessions] = useState<TaskSession[]>([]);
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null);
  const [analysisReport, setAnalysisReport] = useState<TaskAnalysisReport | null>(task?.analysis_report || null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submissionNotes, setSubmissionNotes] = useState<string>('');
  const [deliverableUrl, setDeliverableUrl] = useState<string>('');
  const [managerFeedback, setManagerFeedback] = useState<string>('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (task && isOpen) {
      loadTaskDetails();
      setSubmissionNotes(task.submission_notes || '');
      setDeliverableUrl(task.deliverable_url || '');
      setManagerFeedback(task.manager_feedback || '');
    }
  }, [task?.id, isOpen]);

  const loadTaskDetails = async () => {
    if (!task) return;
    setIsLoadingSession(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();
      if (data.success && data.task) {
        setSessions(data.task.sessions || []);
        setActiveSession(data.task.sessions?.[0] || null);
        if (data.task.submission_notes) setSubmissionNotes(data.task.submission_notes);
        if (data.task.deliverable_url) setDeliverableUrl(data.task.deliverable_url);
        if (data.task.manager_feedback) setManagerFeedback(data.task.manager_feedback);
        if (data.task.analysis_report) {
          setAnalysisReport(data.task.analysis_report);
        } else if (data.task.status === 'COMPLETED') {
          fetch(`/api/tasks/${data.task.id}/analysis`)
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.report) setAnalysisReport(d.report);
            })
            .catch(() => {});
        } else {
          setAnalysisReport(null);
        }
      }
    } catch (err) {
      console.error('Error loading task details:', err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  if (!task) return null;

  const isAssignedEmployee =
    currentUserRole === 'EMPLOYEE' &&
    (currentUserId === task.employee_id || (task as any).employee_user_id === currentUserId);

  const statusVariantMap: Record<TaskStatus, 'yellow' | 'blue' | 'sage' | 'peach' | 'coral'> = {
    ASSIGNED: 'blue',
    PENDING: 'yellow',
    IN_PROGRESS: 'blue',
    SUBMITTED: 'peach',
    CHANGES_REQUESTED: 'coral',
    COMPLETED: 'sage',
  };

  const latestSession = activeSession || sessions[0] || null;
  const isRunning =
    task.status === 'IN_PROGRESS' &&
    latestSession &&
    !latestSession.end_time &&
    (!latestSession.pause_time ||
      (latestSession.resume_time &&
        new Date(latestSession.resume_time) >= new Date(latestSession.pause_time)));
  const isPaused =
    task.status === 'IN_PROGRESS' &&
    latestSession &&
    !latestSession.end_time &&
    latestSession.pause_time &&
    (!latestSession.resume_time ||
      new Date(latestSession.pause_time) > new Date(latestSession.resume_time));

  // Quick stopwatch actions from modal (if assigned employee)
  const handleStartTask = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to start task.');
        return;
      }
      await loadTaskDetails();
      onStatusUpdated?.();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseTask = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to pause task.');
        return;
      }
      await loadTaskDetails();
      onStatusUpdated?.();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeTask = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: task.employee_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to resume task.');
        return;
      }
      await loadTaskDetails();
      onStatusUpdated?.();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: task.employee_id,
          submission_notes: submissionNotes.trim(),
          deliverable_url: deliverableUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }
      setIsSubmitModalOpen(false);
      await loadTaskDetails();
      onStatusUpdated?.();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReviewTask = async (action: 'APPROVE' | 'REQUEST_CHANGES') => {
    if (action === 'REQUEST_CHANGES' && !managerFeedback.trim()) {
      setActionError('Feedback is required when requesting revisions so the employee knows what to update.');
      return;
    }
    setIsReviewSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          manager_feedback: managerFeedback.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to review task');
      }
      if (data.analysis_report) {
        setAnalysisReport(data.analysis_report);
      }
      await loadTaskDetails();
      onStatusUpdated?.();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`Task ID: ${task.id} • ${task.is_demo_seed ? 'Historical Demonstration Seed' : 'Live Multi-Laptop Task'}`}
      maxWidth="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* If assigned employee and task not started */}
            {isAssignedEmployee && (task.status === 'ASSIGNED' || task.status === 'PENDING') && (
              <Button
                variant="forest"
                size="sm"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
                isLoading={isActionLoading}
                onClick={handleStartTask}
              >
                Start Working
              </Button>
            )}

            {isAssignedEmployee && isRunning && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Pause className="w-3.5 h-3.5" />}
                  isLoading={isActionLoading}
                  onClick={handlePauseTask}
                  className="text-[#EA580C] border-[#FDBA74]"
                >
                  Pause
                </Button>
                <Button
                  variant="forest"
                  size="sm"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  isLoading={isActionLoading}
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  Submit Report & Deliverables
                </Button>
              </>
            )}

            {isAssignedEmployee && isPaused && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play className="w-3.5 h-3.5 fill-current" />}
                  isLoading={isActionLoading}
                  onClick={handleResumeTask}
                >
                  Resume
                </Button>
                <Button
                  variant="forest"
                  size="sm"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  isLoading={isActionLoading}
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  Submit Report & Deliverables
                </Button>
              </>
            )}

            {isAssignedEmployee && task.status === 'CHANGES_REQUESTED' && (
              <Button
                variant="forest"
                size="sm"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                isLoading={isActionLoading}
                onClick={() => setIsSubmitModalOpen(true)}
              >
                Re-submit Corrected Report
              </Button>
            )}

            {task.status === 'SUBMITTED' && currentUserRole === 'MANAGER' && (
              <Badge variant="peach" size="sm">
                Awaiting Manager Review
              </Badge>
            )}

            {task.status === 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                icon={<FileCheck2 className="w-3.5 h-3.5 text-[#588157]" />}
                className="border-[#D1E0D5] text-[#2D4A36] hover:bg-[#EBF1ED]"
                onClick={() => setIsAnalysisModalOpen(true)}
              >
                View Full Analysis Report
              </Button>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Error notification */}
        {actionError && (
          <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-start gap-2.5 text-xs text-[#9A3412]">
            <AlertCircle className="w-4 h-4 text-[#EA580C] shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Task Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F8F4EB] border border-[#E4DECFA]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Assigned To
            </span>
            <div className="flex items-center gap-2">
              <Avatar
                name={task.employee_name || 'Employee'}
                size="sm"
                department={task.employee_department}
              />
              <span className="text-xs font-bold text-[#1C1917]">{task.employee_name}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Priority
            </span>
            <PriorityBadge priority={task.priority} size="sm" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Status
            </span>
            <Badge variant={statusVariantMap[task.status]} size="sm" dot>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Deadline
            </span>
            <span className="text-xs font-semibold text-[#1C1917] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#588157]" />
              {task.deadline.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Post-Completion Task Analysis Section (Phase 5) */}
        {task.status === 'COMPLETED' && analysisReport && (
          <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#DDD5C5] shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D5] pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#2D4A36]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A36]">
                  Post-Completion Task Analysis
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#D1E0D5] text-[#44403C]">
                  Rule-Based Task Evaluation Engine v1.0
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] py-1 px-2.5 h-auto border-[#D1E0D5] text-[#2D4A36]"
                  onClick={() => setIsAnalysisModalOpen(true)}
                >
                  Expand Audit
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Evaluated Complexity</span>
                <Badge
                  variant={
                    analysisReport.complexity === 'High'
                      ? 'peach'
                      : analysisReport.complexity === 'Medium'
                      ? 'yellow'
                      : 'sage'
                  }
                  size="sm"
                >
                  {analysisReport.complexity} Complexity
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Benchmark Range</span>
                <span className="font-mono font-bold text-sm text-[#2D4A36] block">
                  {analysisReport.benchmark_min_hours}h – {analysisReport.benchmark_max_hours}h
                </span>
                <span className="text-[10px] text-[#78716C]">
                  Midpoint: {Math.round(((analysisReport.benchmark_min_hours + analysisReport.benchmark_max_hours) / 2.0) * 10) / 10}h
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Actual Hours</span>
                <span className="font-mono font-bold text-sm text-[#1C1917] block">
                  {analysisReport.actual_hours.toFixed(2)}h
                </span>
                <span className="text-[10px] text-[#78716C]">From active stopwatch</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Variance</span>
                <span
                  className={`font-mono font-bold text-sm block ${
                    analysisReport.variance_hours < 0 ? 'text-[#16A34A]' : 'text-[#2D4A36]'
                  }`}
                >
                  {analysisReport.variance_hours >= 0
                    ? `+${analysisReport.variance_hours.toFixed(2)}h`
                    : `${analysisReport.variance_hours.toFixed(2)}h`}
                </span>
                <span className="text-[10px] text-[#57534E]">
                  {analysisReport.actual_hours >= analysisReport.benchmark_min_hours &&
                  analysisReport.actual_hours <= analysisReport.benchmark_max_hours
                    ? 'Within benchmark'
                    : analysisReport.actual_hours < analysisReport.benchmark_min_hours
                    ? 'Ahead of min range'
                    : 'Over max range'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#E8E2D5] text-[11px] text-[#57534E]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#588157]" />
                <span>
                  Deadline Compliance:{' '}
                  <strong className={analysisReport.is_on_time === 1 ? 'text-[#15803D]' : 'text-[#DC2626]'}>
                    {analysisReport.is_on_time === 1 ? 'On-Time Delivery ✓' : 'Past Deadline ⚠️'}
                  </strong>
                </span>
              </div>
              <span className="text-[#78716C] italic truncate max-w-sm">
                {analysisReport.evaluation_note || 'Rule-based historical velocity policy'}
              </span>
            </div>
          </div>
        )}

        {/* Stopwatch Execution Telemetry Box */}
        <div className="p-4 rounded-2xl bg-white border border-[#DDD5C5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-[#588157]" />
              Task Stopwatch Telemetry (task_sessions)
            </h4>
            {task.status === 'COMPLETED' ? (
              <Badge variant="sage" size="sm">
                Finalized Session
              </Badge>
            ) : isRunning ? (
              <Badge variant="forest" size="sm" dot>
                Actively Timing
              </Badge>
            ) : isPaused ? (
              <Badge variant="peach" size="sm">
                Session Paused
              </Badge>
            ) : (
              <Badge variant="yellow" size="sm">
                Not Started
              </Badge>
            )}
          </div>

          {latestSession ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-[#FBF9F4] border border-[#E8E2D5]">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Active Work Duration</span>
                <span className="font-mono font-bold text-sm text-[#2D4A36]">
                  {formatDurationHMS(latestSession.total_active_seconds || task.total_active_seconds || 0)}
                </span>
                <span className="text-[11px] text-[#78716C] block mt-0.5">
                  ({formatDurationHuman(latestSession.total_active_seconds || task.total_active_seconds || 0)})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBF9F4] border border-[#E8E2D5]">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Paused Duration</span>
                <span className="font-mono font-bold text-sm text-[#78716C]">
                  {formatDurationHMS(latestSession.total_paused_seconds || task.total_paused_seconds || 0)}
                </span>
                <span className="text-[11px] text-[#78716C] block mt-0.5">
                  ({formatDurationHuman(latestSession.total_paused_seconds || task.total_paused_seconds || 0)})
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBF9F4] border border-[#E8E2D5]">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Started At</span>
                <span className="text-xs font-semibold text-[#1C1917] block">
                  {formatDateTime(latestSession.start_time)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBF9F4] border border-[#E8E2D5]">
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Completed At</span>
                <span className="text-xs font-semibold text-[#1C1917] block">
                  {formatDateTime(latestSession.end_time)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-[#78716C]">
              No stopwatch session has been recorded yet. The stopwatch initiates automatically when the employee starts the task.
            </div>
          )}
        </div>

        {/* Acceptance Criteria Box */}
        {task.acceptance_criteria && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[#588157]" />
              Acceptance Criteria & Required Deliverables
            </h4>
            <div className="p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E0D5] text-xs text-[#1C1917] whitespace-pre-wrap leading-relaxed shadow-xs">
              {task.acceptance_criteria}
            </div>
          </div>
        )}

        {/* Description & Instructions Box */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#588157]" />
            Description & Instructions
          </h4>
          <div className="p-4 rounded-2xl bg-white border border-[#DDD5C5] text-sm text-[#292524] whitespace-pre-wrap leading-relaxed shadow-xs">
            {task.description}
          </div>
        </div>

        {/* Employee Submission Deliverables (if submitted, in review, or completed) */}
        {(task.submitted_at || task.work_summary || task.submission_notes || task.submission_file_name || task.deliverable_url) && (
          <div className="p-4 rounded-2xl bg-[#F4F8F5] border border-[#D1E0D5] space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#D1E0D5] pb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-[#2D4A36]" />
                Employee Submission Report & Deliverables
              </h4>
              <div className="flex items-center gap-2">
                {task.completion_status && (
                  <Badge variant="sage" size="sm">
                    {task.completion_status}
                  </Badge>
                )}
                {task.submitted_at && (
                  <span className="text-[11px] text-[#588157] font-mono">
                    Submitted: {formatDateTime(task.submitted_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Work Summary */}
            <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#292524] whitespace-pre-wrap leading-relaxed">
              <span className="font-bold text-[#2D4A36] block mb-1">Work Summary & Implemented Changes:</span>
              {task.work_summary || task.submission_notes || 'No written summary provided.'}
            </div>

            {/* Challenges Faced */}
            {task.challenges_faced && (
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#292524] whitespace-pre-wrap leading-relaxed">
                <span className="font-bold text-[#854D0E] block mb-1">Challenges Faced & Resolutions:</span>
                {task.challenges_faced}
              </div>
            )}

            {/* Optional Remarks */}
            {task.optional_remarks && (
              <div className="p-3 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#44403C] whitespace-pre-wrap leading-relaxed">
                <span className="font-bold text-[#44403C] block mb-1">Additional Remarks:</span>
                {task.optional_remarks}
              </div>
            )}

            {/* ZIP File Deliverable Download */}
            {(task.submission_file_name || task.submission_original_file_name) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-[#2D4A36]/30 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#EBF1ED] flex items-center justify-center shrink-0">
                    <FileArchive className="w-5 h-5 text-[#2D4A36]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#1C1917] block truncate">
                      {task.submission_original_file_name || task.submission_file_name}
                    </span>
                    <span className="text-[10px] text-[#78716C]">
                      {task.submission_file_size
                        ? `${(task.submission_file_size / (1024 * 1024)).toFixed(2)} MB • Verified ZIP Archive`
                        : 'Verified ZIP Archive Deliverable'}
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/tasks/${task.id}/submission/download`}
                  download
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2D4A36] hover:bg-[#223829] transition-all shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download ZIP
                </a>
              </div>
            )}

            {task.deliverable_url && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E8E2D5] text-xs">
                <span className="text-[#78716C] font-semibold">Deliverable URL / Resource:</span>
                <a
                  href={task.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2D4A36] font-bold underline hover:text-[#16A34A] truncate max-w-md"
                >
                  {task.deliverable_url}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Manager Review & Feedback Section */}
        {(task.manager_feedback || (currentUserRole === 'MANAGER' && task.status === 'SUBMITTED')) && (
          <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#92400E] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#D97706]" />
              Manager Review & Supervision Feedback
            </h4>

            {task.manager_feedback && (
              <div className="p-3 rounded-xl bg-white border border-[#FDE68A] text-xs text-[#92400E]">
                <span className="font-bold block mb-1">Supervisor Notes:</span>
                {task.manager_feedback}
              </div>
            )}

            {currentUserRole === 'MANAGER' && task.status === 'SUBMITTED' && (
              <div className="space-y-2.5 pt-2 border-t border-[#FDE68A]">
                <label className="block text-xs font-bold text-[#92400E]">
                  Supervisor Decision Notes & Instructions:
                </label>
                <textarea
                  rows={2}
                  value={managerFeedback}
                  onChange={(e) => setManagerFeedback(e.target.value)}
                  placeholder="Provide feedback on the deliverable or details of requested changes..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#FDE68A] text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                />
                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isReviewSubmitting}
                    onClick={() => handleReviewTask('REQUEST_CHANGES')}
                    className="border-[#F87171] text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    Request Corrections
                  </Button>
                  <Button
                    variant="forest"
                    size="sm"
                    isLoading={isReviewSubmitting}
                    onClick={() => handleReviewTask('APPROVE')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve Deliverable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informational Protocol Note */}
        <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E0D9C8] text-xs text-[#78716C] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Authoritative Timing Rule:</strong> Working duration is measured live from start to completion. Telemetry is objectively captured to avoid subjective estimation bias.
          </p>
        </div>
      </div>

      {/* Employee Submit Work Modal */}
      <WorkSubmissionModal
        task={task}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={() => {
          setIsSubmitModalOpen(false);
          loadTaskDetails();
          onStatusUpdated?.();
        }}
      />
    </Modal>
  );
};
