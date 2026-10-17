'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { CustomSelect } from '@/components/Select';
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
  AlertCircle,
  FileUp,
  Camera,
  BookOpen,
  Lock,
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
  const rawFolderId = searchParams.get('folderId');
  const rawFolderName = searchParams.get('folderName');

  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('app_active_folder_id');
      const storedName = sessionStorage.getItem('app_active_folder_name');
      const effId = rawFolderId || storedId || null;
      const effName = rawFolderName || storedName || null;
      setFolderId(effId);
      setFolderName(effName);
      if (effId) sessionStorage.setItem('app_active_folder_id', effId);
      if (effName) sessionStorage.setItem('app_active_folder_name', effName);

      if (window.location.search) {
        window.history.replaceState(null, '', '/app/documents/create/manual');
      }
    }
  }, [rawFolderId, rawFolderName]);

  const targetQuery = '';
  const { user, token } = useAuthStore();
  const isTeacher = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // BẢO MẬT: Chuyển hướng học sinh về Lớp học nếu truy cập trang tạo đề thi
  useEffect(() => {
    if (user && !isTeacher) {
      router.replace('/classes');
    }
  }, [user, isTeacher, router]);

  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('');
  const [docGrade, setDocGrade] = useState('');

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      setErrorMessage(msg);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      showToast('Đề thi phải có ít nhất 1 câu hỏi!', true);
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
    const userPrompt = targetQ?.content.trim() || docTitle.trim() || (docSubject ? `Kiến thức trọng tâm môn ${docSubject}${docGrade ? ` lớp ${docGrade}` : ''}` : '');

    if (!userPrompt) {
      showToast('Vui lòng nhập nội dung câu hỏi hoặc từ khóa trước khi yêu cầu SI điền!', true);
      return;
    }

    setAiLoadingId(qId);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/si/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'suggest',
          subject: docSubject || '',
          grade: docGrade || '',
          customPrompt: userPrompt,
          difficulty: 'Thông hiểu',
          model: 'gemini-3.5-flash',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.question) {
        throw new Error(data.error || 'SI không thể tạo câu hỏi lúc này. Hệ thống 100% không làm giả dữ liệu.');
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
      showToast('SI đã soạn xong câu hỏi theo đúng chủ đề!');
    } catch (err: any) {
      console.error('Error generating single SI question:', err);
      showToast(err.message || 'Lỗi kết nối SI. Hệ thống 100% không làm giả dữ liệu.', true);
    } finally {
      setAiLoadingId(null);
    }
  };

  const handleSaveQuiz = async () => {
    let finalTitle = docTitle.trim();
    if (!finalTitle) {
      if (questions[0]?.content.trim()) {
        const snippet = questions[0].content.trim().slice(0, 35);
        finalTitle = `Đề thi: ${snippet}`;
      } else {
        finalTitle = `Đề thi trắc nghiệm (${docSubject && docSubject !== 'Không chọn' ? docSubject : 'Tổng hợp'}) - ${new Date().toLocaleDateString('vi-VN')}`;
      }
    }

    const hasEmptyQuestion = questions.some((q) => !q.content.trim());
    if (hasEmptyQuestion) {
      showToast('Vui lòng điền nội dung cho tất cả các câu hỏi!');
      return;
    }

    const totalQ = questions.length;
    const pt = Math.round((10 / totalQ) * 100) / 100;

    let result = AiToolRegistry.createExam({
      title: finalTitle,
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

    showToast('Đã tạo và lưu đề thi thành công!');
    setTimeout(() => {
      if (result.data?.examUrl) {
        router.push(result.data.examUrl);
      } else {
        router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
      }
    }, 1000);
  };

  if (user && !isTeacher) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Quyền truy cập bị hạn chế</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm mb-4">
            Chỉ tài khoản giáo viên mới có quyền tạo đề thi và quản lý tài liệu. Đang chuyển hướng bạn về danh sách lớp học
          </p>
          <Button onClick={() => router.replace('/classes')} className="bg-primary hover:bg-primary/90 text-white text-sm">
            Về trang Lớp học
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/documents')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            Tài liệu của tôi
          </button>
          {folderName ? (
            <>
              <BreadcrumbChevron
                folderId={null}
                fallbackToStaticChevron={true}
                onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
              />
              <button
                type="button"
                onClick={() => router.push(`/app/documents?folderId=${folderId || ''}`)}
                className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
              >
                {folderName}
              </button>
              <BreadcrumbChevron
                folderId={folderId || null}
                fallbackToStaticChevron={true}
                onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
              />
            </>
          ) : (
            <BreadcrumbChevron
              folderId={null}
              fallbackToStaticChevron={true}
              onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
            />
          )}
          <button
            type="button"
            onClick={() => router.push('/app/documents/create' + targetQuery)}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            Tạo đề thi
          </button>
          <BreadcrumbChevron
            menuTitle="Phương thức tạo đề"
            items={[
              { label: 'Tải lên Word/PDF', href: `/app/documents/create${targetQuery}`, icon: <FileUp size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Tạo đề bằng SI', href: `/app/documents/create/si${targetQuery}`, icon: <Sparkles size={14} className="text-amber-500 shrink-0" /> },
              { label: 'Nhận diện ảnh (OCR)', href: `/app/documents/create/ocr${targetQuery}`, icon: <Camera size={14} className="text-purple-500 shrink-0" /> },
              { label: 'Ngân hàng câu hỏi', href: `/app/documents/create/bank${targetQuery}`, icon: <BookOpen size={14} className="text-emerald-500 shrink-0" /> },
              { label: 'Nhập thủ công', href: `/app/documents/create/manual${targetQuery}`, icon: <PenTool size={14} className="text-rose-500 shrink-0" /> },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Soạn đề thủ công
          </span>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce pointer-events-none ${
          errorMessage
            ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
        }`}>
          {errorMessage ? (
            <AlertCircle size={16} className="text-white shrink-0" />
          ) : (
            <Check size={16} className="text-google-green shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-1">
              <Input
                label="Tên đề thi"
                placeholder="Nhập tên đề thi hiển thị"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Môn học
              </label>
              <CustomSelect
                value={docSubject}
                onChange={(val) => setDocSubject(String(val))}
                options={[
                  { value: '', label: 'Không chọn' },
                  { value: 'Toán', label: 'Toán' },
                  { value: 'Tiếng Anh', label: 'Tiếng Anh' },
                  { value: 'Ngữ văn', label: 'Ngữ văn' },
                  { value: 'Vật lý', label: 'Vật lý' },
                  { value: 'Hóa học', label: 'Hóa học' },
                  { value: 'Sinh học', label: 'Sinh học' },
                  { value: 'Lịch sử', label: 'Lịch sử' },
                  { value: 'Địa lý', label: 'Địa lý' },
                  { value: 'Giáo dục công dân', label: 'GDCD / KT&PL' },
                  { value: 'Tin học', label: 'Tin học' },
                ]}
                placeholder="Không chọn"
                size="sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Khối lớp
              </label>
              <CustomSelect
                value={docGrade}
                onChange={(val) => setDocGrade(String(val))}
                options={[
                  { value: '', label: 'Không chọn' },
                  { value: '12', label: 'Lớp 12' },
                  { value: '11', label: 'Lớp 11' },
                  { value: '10', label: 'Lớp 10' },
                  { value: '9', label: 'Lớp 9' },
                  { value: '8', label: 'Lớp 8' },
                  { value: '7', label: 'Lớp 7' },
                  { value: '6', label: 'Lớp 6' },
                  { value: '5', label: 'Lớp 5' },
                  { value: '4', label: 'Lớp 4' },
                  { value: '3', label: 'Lớp 3' },
                  { value: '2', label: 'Lớp 2' },
                  { value: '1', label: 'Lớp 1' },
                ]}
                placeholder="Không chọn"
                size="sm"
              />
            </div>
          </div>

          {/* Question Items List */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-normal text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-google-blue" />
                Danh sách câu hỏi {questions.length}
              </h2>

              <Button size="sm" variant="outline" onClick={handleAddQuestion}>
                <Plus size={16} className="mr-1" /> Thêm câu hỏi
              </Button>
            </div>

            <div className="space-y-5">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="py-5 space-y-4"
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
                        {aiLoadingId === q.id ? 'SI Đang Viết' : '✨ SI Điền Tự Động'}
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
                      placeholder={`Nhập nội dung câu hỏi thứ ${qIdx + 1} hoặc nhập từ khóa rồi nhấn nút ✨ SI Điền Tự Động`}
                      value={q.content}
                      onChange={(e) => handleQuestionChange(q.id, 'content', e.target.value)}
                      className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-google-blue resize-none"
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
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`}
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
                      placeholder="Nhập giải thích cho đáp án đúng"
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải biểu mẫu soạn đề</div>}>
      <ManualQuizCreateContent />
    </Suspense>
  );
}
