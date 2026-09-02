'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  PenTool,
  Plus,
  Trash2,
  Check,
  Layers,
  Save,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';

interface QuestionItem {
  id: string;
  content: string;
  points: number;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

function ManualQuizCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');
  const targetQuery = folderId && folderName ? `?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}` : '';
  const token = useAuthStore((state) => state.token);

  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('Toán');
  const [docGrade, setDocGrade] = useState('12');

  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q_1',
      content: '',
      points: 1.0,
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ],
      explanation: '',
    },
  ]);

  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        content: '',
        points: 1.0,
        options: [
          { content: '', isCorrect: true },
          { content: '', isCorrect: false },
          { content: '', isCorrect: false },
          { content: '', isCorrect: false },
        ],
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      alert('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleQuestionChange = (qId: string, field: 'content' | 'explanation', value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, [field]: value } : q))
    );
  };

  const handleOptionChange = (qId: string, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = { ...newOpts[optIdx], content: value };
        return { ...q, options: newOpts };
      })
    );
  };

  const handleSelectCorrectOption = (qId: string, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = q.options.map((opt, idx) => ({
          ...opt,
          isCorrect: idx === optIdx,
        }));
        return { ...q, options: newOpts };
      })
    );
  };

  const handleAiSuggestQuestion = async (qId: string) => {
    const targetQ = questions.find((q) => q.id === qId);
    const userPrompt = targetQ?.content.trim() || docTitle.trim() || `Kiến thức trọng tâm môn ${docSubject} lớp ${docGrade}`;

    setAiLoadingId(qId);
    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          subject: docSubject,
          grade: docGrade,
          customPrompt: userPrompt,
          difficulty: 'Thông hiểu',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || 'AI không thể gợi ý câu hỏi lúc này');
      }

      const sq = data.question;

      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== qId) return q;
          return {
            ...q,
            content: sq.content || q.content,
            explanation: sq.explanation || q.explanation,
            options: Array.isArray(sq.options) && sq.options.length === 4
              ? sq.options.map((o: any) => ({ content: o.content, isCorrect: Boolean(o.isCorrect) }))
              : q.options,
          };
        })
      );
    } catch (err: any) {
      console.error('Error generating single AI question:', err);
      alert(err.message || 'Lỗi khi gọi AI tạo câu hỏi');
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleSaveQuiz = async () => {
    if (!docTitle.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }
    const hasEmptyQuestion = questions.some((q) => !q.content.trim());
    if (hasEmptyQuestion) {
      alert('Vui lòng điền nội dung cho tất cả các câu hỏi!');
      return;
    }

    const totalQ = questions.length;
    const pt = Math.round((10 / totalQ) * 100) / 100;

    let result = AiToolRegistry.createExam({
      title: docTitle.trim(),
      subject: docSubject,
      grade: docGrade,
      durationMinutes: totalQ <= 15 ? 30 : 60,
      questions: questions.map((q, idx) => ({
        id: `q_${idx + 1}`,
        content: q.content,
        points: pt,
        options: q.options,
      })),
      folderId: folderId || undefined,
    });
    result = await syncExamActionToDocument(token, result);

    setToastMessage('Đã tạo và lưu đề thi thành công!');
    setTimeout(() => {
      if (result.data?.examUrl) {
        router.push(result.data.examUrl);
      } else {
        router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
      }
    }, 1000);
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-normal tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/documents')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Tài liệu của tôi
          </button>
          {folderName && (
            <>
              <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
              <button
                type="button"
                onClick={() => router.push(`/app/documents?folderId=${folderId || ''}`)}
                className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
              >
                {folderName}
              </button>
            </>
          )}
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <button
            type="button"
            onClick={() => router.push('/app/documents/create' + targetQuery)}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Tạo đề thi
          </button>
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Soạn đề thủ công + Trợ lý AI
          </span>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce pointer-events-none">
          <Check size={16} className="text-google-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-1">
              <Input
                label="Tên đề thi"
                placeholder="Nhập tên đề thi hiển thị..."
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Môn học
              </label>
              <select
                value={docSubject}
                onChange={(e) => setDocSubject(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-google-blue"
              >
                <option value="Toán">Toán</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lý">Địa lý</option>
                <option value="Giáo dục công dân">GDCD / KT&PL</option>
                <option value="Tin học">Tin học</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Khối lớp
              </label>
              <select
                value={docGrade}
                onChange={(e) => setDocGrade(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-google-blue"
              >
                <option value="12">Lớp 12</option>
                <option value="11">Lớp 11</option>
                <option value="10">Lớp 10</option>
                <option value="9">Lớp 9</option>
                <option value="8">Lớp 8</option>
                <option value="7">Lớp 7</option>
                <option value="6">Lớp 6</option>
                <option value="5">Lớp 5</option>
                <option value="4">Lớp 4</option>
                <option value="3">Lớp 3</option>
                <option value="2">Lớp 2</option>
                <option value="1">Lớp 1</option>
              </select>
            </div>
          </div>

          {/* Question Items List */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-google-blue" />
                Danh sách câu hỏi ({questions.length})
              </h2>

              <Button size="sm" variant="outline" onClick={handleAddQuestion}>
                <Plus size={16} className="mr-1" /> Thêm câu hỏi
              </Button>
            </div>

            <div className="space-y-5">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-google-blue bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-lg">
                        Câu hỏi {qIdx + 1}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAiSuggestQuestion(q.id)}
                        disabled={aiLoadingId === q.id}
                        className="text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] h-7 px-2.5"
                      >
                        {aiLoadingId === q.id ? (
                          <Loader2 size={13} className="animate-spin mr-1" />
                        ) : (
                          <Sparkles size={13} className="mr-1" />
                        )}
                        {aiLoadingId === q.id ? 'AI Đang Viết...' : '✨ AI Điền Tự Động'}
                      </Button>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-google-red transition-colors cursor-pointer"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nội dung câu hỏi
                    </label>
                    <textarea
                      rows={2}
                      placeholder={`Nhập nội dung câu hỏi thứ ${qIdx + 1} hoặc nhập từ khóa rồi nhấn nút ✨ AI Điền Tự Động...`}
                      value={q.content}
                      onChange={(e) => handleQuestionChange(q.id, 'content', e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-google-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Các phương án trả lời (Tích chọn ô tròn để chỉ định đáp án đúng)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                            opt.isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={opt.isCorrect}
                            onChange={() => handleSelectCorrectOption(q.id, optIdx)}
                            className="w-4 h-4 text-google-green focus:ring-google-green cursor-pointer shrink-0"
                          />
                          <span className="text-xs font-bold text-slate-500">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <input
                            type="text"
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}...`}
                            value={opt.content}
                            onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                            className="w-full text-xs bg-transparent focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">
                      Lời giải chi tiết (không bắt buộc)
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập giải thích cho đáp án đúng..."
                      value={q.explanation || ''}
                      onChange={(e) => handleQuestionChange(q.id, 'explanation', e.target.value)}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={handleAddQuestion}>
                <Plus size={16} className="mr-1" /> Thêm câu hỏi
              </Button>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/app/documents/create' + targetQuery)}>
                  Hủy
                </Button>
                <Button onClick={handleSaveQuiz} className="bg-google-blue hover:bg-blue-600 text-white font-bold">
                  <Save size={16} className="mr-1.5" /> Lưu & Xuất Bản Đề Thi
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ManualQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải biểu mẫu soạn đề...</div>}>
      <ManualQuizCreateContent />
    </Suspense>
  );
}
