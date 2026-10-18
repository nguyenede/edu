'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/Select';
import { Sparkles, Check, Wand2, ChevronRight, AlertCircle, FileUp, Camera, BookOpen, PenTool, Lock } from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';
import { detectSubjectFromText, detectGradeFromText } from '@/lib/examStructureParser';

function AiQuizCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFolderId = searchParams && typeof searchParams.get === 'function' ? searchParams.get('folderId') : null;
  const rawFolderName = searchParams && typeof searchParams.get === 'function' ? searchParams.get('folderName') : null;

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
        window.history.replaceState(null, '', '/app/documents/create/si');
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

  const [aiTopic, setAiTopic] = useState('');
  const [docGrade, setDocGrade] = useState('');
  const [docSubject, setDocSubject] = useState('');
  const [numQuestions, setNumQuestions] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTopicChange = (val: string) => {
    setAiTopic(val);
    if (!docSubject) {
      const s = detectSubjectFromText(val);
      if (s && s !== 'Kiến thức tổng hợp') {
        setDocSubject(s);
      }
    }
    if (!docGrade) {
      const g = detectGradeFromText(val);
      if (g && g !== 'Tự do') {
        setDocGrade(g);
      }
    }
  };

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
      const res = await fetch('/api/si/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'topic',
          subject: docSubject || '',
          grade: docGrade || '',
          topic: aiTopic.trim(),
          numQuestions: numQuestions ? Number(numQuestions) : 10,
          difficulty: difficulty || '',
          model: 'gemini-3.5-flash',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.exam) {
        throw new Error(data.error || 'Máy chủ SI không thể tạo đề thi lúc này');
      }

      const generatedExam = data.exam;
      let finalSubject = generatedExam.subject || docSubject || 'Kiến thức tổng hợp';
      let finalGrade = generatedExam.grade || (docGrade ? `Lớp ${docGrade}` : 'Tự do');
      if (/^\d{1,2}$/.test(finalGrade.trim())) {
        finalGrade = `Lớp ${finalGrade.trim()}`;
      }

      // Save the real AI generated exam into Document storage
      let result = AiToolRegistry.createExam({
        title: generatedExam.title,
        subject: finalSubject,
        grade: finalGrade,
        durationMinutes: generatedExam.durationMinutes || 45,
        questions: generatedExam.questions,
        folderId: folderId || undefined,
      });
      result = await syncExamActionToDocument(token, result);

      setToastMessage(`SI đã tạo thành công ${generatedExam.questions.length} câu hỏi chuẩn xác!`);

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
            Tạo đề bằng SI
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
                Trình tạo câu hỏi trắc nghiệm tự động 100% bằng SI
              </h2>
              <p className="text-xs text-slate-500">
                Nhập chủ đề bài học, SI sẽ trực tiếp suy luận và sinh ra các câu hỏi trắc nghiệm kèm đáp án chuẩn xác
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                Thử lại ngay
              </button>
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
                onChange={(e) => handleTopicChange(e.target.value)}
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Số lượng câu hỏi
                </label>
                <CustomSelect
                  value={numQuestions}
                  onChange={(val) => setNumQuestions(String(val))}
                  options={[
                    { value: '', label: 'Không chọn' },
                    { value: '5', label: '5 câu hỏi' },
                    { value: '10', label: '10 câu hỏi' },
                    { value: '20', label: '20 câu hỏi' },
                    { value: '40', label: '40 câu hỏi' },
                  ]}
                  placeholder="Không chọn"
                  size="sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mức độ nhận thức
                </label>
                <CustomSelect
                  value={difficulty}
                  onChange={(val) => setDifficulty(String(val))}
                  options={[
                    { value: '', label: 'Không chọn' },
                    { value: 'Nhận biết', label: 'Nhận biết' },
                    { value: 'Thông hiểu', label: 'Thông hiểu' },
                    { value: 'Vận dụng', label: 'Vận dụng' },
                    { value: 'Vận dụng cao', label: 'Vận dụng cao' },
                  ]}
                  placeholder="Không chọn"
                  size="sm"
                />
              </div>
            </div>
          </div>

          {isGenerating && (
            <div className="p-6 text-center space-y-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/50">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-amber-500 mx-auto" />
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                SI đang suy luận nội dung và khởi tạo đề thi trắc nghiệm
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
              <Sparkles size={16} className="mr-1.5" /> {isGenerating ? 'SI Đang Xử Lý' : 'Tạo Đề Thi Bằng SI'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AiQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải cấu hình SI</div>}>
      <AiQuizCreateContent />
    </Suspense>
  );
}
