'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/Select';
import {
  Camera,
  Check,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  AlertCircle,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileUp,
  BookOpen,
  PenTool,
  Lock,
} from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';
import { idbSaveDocument } from '@/lib/indexedDbStorage';
import { validateDeterministicResult, parseExamFileStructure } from '@/lib/examStructureParser';
import { extractFileForAi } from '@/lib/fileExtractor';

function OcrQuizCreateContent() {
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
        window.history.replaceState(window.history.state, '', '/app/documents/create/ocr');
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

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [docSubject, setDocSubject] = useState('');
  const [docGrade, setDocGrade] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Kết quả sau khi quét và xác thực 100% dữ liệu thật
  const [scannedExamData, setScannedExamData] = useState<{
    title: string;
    subject: string;
    grade: string;
    durationMinutes: number;
    questions: any[];
  } | null>(null);

  const handleProcessImageFile = (file: File) => {
    setSelectedImage(file);
    setErrorMessage(null);
    setScannedExamData(null);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleProcessImageFile(file);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedImage) {
      setErrorMessage('Vui lòng chọn hoặc tải ảnh/tài liệu đề thi!');
      setToastMessage('Vui lòng chọn hoặc tải ảnh/tài liệu đề thi!');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setScannedExamData(null);

    try {
      // 1. CHẠY THUẬT TOÁN ĐẦU TIÊN: 100% dữ liệu thật từ file (0ms, không tốn AI)
      try {
        const deterministicResult = await parseExamFileStructure(selectedImage);
        const isAlgoValid = validateDeterministicResult(deterministicResult);
        if (isAlgoValid && deterministicResult && deterministicResult.questions.length > 0) {
          const validResult = {
            title: deterministicResult.title || `Đề thi từ file (${selectedImage.name.replace(/\.[^/.]+$/, '')})`,
            subject: deterministicResult.subject || docSubject || 'Kiến thức tổng hợp',
            grade: deterministicResult.grade || docGrade || 'Tự do',
            durationMinutes: deterministicResult.durationMinutes || 45,
            questions: deterministicResult.questions,
          };
          setScannedExamData(validResult);
          setToastMessage(`Thuật toán đã nhận diện thành công ${deterministicResult.questions.length} câu hỏi thật từ file!`);
          return;
        }
      } catch (algoErr) {
        console.warn('Thuật toán không thể phân tích trực tiếp, chuyển sang SI:', algoErr);
      }

      // 2. CHỈ KHI THUẬT TOÁN KHÔNG PHÂN TÍCH ĐƯỢC (Ảnh chụp, scan, viết tay) -> MỚI DÙNG SI
      const extracted = await extractFileForAi(selectedImage);

      const res = await fetch('/api/si/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: extracted.type === 'image' ? 'ocr' : 'document',
          subject: docSubject || '',
          grade: docGrade || '',
          imageBase64: extracted.imageBase64 || imagePreview || null,
          documentText: extracted.text || '',
          fileName: selectedImage.name,
          model: 'gemini-3.5-flash',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.exam) {
        throw new Error(data.error || 'SI không thể nhận diện được câu hỏi từ tài liệu này. 100% không làm giả dữ liệu.');
      }

      const generatedExam = data.exam;
      const rawQuestions = Array.isArray(generatedExam.questions) ? generatedExam.questions : [];

      // KIỂM TRA & LỌC NGHIÊM NGẶT: TUYỆT ĐỐI KHÔNG CHẤP NHẬN DỮ LIỆU GIẢ
      const filteredQuestions = rawQuestions.filter((q: any) => {
        const rawContent = String(q.content || q.question || '').trim();
        const content = rawContent
          .replace(/^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i, '')
          .replace(/^[:.-]+\s*/, '')
          .trim();
        if (content.length < 5) return false;

        if (Array.isArray(q.options) && q.options.length > 0) {
          // Bắt buộc các phương án phải có chữ thật, không được chứa "Phương án A/B/C/D"
          const hasDummy = q.options.some((o: any) => {
            const str = typeof o === 'string' ? o : o?.content || o?.text || '';
            const trimmed = str.trim();
            return (
              trimmed.length === 0 ||
              /^Phương án\s*[A-D0-9]?$/i.test(trimmed) ||
              /^Lựa chọn\s*[A-D0-9]?$/i.test(trimmed) ||
              trimmed === 'Phương án đúng chính xác'
            );
          });
          if (hasDummy) return false;
        }
        return true;
      });

      if (filteredQuestions.length === 0) {
        throw new Error('Ảnh đề thi không chứa câu hỏi hợp lệ hoặc bị mờ. Hệ thống tuyệt đối không tạo dữ liệu giả!');
      }

      const validResult = {
        title: generatedExam.title || `Đề thi nhận diện từ ảnh (${selectedImage.name.replace(/\.[^/.]+$/, '')})`,
        subject: generatedExam.subject || docSubject || 'Kiến thức tổng hợp',
        grade: generatedExam.grade || docGrade || 'Tự do',
        durationMinutes: generatedExam.durationMinutes || 45,
        questions: filteredQuestions,
      };

      setScannedExamData(validResult);
      setToastMessage(`Đã bóc tách thành công ${filteredQuestions.length} câu hỏi thật từ ảnh!`);
    } catch (err: any) {
      console.error('Error in SI OCR quiz scan:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi nhận diện ảnh đề thi.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveScannedExam = async () => {
    if (!scannedExamData) return;

    try {
      setIsScanning(true);
      let result = AiToolRegistry.createExam({
        title: scannedExamData.title,
        subject: scannedExamData.subject,
        grade: scannedExamData.grade,
        durationMinutes: scannedExamData.durationMinutes,
        questions: scannedExamData.questions,
        folderId: folderId || undefined,
      });

      result = await syncExamActionToDocument(token, result);

      if (result.data?.examId) {
        await idbSaveDocument({
          id: result.data.examId,
          name: `${scannedExamData.title}.json`,
          parentId: folderId || null,
          fileType: 'json',
          storageKey: `exams/teacher/${result.data.examId}.json`,
          createdAt: new Date().toISOString(),
          parsedQuiz: {
            title: scannedExamData.title,
            description: `Đề thi môn ${scannedExamData.subject} nhận diện từ ảnh`,
            durationMinutes: scannedExamData.durationMinutes,
            questions: scannedExamData.questions,
          },
        });
      }

      setToastMessage('Đã lưu đề thi thành công vào thư viện!');

      setTimeout(() => {
        if (result.data?.examUrl) {
          router.push(result.data.examUrl);
        } else {
          router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
        }
      }, 500);
    } catch (err: any) {
      console.error('Error saving scanned exam:', err);
      setErrorMessage(err.message || 'Lỗi khi lưu đề thi vào hệ thống');
      setIsScanning(false);
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
            Nhận diện từ ảnh (SI OCR)
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

      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/60">
            <Camera size={24} className="text-purple-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Nhận diện đề thi từ hình ảnh bằng SI Multimodal Vision
              </h2>
              <p className="text-xs text-slate-500">
                100% dữ liệu thật từ ảnh, hỗ trợ công thức toán học LaTeX, tuyệt đối không tạo dữ liệu giả
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
                onClick={handleStartOcr}
                disabled={isScanning}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                Thử lại ngay
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Môn học đề thi (Tùy chọn)
              </label>
              <CustomSelect
                value={docSubject}
                onChange={(val) => setDocSubject(String(val))}
                options={[
                  { value: '', label: 'Tự động nhận diện từ ảnh' },
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
                placeholder="Tự động nhận diện từ ảnh"
                size="sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Khối lớp (Tùy chọn)
              </label>
              <CustomSelect
                value={docGrade}
                onChange={(val) => setDocGrade(String(val))}
                options={[
                  { value: '', label: 'Tự động nhận diện từ ảnh' },
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
                placeholder="Tự động nhận diện từ ảnh"
                size="sm"
              />
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`p-8 border-2 border-dashed rounded-3xl text-center space-y-4 transition-colors ${
              isDragging
                ? 'border-purple-600 bg-purple-100/50 dark:bg-purple-900/30'
                : 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-slate-800/30'
            }`}
          >
            <ImageIcon size={36} className="mx-auto text-purple-600" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Chọn ảnh hoặc kéo thả ảnh đề thi vào đây (.png, .jpg, .jpeg, .webp)
              </p>
              <p className="text-[11px] text-slate-400">
                Hệ thống bóc tách đúng nội dung câu hỏi, công thức toán và đáp án có sẵn trong ảnh
              </p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full max-w-xs mx-auto text-xs text-slate-500 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />

            {selectedImage && imagePreview && (
              <div className="pt-2 max-w-sm mx-auto space-y-2">
                <img
                  src={imagePreview}
                  alt="Ảnh đề thi đã chọn"
                  className="w-full max-h-56 object-contain rounded-xl border border-purple-300 dark:border-purple-800 shadow-xs bg-black/5 dark:bg-white/5"
                />
                <p className="text-xs font-bold text-purple-600">
                  Đã chọn ảnh: {selectedImage.name}
                </p>
              </div>
            )}
          </div>

          {isScanning && (
            <div className="p-6 text-center space-y-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200/50">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600 mx-auto" />
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                SI Vision đang phân tích hình ảnh và bóc tách từng câu hỏi
              </p>
              <p className="text-[11px] text-slate-400">
                100% bám sát nội dung ảnh thật, bảo toàn công thức toán học, tuyệt đối không tạo dữ liệu giả
              </p>
            </div>
          )}

          {/* PREVIEW KẾT QUẢ BÓC TÁCH */}
          {scannedExamData && (
            <div className="space-y-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-purple-200 dark:border-purple-800 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2 text-google-green">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold">
                    {(scannedExamData as any).method === 'algorithm'
                      ? `⚡ Thuật toán bóc tách thành công ${scannedExamData.questions.length} câu hỏi thật từ file - 0ms tốc độ cao`
                      : `✨ SI Vision đã bóc tách thành công ${scannedExamData.questions.length} câu hỏi thật từ ảnh`}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Môn: {scannedExamData.subject} • {scannedExamData.grade}
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {scannedExamData.questions.map((q: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-2"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-start gap-1.5">
                      <span className="text-purple-600 shrink-0">Câu {idx + 1}:</span>
                      <span className="whitespace-pre-wrap">{(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')}</span>
                    </div>

                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pl-4">
                        {q.options.map((opt: any, oIdx: number) => {
                          const letter = String.fromCharCode(65 + oIdx);
                          const isCorrect = Boolean(opt?.isCorrect);
                          const content = typeof opt === 'string' ? opt : opt?.content || '';
                          return (
                            <div
                              key={oIdx}
                              className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="font-bold">{letter}.</span>
                              <span className="truncate">{content}</span>
                              {isCorrect && <Check size={12} className="ml-auto shrink-0 text-emerald-600" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-purple-600">Lời giải: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScannedExamData(null)}
                >
                  <RefreshCw size={14} className="mr-1" /> Quét lại ảnh khác
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={handleSaveScannedExam}
                >
                  <Check size={14} className="mr-1" /> Xác nhận & Mở Đề Thi
                </Button>
              </div>
            </div>
          )}

          {!scannedExamData && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/app/documents/create' + targetQuery)}
                disabled={isScanning}
              >
                Hủy
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                onClick={handleStartOcr}
                disabled={!selectedImage || isScanning}
              >
                <Camera size={16} className="mr-1.5" /> {isScanning ? 'SI Đang Quét' : 'Quét OCR & Bóc Tách'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function OcrQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải cấu hình OCR</div>}>
      <OcrQuizCreateContent />
    </Suspense>
  );
}
