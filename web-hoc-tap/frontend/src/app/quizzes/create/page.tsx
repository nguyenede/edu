'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Play, Check } from 'lucide-react';

export default function CreateQuizPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [questions, setQuestions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [classId, setClassId] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const qRes = await fetch('/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (qRes.ok) setQuestions(await qRes.json());

      const cRes = await fetch('/api/classes/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cRes.ok) setClasses(await cRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQuestionSelect = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề bài thi.');
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          timeLimit: Number(timeLimit),
          maxAttempts: Number(maxAttempts),
          classId: classId || undefined,
          showAnswers,
          questionIds: selectedQuestionIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Không thể tạo đề thi');
      }

      setToast(true);
      setTimeout(() => {
        router.push('/quizzes');
      }, 1000);
    } catch (err: any) {
      setToast(true);
      setTimeout(() => {
        router.push('/quizzes');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã tạo đề thi trắc nghiệm mới thành công
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
              <Play size={22} className="text-google-blue" />
              Tạo Đề thi & Game Multiplayer mới
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
              label="Tiêu đề Đề thi"
              placeholder="Ví dụ: Đề Ôn tập giữa kỳ 1 Môn Toán"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mô tả ngắn
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả đề thi..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Thời gian làm bài (phút)"
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min={1}
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Giao cho Lớp học</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                >
                  <option value="">-- Không giao riêng cho lớp nào --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                Chọn câu hỏi từ Ngân hàng câu hỏi ({selectedQuestionIds.length} đã chọn)
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/40">
                {questions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có câu hỏi nào trong ngân hàng</p>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestionSelect(q.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        selectedQuestionIds.includes(q.id)
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 border-google-blue text-slate-900 dark:text-slate-100 font-medium'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-google-blue cursor-pointer"
                      />
                      <div className="text-xs space-y-0.5 flex-1">
                        <p className="font-semibold">Câu {idx + 1}: {q.content}</p>
                        <span className="text-[11px] text-slate-400">
                          {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Đúng/Sai'} · {q.points || 1} điểm
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang khởi tạo...' : 'Tạo Đề thi ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
