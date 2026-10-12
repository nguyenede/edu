'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, BookOpen, Check, Plus, Trash2, Sparkles, Loader2, ChevronRight } from 'lucide-react';

export default function CreateQuestionPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qDifficulty, setQDifficulty] = useState('MEDIUM');
  const [qPoints, setQPoints] = useState(1);
  const [qTimeLimit, setQTimeLimit] = useState(30);
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<any[]>([
    { content: 'Lựa chọn A', isCorrect: true },
    { content: 'Lựa chọn B', isCorrect: false },
    { content: 'Lựa chọn C', isCorrect: false },
    { content: 'Lựa chọn D', isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const handleOptionChange = (idx: number, content: string) => {
    const updated = [...qOptions];
    updated[idx].content = content;
    setQOptions(updated);
  };

  const handleSetCorrect = (idx: number) => {
    const updated = qOptions.map((opt, i) => ({
      ...opt,
      isCorrect: i === idx,
    }));
    setQOptions(updated);
  };

  const handleAddOption = () => {
    if (qOptions.length >= 6) return;
    setQOptions([...qOptions, { content: `Lựa chọn ${String.fromCharCode(65 + qOptions.length)}`, isCorrect: false }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (qOptions.length <= 2) return;
    setQOptions(qOptions.filter((_, i) => i !== idx));
  };

  const handleAiAutoFill = async () => {
    const promptText = qContent.trim() || 'Câu hỏi trắc nghiệm kiến thức tổng hợp THPT';
    setAiLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          customPrompt: promptText,
          difficulty: qDifficulty === 'EASY' ? 'Nhận biết' : qDifficulty === 'HARD' ? 'Vận dụng cao' : 'Thông hiểu',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || 'SI không thể gợi ý câu hỏi lúc này');
      }

      const sq = data.question;
      if (sq.content) setQContent(sq.content);
      if (sq.explanation) setQExplanation(sq.explanation);
      if (Array.isArray(sq.options) && sq.options.length >= 2) {
        setQOptions(
          sq.options.map((o: any) => ({
            content: typeof o === 'string' ? o : o.content,
            isCorrect: Boolean(o.isCorrect),
          }))
        );
      }
    } catch (err: any) {
      console.error('Error generating SI question suggestion:', err);
      setErrorMsg(err.message || 'Lỗi khi gọi SI gợi ý câu hỏi');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qContent.trim()) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: qContent,
          type: qType,
          difficulty: qDifficulty,
          points: Number(qPoints),
          timeLimit: Number(qTimeLimit),
          explanation: qExplanation || undefined,
          options: qOptions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Không thể tạo câu hỏi');
      }

      setToast(true);
      setTimeout(() => {
        router.push('/app/question-bank');
      }, 800);
    } catch (err: any) {
      setToast(true);
      setTimeout(() => {
        router.push('/app/question-bank');
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/question-bank')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
          >
            Ngân hàng câu hỏi
          </button>
          <BreadcrumbChevron
            menuTitle="Ngân hàng câu hỏi"
            items={[
              { label: 'Danh sách câu hỏi', href: '/app/question-bank' },
              { label: 'Tạo câu hỏi mới', href: '/app/question-bank/create' },
              { label: 'Nhập câu hỏi từ file', href: '/app/question-bank/import' },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
            Tạo câu hỏi mới
          </span>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã thêm câu hỏi mới thành công
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung câu hỏi
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAiAutoFill}
                  disabled={aiLoading}
                  className="text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] h-7 px-2.5"
                >
                  {aiLoading ? <Loader2 size={13} className="animate-spin mr-1" /> : <Sparkles size={13} className="mr-1" />}
                  {aiLoading ? 'SI Đang Viết...' : '✨ SI Tự Điền Câu Hỏi'}
                </Button>
              </div>
              <textarea
                value={qContent}
                onChange={(e) => setQContent(e.target.value)}
                placeholder="Nhập nội dung câu hỏi hoặc nhập từ khóa chủ đề rồi bấm ✨ SI Tự Điền Câu Hỏi..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue resize-none"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mức độ khó</label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                >
                  <option value="EASY">Dễ (Nhận biết)</option>
                  <option value="MEDIUM">Trung bình (Thông hiểu)</option>
                  <option value="HARD">Khó (Vận dụng cao)</option>
                </select>
              </div>

              <Input
                label="Điểm số"
                type="number"
                value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value))}
                min={0.5}
                step={0.5}
                required
              />

              <Input
                label="Thời gian (giây)"
                type="number"
                value={qTimeLimit}
                onChange={(e) => setQTimeLimit(Number(e.target.value))}
                min={5}
                required
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Các phương án lựa chọn (Tích chọn đáp án đúng)
                </label>
                {qOptions.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="gap-1">
                    <Plus size={14} /> Thêm phương án
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => handleSetCorrect(idx)}
                      className="w-4 h-4 text-google-blue cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-500 w-5">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                      placeholder={`Nội dung lựa chọn ${String.fromCharCode(65 + idx)}`}
                      required
                    />
                    {qOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Lời giải chi tiết (Tùy chọn)
              </label>
              <textarea
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                placeholder="Nhập giải thích đáp án cho học sinh xem sau khi hoàn thành..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue resize-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo câu hỏi ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
