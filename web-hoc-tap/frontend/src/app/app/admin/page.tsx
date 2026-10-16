'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Shield,
  Users,
  Trash2,
  Search,
  Activity,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.push('/app/dashboard');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchLogs();
  }, [token, roleFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/users?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (roleFilter) url += `role=${roleFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUserToDelete(null);
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'ADMIN') return null;

  return (
    <AppShell
      title="Bảng điều khiển Quản trị Hệ thống"
      subtitle="Quản lý toàn bộ người dùng, xem thống kê hệ thống và theo dõi nhật ký bảo mật (Audit Logs)"
    >
      <div className="space-y-6">
        {/* Metric Summary Counters */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Tổng tài khoản
              </span>
              <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
                {stats.usersCount}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Giáo viên / Học sinh
              </span>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.teachersCount} / {stats.studentsCount}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Tổng số lớp học
              </span>
              <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
                {stats.classesCount}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 sm:gap-2.5 items-center overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm tracking-tight whitespace-nowrap cursor-pointer transition-all rounded-xl ${
              activeTab === 'users'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            Quản lý người dùng ({usersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm tracking-tight whitespace-nowrap cursor-pointer transition-all rounded-xl ${
              activeTab === 'logs'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            Nhật ký hệ thống ({auditLogs.length})
          </button>
        </div>

        {/* Tab 1: User Management */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2.5 items-center py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex-1 min-w-[220px] relative">
                <input
                  type="text"
                  placeholder="Tìm theo email hoặc họ tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                />
                <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tất cả vai trò</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="STUDENT">Học sinh</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>

              <Button size="sm" variant="secondary" onClick={fetchUsers}>
                Tìm kiếm
              </Button>
            </div>

            {/* Users List */}
            {loading ? (
              <p className="text-xs text-slate-400 py-12 text-center">Đang tải danh sách người dùng...</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <div
                    key={u.id}
                    className="py-3.5 px-2 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors select-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        {u.profile?.name ? u.profile.name[0] : 'U'}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {u.profile?.name || 'Chưa đặt tên'}
                          </span>
                          <Badge
                            variant={
                              u.role === 'ADMIN'
                                ? 'danger'
                                : u.role === 'TEACHER'
                                ? 'primary'
                                : 'default'
                            }
                          >
                            {u.role}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {u.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">
                        Ngày tạo: {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => setUserToDelete(u.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Chưa có nhật ký hoạt động nào.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 px-2 flex justify-between items-center text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {log.action}
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs">
                        {log.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Xóa người dùng này?"
        message="Hành động này sẽ xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan."
        isDestructive
        confirmText="Xóa tài khoản"
      />
    </AppShell>
  );
}
