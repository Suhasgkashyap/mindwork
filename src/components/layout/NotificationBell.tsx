import React, { useState, useEffect } from 'react';
import { User, NotificationItem } from '../../types';
import { Bell, Check, ExternalLink, Inbox, CheckCheck } from 'lucide-react';

interface NotificationBellProps {
  currentUser: User;
  onNavigateToTask?: (taskId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onNavigateToTask,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?user_id=${currentUser.id}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('[NotificationBell]: error fetching', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    // Setup SSE listener for real-time notifications
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('notification_created', () => {
        fetchNotifications();
      });
      eventSource.addEventListener('task_created', () => {
        fetchNotifications();
      });
      eventSource.addEventListener('task_updated', () => {
        fetchNotifications();
      });
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [currentUser.id]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFE9DC] transition-colors cursor-pointer"
        title="Real-time Multi-Laptop Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5 text-[#588157]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#E0D9C8] shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#2D4A36]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#EBF1ED] text-[#2D4A36] text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-[11px] text-[#588157] hover:text-[#2D4A36] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-[#78716C] text-xs space-y-1">
                  <Inbox className="w-8 h-8 text-[#A8A29E] mx-auto opacity-50" />
                  <p className="font-semibold">No notifications yet</p>
                  <p className="text-[11px] text-[#A8A29E]">
                    Task assignments, submissions, and status updates will appear here in real time.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = notif.is_read === 0;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (isUnread) markAsRead(notif.id);
                        if (notif.link && onNavigateToTask) {
                          const parts = notif.link.split('/');
                          const taskId = parts[parts.length - 1];
                          onNavigateToTask(taskId);
                          setIsOpen(false);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                        isUnread
                          ? 'bg-[#F4F8F5] border-[#D1E0D5] text-[#1C1917]'
                          : 'bg-white border-[#EFE9DC] text-[#57534E] hover:bg-[#FAF8F4]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[11px] text-[#2D4A36] leading-tight">
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-[#A8A29E] shrink-0 font-mono">
                          {notif.created_at.split(' ')[1] || ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#44403C] mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 mt-2 border-t border-[#F0EBE1] flex items-center justify-between text-[10px] text-[#78716C]">
              <span>Real-Time Multi-Laptop Sync</span>
              <span className="flex items-center gap-1 text-[#2D4A36] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" />
                Live SSE
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
