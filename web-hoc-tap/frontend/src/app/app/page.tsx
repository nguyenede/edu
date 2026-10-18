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
  Folder,
  FileText,
  Clock,
  Users,
  Plus,
  MoreVertical,
  ChevronRight,
  Sparkles,
  BookOpen,
  FolderPlus,
} from 'lucide-react';
import { fetchClasses, createClass, joinClass } from '@/lib/classesApi';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isJoinClassOpen, setIsJoinClassOpen] = useState(false);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
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
      const classList = await fetchClasses(activeToken, isTeacher);
      setClasses(classList);

      // History
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
            setRecentAssignments(histData.submissions.slice(0, 6));
          }
        }
      } catch {}
    } catch (err) {
      console.error(err);
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

  if (!user) {
    return (
      <AppShell title="Trang chủ">
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Chào mừng ${user.name || user.email}`}
      subtitle="Tổng quan lớp học, bài tập đề xuất và phòng đấu trắc nghiệm realtime"
      action={
        <div className="flex items-center gap-2">
          {isTeacher ? (
            <Button
              size="sm"
              variant="compose"
              onClick={() => router.push('/app/classes?create=true')}
              className="gap-2"
            >
              <FolderPlus size={16} className="text-google-blue" />
              Tạo lớp học mới
            </Button>
          ) : (
            <Button
              size="sm"
              variant="compose"
              onClick={() => setIsJoinClassOpen(true)}
              className="gap-2"
            >
              <Plus size={16} className="text-google-blue" />
              Nhập mã vào lớp
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Google Drive Suggested / Recent Activities Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles size={16} className="text-google-yellow" />
              {isTeacher ? 'Chức năng nổi bật' : 'Bài tập đã nộp gần đây'}
            </h2>
          </div>

          {isTeacher ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => router.push('/question-bank')}
                className="p-4 bg-google-hover dark:bg-google-hover-dark rounded-2xl cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Ngân hàng câu hỏi
                  </h3>
                  <p className="text-xs text-slate-500">Soạn đề & Import JSON</p>
                </div>
              </div>

              <div
                onClick={() => router.push('/app/documents')}
                className="p-4 bg-google-hover dark:bg-google-hover-dark rounded-2xl cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Kho tài liệu và Đề thi
                  </h3>
                  <p className="text-xs text-slate-500">Tạo đề thi và Quản lý file</p>
                </div>
              </div>

              <div
                onClick={() => router.push('/app/si')}
                className="p-4 bg-google-hover dark:bg-google-hover-dark rounded-2xl cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Trợ lý SI Soạn đề
                  </h3>
                  <p className="text-xs text-slate-500">Tạo đề theo chuẩn Bộ GD&ĐT</p>
                </div>
              </div>
            </div>
          ) : recentAssignments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">Chưa có bài tập nào gần đây.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentAssignments.map((sub: any) => (
                <div
                  key={sub.id}
                  onClick={() => router.push(`/app/assignments/${sub.assignmentId}`)}
                  className="p-4 bg-google-hover dark:bg-google-hover-dark rounded-2xl cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-google-blue shrink-0" />
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {sub.assignment.title}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Lớp: {sub.assignment.class.name}</span>
                    <Badge variant={sub.status === 'GRADED' ? 'success' : 'warning'}>
                      {sub.status === 'GRADED' ? `${sub.score} pts` : 'Chờ chấm'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Google Drive "Thư mục lớp học" (Folders Grid) */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Folder size={18} className="text-slate-600 dark:text-slate-400" />
              {isTeacher ? 'Thư mục lớp học của bạn' : 'Lớp học bạn đang tham gia'}
            </h2>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-12 text-center">Đang nạp dữ liệu lớp học</p>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Folder size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Chưa có lớp học nào
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isTeacher
                  ? 'Bấm nút "Tạo lớp học mới" để tạo thư mục lớp và nhận mã mời học sinh.'
                  : 'Bấm nút "Nhập mã vào lớp" do giáo viên cung cấp.'}
              </p>
            </div>
          ) : (
            /* Google Drive Folder Chips Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => router.push(`/app/classes/${cls.id}`)}
                  className="p-4 bg-google-hover dark:bg-google-hover-dark hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-2xl flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Folder size={22} className="text-google-blue fill-google-blue/20 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                        {cls.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {isTeacher ? `Mã: ${cls.code}` : `${cls._count?.members ?? 0} bạn học`}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Class Modal */}
      <Modal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        title="Tạo lớp học mới"
        description="Tạo thư mục lớp học để giao bài tập và quản lý học sinh"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
              {formError}
            </div>
          )}
          <Input
            label="Tên lớp học"
            placeholder="Ví dụ: Đại số 12A1, Hóa học 10B"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateClassOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Tạo lớp ngay
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Class Modal */}
      <Modal
        isOpen={isJoinClassOpen}
        onClose={() => setIsJoinClassOpen(false)}
        title="Tham gia lớp học"
        description="Nhập mã lớp 6 ký tự do giáo viên cung cấp"
      >
        <form onSubmit={handleJoinClass} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsJoinClassOpen(false)}>
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
