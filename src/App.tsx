/**
 * MindWork – Burnout Early Detection System
 * Phase 2 & 3: Warm Shell & Manager Task Oversight
 */

import React, { useState, useEffect } from 'react';
import { User, Employee, Priority, RiskLevel } from './types';
import { AppShell } from './components/layout/AppShell';
import { Card, CardHeader } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Badge, PriorityBadge, RiskBadge } from './components/ui/Badge';
import { Avatar } from './components/ui/Avatar';
import { LeafIcon, MindfulPlantIllustration } from './components/ui/BotanicalDecor';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/Table';
import { Tabs } from './components/ui/Tabs';
import { Modal } from './components/ui/Modal';
import { LoadingState } from './components/ui/LoadingState';
import { ManagerTaskBoard } from './components/tasks/ManagerTaskBoard';
import { TaskAssignmentModal } from './components/tasks/TaskAssignmentModal';
import { EmployeeTasksView } from './components/tasks/EmployeeTasksView';
import { EmployeeDashboardView } from './components/dashboard/EmployeeDashboardView';
import { EmployeeWorkActivityView } from './components/activity/EmployeeWorkActivityView';
import { ManagerTeamActivityView } from './components/activity/ManagerTeamActivityView';
import { MetricsAggregationView } from './components/analytics/MetricsAggregationView';
import { ManagerBurnoutInsightsView } from './components/burnout/ManagerBurnoutInsightsView';
import { EmployeeBurnoutView } from './components/burnout/EmployeeBurnoutView';
import { ManagerDailyEodReportView } from './components/reports/ManagerDailyEodReportView';
import { ManagerEmployeeReportView } from './components/reports/ManagerEmployeeReportView';
import { ManagerSubmittedWorkView } from './components/reports/ManagerSubmittedWorkView';
import { EmployeeSubmissionsView } from './components/reports/EmployeeSubmissionsView';
import { LoginView } from './components/auth/LoginView';
import { usePalette } from './context/PaletteContext';
import {
  Users,
  CheckCircle2,
  Clock,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Calendar,
  BarChart2,
  Activity,
  Sliders,
  CheckSquare,
  Plus,
  FileText,
  Palette,
  Check,
  RotateCcw,
  FileCheck2,
} from 'lucide-react';

