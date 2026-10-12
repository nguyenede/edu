'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { GraduationCap, Users, Plus, ChevronRight, Copy, Check } from 'lucide-react';
import { fetchClasses as apiFetchClasses, getLocalClasses, ClassItem } from '@/lib/classesApi';

export default function ClassesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isTeacher = user?.role === 'TEACHER';

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const data = await apiFetchClasses(activeToken, isTeacher);
      setClasses(data);
    } catch (err) {
      console.error('Error loading classes:', err);
      setClasses(getLocalClasses());
    } finally {
      setLoading(false);
    }
  }, [token, isTeacher]);

  useEffect(() => {
    loadClasses();

    const handleRefresh = () => loadClasses();
    window.addEventListener('storage', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [loadClasses]);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <AppShell
      title="Danh sách Lớp học"
      subtitle={
        isTeacher
          ? 'Quản lý toàn bộ các lớp bạn đang phụ trách và mã tham gia'
          : 'Tất cả các lớp học bạn đã tham gia để nhận bài tập'
      }
      action={
        isTeacher ? (
          <Button size="sm" onClick={() => router.push('/app/classes/create')} className="gap-1.5">
            <Plus size={16} /> Tạo lớp học
          </Button>
        ) : (
          <Button size="sm" onClick={() => router.push('/app/classes/join')} className="gap-1.5">
            <Plus size={16} /> Tham gia lớp mới
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center">Đang tải danh sách lớp...</p>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <GraduationCap size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chưa có lớp học nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isTeacher
                ? 'Hãy bấm nút Tạo lớp học để bắt đầu quản lý học sinh và giao bài tập.'
                : 'Hãy nhập mã lớp học do giáo viên cung cấp để tham gia vào lớp.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => router.push(`/app/classes/${cls.id}`)}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg transition-colors select-none group"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-950 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cls.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {cls._count?.members ?? 0} học sinh
                    </span>
                    <span>•</span>
                    {isTeacher ? (
                      <span className="flex items-center gap-1 font-mono">
                        Mã: <strong className="text-slate-700 dark:text-slate-300">{cls.code}</strong>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(e, cls.code)}
                          className="hover:text-slate-900 dark:hover:text-white p-0.5"
                          title="Sao chép mã"
                        >
                          {copiedCode === cls.code ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </span>
                    ) : (
                      <span>Giáo viên: {cls.teacher?.profile?.name || cls.teacher?.email}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Chi tiết lớp</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
