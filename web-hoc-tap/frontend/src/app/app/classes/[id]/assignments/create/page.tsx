'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, FileText, Check } from 'lucide-react';
import { listDocumentFiles } from '@/lib/documentsApi';

export default function CreateAssignmentPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { token } = useAuthStore();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [documentFiles, setDocumentFiles] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedQuizId, setLinkedQuizId] = useState('');
  const [linkedDocumentFileId, setLinkedDocumentFileId] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchQuizzes();
  }, [token]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setQuizzes(await res.json());

      const docs = await listDocumentFiles(token!);
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
          documentFileId: linkedDocumentFileId || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          maxScore: Number(maxScore),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể giao bài tập');

      setToast(true);
      setTimeout(() => {
        router.push(`/app/classes/${classId}`);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi giao bài tập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã giao bài tập thành công
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText size={22} className="text-google-blue" />
              Giao Bài tập / Đề thi mới
            </h1>
          </div>
        </div>

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
                Liên kết Đề thi trắc nghiệm (Tùy chọn)
              </label>
              <select
                value={linkedQuizId}
                onChange={(e) => {
                  setLinkedQuizId(e.target.value);
                  if (e.target.value) setLinkedDocumentFileId('');
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
              >
                <option value="">-- Không liên kết đề thi tự động --</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q._count?.questions ?? 0} câu hỏi)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hoặc giao đề từ Kho tài liệu / AI đã tạo
              </label>
              <select
                value={linkedDocumentFileId}
                onChange={(e) => {
                  setLinkedDocumentFileId(e.target.value);
                  if (e.target.value) setLinkedQuizId('');
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
              >
                <option value="">-- Không dùng tài liệu trong kho --</option>
                {documentFiles.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.parsedQuiz?.title || doc.name} ({doc.parsedQuiz?.questions?.length || 0} câu)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Dùng cho đề tạo bằng AI / OCR / upload Word đã nằm trong Kho tài liệu.
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
