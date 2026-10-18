'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Bell, CheckCheck, Inbox, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
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
        setNotifications(
          notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppShell
      title="Trung tâm thông báo"
      subtitle={`Bạn có ${unreadCount} thông báo chưa đọc`}
      action={
        unreadCount > 0 ? (
          <Button size="sm" variant="secondary" onClick={handleMarkAllRead} className="gap-1.5">
            <CheckCheck size={16} /> Đánh dấu đã đọc tất cả
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-4xl space-y-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center">Đang tải thông báo</p>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Inbox size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chưa có thông báo nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi có bài tập mới, lời mời vào lớp hoặc kết quả chấm điểm, bạn sẽ nhận được thông báo tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={`py-3.5 px-3 rounded-2xl flex justify-between items-start cursor-pointer transition-colors border border-transparent ${
                  n.isRead
                    ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                    : 'text-slate-900 dark:text-slate-100 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border-blue-100 dark:border-blue-900/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{n.title}</span>
                    {!n.isRead && <Badge variant="primary">Mới</Badge>}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{n.content}</p>
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="shrink-0 text-xs"
                >
                  {n.isRead ? 'Đã đọc' : 'Đánh dấu đọc'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
