import React from 'react';
import { User } from '../../types';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  BarChart3,
  Cpu,
  Clock,
  Activity,
  HeartPulse,
  Shield,
  ChevronRight,
  LogOut,
  FileCheck2,
} from 'lucide-react';
import { LeafIcon } from '../ui/BotanicalDecor';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  currentUser: User;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentPath,
  onNavigate,
  onLogout,
  isOpen = true,
  onClose,
}) => {
  const isManager = currentUser.role === 'MANAGER';

  const managerNav = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
    { id: 'submitted-work', label: 'Submitted Work', icon: FileCheck2, badge: 'Review' },
    { id: 'activity', label: 'Work Activity', icon: Activity, badge: 'Live' },
    { id: 'tasks', label: 'Task Oversight', icon: CheckSquare },
    { id: 'reports', label: 'Daily EOD Reports', icon: FileText, badge: 'Daily' },
    { id: 'analytics', label: 'Weekly Analytics', icon: BarChart3 },
    { id: 'model', label: 'AI Model Insights', icon: Cpu, badge: 'Verified' },
  ];

  const employeeNav = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'my-tasks', label: 'My Assigned Tasks', icon: CheckSquare, badge: 'Active' },
    { id: 'my-submissions', label: 'My Submissions', icon: FileCheck2 },
    { id: 'activity', label: 'Work Activity', icon: Activity },
    { id: 'burnout', label: 'Burnout Telemetry', icon: HeartPulse },
  ];

  const navItems = isManager ? managerNav : employeeNav;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-[#1C1917]/40 z-30 lg:hidden transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-64 bg-[#FBF9F4] border-r border-[#E8E2D5] flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Banner */}
        <div className="p-5 border-b border-[#E8E2D5] flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-[#2D4A36] text-[#FAF7F0] flex items-center justify-center shadow-md">
              <LeafIcon size={22} className="text-[#A3B18A]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-[#1C1917] tracking-tight">MindWork</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBF1ED] text-[#2D4A36] border border-[#D1E0D5]">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] font-medium leading-none mt-0.5">
                Early Burnout Detection
              </p>
            </div>
          </div>
        </div>

        {/* Current Role Pill */}
        <div className="px-4 py-3 mx-4 my-3 rounded-xl bg-[#F3EFE6] border border-[#E0D9C8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#588157]" />
            <span className="text-xs font-semibold text-[#44403C]">
              {isManager ? 'Manager Workspace' : 'Employee Portal'}
            </span>
          </div>
          <Badge variant={isManager ? 'forest' : 'sage'} size="sm">
            {currentUser.role}
          </Badge>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A8A29E]">
            {isManager ? 'Management & Oversight' : 'Personal Workspace'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id || (item.id === 'employees' && currentPath === 'employee-report');
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#2D4A36] text-[#FAF7F0] font-semibold shadow-sm'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFE9DC]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#A3B18A]' : 'text-[#78716C] group-hover:text-[#2D4A36]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isActive
                          ? 'bg-[#1E3525] text-[#A3B18A]'
                          : 'bg-[#E7DFCE] text-[#57534E]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#A3B18A]" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Academic / Non-Clinical Notice Badge */}
        <div className="p-3 mx-3 mb-2 rounded-xl bg-[#FAF7F0] border border-[#E5DFD1] text-[11px] text-[#78716C] leading-tight">
          <span className="font-semibold text-[#2D4A36] block mb-0.5">Academic Project Viva</span>
          Objective telemetry early-detection. Non-clinical decision support.
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-[#E8E2D5] bg-[#F7F3EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-sm"
              style={{ backgroundColor: currentUser.avatar_color || '#2D4A36' }}
            >
              {currentUser.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1C1917] truncate">{currentUser.name}</p>
              <p className="text-[11px] text-[#78716C] truncate">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
