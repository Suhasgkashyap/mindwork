import React, { useState, useEffect } from 'react';
import { TaskItem, Employee, Priority, TaskStatus } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge, Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { TaskAssignmentModal } from './TaskAssignmentModal';
import { TaskDetailsModal } from './TaskDetailsModal';
import { LoadingState, EmptyState } from '../ui/LoadingState';
import { formatDurationHuman, formatDurationHMS } from '../../utils/formatTime';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Timer,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

interface ManagerTaskBoardProps {
  employees: Employee[];
}

export const ManagerTaskBoard: React.FC<ManagerTaskBoardProps> = ({ employees }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<TaskItem | null>(null);

  const fetchTasks = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (selectedEmployee !== 'ALL') params.append('employee_id', selectedEmployee);
      if (selectedPriority !== 'ALL') params.append('priority', selectedPriority);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/tasks?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Failed to synchronize tasks.`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Failed to retrieve tasks from database.');
      }
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      setErrorMessage(err.message || 'Network error synchronizing tasks from database.');
    } finally {
      setIsRefreshing(false);
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('task_created', () => fetchTasks(false));
      eventSource.addEventListener('task_updated', () => fetchTasks(false));
    } catch {}

    const interval = setInterval(() => fetchTasks(false), 4000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [selectedEmployee, selectedPriority, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Computed summary metrics
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const submittedCount = tasks.filter((t) => t.status === 'SUBMITTED').length;
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
            onClick={() => fetchTasks(true)}
            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Header with Title and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-[#2D4A36]" />
            Sprint Task Oversight & Delegation
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Bob Manager • Assign new tasks and supervise team delivery across Alice, Priya, Rahul, and Sneha
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={<RotateCcw className={`w-4 h-4 text-[#2D4A36] ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchTasks(true)}
            title="Refresh tasks from database"
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            variant="forest"
            size="md"
            icon={<Plus className="w-4 h-4 text-[#A3B18A]" />}
            onClick={() => setIsAssignModalOpen(true)}
          >
            Assign New Task
          </Button>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card padding="sm" className="bg-white border-[#E0D9C8]">
          <span className="text-xs text-[#78716C] font-medium block">Total Tasks</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#1C1917] mt-0.5 block">
            {totalCount}
          </span>
        </Card>

        <Card padding="sm" className={`border ${submittedCount > 0 ? 'bg-[#FFFBEB] border-[#FDE68A] ring-1 ring-[#F59E0B]' : 'bg-white border-[#E0D9C8]'}`}>
          <span className="text-xs text-[#B45309] font-medium block flex items-center justify-between">
            <span>Awaiting Review</span>
            {submittedCount > 0 && <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#B45309] mt-0.5 block">
            {submittedCount}
          </span>
        </Card>

        <Card padding="sm" className="bg-[#F0F9FF] border-[#BAE6FD]">
          <span className="text-xs text-[#0369A1] font-medium block">In Progress</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#0369A1] mt-0.5 block">
            {inProgressCount}
          </span>
        </Card>

        <Card padding="sm" className="bg-[#FEFCE8] border-[#FEF08A]">
          <span className="text-xs text-[#854D0E] font-medium block">Pending / Assigned</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#854D0E] mt-0.5 block">
            {pendingCount}
          </span>
        </Card>

        <Card padding="sm" className="bg-[#F0FDF4] border-[#BBF7D0]">
          <span className="text-xs text-[#166534] font-medium block">Completed</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#166534] mt-0.5 block">
            {completedCount}
          </span>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <Card padding="sm" className="bg-[#F7F3EA] border-[#E2DBD0]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title or instructions..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#D9D0BE] bg-white text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:border-transparent transition-all"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Employee Filter */}
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#D9D0BE] bg-white text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] cursor-pointer"
            >
              <option value="ALL">All Team Members</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.department})
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#D9D0BE] bg-white text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#D9D0BE] bg-white text-[#44403C] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Awaiting Review</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#EBE4D5] border border-[#DDD3C2] gap-1 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-[#2D4A36] shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#2D4A36] shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Task Content Area */}
      {isLoading ? (
        <LoadingState message="Loading sprint task backlog..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No Tasks Found"
          description={
            searchQuery || selectedEmployee !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No tasks match your selected filter criteria. Try clearing search filters.'
              : 'There are currently no tasks in the queue. Click Assign New Task to assign work.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign First Task
            </Button>
          }
        />
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {tasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            const isInProgress = task.status === 'IN_PROGRESS';

            return (
              <Card
                key={task.id}
                padding="md"
                className="hover:border-[#588157] transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedTaskDetails(task)}
              >
                <div>
                  {/* Top Bar: Assignee & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={task.employee_name || 'Emp'}
                        size="sm"
                        department={task.employee_department}
                      />
                      <div>
                        <span className="text-xs font-bold text-[#1C1917] block leading-none">
                          {task.employee_name}
                        </span>
                        <span className="text-[10px] text-[#78716C]">{task.employee_department}</span>
                      </div>
                    </div>
                    <PriorityBadge priority={task.priority} size="sm" />
                  </div>

                  {/* Title & Preview */}
                  <h3 className="font-bold text-sm text-[#1C1917] line-clamp-2 mb-1.5 hover:text-[#2D4A36] transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed mb-4">
                    {task.description}
                  </p>
                </div>

                {/* Bottom Metadata & Status */}
                <div className="pt-3 border-t border-[#EFE9DC] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#78716C]">
                      <Calendar className="w-3.5 h-3.5 text-[#588157]" />
                      <span>Due: {task.deadline.split(' ')[0]}</span>
                    </div>

                    <Badge
                      variant={
                        task.status === 'COMPLETED'
                          ? 'sage'
                          : task.status === 'SUBMITTED'
                          ? 'peach'
                          : task.status === 'CHANGES_REQUESTED'
                          ? 'coral'
                          : task.status === 'IN_PROGRESS'
                          ? 'blue'
                          : task.status === 'ASSIGNED'
                          ? 'blue'
                          : 'yellow'
                      }
                      size="sm"
                      dot
                    >
                      {task.status === 'SUBMITTED'
                        ? 'Awaiting Review'
                        : task.status === 'CHANGES_REQUESTED'
                        ? 'Needs Fixes'
                        : task.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Stopwatch timing indicator */}
                  <div className="flex items-center justify-between text-[11px] bg-[#FAF8F3] px-2.5 py-1 rounded-lg border border-[#E8E2D5]">
                    <span className="text-[#78716C] flex items-center gap-1">
                      <Timer className="w-3 h-3 text-[#588157]" />
                      Stopwatch:
                    </span>
                    {isCompleted ? (
                      <span className="font-mono font-semibold text-[#2D4A36]">
                        {formatDurationHuman(task.total_active_seconds || 0)}
                      </span>
                    ) : isInProgress ? (
                      <span className="font-semibold text-[#0284C7] flex items-center gap-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0284C7]"></span>
                        </span>
                        Active Timing
                      </span>
                    ) : (
                      <span className="text-[#A8A29E]">Not started</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assigned Employee</TableHead>
              <TableHead>Task Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorded Stopwatch Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                clickable
                onClick={() => setSelectedTaskDetails(task)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={task.employee_name || 'Emp'}
                      size="sm"
                      department={task.employee_department}
                    />
                    <div>
                      <p className="font-semibold text-xs text-[#1C1917]">{task.employee_name}</p>
                      <p className="text-[10px] text-[#78716C]">{task.employee_department}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-md">
                    <p className="font-bold text-xs text-[#1C1917] truncate">{task.title}</p>
                    <p className="text-[11px] text-[#78716C] truncate mt-0.5">{task.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} size="sm" />
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-[#57534E] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#588157]" />
                    {task.deadline.split(' ')[0]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      task.status === 'COMPLETED'
                        ? 'sage'
                        : task.status === 'SUBMITTED'
                        ? 'peach'
                        : task.status === 'CHANGES_REQUESTED'
                        ? 'coral'
                        : task.status === 'IN_PROGRESS'
                        ? 'blue'
                        : task.status === 'ASSIGNED'
                        ? 'blue'
                        : 'yellow'
                    }
                    size="sm"
                    dot
                  >
                    {task.status === 'SUBMITTED'
                      ? 'Awaiting Review'
                      : task.status === 'CHANGES_REQUESTED'
                      ? 'Needs Fixes'
                      : task.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.status === 'COMPLETED' ? (
                    <span className="font-mono text-xs font-bold text-[#2D4A36]">
                      {formatDurationHuman(task.total_active_seconds || 0)}
                    </span>
                  ) : task.status === 'IN_PROGRESS' ? (
                    <span className="text-xs text-[#0284C7] font-semibold flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284C7] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284C7]"></span>
                      </span>
                      Live Timing
                    </span>
                  ) : (
                    <span className="text-xs text-[#A8A29E] font-mono">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskDetails(task);
                    }}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        employees={employees}
        onTaskCreated={fetchTasks}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTaskDetails}
        isOpen={!!selectedTaskDetails}
        onClose={() => setSelectedTaskDetails(null)}
        currentUserRole="MANAGER"
        onStatusUpdated={fetchTasks}
      />
    </div>
  );
};
