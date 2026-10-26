import React, { useState } from 'react';
import { User } from '../../types';
import {
  Menu,
  Sparkles,
  UserPlus,
  LogOut,
  Shield,
  Laptop
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { NotificationBell } from './NotificationBell';
import { RegisterModal } from './RegisterModal';

interface HeaderProps {
  currentUser: User;
  availableUsers?: User[];
  onToggleSidebar: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onLogout: () => void;
  onUserRegistered?: (user: User) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onToggleSidebar,
  onNavigateToTask,
  onLogout,
  onUserRegistered,
}) => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const isManager = currentUser.role === 'MANAGER';

  return (
    <header className="sticky top-0 z-20 h-16 bg-[#FBF9F4]/90 backdrop-blur-md border-b border-[#E8E2D5] px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left section: Hamburger & Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFE9DC] lg:hidden cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#78716C]">
          <span className="flex items-center gap-1.5 font-medium text-[#2D4A36]">
            <Sparkles className="w-3.5 h-3.5 text-[#588157]" />
            MindWork
          </span>
          <span>/</span>
          <span className="font-semibold text-[#1C1917] capitalize">
            {isManager ? 'Team Manager Operations' : `${currentUser.name}’s Workspace`}
          </span>
        </div>
      </div>

      {/* Middle: System Banner Tagline & Multi-Laptop Sync Indicator */}
      <div className="hidden xl:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF1ED] border border-[#D1E0D5] text-xs text-[#2D4A36] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
          <span>Multi-Laptop Network Authenticated</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFE6] border border-[#E0D9C8] text-xs text-[#57534E]">
          <span className="italic">"Detect Early. Support Better. Work Healthier."</span>
        </div>
      </div>

      {/* Right Section: Notifications, Manager Provisions, Account Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Notifications Bell */}
        <NotificationBell
          currentUser={currentUser}
          onNavigateToTask={onNavigateToTask}
        />

        {/* Manager-Controlled Employee Account Provisioning */}
        {isManager && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#DDD5C5] hover:border-[#2D4A36] text-xs font-semibold text-[#44403C] hover:text-[#1C1917] transition-all cursor-pointer shadow-xs"
            title="Provision new employee account"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#588157]" />
            <span className="hidden md:inline">Add Employee Account</span>
          </button>
        )}

        {/* Current Authenticated User Details */}
        <div className="hidden sm:flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-[#1C1917]">{currentUser.name}</span>
            <Badge variant={isManager ? 'forest' : 'sage'} size="sm">
              {currentUser.role}
            </Badge>
          </div>
          <span className="text-[10px] text-[#78716C] leading-none mt-0.5">{currentUser.email}</span>
        </div>

        {/* User Avatar */}
        <Avatar
          name={currentUser.name}
          role={currentUser.role}
          department={currentUser.department || undefined}
          size="md"
          showStatus
          statusVariant="active"
        />

        {/* Explicit Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF6ED] hover:bg-[#FEE2E2] border border-[#DDD5C5] hover:border-[#FECACA] text-xs font-semibold text-[#57534E] hover:text-[#DC2626] transition-all cursor-pointer shadow-xs"
          title="Log out of this laptop session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>

      {/* Registration / Account Provisioning Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        currentUser={currentUser}
        onUserRegistered={(user) => {
          onUserRegistered?.(user);
        }}
      />
    </header>
  );
};
