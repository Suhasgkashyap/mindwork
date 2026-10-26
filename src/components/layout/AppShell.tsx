import React, { useState } from 'react';
import { User } from '../../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { WellnessBannerWatermark } from '../ui/BotanicalDecor';
import { usePalette } from '../../context/PaletteContext';

interface AppShellProps {
  currentUser: User;
  availableUsers: User[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onSwitchUser: (user: User) => void;
  onLogout: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onUserRegistered?: (user: User) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  availableUsers,
  currentPath,
  onNavigate,
  onSwitchUser,
  onLogout,
  onNavigateToTask,
  onUserRegistered,
  children,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { activePalette } = usePalette();

  return (
    <div
      style={{ backgroundColor: activePalette.bgCanvas }}
      className="min-h-screen text-[#1C1917] flex font-sans antialiased selection:bg-[#D1E0D5] selection:text-[#2D4A36] transition-colors duration-200"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        currentPath={currentPath}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          currentUser={currentUser}
          availableUsers={availableUsers}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigateToTask={onNavigateToTask}
          onUserRegistered={onUserRegistered}
        />

        {/* Page Container with subtle botanical watermark */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative overflow-hidden">
          <WellnessBannerWatermark className="top-10 right-4 w-96 h-48 opacity-[0.03]" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
};
