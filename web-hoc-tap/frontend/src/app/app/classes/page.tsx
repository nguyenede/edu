'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { GraduationCap, Users, Plus, ChevronRight, Copy, Check } from 'lucide-react';

export default function ClassesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchClasses();
  }, [token]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const endpoint = isTeacher
        ? '/api/classes/teacher'
        : '/api/classes/student';

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (isTeacher) {
          setClasses(data);
        } else {
          setClasses(data.map((m: any) => m.class));
        }
      } else {
        setClasses([]);
      }
    } catch (err) {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

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
          <Button size="sm" onClick={() => router.push('/classes/create')} className="gap-1.5">
            <Plus size={16} /> Tạo lớp học
          </Button>
        ) : (
          <Button size="sm" onClick={() => router.push('/classes/join')} className="gap-1.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => router.push(`/classes/${cls.id}`)}
                className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex flex-col justify-between cursor-pointer space-y-4 select-none"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100 text-base">
                      {cls.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isTeacher
                      ? 'Mã mời học sinh: '
                      : `Giáo viên: ${cls.teacher?.profile?.name || cls.teacher?.email}`}
                    {isTeacher && (
                      <span
                        onClick={(e) => handleCopyCode(e, cls.code)}
                        className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-[4px] ml-1 cursor-pointer"
                        title="Click để sao chép"
                      >
                        {cls.code}
                        {copiedCode === cls.code ? <Check size={12} /> : <Copy size={12} />}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users size={14} /> {cls._count?.members ?? 0} học sinh
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                    Chi tiết lớp <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
