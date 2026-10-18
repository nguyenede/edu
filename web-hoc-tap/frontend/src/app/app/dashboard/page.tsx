'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import {
  GraduationCap,
  Users,
  Plus,
  BookOpen,
  FileText,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';
import { fetchClasses, createClass, joinClass } from '@/lib/classesApi';
import { idbSyncAndGetAll } from '@/lib/indexedDbStorage';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [createdExamsCount, setCreatedExamsCount] = useState<number>(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isJoinClassOpen, setIsJoinClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isTeacher = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  useEffect(() => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!activeToken) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      // 1. Fetch Classes (with resilient offline support)
      const classList = await fetchClasses(activeToken, isTeacher);
      setClasses(classList);

      // 2. Fetch Real Exams / Documents Count (100% real data)
      if (typeof window !== 'undefined') {
        try {
          const { documents: idbDocs } = await idbSyncAndGetAll();
          setCreatedExamsCount(idbDocs.length);
        } catch (_) {}
      }

      // 3. Fetch Results / History
      try {
        const histRes = await fetch(
          isTeacher
            ? '/api/classes/teacher'
            : '/api/results/history',
          { headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {} }
        );
        if (histRes.ok) {
          const histData = await histRes.json();
          if (!isTeacher && histData.submissions) {
            setRecentAssignments(histData.submissions.slice(0, 5));
          }
        }
      } catch {}
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setFormError(null);

    try {
      const created = await createClass(token, newClassName.trim(), user);
      setNewClassName('');
      setIsCreateClassOpen(false);
      setClasses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      fetchDashboardData();
    } catch (err: any) {
      setFormError(err.message || 'Không thể tạo lớp học');
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setFormError(null);

    try {
      const joined = await joinClass(token, joinCode.trim());
      setJoinCode('');
      setIsJoinClassOpen(false);
      setClasses((prev) => [joined, ...prev.filter((c) => c.id !== joined.id)]);
      fetchDashboardData();
    } catch (err: any) {
      setFormError(err.message || 'Không thể tham gia lớp học');
    }
  };

  const currentUser = user;
  const isTeacherUser = isTeacher;

  return (
    <AppShell
      title={`Xin chào, ${currentUser?.name || currentUser?.email || 'bạn'}`}
      subtitle={
        isTeacherUser
          ? 'Quản lý lớp học, ngân hàng đề thi và theo dõi tiến độ học tập của học sinh'
          : 'Xem danh sách bài tập được giao và theo dõi kết quả học tập'
      }
      action={
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          {isTeacherUser ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/app/documents')}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <FileText size={15} /> Kho tài liệu và Đề thi
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/app/classes?create=true')}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <Plus size={15} /> Tạo lớp học mới
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsJoinClassOpen(true)}
              className="gap-1.5 flex-1 sm:flex-none"
            >
              <Plus size={15} /> Nhập mã vào lớp
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Quick Metric Counters */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              Lớp học
            </span>
            <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
              {classes.length}
            </p>
          </div>

          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              {isTeacherUser ? 'Tổng học sinh' : 'Bài đã nộp'}
            </span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isTeacherUser
                ? classes.reduce((acc, c) => acc + (c._count?.members ?? 0), 0)
                : recentAssignments.length}
            </p>
          </div>

          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              {isTeacherUser ? 'Đề thi đã tạo' : 'Phòng thi đã đấu'}
            </span>
            <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
              {isTeacherUser ? createdExamsCount : recentAssignments.length}
            </p>
          </div>

          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              Trạng thái
            </span>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            </div>
          </div>
        </section>

        {/* Classes Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap size={18} className="text-blue-600 dark:text-blue-400" />
              {isTeacherUser ? 'Danh sách lớp bạn đang giảng dạy' : 'Lớp học bạn đang tham gia'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/app/classes')}
              className="text-xs gap-1 self-start sm:self-auto"
            >
              Xem tất cả <ChevronRight size={14} />
            </Button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-8 text-center">Đang tải lớp học</p>
          ) : classes.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-slate-500">
                {isTeacherUser
                  ? 'Bạn chưa tạo lớp học nào. Hãy nhấn nút "Tạo lớp học mới" để bắt đầu.'
                  : 'Bạn chưa tham gia lớp nào. Hãy nhập mã tham gia 6 ký tự do giáo viên cung cấp.'}
              </p>
              <Button
                size="sm"
                onClick={() =>
                  isTeacherUser ? router.push('/app/classes?create=true') : setIsJoinClassOpen(true)
                }
              >
                {isTeacherUser ? 'Tạo lớp đầu tiên' : 'Tham gia lớp ngay'}
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/app/classes/${cls.id}`)}
                  className="py-3 px-2 flex justify-between items-center cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-[#282a2c]/60 rounded-lg transition-colors group"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cls.name}
                    </h3>
                    {!isTeacherUser && (
                      <p className="text-xs text-slate-500">
                        Giáo viên: {cls.teacher?.profile?.name || cls.teacher?.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users size={14} /> {cls._count?.members ?? 0} học sinh
                    </span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Shortcuts for Teacher / Recent for Student */}
        {isTeacherUser ? (
          <section className="space-y-1 pt-2">
            <div
              onClick={() => router.push('/app/question-bank')}
              className="py-3 px-2 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-[#282a2c]/60 rounded-lg transition-colors group"
            >
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  Ngân hàng câu hỏi
                </h3>
                <p className="text-xs text-slate-500">
                  Tạo câu hỏi trắc nghiệm, quản lý chuyên đề và import từ file
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            <div
              onClick={() => router.push('/app/documents')}
              className="py-3 px-2 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-[#282a2c]/60 rounded-lg transition-colors group"
            >
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Kho tài liệu và Đề thi SI
                </h3>
                <p className="text-xs text-slate-500">
                  Tạo đề thi tự động với SI chuẩn Bộ GD&ĐT, lưu trữ và xuất bản tài liệu
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
              Bài tập đã nộp gần đây
            </h2>

            {recentAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Chưa có lịch sử làm bài tập nào.
              </p>
            ) : (
              <div className="space-y-1">
                {recentAssignments.map((sub: any) => (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/app/assignments/${sub.assignmentId}`)}
                    className="py-3 px-2 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#282a2c]/60 rounded-lg transition-colors group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {sub.assignment.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Lớp: {sub.assignment.class.name}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block">
                          {sub.score !== null ? `${sub.score} / ${sub.assignment.maxScore}` : 'Chờ chấm'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Create Class Modal */}
      <Modal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        title="Tạo lớp học mới"
        description="Nhập tên lớp học để quản lý học sinh và giao bài tập"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-[4px]">
              {formError}
            </div>
          )}

          <Input
            label="Tên lớp học"
            placeholder="Ví dụ: Toán 12A1, Tiếng Anh K15"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateClassOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Xác nhận tạo lớp
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Class Modal */}
      <Modal
        isOpen={isJoinClassOpen}
        onClose={() => setIsJoinClassOpen(false)}
        title="Tham gia lớp học"
        description="Nhập mã lớp học 6 ký tự do giáo viên cung cấp"
      >
        <form onSubmit={handleJoinClass} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-[4px]">
              {formError}
            </div>
          )}

          <Input
            label="Mã lớp tham gia"
            placeholder="MÃ 6 KÝ TỰ"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="text-center font-mono font-bold tracking-widest text-base"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsJoinClassOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Vào lớp ngay
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
