import React, { useState, useEffect } from 'react';
import { User, TaskItem, Employee } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge, RiskBadge } from '../ui/Badge';
import { TaskStopwatchWidget } from '../tasks/TaskStopwatchWidget';
import { TaskDetailsModal } from '../tasks/TaskDetailsModal';
import { LoadingState } from '../ui/LoadingState';
import { MindfulPlantIllustration } from '../ui/BotanicalDecor';
import { formatDurationHuman, formatDurationHoursDecimal } from '../../utils/formatTime';
import {
  CheckSquare,
  Clock,
  Timer,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  Sparkles,
  HeartPulse,
  Activity,
  Layers,
  Database,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface EmployeeDashboardViewProps {
  currentUser: User;
  onNavigateToTasks: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToBurnout?: () => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  currentUser,
  onNavigateToTasks,
  onNavigateToActivity,
  onNavigateToBurnout,
}) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskItem | null>(null);

  const employeeId = currentUser.employee_id || currentUser.id;

  const fetchTasks = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tasks?employee_id=${encodeURIComponent(employeeId)}`, { headers });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: Failed to synchronize tasks.`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Failed to retrieve tasks from shared database.');
      }
    } catch (err: any) {
      console.error('Failed to fetch tasks for dashboard:', err);
      setErrorMessage(err.message || 'Network error synchronizing tasks from database.');
    } finally {
      setIsRefreshing(false);
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);

    // Listen to real-time events across laptops
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('task_created', () => fetchTasks(false));
      eventSource.addEventListener('task_updated', () => fetchTasks(false));
      eventSource.addEventListener('notification_created', () => fetchTasks(false));
    } catch {}

    const interval = setInterval(() => fetchTasks(false), 4000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [employeeId]);

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

  const runningTask = tasks.find((t) => {
    if (t.status !== 'IN_PROGRESS') return false;
    const pTime = t.session_pause_time;
    const rTime = t.session_resume_time;
    const sTime = t.session_start_time;
    if (!pTime) return !!(sTime || rTime);
    if (rTime && parseTimestamp(rTime) > parseTimestamp(pTime)) return true;
    return false;
  });

  const activeTask = runningTask || tasks.find((t) => t.status === 'IN_PROGRESS') || null;
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  // Calculate total focus time logged in completed tasks
  const totalCompletedActiveSeconds = completedTasks.reduce(
    (acc, t) => acc + (t.total_active_seconds || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Network Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-4 sm:p-5 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="forest" size="sm" dot>
                Employee Work Portal
              </Badge>
              <span className="text-xs font-medium text-[#A3B18A] tracking-wide">
                Persona: <strong className="text-white">{currentUser.name}</strong> • {currentUser.department} Department
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
              "Detect Early. Support Better. Work Healthier." — Execute sprint deliverables with precision timekeeping. Focus time is recorded via the task stopwatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="light"
              size="sm"
              icon={<RotateCcw className={`w-3.5 h-3.5 text-[#1E3525] ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={() => fetchTasks(true)}
              title="Refresh deliverables from shared database"
            >
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </Button>
            <Button
              variant="light"
              size="sm"
              icon={<CheckSquare className="w-3.5 h-3.5 text-[#1E3525]" />}
              onClick={onNavigateToTasks}
            >
              View All Tasks ({tasks.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Pinned Active Stopwatch Widget (if a task is currently in progress) */}
      {activeTask && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
              </span>
              Active Task Stopwatch Execution
            </span>
            <span className="text-xs text-[#78716C]">Authoritative Session Running</span>
          </div>
          <TaskStopwatchWidget
            task={activeTask}
            currentUserId={currentUser.id}
            onSessionUpdated={fetchTasks}
          />
        </div>
      )}

      {/* Employee KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
            <span>Assigned Tasks</span>
            <Layers className="w-4 h-4 text-[#588157]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            {tasks.length}
          </div>
          <p className="text-xs text-[#57534E] mt-1">Across current sprint</p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
            <span>In Progress</span>
            <Timer className="w-4 h-4 text-[#EA580C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#EA580C]">
            {activeTask ? '1 Active' : '0 Active'}
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            {activeTask ? 'Stopwatch currently timing' : 'No active session'}
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
            <span>Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#16A34A]">
            {completedTasks.length}
          </div>
          <p className="text-xs text-[#57534E] mt-1">
            {completedTasks.length} / {tasks.length} deliverables
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
            <span>Recorded Focus Time</span>
            <Clock className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0284C7]">
            {formatDurationHoursDecimal(totalCompletedActiveSeconds)}
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            {formatDurationHuman(totalCompletedActiveSeconds)} total logged
          </p>
        </Card>
      </div>

      {/* Main Grid: Pending Tasks & Recent Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#588157]" />
              Sprint Deliverables & Stopwatch Controls
            </h2>
            <button
              onClick={onNavigateToTasks}
              className="text-xs font-semibold text-[#2D4A36] hover:text-[#1E3525] flex items-center gap-1 cursor-pointer"
            >
              <span>View All Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8">
              <LoadingState message="Fetching assigned deliverables..." />
            </div>
          ) : tasks.length === 0 ? (
            <Card padding="lg" className="text-center py-10">
              <p className="text-sm text-[#78716C]">No tasks currently assigned to you.</p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {tasks.slice(0, 10).map((task) => (
                <Card
                  key={task.id}
                  padding="md"
                  className={`hover:border-[#588157] transition-all ${
                    task.status === 'IN_PROGRESS'
                      ? 'border-[#588157] ring-1 ring-[#588157]/40 shadow-xs'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={task.priority} size="sm" />
                      {task.status === 'ASSIGNED' && (
                        <Badge variant="blue" size="sm" dot>
                          Assigned
                        </Badge>
                      )}
                      {task.status === 'PENDING' && (
                        <Badge variant="yellow" size="sm" dot>
                          Pending
                        </Badge>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Badge variant="forest" size="sm" dot>
                          In Progress
                        </Badge>
                      )}
                      {task.status === 'SUBMITTED' && (
                        <Badge variant="yellow" size="sm" dot>
                          Submitted for Review
                        </Badge>
                      )}
                      {task.status === 'CHANGES_REQUESTED' && (
                        <Badge variant="coral" size="sm" dot>
                          Changes Requested
                        </Badge>
                      )}
                      {task.status === 'COMPLETED' && (
                        <Badge variant="sage" size="sm">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-[#78716C] font-mono">
                      Due: {task.deadline.split(' ')[0]}
                    </span>
                  </div>

                  <h3
                    className="font-bold text-sm sm:text-base text-[#1C1917] hover:text-[#2D4A36] cursor-pointer transition-colors"
                    onClick={() => setSelectedTaskDetails(task)}
                  >
                    {task.title}
                  </h3>

                  <p
                    className="text-xs text-[#57534E] mt-1 mb-2 line-clamp-2 cursor-pointer"
                    onClick={() => setSelectedTaskDetails(task)}
                  >
                    {task.description}
                  </p>

                  {/* Compact stopwatch controls directly on the dashboard card */}
                  <TaskStopwatchWidget
                    task={task}
                    compact={true}
                    currentUserId={currentUser.id}
                    onSessionUpdated={fetchTasks}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Restorative Protocol & Telemetry Context */}
        <div className="space-y-6">
          <Card padding="md">
            <CardHeader
              title="Execution Protocol"
              subtitle="Stopwatch-governed workload"
              icon={<ShieldCheck className="w-4 h-4 text-[#588157]" />}
            />
            <div className="space-y-3 text-xs text-[#57534E] leading-relaxed">
              <div className="p-3 rounded-xl bg-[#F8F5EE] border border-[#E4DECFA]">
                <strong className="text-[#1C1917] block mb-1">1. Authoritative Timing:</strong>
                Tasks must be started and completed using the live stopwatch to calculate true active and paused durations.
              </div>
              <div className="p-3 rounded-xl bg-[#F8F5EE] border border-[#E4DECFA]">
                <strong className="text-[#1C1917] block mb-1">2. Single Active Task:</strong>
                Only one task can be in progress at a time to reflect authentic human cognitive focus.
              </div>
              <div className="p-3 rounded-xl bg-[#F8F5EE] border border-[#E4DECFA]">
                <strong className="text-[#1C1917] block mb-1">3. Non-Diagnostic Privacy:</strong>
                MindWork measures work pattern telemetry to support well-being, never biometric clinical evaluation.
              </div>
            </div>
          </Card>

          {/* Desktop Work Activity Telemetry (Phase 6) */}
          <Card padding="md" className="border-[#DDD5C5] bg-[#FAF9F5]">
            <CardHeader
              title="Desktop Work Activity"
              subtitle="Application-level focus metadata"
              icon={<Activity className="w-4 h-4 text-[#588157]" />}
            />
            <div className="space-y-3 text-xs text-[#57534E]">
              <p className="leading-relaxed">
                Objective work-session login/logout and permitted application focus tracking (VS Code, Chrome, Terminal, Slack). Keystrokes, URLs, and screenshots are strictly blocked.
              </p>
              {onNavigateToActivity && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={onNavigateToActivity}
                >
                  Open Work Activity Telemetry
                </Button>
              )}
              {onNavigateToBurnout && (
                <Button
                  variant="forest"
                  size="sm"
                  className="w-full justify-center"
                  icon={<HeartPulse className="w-3.5 h-3.5" />}
                  onClick={onNavigateToBurnout}
                >
                  View My Burnout Risk Status
                </Button>
              )}
            </div>
          </Card>

          <Card variant="flat" padding="md" className="border-[#DDD5C5]">
            <div className="flex items-start gap-4">
              <MindfulPlantIllustration className="w-14 h-14 shrink-0" />
              <div className="space-y-1.5">
                <h4 className="font-bold text-xs text-[#1C1917]">
                  Balanced Focus Cadence
                </h4>
                <p className="text-[11px] text-[#57534E] leading-relaxed">
                  Remember to pause your stopwatch when stepping away for rest or breaks. Accurate rest logging helps identify unsustainable work paces early.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTaskDetails}
        isOpen={Boolean(selectedTaskDetails)}
        onClose={() => setSelectedTaskDetails(null)}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        onStatusUpdated={fetchTasks}
      />
    </div>
  );
};
