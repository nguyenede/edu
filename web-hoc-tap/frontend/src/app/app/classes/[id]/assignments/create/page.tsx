'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, FileText, Check, ChevronRight } from 'lucide-react';
import { listDocumentFiles } from '@/lib/documentsApi';
import { createClassAssignment } from '@/lib/classesApi';

export default function CreateAssignmentPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();

  const [documentFiles, setDocumentFiles] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedDocumentFileId, setLinkedDocumentFileId] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    fetchDocumentFiles();
  }, [token]);

  const fetchDocumentFiles = async () => {
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const docs = await listDocumentFiles(activeToken || '');
      setDocumentFiles(
        Array.isArray(docs)
          ? docs.filter((doc) => Array.isArray(doc?.parsedQuiz?.questions) && doc.parsedQuiz.questions.length > 0)
          : []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormError(null);
    setLoading(true);

    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      await createClassAssignment(activeToken, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        classId: String(classId),
        documentFileId: linkedDocumentFileId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore),
      });

      setToast(true);
      setTimeout(() => {
        router.push(`/app/classes/${classId}`);
      }, 700);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi giao bài tập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-normal tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Lớp học của tôi
          </button>
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <button
            type="button"
            onClick={() => router.push(`/app/classes/${classId}`)}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Chi tiết lớp
          </button>
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Giao bài tập mới
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã giao bài tập thành công
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <Input
              label="Tiêu đề bài tập"
              placeholder="Ví dụ: Kiểm tra 15 phút Chương 1 - Đại số"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú / Hướng dẫn học sinh
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Nhập hướng dẫn làm bài cho học sinh..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hạn nộp (Deadline)"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <Input
                label="Thang điểm tối đa"
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                min={1}
                max={100}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Giao đề từ Kho tài liệu / Đề thi SI (Tùy chọn)
              </label>
              <select
                value={linkedDocumentFileId}
                onChange={(e) => setLinkedDocumentFileId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
              >
                <option value="">-- Không đính kèm đề thi --</option>
                {documentFiles.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.parsedQuiz?.title || doc.name} ({doc.parsedQuiz?.questions?.length || 0} câu)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Giao đề trắc nghiệm tạo bằng SI hoặc tải lên từ Kho tài liệu.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang giao...' : 'Giao bài tập ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
