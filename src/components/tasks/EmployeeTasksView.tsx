import React, { useState, useEffect } from 'react';
import { User, TaskItem, TaskStatus, Priority } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PriorityBadge, Badge } from '../ui/Badge';
import { TaskStopwatchWidget } from './TaskStopwatchWidget';
import { TaskDetailsModal } from './TaskDetailsModal';
import { WorkSubmissionModal } from './WorkSubmissionModal';
import { LoadingState, EmptyState } from '../ui/LoadingState';
import { formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  CheckSquare,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Sparkles,
  Timer,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Upload,
  FileArchive,
  Download,
} from 'lucide-react';

interface EmployeeTasksViewProps {
  currentUser: User;
}

export const EmployeeTasksView: React.FC<EmployeeTasksViewProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'ASSIGNED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskItem | null>(null);
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<TaskItem | null>(null);

  const employeeId = currentUser.employee_id || currentUser.id;

  const fetchEmployeeTasks = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tasks?employee_id=${encodeURIComponent(employeeId)}`, { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Failed to synchronize tasks.`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Failed to retrieve tasks from shared database.');
      }
    } catch (err: any) {
      console.error('Failed to fetch employee tasks:', err);
      setErrorMessage(err.message || 'Network error synchronizing tasks from database.');
    } finally {
      setIsRefreshing(false);
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeTasks(true);

    // Listen to real-time events across laptops
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('task_created', () => fetchEmployeeTasks(false));
      eventSource.addEventListener('task_updated', () => fetchEmployeeTasks(false));
      eventSource.addEventListener('notification_created', () => fetchEmployeeTasks(false));
    } catch {}

    const interval = setInterval(() => fetchEmployeeTasks(false), 4000);
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

  // Filter tasks based on tabs and search query
  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'ASSIGNED') {
      if (task.status !== 'ASSIGNED' && task.status !== 'PENDING') return false;
    } else if (activeFilter !== 'ALL' && task.status !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.priority.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const submittedCount = tasks.filter((t) => t.status === 'SUBMITTED').length;
  const changesCount = tasks.filter((t) => t.status === 'CHANGES_REQUESTED').length;
  const pendingCount = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Network Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchEmployeeTasks(true)}
            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-[#2D4A36]" />
            My Assigned Tasks & Stopwatch Execution
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            {currentUser.name} ({currentUser.department}) • Track active working duration authoritatively via the Task Stopwatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className={`w-3.5 h-3.5 text-[#2D4A36] ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchEmployeeTasks(true)}
            title="Refresh deliverables from shared database"
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <div className="flex items-center gap-2 text-xs text-[#57534E] bg-[#EBF1ED] px-3.5 py-1.5 rounded-xl border border-[#D1E0D5]">
            <Timer className="w-4 h-4 text-[#2D4A36]" />
            <span>
              Active: <strong className="text-[#2D4A36]">{inProgressCount}</strong> | In Review:{' '}
              <strong className="text-[#D97706]">{submittedCount}</strong> | Completed:{' '}
              <strong className="text-[#2D4A36]">{completedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Pinned Active Stopwatch Hero Widget (if a task is currently in progress) */}
      {activeTask && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
              </span>
              Current Active Execution Session
            </span>
            <span className="text-xs text-[#78716C]">Synced to SQLite task_sessions</span>
          </div>
          <TaskStopwatchWidget
            task={activeTask}
            currentUserId={currentUser.id}
            onSessionUpdated={fetchEmployeeTasks}
          />
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F5EE] p-3 rounded-2xl border border-[#E4DECFA]">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[#2D4A36] text-[#FAF7F0] shadow-xs'
                : 'text-[#57534E] hover:bg-[#EDE8DC]'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setActiveFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'IN_PROGRESS'
                ? 'bg-[#2D4A36] text-[#FAF7F0] shadow-xs'
                : 'text-[#57534E] hover:bg-[#EDE8DC]'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setActiveFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'SUBMITTED'
                ? 'bg-[#2D4A36] text-[#FAF7F0] shadow-xs'
                : 'text-[#57534E] hover:bg-[#EDE8DC]'
            }`}
          >
            In Review ({submittedCount})
          </button>
          {changesCount > 0 && (
            <button
              onClick={() => setActiveFilter('CHANGES_REQUESTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'CHANGES_REQUESTED'
                  ? 'bg-[#DC2626] text-white shadow-xs'
                  : 'text-[#DC2626] hover:bg-[#FEE2E2]'
              }`}
            >
              Needs Fixes ({changesCount})
            </button>
          )}
          <button
            onClick={() => setActiveFilter('ASSIGNED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'ASSIGNED'
                ? 'bg-[#2D4A36] text-[#FAF7F0] shadow-xs'
                : 'text-[#57534E] hover:bg-[#EDE8DC]'
            }`}
          >
            Assigned ({pendingCount})
          </button>
          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'COMPLETED'
                ? 'bg-[#2D4A36] text-[#FAF7F0] shadow-xs'
                : 'text-[#57534E] hover:bg-[#EDE8DC]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#DDD5C5] text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-hidden focus:border-[#588157]"
          />
        </div>
      </div>

      {/* Task List / Grid */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Loading your assigned tasks & timing telemetry..." />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No Tasks Found"
          description={
            searchQuery
              ? `No tasks matched your search query "${searchQuery}".`
              : activeFilter === 'ASSIGNED'
              ? 'You have no pending tasks waiting to be started.'
              : activeFilter === 'IN_PROGRESS'
              ? 'No tasks are currently running or paused.'
              : 'No tasks currently assigned.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isTaskActive = task.status === 'IN_PROGRESS';
            const isTaskCompleted = task.status === 'COMPLETED';

            return (
              <Card
                key={task.id}
                padding="md"
                className={`relative flex flex-col justify-between transition-all ${
                  isTaskActive
                    ? 'border-[#588157] ring-1 ring-[#588157]/40 shadow-sm'
                    : isTaskCompleted
                    ? 'border-[#D1E0D5] bg-[#FCFDFB]'
                    : task.status === 'CHANGES_REQUESTED'
                    ? 'border-[#FCA5A5] bg-[#FEF2F2]/40'
                    : 'hover:border-[#588157]'
                }`}
              >
                <div>
                  {/* Card Header Row */}
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
                        <Badge variant="peach" size="sm" dot>
                          In Review
                        </Badge>
                      )}
                      {task.status === 'CHANGES_REQUESTED' && (
                        <Badge variant="coral" size="sm" dot>
                          Needs Fixes
                        </Badge>
                      )}
                      {task.status === 'COMPLETED' && (
                        <Badge variant="sage" size="sm">
                          Completed
                        </Badge>
                      )}
                      {task.is_demo_seed === 1 && (
                        <Badge variant="neutral" size="sm">
                          Historical
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-[#78716C] font-mono flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-[#588157]" />
                      <span>Due {task.deadline.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Task Title */}
                  <h3
                    className="font-bold text-base text-[#1C1917] hover:text-[#2D4A36] cursor-pointer transition-colors leading-snug line-clamp-1"
                    onClick={() => setSelectedTaskDetails(task)}
                  >
                    {task.title}
                  </h3>

                  {/* Description Snippet */}
                  <p
                    className="text-xs text-[#57534E] mt-1.5 mb-2 leading-relaxed line-clamp-2 cursor-pointer"
                    onClick={() => setSelectedTaskDetails(task)}
                  >
                    {task.description}
                  </p>

                  {/* Corrections feedback alert if changes requested */}
                  {task.status === 'CHANGES_REQUESTED' && task.manager_feedback && (
                    <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] mb-2.5">
                      <span className="font-bold flex items-center gap-1.5 mb-0.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#DC2626]" />
                        Requested Corrections:
                      </span>
                      <p className="pl-5 leading-relaxed">{task.manager_feedback}</p>
                    </div>
                  )}
                </div>

                {/* Stopwatch Widget Section */}
                <div className="space-y-2">
                  <TaskStopwatchWidget
                    task={task}
                    compact={true}
                    currentUserId={currentUser.id}
                    onSessionUpdated={fetchEmployeeTasks}
                  />

                  {/* Submission & Deliverable Action Bar */}
                  <div className="pt-2 border-t border-[#E8E2D5] flex flex-wrap items-center justify-between gap-2">
                    {task.status === 'SUBMITTED' ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#D97706] font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Review (Submitted {task.submitted_at?.split(' ')[0]})</span>
                      </div>
                    ) : task.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#16A34A] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Work Approved</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#78716C]">
                        Ready to hand over completed work?
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 ml-auto">
                      {(task.submission_file_name || task.submission_file_path) && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Download className="w-3 h-3 text-[#2D4A36]" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/tasks/${task.id}/submission/download`, '_blank');
                          }}
                          title="Download uploaded ZIP deliverable"
                        >
                          ZIP
                        </Button>
                      )}

                      {task.status !== 'COMPLETED' && (
                        <Button
                          variant={task.status === 'CHANGES_REQUESTED' ? 'coral' : 'forest'}
                          size="sm"
                          icon={<Upload className="w-3.5 h-3.5" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskForSubmission(task);
                          }}
                        >
                          {task.status === 'CHANGES_REQUESTED'
                            ? 'Submit Revised Work'
                            : task.status === 'SUBMITTED'
                            ? 'Update Report'
                            : 'Submit Work'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTaskDetails}
        isOpen={Boolean(selectedTaskDetails)}
        onClose={() => setSelectedTaskDetails(null)}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        onStatusUpdated={fetchEmployeeTasks}
      />

      {/* Work Submission & ZIP Upload Modal */}
      <WorkSubmissionModal
        task={selectedTaskForSubmission}
        isOpen={Boolean(selectedTaskForSubmission)}
        onClose={() => setSelectedTaskForSubmission(null)}
        onSubmitted={() => {
          fetchEmployeeTasks(true);
        }}
      />
    </div>
  );
};
