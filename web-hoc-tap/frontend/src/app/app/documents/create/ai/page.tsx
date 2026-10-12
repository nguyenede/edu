'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Sparkles, Check, Wand2, ChevronRight, AlertCircle } from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';

function AiQuizCreateContent() {
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
        window.history.replaceState(null, '', '/app/documents/create/ai');
      }
    }
  }, [rawFolderId, rawFolderName]);

  const targetQuery = '';
  const token = useAuthStore((state) => state.token);

  const [aiTopic, setAiTopic] = useState('');
  const [docGrade, setDocGrade] = useState('');
  const [docSubject, setDocSubject] = useState('');
  const [numQuestions, setNumQuestions] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!aiTopic.trim()) {
      setErrorMessage('Vui lòng nhập mô tả bài học hoặc chủ đề!');
      setToastMessage('Vui lòng nhập mô tả bài học hoặc chủ đề!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'topic',
          subject: docSubject || '',
          grade: docGrade || '',
          topic: aiTopic.trim(),
          numQuestions: numQuestions ? Number(numQuestions) : 10,
          difficulty: difficulty || '',
          model: 'gemini-3.5-flash-lite',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.exam) {
        throw new Error(data.error || 'Máy chủ AI không thể tạo đề thi lúc này');
      }

      const generatedExam = data.exam;

      // Save the real AI generated exam into Document storage
      let result = AiToolRegistry.createExam({
        title: generatedExam.title,
        subject: generatedExam.subject || docSubject || 'Kiến thức tổng hợp',
        grade: generatedExam.grade || docGrade || 'Tự do',
        durationMinutes: generatedExam.durationMinutes || 45,
        questions: generatedExam.questions,
        folderId: folderId || undefined,
      });
      result = await syncExamActionToDocument(token, result);

      setToastMessage(`AI đã tạo thành công ${generatedExam.questions.length} câu hỏi chuẩn xác!`);

      setTimeout(() => {
        if (result.data?.examUrl) {
          router.push(result.data.examUrl);
        } else {
          router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error generating AI quiz:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình sinh đề thi.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/documents')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Tài liệu của tôi
          </button>
          {folderName ? (
            <>
              <BreadcrumbChevron
                folderId={null}
                onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
              />
              <button
                type="button"
                onClick={() => router.push(`/app/documents?folderId=${folderId || ''}`)}
                className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal"
              >
                {folderName}
              </button>
              <BreadcrumbChevron
                folderId={folderId || null}
                onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
              />
            </>
          ) : (
            <BreadcrumbChevron
              folderId={null}
              onNavigateFolder={(id) => router.push(`/app/documents?folderId=${id}`)}
            />
          )}
          <button
            type="button"
            onClick={() => router.push('/app/documents/create' + targetQuery)}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal"
          >
            Tạo đề thi
          </button>
          <BreadcrumbChevron
            menuTitle="Phương thức tạo đề"
            items={[
              { label: 'Tải lên Word/PDF', href: `/app/documents/create${targetQuery}` },
              { label: 'Tạo đề bằng AI', href: `/app/documents/create/ai${targetQuery}` },
              { label: 'Nhận diện ảnh (OCR)', href: `/app/documents/create/ocr${targetQuery}` },
              { label: 'Ngân hàng câu hỏi', href: `/app/documents/create/bank${targetQuery}` },
              { label: 'Nhập thủ công', href: `/app/documents/create/manual${targetQuery}` },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Tạo đề bằng AI
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

      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60">
            <Wand2 size={24} className="text-amber-500 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Trình tạo câu hỏi trắc nghiệm tự động 100% bằng AI
              </h2>
              <p className="text-xs text-slate-500">
                Nhập chủ đề bài học, AI sẽ trực tiếp suy luận và sinh ra các câu hỏi trắc nghiệm kèm đáp án chuẩn xác
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Mô tả
              </label>
              <textarea
                rows={4}
                placeholder="Mô tả"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                style={{ resize: 'none' }}
                className="w-full px-4 py-3 bg-google-input dark:bg-google-input-dark border border-slate-200/60 dark:border-transparent text-slate-900 dark:text-slate-100 rounded-xl text-sm outline-none focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 transition-colors resize-none leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Môn học
                </label>
                <select
                  value={docSubject}
                  onChange={(e) => setDocSubject(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Không chọn</option>
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
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Không chọn</option>
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Số lượng câu hỏi
                </label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Không chọn</option>
                  <option value="5">5 câu hỏi</option>
                  <option value="10">10 câu hỏi</option>
                  <option value="20">20 câu hỏi</option>
                  <option value="40">40 câu hỏi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mức độ nhận thức
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Không chọn</option>
                  <option value="Nhận biết">Nhận biết</option>
                  <option value="Thông hiểu">Thông hiểu</option>
                  <option value="Vận dụng">Vận dụng</option>
                  <option value="Vận dụng cao">Vận dụng cao</option>
                </select>
              </div>
            </div>
          </div>

          {isGenerating && (
            <div className="p-6 text-center space-y-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-amber-500 mx-auto" />
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                AI đang suy luận nội dung và khởi tạo đề thi trắc nghiệm...
              </p>
              <p className="text-[11px] text-slate-400">
                {docSubject || docGrade
                  ? `Đang biên soạn các câu hỏi theo chuẩn chương trình GDPT${docSubject ? ` môn ${docSubject}` : ''}${docGrade ? ` Lớp ${docGrade}` : ''}`
                  : 'Đang biên soạn các câu hỏi trắc nghiệm theo nội dung mô tả'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => router.push('/app/documents/create' + targetQuery)} disabled={isGenerating}>
              Hủy
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles size={16} className="mr-1.5" /> {isGenerating ? 'AI Đang Xử Lý...' : 'Tạo Đề Thi Bằng AI'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AiQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải cấu hình AI...</div>}>
      <AiQuizCreateContent />
    </Suspense>
  );
}
