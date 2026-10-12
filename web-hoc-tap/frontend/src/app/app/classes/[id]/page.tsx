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

import {
  fetchClassDetail,
  fetchClassAssignments,
  fetchClassMembers,
  deleteClass,
  removeStudentFromClass,
  createClassAssignment,
  deleteClassAssignment,
} from '@/lib/classesApi';
import { safeLocalStorageSet } from '@/lib/safeStorage';

export default function ClassDetailPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [clazz, setClazz] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'students'>('assignments');
  const [loading, setLoading] = useState(true);

  // Modals & Actions
  const [isCreateAssignOpen, setIsCreateAssignOpen] = useState(false);
  const [isDeleteClassOpen, setIsDeleteClassOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);
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
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!activeToken) {
      router.push('/login');
      return;
    }
    fetchClassData();
  }, [token, classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const cId = String(classId);

      // 1. Class Detail with resilient offline support
      const detail = await fetchClassDetail(activeToken, cId);
      setClazz(detail);

      // 2. Assignments
      const asgs = await fetchClassAssignments(activeToken, cId);
      setAssignments(asgs);

      // 3. Members
      const mems = await fetchClassMembers(activeToken, cId);
      setMembers(mems);

      if (detail && mems.length > (detail._count?.members || 0)) {
        setClazz({ ...detail, _count: { members: mems.length } });
      }
    } catch (err) {
      console.error('Error fetching class data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormError(null);

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    const cId = String(classId);

    try {
      const created = await createClassAssignment(activeToken, {
        title: newTitle.trim(),
        description: newDesc || undefined,
        classId: cId,
        quizId: linkedQuizId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore),
      });

      setAssignments((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setNewTitle('');
      setNewDesc('');
      setDeadline('');
      setLinkedQuizId('');
      setIsCreateAssignOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi tạo bài tập');
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await removeStudentFromClass(activeToken, String(classId), studentToDelete);
    setMembers((prev) => prev.filter((m) => m.student.id !== studentToDelete));
    setStudentToDelete(null);
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClassAssignment(activeToken, String(classId), assignmentToDelete.id);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentToDelete.id));
    setAssignmentToDelete(null);
  };

  const handleDeleteClass = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClass(activeToken, String(classId));
    router.push('/classes');
  };

  const handleCopyCode = () => {
    if (!clazz) return;
    navigator.clipboard.writeText(clazz.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !clazz) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
          <p className="text-xs text-slate-400">Đang tải thông tin lớp học...</p>
        </div>
      </AppShell>
    );
  }

  if (!clazz) {
    return (
      <AppShell title="Không tìm thấy lớp học">
        <div className="p-12 text-center space-y-4">
          <p className="text-sm text-slate-500">Lớp học không tồn tại hoặc đã bị xóa.</p>
          <Button onClick={() => router.push('/classes')}>Quay lại danh sách lớp học</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
          >
            Lớp học của tôi
          </button>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[2]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
            {clazz.name}
          </span>
        </div>
      }
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
                onClick={() => router.push('/documents')}
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
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`text-sm font-semibold transition-colors ${
              activeTab === 'assignments'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Bài tập & Đề thi ({assignments.length})
          </button>

          {isTeacher && (
            <button
              onClick={() => setActiveTab('students')}
              className={`text-sm font-semibold transition-colors ${
                activeTab === 'students'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
              <div className="p-12 text-center space-y-2">
                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Chưa có bài tập nào được giao
                </h3>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    onClick={() => router.push(`/assignments/${assign.id}`)}
                    className="py-3.5 px-2 flex justify-between items-center cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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

                    <div className="flex items-center gap-3">
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

                      {isTeacher && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignmentToDelete(assign);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Xóa bài tập"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map((m) => {
                  const studentName = m.student?.profile?.name || m.student?.name || m.name || m.student?.email || m.email || 'Học sinh';
                  const studentEmail = m.student?.email || m.email || '';
                  const studentId = m.student?.id || m.studentId || m.id;
                  const initialChar = (studentName ? studentName[0] : 'S').toUpperCase();

                  return (
                    <div
                      key={m.id || studentId}
                      className="py-3 px-2 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200">
                          {initialChar}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {studentName}
                          </span>
                          {studentEmail && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {studentEmail}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStudentToDelete(studentId)}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                      >
                        Xóa khỏi lớp
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Assignment Confirmation */}
      <ConfirmDialog
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={handleDeleteAssignment}
        title="Xóa bài tập này?"
        message={`Bạn có chắc chắn muốn xóa bài tập "${assignmentToDelete?.title}"? Tất cả bài nộp của học sinh đối với bài tập này cũng sẽ bị xóa.`}
        isDestructive
        confirmText="Xóa bài tập"
      />

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
