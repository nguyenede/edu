'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { parseDocxFile, ParsedQuiz } from '@/lib/docParser';
import { parseExamFileStructure, validateDeterministicResult } from '@/lib/examStructureParser';
import { downloadSampleTemplate } from '@/lib/templateGenerator';
import { extractFileForAi } from '@/lib/fileExtractor';
import { validateEducationalDocument } from '@/lib/questionValidator';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ArrowLeft,
  Upload,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Sparkles,
  FileCode,
  Layers,
  BookOpen,
  ChevronRight,
  PenTool,
  Camera,
  Play,
  Save,
  Edit3,
  Lock,
  AlertCircle,
} from 'lucide-react';

interface ParsedExamQuestion {
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
  points?: number;
  type?: 'multiple_choice' | 'essay' | 'fill_blank' | 'true_false' | 'short_answer';
  rawLabel?: string;
  answer?: string;
}

interface ParsedExamData {
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  questions: ParsedExamQuestion[];
  examUrl: string;
}

interface ManualQuestion {
  id: string;
  content: string;
  points: number;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

function AutoGrowingTextarea({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(46, textareaRef.current.scrollHeight)}px`;
    }
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden ${className}`}
      style={{ overflow: 'hidden' }}
    />
  );
}

function normalizeGradeLabel(g?: string): string {
  if (!g || g === 'Tự do') return 'Tự do';
  const trimmed = g.trim();
  if (/^\d{1,2}$/.test(trimmed)) return `Lớp ${trimmed}`;
  return trimmed;
}

