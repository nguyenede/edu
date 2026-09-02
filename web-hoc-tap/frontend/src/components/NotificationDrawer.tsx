'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from './Button';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export const NotificationDrawer: React.FC = () => {
  const router = useRouter();
  const { token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
        title="Thông báo"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-950 rounded-[6px] ring-1 ring-slate-200/20 z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Thông báo ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
            {loading ? (
              <p className="text-xs text-slate-400 py-6 text-center">Đang tải...</p>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1">
                <Inbox size={24} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">Không có thông báo mới</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`p-3 text-left cursor-pointer flex flex-col gap-1 ${
                    n.isRead
                      ? 'bg-transparent text-slate-600 dark:text-slate-400'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 text-slate-900 dark:text-slate-100 font-medium'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold">{n.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer link to full notification page */}
          <div className="p-2 bg-slate-50 dark:bg-slate-900/50 text-center border-t border-slate-100 dark:border-slate-900">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/notifications');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
