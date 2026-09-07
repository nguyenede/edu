'use client';

import React, { useEffect, useState } from 'react';
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
  Play,
  BookOpen,
  FileText,
  Clock,
  Award,
  ChevronRight,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isJoinClassOpen, setIsJoinClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Classes
      const endpoint = isTeacher
        ? 'http://localhost:3005/api/classes/teacher'
        : 'http://localhost:3005/api/classes/student';

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
      }

      // 2. Fetch Results / History
      const histRes = await fetch(
        isTeacher
          ? 'http://localhost:3005/api/classes/teacher'
          : 'http://localhost:3005/api/results/history',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        if (!isTeacher && histData.submissions) {
          setRecentAssignments(histData.submissions.slice(0, 5));
        }
      }
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
      const res = await fetch('http://localhost:3005/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tạo lớp');

      setNewClassName('');
      setIsCreateClassOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setFormError(null);

    try {
      const res = await fetch('http://localhost:3005/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tham gia lớp');

      setJoinCode('');
      setIsJoinClassOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const currentUser = user;
  const isTeacherUser = currentUser?.role === 'TEACHER';

  return (
    <AppShell
      title={`Xin chào, ${currentUser?.name || currentUser?.email || 'bạn'}`}
      subtitle={
        isTeacherUser
          ? 'Quản lý lớp học, ngân hàng đề thi và theo dõi tiến độ học tập của học sinh'
          : 'Xem danh sách bài tập được giao, lịch sử làm bài và tham gia phòng game realtime'
      }
      action={
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          {isTeacherUser ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/app/quizzes')}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <Play size={15} /> Tạo đề & Host Game
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateClassOpen(true)}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <Plus size={15} /> Tạo lớp học mới
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/play')}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <Zap size={15} /> Vào phòng game
              </Button>
              <Button
                size="sm"
                onClick={() => setIsJoinClassOpen(true)}
                className="gap-1.5 flex-1 sm:flex-none"
              >
                <Plus size={15} /> Nhập mã vào lớp
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Quick Metric Counters */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              Lớp học
            </span>
            <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
              {classes.length}
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              {isTeacherUser ? 'Tổng học sinh' : 'Bài đã nộp'}
            </span>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isTeacherUser
                ? classes.reduce((acc, c) => acc + (c._count?.members ?? 0), 0)
                : recentAssignments.length}
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              {isTeacherUser ? 'Đề thi đã tạo' : 'Phòng thi đã đấu'}
            </span>
            <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
              {isTeacherUser ? 'Sẵn sàng' : 'Hoạt động'}
            </p>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1 min-w-0">
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
            <p className="text-xs text-slate-400 py-8 text-center">Đang tải lớp học...</p>
          ) : classes.length === 0 ? (
            <div className="p-5 sm:p-8 bg-slate-50/50 dark:bg-slate-900/20 rounded-[6px] text-center space-y-3">
              <p className="text-xs text-slate-500">
                {isTeacherUser
                  ? 'Bạn chưa tạo lớp học nào. Hãy nhấn nút "Tạo lớp học mới" để bắt đầu.'
                  : 'Bạn chưa tham gia lớp nào. Hãy nhập mã tham gia 6 ký tự do giáo viên cung cấp.'}
              </p>
              <Button
                size="sm"
                onClick={() =>
                  isTeacherUser ? setIsCreateClassOpen(true) : setIsJoinClassOpen(true)
                }
              >
                {isTeacherUser ? 'Tạo lớp đầu tiên' : 'Tham gia lớp ngay'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/classes/${cls.id}`)}
                  className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex flex-col justify-between cursor-pointer active:bg-slate-100 dark:active:bg-slate-900/80 select-none space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100 text-base">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isTeacherUser
                        ? `Mã mời học sinh: `
                        : `Giáo viên: ${cls.teacher?.profile?.name || cls.teacher?.email}`}
                      {isTeacherUser && (
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {cls.code}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-200/40 dark:border-slate-800/40">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users size={14} /> {cls._count?.members ?? 0} học sinh
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      Vào lớp <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Shortcuts for Teacher / Recent for Student */}
        {isTeacherUser ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div
              onClick={() => router.push('/app/question-bank')}
              className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-900/30 rounded-[6px] cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  Ngân hàng câu hỏi
                </h3>
                <p className="text-xs text-slate-500">
                  Tạo câu hỏi trắc nghiệm, quản lý chuyên đề và import từ file
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </div>

            <div
              onClick={() => router.push('/app/quizzes')}
              className="p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-900/30 rounded-[6px] cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Play size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Đề trắc nghiệm & Game Realtime
                </h3>
                <p className="text-xs text-slate-500">
                  Tạo đề kiểm tra và mở phòng thi đấu Classic / Chaos Quiz
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-400 shrink-0" />
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
              Bài tập đã nộp gần đây
            </h2>

            {recentAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center bg-slate-50/40 dark:bg-slate-900/20 rounded-[6px]">
                Chưa có lịch sử làm bài tập nào.
              </p>
            ) : (
              <div className="space-y-2">
                {recentAssignments.map((sub: any) => (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/assignments/${sub.assignmentId}`)}
                    className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center cursor-pointer"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {sub.assignment.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Lớp: {sub.assignment.class.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {sub.score !== null ? `${sub.score} / ${sub.assignment.maxScore}` : 'Chờ chấm'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </span>
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
