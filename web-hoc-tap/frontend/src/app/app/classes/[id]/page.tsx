'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  FileText,
  Users,
  Calendar,
  Plus,
  Trash2,
  Copy,
  Check,
  Award,
  ChevronRight,
  ArrowLeft,
  Share2,
} from 'lucide-react';

export default function ClassDetailPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [clazz, setClazz] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'students'>('assignments');
  const [loading, setLoading] = useState(true);

  // Modals & Actions
  const [isCreateAssignOpen, setIsCreateAssignOpen] = useState(false);
  const [isDeleteClassOpen, setIsDeleteClassOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Assignment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedQuizId, setLinkedQuizId] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [formError, setFormError] = useState<string | null>(null);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchClassData();
  }, [token, classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      // 1. Class Detail
      const classRes = await fetch(`/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!classRes.ok) throw new Error('Không tìm thấy lớp học');
      setClazz(await classRes.json());

      // 2. Assignments
      const assignRes = await fetch(
        `/api/assignments/class/${classId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (assignRes.ok) setAssignments(await assignRes.json());

      // 3. Members & Quizzes (Teacher)
      if (isTeacher) {
        const membersRes = await fetch(
          `/api/classes/${classId}/members`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (membersRes.ok) setMembers(await membersRes.json());

        const quizRes = await fetch('/api/quizzes/teacher', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (quizRes.ok) setQuizzes(await quizRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormError(null);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc || undefined,
          classId,
          quizId: linkedQuizId || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          maxScore: Number(maxScore),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể giao bài');

      setNewTitle('');
      setNewDesc('');
      setDeadline('');
      setLinkedQuizId('');
      setIsCreateAssignOpen(false);
      fetchClassData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return;
    try {
      const res = await fetch(
        `/api/classes/${classId}/students/${studentToDelete}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setMembers(members.filter((m) => m.student.id !== studentToDelete));
        setStudentToDelete(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClass = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.push('/app/classes');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = () => {
    if (!clazz) return;
    navigator.clipboard.writeText(clazz.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !clazz) {
    return (
      <AppShell>
        <p className="text-xs text-slate-400 py-12 text-center">Đang tải thông tin lớp học...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={clazz.name}
      subtitle={`Mã tham gia lớp: ${clazz.code}`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyCode} className="gap-1.5">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Đã sao chép' : `Mã lớp: ${clazz.code}`}
          </Button>

          {isTeacher && (
            <>
              <Button
                size="sm"
                onClick={() => router.push(`/app/classes/${classId}/assignments/create`)}
                className="gap-1.5"
              >
                <Plus size={16} /> Giao bài tập
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteClassOpen(true)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                title="Xóa lớp"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-900 pb-1">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-2.5 text-sm font-semibold border-b-2 ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                : 'border-transparent text-slate-500'
            }`}
          >
            Bài tập & Đề thi ({assignments.length})
          </button>

          {isTeacher && (
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-2.5 text-sm font-semibold border-b-2 ${
                activeTab === 'students'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                  : 'border-transparent text-slate-500'
              }`}
            >
              Danh sách Học sinh ({members.length})
            </button>
          )}
        </div>

        {/* Tab 1: Assignments */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Chưa có bài tập nào được giao
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isTeacher
                    ? 'Hãy nhấn "Giao bài tập" để tạo đề tự luận hoặc kết nối bộ câu hỏi trắc nghiệm.'
                    : 'Giáo viên chưa giao bài tập nào cho lớp này.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    onClick={() => router.push(`/app/assignments/${assign.id}`)}
                    className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center cursor-pointer select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {assign.title}
                        </h4>
                        {assign.quiz && <Badge variant="info">Trắc nghiệm</Badge>}
                        {assign.documentFile && <Badge variant="success">Kho tài liệu</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} />
                        Hạn nộp:{' '}
                        {assign.deadline
                          ? new Date(assign.deadline).toLocaleString('vi-VN')
                          : 'Không giới hạn'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                          Thang điểm: {assign.maxScore}
                        </span>
                        {isTeacher && (
                          <span className="text-[10px] text-slate-400 block">
                            {assign._count?.submissions ?? 0} bài nộp
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Students List (Teacher only) */}
        {activeTab === 'students' && isTeacher && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Chưa có học sinh nào tham gia bằng mã lớp: <strong className="font-mono">{clazz.code}</strong>
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[4px] bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                        {m.student.profile?.name ? m.student.profile.name[0] : 'S'}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                          {m.student.profile?.name || m.student.email}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.student.email}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStudentToDelete(m.student.id)}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Xóa khỏi lớp
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Class Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteClassOpen}
        onClose={() => setIsDeleteClassOpen(false)}
        onConfirm={handleDeleteClass}
        title="Xóa lớp học này?"
        message="Hành động này sẽ xóa toàn bộ bài tập và dữ liệu điểm liên quan của lớp. Bạn có chắc chắn muốn tiếp tục?"
        isDestructive
        confirmText="Xóa lớp vĩnh viễn"
      />

      {/* Remove Student Confirmation */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleRemoveStudent}
        title="Xóa học sinh khỏi lớp?"
        message="Học sinh này sẽ không còn quyền truy cập vào các bài tập của lớp."
        isDestructive
        confirmText="Xóa học sinh"
      />
    </AppShell>
  );
}