function DocumentCreateContent() {
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
        window.history.replaceState(null, '', '/app/documents/create');
      }
    }
  }, [rawFolderId, rawFolderName]);

  const targetQuery = '';

  // Shared Document Metadata
  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('');
  const [docGrade, setDocGrade] = useState('');

  // Left Side: File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createdExamResult, setCreatedExamResult] = useState<{
    title: string;
    questionCount: number;
    examUrl: string;
    subject?: string;
    grade?: string;
    method?: 'algorithm' | 'si';
    parserUsed?: string;
  } | null>(null);
  const [parsedExamData, setParsedExamData] = useState<ParsedExamData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Trình nhận diện cấu trúc đề thi đa định dạng (.docx, .xlsx, .tex, .azt, .txt, .pdf, Ảnh)
  // Ưu tiên 1: Chạy thuật toán nhận diện cấu trúc có sẵn trong file (100% dữ liệu thật, không qua AI)
  // Ưu tiên 2: Chỉ khi thuật toán KHÔNG nhận diện được cấu trúc mới chuyển qua SI để bóc tách
  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setIsParsing(true);
    setCreatedExamResult(null);
    setErrorMessage(null);

    // Watchdog timer: Đảm bảo giao diện không bao giờ bị treo loading vô hạn
    const watchdogTimer = setTimeout(() => {
      setIsParsing(false);
      setToastMessage('Hệ thống mất nhiều thời gian để xử lý file. Vui lòng kiểm tra lại file của bạn.');
    }, 90000);

    try {
      // 1. CHẠY THUẬT TOÁN NHẬN DIỆN CẤU TRÚC FILE TRƯỚC (100% dữ liệu thật từ file)
      const deterministicResult = await parseExamFileStructure(file);
      const isAlgoValid = validateDeterministicResult(deterministicResult);

      if (isAlgoValid && deterministicResult && deterministicResult.questions.length > 0) {
        // Nhận diện thành công 100% bằng thuật toán từ file (không dùng AI, 100% dữ liệu thật từ file)
        const detectedTitle = deterministicResult.title || cleanName;
        const detectedSubject = deterministicResult.subject || 'Kiến thức tổng hợp';
        const detectedGrade = normalizeGradeLabel(deterministicResult.grade);
        const durationMinutes = deterministicResult.durationMinutes || 45;

        setDocTitle(detectedTitle);
        setDocSubject(detectedSubject);
        setDocGrade(detectedGrade);

        let saveRes = AiToolRegistry.createExam({
          title: detectedTitle,
          subject: detectedSubject,
          grade: detectedGrade,
          durationMinutes,
          questions: deterministicResult.questions,
          folderId: folderId || undefined,
        });

        saveRes = await syncExamActionToDocument(token, saveRes);
        const targetUrl = saveRes.data?.examUrl || (folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');

        setCreatedExamResult({
          title: detectedTitle,
          subject: detectedSubject,
          grade: detectedGrade,
          questionCount: deterministicResult.questions.length,
          examUrl: targetUrl,
          method: 'algorithm',
          parserUsed: deterministicResult.parserUsed,
        });

        setParsedExamData({
          title: detectedTitle,
          subject: detectedSubject,
          grade: detectedGrade,
          durationMinutes,
          questions: deterministicResult.questions,
          examUrl: targetUrl,
        });

        setToastMessage(`Thuật toán đã nhận diện thành công ${deterministicResult.questions.length} câu hỏi theo cấu trúc file!`);
        return;
      }

      // 2. CHỈ KHI THUẬT TOÁN KHÔNG NHẬN DIỆN ĐƯỢC (0 câu hỏi, ảnh chụp, PDF scan)
      const extracted = await extractFileForAi(file);
      const cleanDocText = (extracted.text || '').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[Hình ảnh]').slice(0, 35000);

      // KIỂM ĐỊNH TÍNH HỢP LỆ CỦA TÀI LIỆU TRƯỚC KHI CHUYỂN QUA SI
      if (extracted.type !== 'image') {
        const docCheck = validateEducationalDocument(cleanDocText, file.name);
        if (!docCheck.isValid) {
          setIsParsing(false);
          const reason = docCheck.reason || 'Tài liệu không chứa nội dung bài học hoặc đề thi hợp lệ.';
          setErrorMessage(reason);
          setToastMessage(reason);
          return;
        }
      }

      console.log('Chuyển qua SI để nhận diện nội dung học tập...');

      const aiController = new AbortController();
      const aiTimeoutId = setTimeout(() => aiController.abort(), 75000);

      const res = await fetch('/api/si/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: aiController.signal,
        body: JSON.stringify({
          mode: extracted.type === 'image' ? 'ocr' : 'document',
          documentText: cleanDocText,
          imageBase64: extracted.imageBase64 || null,
          fileName: file.name,
          numQuestions: 15,
          model: 'gemini-3.5-flash',
        }),
      }).finally(() => clearTimeout(aiTimeoutId));

      const data = await res.json();
      if (!res.ok || !data.success || !data.exam) {
        const errorMsg = data.error || 'SI không thể nhận diện đề thi từ tài liệu này. 100% không làm giả dữ liệu.';
        setErrorMessage(errorMsg);
        setToastMessage(errorMsg);
        return;
      }

      const examData = data.exam;
      if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
        throw new Error('Không tìm thấy câu hỏi hợp lệ trong tài liệu. Tuyệt đối không tạo dữ liệu giả.');
      }

      const detectedTitle = examData.title || cleanName;
      const detectedSubject = examData.subject || 'Kiến thức tổng hợp';
      const detectedGrade = normalizeGradeLabel(examData.grade);

      setDocTitle(detectedTitle);
      setDocSubject(detectedSubject);
      setDocGrade(detectedGrade);

      let saveRes = AiToolRegistry.createExam({
        title: detectedTitle,
        subject: detectedSubject,
        grade: detectedGrade,
        durationMinutes: examData.durationMinutes || 45,
        questions: examData.questions,
        folderId: folderId || undefined,
      });

      saveRes = await syncExamActionToDocument(token, saveRes);

      const targetUrl = saveRes.data?.examUrl || (folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');

      setCreatedExamResult({
        title: detectedTitle,
        subject: detectedSubject,
        grade: detectedGrade,
        questionCount: examData.questions.length,
        examUrl: targetUrl,
        method: 'si',
      });

      setParsedExamData({
        title: detectedTitle,
        subject: detectedSubject,
        grade: detectedGrade,
        durationMinutes: examData.durationMinutes || 45,
        questions: examData.questions,
        examUrl: targetUrl,
      });

      setToastMessage(`SI đã nhận diện môn "${detectedSubject}" và tạo thành công ${examData.questions.length} câu hỏi!`);
    } catch (err: any) {
      console.error('Error processing file:', err);
      const msg = err.message || 'Có lỗi xảy ra trong quá trình nhận diện file.';
      setErrorMessage(msg);
      setToastMessage(msg);
    } finally {
      clearTimeout(watchdogTimer);
      setIsParsing(false);
    }
  };

  // Tải file mẫu chuẩn cho giáo viên (100% định dạng mẫu thật, không tạo dữ liệu giả)
  const handleDownloadSampleTemplate = async (templateType: 'pdf' | 'docx' | 'excel' | 'tex' | 'zip') => {
    try {
      await downloadSampleTemplate(templateType);
      setToastMessage(`Đã tải xuống file đề mẫu chuẩn (${templateType.toUpperCase()}) thành công!`);
    } catch (err: any) {
      console.error('Error downloading template:', err);
      alert('Lỗi tải file mẫu: ' + (err.message || 'Không thể tải file'));
    }
  };

  const handleSelectParsedCorrectOption = (qIdx: number, optIdx: number) => {
    if (!parsedExamData) return;
    const updated = [...parsedExamData.questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: updated[qIdx].options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === optIdx,
      })),
    };
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleUpdateParsedQuestionContent = (qIdx: number, newContent: string) => {
    if (!parsedExamData) return;
    const updated = [...parsedExamData.questions];
    updated[qIdx] = { ...updated[qIdx], content: newContent };
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleUpdateParsedOptionContent = (qIdx: number, optIdx: number, newContent: string) => {
    if (!parsedExamData) return;
    const updated = [...parsedExamData.questions];
    const newOptions = [...updated[qIdx].options];
    newOptions[optIdx] = { ...newOptions[optIdx], content: newContent };
    updated[qIdx] = { ...updated[qIdx], options: newOptions };
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleUpdateParsedExplanation = (qIdx: number, newExplanation: string) => {
    if (!parsedExamData) return;
    const updated = [...parsedExamData.questions];
    updated[qIdx] = { ...updated[qIdx], explanation: newExplanation };
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleDeleteParsedQuestion = (qIdx: number) => {
    if (!parsedExamData) return;
    if (parsedExamData.questions.length <= 1) {
      alert('Đề thi cần có ít nhất 1 câu hỏi.');
      return;
    }
    const updated = parsedExamData.questions.filter((_, idx) => idx !== qIdx);
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleAddParsedQuestion = () => {
    if (!parsedExamData) return;
    const newQ: ParsedExamQuestion = {
      content: '',
      points: Number((10 / (parsedExamData.questions.length + 1)).toFixed(2)),
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ],
      explanation: '',
    };
    setParsedExamData({
      ...parsedExamData,
      questions: [...parsedExamData.questions, newQ],
    });
  };

  const handleAddDefaultOptionsToQuestion = (qIdx: number) => {
    if (!parsedExamData) return;
    const updated = [...parsedExamData.questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ],
    };
    setParsedExamData({ ...parsedExamData, questions: updated });
  };

  const handleSaveExamEdits = async () => {
    if (!parsedExamData) return;
    setIsSavingChanges(true);
    try {
      let saveRes = AiToolRegistry.createExam({
        title: parsedExamData.title,
        subject: parsedExamData.subject,
        grade: parsedExamData.grade,
        durationMinutes: parsedExamData.durationMinutes,
        questions: parsedExamData.questions,
        folderId: folderId || undefined,
      });
      saveRes = await syncExamActionToDocument(token, saveRes);
      setToastMessage('Đã lưu thành công các câu hỏi vào kho tài liệu!');
    } catch (e: any) {
      alert('Lỗi lưu thay đổi: ' + e.message);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmUpload = () => {
    if (createdExamResult?.examUrl) {
      router.push(createdExamResult.examUrl);
    } else {
      router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
    }
  };

  if (user && !isTeacher) {
    return (
      <AppShell title="Quyền truy cập">
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
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Tạo đề thi
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

      <div className="w-full max-w-full px-2 space-y-6 pt-2 pb-16">

        {/* TWO-COLUMN MAIN LAYOUT (FULL WIDTH STRETCH TO LEFT & RIGHT EDGES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          {/* LEFT SIDE: KHUNG TẢI FILE LÊN THẬT TO & CAO (7 COLUMNS) */}
          <div className="lg:col-span-7">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleProcessFile(e.dataTransfer.files[0]);
                }
              }}
              className={`min-h-[520px] md:min-h-[580px] p-8 md:p-12 rounded-3xl text-center flex flex-col justify-center items-center space-y-5 transition-all ${
                isDragging
                  ? 'border-2 border-dashed border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 scale-[1.01]'
                  : 'bg-blue-50/40 dark:bg-slate-800/40 hover:bg-blue-50/70'
              }`}
            >
              {/* Cloud Upload Icon */}
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950 text-google-blue flex items-center justify-center mx-auto shadow-md">
                <Upload size={40} />
              </div>

              {/* Title & Description Lines */}
              <div className="space-y-2 max-w-xl mx-auto">
                <h3 className="text-xl md:text-2xl font-normal text-slate-900 dark:text-white">
                  Chọn File hoặc kéo thả File vào đây
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Hỗ trợ các định dạng .pdf, .docx, .xlsx, .azt, .tex, .zip, Ảnh
                </p>
                <p className="text-xs text-slate-500 font-normal">
                  SI sẽ tự động đọc tài liệu và biên soạn bài tập / đề thi trắc nghiệm hoàn chỉnh.
                </p>
              </div>

              {/* File Button & Selection Status */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 max-w-full">
                <input
                  type="file"
                  id="custom-doc-file-input"
                  accept=".pdf,.docx,.xlsx,.azt,.tex,.zip,.png,.jpg,.jpeg,.webp,.bmp,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="custom-doc-file-input"
                  className="px-6 py-2.5 rounded-xl bg-google-blue hover:bg-blue-600 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  Chọn tệp
                </label>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-visible">
                  {selectedFile ? selectedFile.name : 'Không có tệp nào được chọn'}
                </span>
              </div>

              {/* Sample Template Links Row */}
              <div className="pt-4 text-[11px] md:text-xs font-bold text-google-blue flex flex-wrap items-center justify-center gap-2 max-w-2xl leading-relaxed">
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate('pdf')}
                  className="hover:underline cursor-pointer text-google-blue font-bold"
                >
                  Đề mẫu Pdf
                </button>
                <span className="text-slate-300 font-normal">|</span>
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate('docx')}
                  className="hover:underline cursor-pointer text-google-blue font-bold"
                >
                  Đề mẫu Docx
                </button>
                <span className="text-slate-300 font-normal">|</span>
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate('excel')}
                  className="hover:underline cursor-pointer text-google-blue font-bold"
                >
                  File Excel bảng đáp án đề Offline
                </button>
                <span className="text-slate-300 font-normal">|</span>
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate('tex')}
                  className="hover:underline cursor-pointer text-google-blue font-bold"
                >
                  File Latex mẫu .tex
                </button>
                <span className="text-slate-300 font-normal">|</span>
                <button
                  type="button"
                  onClick={() => handleDownloadSampleTemplate('zip')}
                  className="hover:underline cursor-pointer text-google-blue font-bold"
                >
                  File Latex mẫu .zip
                </button>
              </div>

              {/* Bottom Announcement Text */}
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center pt-1">
                Hệ thống nhận diện tự động theo cấu trúc file (.docx, .xlsx, .tex, .azt, .txt, .pdf) và chuyển qua SI khi cần
              </p>
            </div>

            {/* AI File Parsing Status */}
            {isParsing && (
              <div className="mt-4 p-5 text-center space-y-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 animate-pulse">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue mx-auto" />
                <p className="text-sm text-google-blue dark:text-blue-300 font-bold flex items-center justify-center gap-2">
                  <Sparkles size={18} className="text-google-blue" />
                  Đang nhận diện đề thi từ {selectedFile?.name}
                </p>
                <p className="text-xs text-slate-500">
                  Hệ thống đang trích xuất câu hỏi, phương án A/B/C/D, đáp án đúng và lời giải chi tiết
                </p>
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && !isParsing && (
              <div className="mt-4 p-5 bg-red-50/95 dark:bg-red-950/40 rounded-2xl border border-red-300 dark:border-red-800 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertCircle size={26} className="text-red-600 shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200">
                        Không thể nhận diện đề thi
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-red-900 dark:text-white truncate-tight">
                      {selectedFile?.name || 'Tài liệu không hợp lệ'}
                    </h4>
                    <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                      {errorMessage}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-700 hover:bg-red-100/50"
                    onClick={() => {
                      setErrorMessage(null);
                      setSelectedFile(null);
                    }}
                  >
                    Đóng thông báo
                  </Button>
                </div>
              </div>
            )}

            {/* AI Exam Generated Success Box */}
            {createdExamResult && (
              <div className="mt-4 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-google-green shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate-tight">
                      {createdExamResult.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {createdExamResult.questionCount} câu hỏi
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreatedExamResult(null);
                      setParsedExamData(null);
                      setSelectedFile(null);
                    }}
                  >
                    Tải file khác
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-medium"
                    onClick={() => setIsPreviewModalOpen(true)}
                  >
                    Xem trước ({createdExamResult.questionCount} câu)
                  </Button>
                  <Button
                    size="sm"
                    className="bg-google-blue hover:bg-[#1557b0] text-white text-xs font-medium"
                    onClick={() => router.push(createdExamResult.examUrl)}
                  >
                    Vào xem đề
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: DANH SÁCH CÁC TÙY CHỌN TẠO ĐỀ TỪNG DÒNG (5 COLUMNS) */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={20} className="text-google-blue" />
              Các hình thức tạo đề thi khác
            </h2>

            <div className="space-y-3">
              {/* DÒNG 1: SOẠN ĐỀ THỦ CÔNG */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/manual' + targetQuery)}
                className="w-full p-4 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-2xl transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 text-google-blue flex items-center justify-center shrink-0">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Soạn đề thi thủ công
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                       Tự nhập nội dung câu hỏi, đáp án A/B/C/D và lời giải
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* DÒNG 2: TẠO ĐỀ THI BẰNG AI */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/si' + targetQuery)}
                className="w-full p-4 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-2xl transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Tạo đề thi bằng SI
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Tự động tạo câu hỏi trắc nghiệm từ từ khóa hoặc chủ đề
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* DÒNG 3: NHẬP TỪ NGÂN HÀNG CÂU HỎI */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/bank' + targetQuery)}
                className="w-full p-4 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-2xl transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-google-green flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Nhập từ Ngân hàng câu hỏi
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Trích xuất câu hỏi từ kho tài liệu và đề thi có sẵn
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </button>

              {/* DÒNG 4: QUÉT ĐỀ THI TỪ ẢNH CHỤP (OCR) */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/ocr' + targetQuery)}
                className="w-full p-4 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-2xl transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Camera size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">
                      Quét đề thi từ ảnh chụp (OCR)
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Nhận diện câu hỏi từ hình ảnh đề thi in giấy
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* MODAL XEM TRƯỚC VÀ CHỈNH SỬA CÂU HỎI (CHỈ MỞ KHI BẤM NÚT "XEM TRƯỚC") */}
        {parsedExamData && (
          <Modal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            maxWidth="3xl"
            title={parsedExamData.title || 'Xem trước & Chỉnh sửa câu hỏi'}
            description={`Đã trích xuất ${parsedExamData.questions.length} câu hỏi, thời gian làm bài: ${parsedExamData.durationMinutes || 45} phút`}
          >
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-blue-50/80 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold text-xs">
                  Tổng số: {parsedExamData.questions.length} câu
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs">
                  Thang điểm 10
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAddParsedQuestion}
                className="text-xs font-semibold text-google-blue hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <Plus size={14} className="mr-1" />
                Thêm câu hỏi
              </Button>
            </div>

            {/* Questions List Container */}
            <div className="space-y-4 pt-3 max-h-[68vh] overflow-y-auto pr-1">
              {parsedExamData.questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl space-y-3.5"
                >
                  {/* Card Header (Frameless, Không đường kẻ ngang) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-lg bg-google-blue text-white font-bold text-xs shadow-2xs">
                        Câu {qIdx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {q.points || (10 / parsedExamData.questions.length).toFixed(2)} điểm
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteParsedQuestion(qIdx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Nội dung câu hỏi:
                    </label>
                    <AutoGrowingTextarea
                      value={q.content}
                      onChange={(val) => handleUpdateParsedQuestionContent(qIdx, val)}
                      placeholder="Nhập nội dung câu hỏi"
                      className="p-3 bg-white dark:bg-slate-900/80 border-0 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-google-blue/30 leading-relaxed shadow-none"
                    />
                  </div>

                  {/* Options List */}
                  {q.options && q.options.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>Các phương án lựa chọn:</span>
                        <span className="text-[10px] text-slate-400 font-normal">Nhấp vào ô để chọn đáp án đúng</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const letter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              onClick={() => handleSelectParsedCorrectOption(qIdx, optIdx)}
                              className={`p-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                                opt.isCorrect
                                  ? 'bg-emerald-500/15 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100'
                                  : 'bg-white dark:bg-slate-900/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {letter}
                              </div>
                              <input
                                type="text"
                                value={opt.content}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateParsedOptionContent(qIdx, optIdx, e.target.value)}
                                placeholder={`Phương án ${letter}`}
                                className={`flex-1 text-xs font-medium bg-transparent border-0 focus:outline-none ${
                                  opt.isCorrect
                                    ? 'text-emerald-950 dark:text-emerald-100 font-semibold'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              />
                              {opt.isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                                  <Check size={11} strokeWidth={3} /> Đúng
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 shrink-0 hover:text-emerald-600">
                                  Chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Câu hỏi tự luận / Chưa có phương án trắc nghiệm
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddDefaultOptionsToQuestion(qIdx)}
                        className="text-[11px] h-7 px-2.5 font-semibold text-google-blue hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <Plus size={12} className="mr-1" />
                        + Thêm 4 phương án (A, B, C, D)
                      </Button>
                    </div>
                  )}

                  {/* Explanation Field */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Lời giải chi tiết:</span>
                    </label>
                    <AutoGrowingTextarea
                      value={q.explanation || ''}
                      onChange={(val) => handleUpdateParsedExplanation(qIdx, val)}
                      placeholder="Nhập hướng dẫn giải hoặc lời giải chi tiết"
                      className="p-2.5 bg-amber-50/30 dark:bg-amber-950/20 border-0 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-amber-500/30 leading-relaxed shadow-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex items-center justify-between pt-4 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPreviewModalOpen(false)}>
                Đóng
              </Button>
              <div className="flex items-center gap-2.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSavingChanges}
                  onClick={handleSaveExamEdits}
                  className="font-bold text-xs text-google-blue hover:bg-blue-50/60 dark:hover:bg-blue-950/40"
                >
                  <Save size={14} className="mr-1" />
                  {isSavingChanges ? 'Đang lưu' : 'Lưu thay đổi'}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-none border-0"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    if (parsedExamData.examUrl) router.push(parsedExamData.examUrl);
                  }}
                >
                  <Play size={14} className="mr-1 fill-current" />
                  Vào xem đề
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}

export default function DocumentCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải biểu mẫu tạo đề</div>}>
      <DocumentCreateContent />
    </Suspense>
  );
}