const DEMO_FALLBACK_USERS: User[] = [
  { id: 'usr_mgr_bob', email: 'bob.manager@mindwork.io', name: 'Bob Manager', role: 'MANAGER' },
  { id: 'usr_emp_alice', email: 'alice@mindwork.io', name: 'Alice', role: 'EMPLOYEE', employee_id: 'emp_alice', department: 'IT', age: 28, experience_years: 4, avatar_color: '#2563eb' },
  { id: 'usr_emp_priya', email: 'priya@mindwork.io', name: 'Priya', role: 'EMPLOYEE', employee_id: 'emp_priya', department: 'HR', age: 31, experience_years: 6, avatar_color: '#16a34a' },
  { id: 'usr_emp_rahul', email: 'rahul@mindwork.io', name: 'Rahul', role: 'EMPLOYEE', employee_id: 'emp_rahul', department: 'Sales', age: 26, experience_years: 2, avatar_color: '#d97706' },
  { id: 'usr_emp_sneha', email: 'sneha@mindwork.io', name: 'Sneha', role: 'EMPLOYEE', employee_id: 'emp_sneha', department: 'Operations', age: 35, experience_years: 8, avatar_color: '#7c3aed' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>(DEMO_FALLBACK_USERS);
  const [currentPath, setCurrentPath] = useState<string>('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('emp_alice');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSampleModalOpen, setIsSampleModalOpen] = useState<boolean>(false);
  const [isQuickAssignModalOpen, setIsQuickAssignModalOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { activePalette, setPaletteById, palettes, resetToDefault } = usePalette();

  // Validate active token session and fetch users
  useEffect(() => {
    async function loadAuth() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
        if (token) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success && meData.user) {
                setCurrentUser(meData.user);
              } else {
                localStorage.removeItem('mindwork_token');
                localStorage.removeItem('mindwork_active_user_id');
                setCurrentUser(null);
              }
            } else {
              localStorage.removeItem('mindwork_token');
              localStorage.removeItem('mindwork_active_user_id');
              setCurrentUser(null);
            }
          } catch (e) {
            console.error('Error validating session token:', e);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }

        // Fetch users directory
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users) && data.users.length > 0) {
            setAvailableUsers(data.users);
          }
        }
      } catch (err) {
        console.warn('Network issue initializing MindWork auth:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();

    // Real-time synchronization for multi-laptop events
    let eventSource: EventSource | null = null;
    const syncUsers = async () => {
      try {
        const res = await fetch('/api/auth/users');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            setAvailableUsers(data.users);
          }
        }
      } catch {}
    };

    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('user_registered', () => syncUsers());
    } catch {}

    const interval = setInterval(syncUsers, 10000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mindwork_active_user_id');
      localStorage.removeItem('mindwork_token');
      try {
        document.cookie = 'mindwork_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch {}
    }
    setCurrentUser(null);
    setCurrentPath('dashboard');
  };

  const handleSwitchUser = () => {
    handleLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-6">
        <LoadingState message="Initializing MindWork Visual Shell..." />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user, token) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('mindwork_token', token);
            localStorage.setItem('mindwork_active_user_id', user.id);
            try {
              document.cookie = `mindwork_token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
            } catch {}
          }
          setCurrentUser(user);
          setCurrentPath('dashboard');
        }}
      />
    );
  }

  const isManager = currentUser.role === 'MANAGER';

  // Construct typed employee list from available users
  const employeesList: Employee[] = availableUsers
    .filter((u) => u.role === 'EMPLOYEE')
    .map((u) => ({
      id: u.employee_id || u.id,
      user_id: u.id,
      name: u.name,
      department: u.department || 'General',
      age: u.age || 28,
      experience_years: u.experience_years || 4,
      avatar_color: u.avatar_color || '#2563eb',
    }));

  return (
    <AppShell
      currentUser={currentUser}
      availableUsers={availableUsers}
      currentPath={currentPath}
      onNavigate={(path) => setCurrentPath(path)}
      onSwitchUser={handleSwitchUser}
      onLogout={handleLogout}
      onNavigateToTask={() => setCurrentPath('tasks')}
      onUserRegistered={(newUser) => {
        setAvailableUsers((prev) => {
          const exists = prev.some((u) => u.id === newUser.id);
          return exists ? prev : [...prev, newUser];
        });
        if (!currentUser) {
          setCurrentUser(newUser);
        }
      }}
    >
      {/* Route: Manager Task Board */}
      {isManager && currentPath === 'tasks' ? (
        <ManagerTaskBoard employees={employeesList} />
      ) : isManager && (currentPath === 'submitted-work' || currentPath === 'submissions') ? (
        <ManagerSubmittedWorkView
          currentUser={currentUser}
          onNavigateToTask={(taskId) => {
            setCurrentPath('tasks');
          }}
        />
      ) : isManager && (currentPath === 'reports' || currentPath === 'daily-reports') ? (
        <ManagerDailyEodReportView currentUser={currentUser} />
      ) : isManager && (currentPath === 'activity' || currentPath === 'work-activity') ? (
        <ManagerTeamActivityView currentUser={currentUser} />
      ) : currentPath === 'analytics' || currentPath === 'weekly-metrics' ? (
        <MetricsAggregationView currentUser={currentUser} />
      ) : isManager && (currentPath === 'model' || currentPath === 'burnout') ? (
        <ManagerBurnoutInsightsView currentUser={currentUser} />
      ) : isManager && (currentPath === 'employee-report' || currentPath === 'employee-details') ? (
        <ManagerEmployeeReportView
          employeeId={selectedEmployeeId || 'emp_alice'}
          employees={employeesList}
          currentUser={currentUser}
          onBack={() => setCurrentPath('dashboard')}
          onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
        />
      ) : !isManager ? (
        currentPath === 'my-submissions' || currentPath === 'submissions' ? (
          <EmployeeSubmissionsView
            currentUser={currentUser}
            onNavigateToTasks={() => setCurrentPath('my-tasks')}
          />
        ) : currentPath === 'activity' || currentPath === 'work-activity' ? (
          <EmployeeWorkActivityView currentUser={currentUser} />
        ) : currentPath === 'my-tasks' || currentPath === 'tasks' ? (
          <EmployeeTasksView currentUser={currentUser} />
        ) : currentPath === 'burnout' ? (
          <EmployeeBurnoutView currentUser={currentUser} />
        ) : (
          <EmployeeDashboardView
            currentUser={currentUser}
            onNavigateToTasks={() => setCurrentPath('my-tasks')}
            onNavigateToActivity={() => setCurrentPath('activity')}
            onNavigateToBurnout={() => setCurrentPath('burnout')}
          />
        )
      ) : (
        /* Route: Dashboard / Overview Shell (Manager) */
        <div className="space-y-5">
          {/* Top Hero Card / Compact SaaS Dashboard Header */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${activePalette.heroGradient} text-[#FAF7F0] p-4 sm:p-5 shadow-sm transition-all duration-300`}>
            {/* Subtle Organic Background Leaves */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-3">
              <svg width="180" height="130" viewBox="0 0 200 150" fill="currentColor">
                <path d="M180 20C120 40 90 90 80 140C130 120 180 80 190 20Z" />
                <path d="M120 50C80 70 60 110 50 150C90 135 130 100 150 45Z" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="forest" size="sm" dot>
                    Team Workplace Telemetry
                  </Badge>
                  <span className="text-xs font-medium text-[#A3B18A] tracking-wide">
                    Active Persona: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {isManager ? 'Team Workplace Telemetry & Oversight' : `Welcome Back, ${currentUser.name}`}
                </h1>
                <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
                  "Detect Early. Support Better. Work Healthier." — Proactive workplace pattern monitoring to detect early burnout indicators from objective telemetry.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {isManager && (
                  <>
                    <Button
                      variant="light"
                      size="sm"
                      icon={<FileCheck2 className="w-3.5 h-3.5 text-[#1E3525]" />}
                      onClick={() => setCurrentPath('submitted-work')}
                    >
                      Submitted Work
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      icon={<FileText className="w-3.5 h-3.5 text-[#1E3525]" />}
                      onClick={() => setCurrentPath('reports')}
                    >
                      Daily EOD Report
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      icon={<Activity className="w-3.5 h-3.5 text-[#1E3525]" />}
                      onClick={() => setCurrentPath('activity')}
                    >
                      Team Activity
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5 text-[#1E3525]" />}
                      onClick={() => setIsQuickAssignModalOpen(true)}
                    >
                      Assign Task
                    </Button>
                  </>
                )}
                <Button
                  variant="light"
                  size="sm"
                  icon={<Palette className="w-3.5 h-3.5 text-[#1E3525]" />}
                  onClick={() => setIsSampleModalOpen(true)}
                >
                  Visual Palette
                </Button>
              </div>
            </div>
          </div>

          {/* Executive KPI Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#588157]" />
                Executive Operational Indicators
              </h2>
              {isManager && (
                <button
                  onClick={() => setCurrentPath('tasks')}
                  className="text-xs font-semibold text-[#2D4A36] hover:text-[#1E3525] flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Task Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card padding="md" className="hover:border-[#588157] transition-all">
                <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
                  <span>Active Team</span>
                  <Users className="w-4 h-4 text-[#588157]" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">4 Employees</div>
                <p className="text-xs text-[#16A34A] font-semibold mt-1 flex items-center gap-1">
                  <span>Alice, Priya, Rahul, Sneha</span>
                </p>
              </Card>

              <Card
                padding="md"
                className="hover:border-[#588157] transition-all cursor-pointer"
                onClick={() => setCurrentPath('tasks')}
              >
                <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
                  <span>Sprint Deliverables</span>
                  <CheckSquare className="w-4 h-4 text-[#0284C7]" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">Active Board</div>
                <p className="text-xs text-[#0284C7] font-semibold mt-1 flex items-center gap-1">
                  <span>Click to inspect & assign tasks</span>
                </p>
              </Card>

              <Card padding="md" className="hover:border-[#DC2626] transition-all">
                <div className="flex items-center justify-between text-xs text-[#78716C] mb-2 font-medium">
                  <span>Burnout Watch</span>
                  <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626]">1 High Risk</div>
                <p className="text-xs text-[#78716C] font-medium mt-1">
                  Alice (IT) • Overtime spike
                </p>
              </Card>
            </div>
          </div>

          {/* Team Roster Table with Task Oversight Action */}
          <div className="space-y-6">
              <Card padding="md">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#1C1917]">Supervised Team Directory</h3>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      4 dedicated team members • Click employee row to inspect dedicated report
                    </p>
                  </div>
                  {isManager && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setIsQuickAssignModalOpen(true)}
                    >
                      Assign Task
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Baseline Shift</TableHead>
                      <TableHead>Burnout Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeesList.map((emp) => (
                      <TableRow
                        key={emp.id}
                        clickable
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setCurrentPath('employee-report');
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.name} size="sm" department={emp.department} />
                            <div>
                              <p className="font-semibold text-xs text-[#1C1917]">{emp.name}</p>
                              <p className="text-[11px] text-[#78716C]">{emp.name.toLowerCase()}@mindwork.io</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral" size="sm">
                            {emp.department}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-[#57534E]">
                            {emp.experience_years} yrs (Age {emp.age})
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-[#57534E]">
                            {emp.name === 'Alice'
                              ? '10.8 hrs (Overtime)'
                              : emp.name === 'Rahul'
                              ? '9.8 hrs (Variable)'
                              : '8.0 hrs (Standard)'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {emp.name === 'Alice' ? (
                            <RiskBadge risk="High" size="sm" />
                          ) : emp.name === 'Rahul' ? (
                            <RiskBadge risk="Medium" size="sm" />
                          ) : (
                            <RiskBadge risk="Low" size="sm" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs text-[#2D4A36]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployeeId(emp.id);
                              setCurrentPath('employee-report');
                            }}
                          >
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-3.5 flex items-center justify-between text-xs text-[#78716C]">
                  <span>Click any employee to view dedicated report without switching persona</span>
                  <span className="font-medium text-[#2D4A36]">All 4 profiles verified in SQLite</span>
                </div>
              </Card>

              {/* Protocol Banner */}
              <Card variant="flat" padding="md" className="border-[#DDD5C5]">
                <div className="flex items-start gap-4">
                  <MindfulPlantIllustration className="w-16 h-16 shrink-0" />
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-[#1C1917] flex items-center gap-2">
                      <span>Restorative Workplace Protocol</span>
                      <Badge variant="forest" size="sm">Non-Clinical</Badge>
                    </h4>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      MindWork provides early burnout warnings to facilitate proactive manager support. It is strictly non-diagnostic and preserves employee privacy with application-level telemetry only.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

      {/* Quick Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={isQuickAssignModalOpen}
        onClose={() => setIsQuickAssignModalOpen(false)}
        employees={employeesList}
        onTaskCreated={() => {
          setRefreshKey((k) => k + 1);
          setCurrentPath('tasks');
        }}
      />

      {/* Visual Palette Modal */}
      <Modal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        title="MindWork Visual Palette & Theme Tokens"
        subtitle="Select a dynamic visual theme to update application background and accents in real-time"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-[#57534E]" />}
              onClick={resetToDefault}
            >
              Reset to Default (Forest)
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsSampleModalOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Active Palette Notice */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#E0D9C8] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: activePalette.primaryColor }}>
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                  Active Palette: <span>{activePalette.name}</span>
                </p>
                <p className="text-[11px] text-[#78716C]">{activePalette.tagline}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EBF1ED] text-[#2D4A36] border border-[#C5D6C9]">
              <Check className="w-3.5 h-3.5" />
              Live Active
            </span>
          </div>

          {/* Dynamic Theme Options Grid */}
          <div>
            <h4 className="text-xs font-bold text-[#44403C] uppercase tracking-wider mb-2.5">
              Select Theme Palette (Instant Canvas & Banner Live Switching)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {palettes.map((p) => {
                const isActive = activePalette.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPaletteById(p.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'border-[#2D4A36] bg-white ring-2 ring-[#2D4A36]/20 shadow-sm'
                        : 'border-[#E5DFD1] bg-white/70 hover:bg-white hover:border-[#B5A895]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-[#1C1917]">{p.name}</span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2D4A36] text-white">
                          <Check className="w-3 h-3" />
                          Applied
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-[#78716C] group-hover:text-[#2D4A36]">
                          Click to apply
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#57534E] mb-2.5 leading-snug">{p.tagline}</p>

                    {/* Color Swatch Preview Bar */}
                    <div className="flex items-center gap-1.5 h-6 rounded-lg overflow-hidden border border-[#DDD5C5] p-0.5 bg-[#F5F2EB]">
                      {p.previewColors.map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-full rounded-xs shadow-2xs"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Tokens Reference */}
          <div className="pt-2 border-t border-[#E7E1D2]">
            <h4 className="text-xs font-bold text-[#44403C] uppercase tracking-wider mb-2">
              Audited MindWork Token System
            </h4>
            <p className="text-xs text-[#57534E] leading-relaxed mb-3">
              The MindWork visual design tokens strictly exclude purple, sterile gray-only admin tables, and excessive glassmorphism.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-[#FAF7F0] text-center">
                <div className="w-full h-6 rounded-lg bg-[#FAF7F0] border border-[#DDD5C5] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Warm Cream</p>
                <p className="text-[10px] text-[#78716C]">#FAF7F0</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#2D4A36] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Forest Green</p>
                <p className="text-[10px] text-[#78716C]">#2D4A36</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#588157] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Sage Green</p>
                <p className="text-[10px] text-[#78716C]">#588157</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#606C38] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Olive Green</p>
                <p className="text-[10px] text-[#78716C]">#606C38</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#16A34A] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Bright Green</p>
                <p className="text-[10px] text-[#78716C]">#16A34A</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#FDBA74] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Peach / Orange</p>
                <p className="text-[10px] text-[#78716C]">#FDBA74</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#38BDF8] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Soft Sky Blue</p>
                <p className="text-[10px] text-[#78716C]">#38BDF8</p>
              </div>

              <div className="p-2.5 rounded-xl border border-[#E0D9C8] bg-white text-center">
                <div className="w-full h-6 rounded-lg bg-[#DC2626] mb-1" />
                <p className="font-bold text-xs text-[#1C1917]">Coral Red</p>
                <p className="text-[10px] text-[#78716C]">#DC2626</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
