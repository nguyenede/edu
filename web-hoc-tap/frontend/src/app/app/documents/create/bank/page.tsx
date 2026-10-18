'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { CustomSelect } from '@/components/Select';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { BookOpen, Check, Layers, Sparkles, ChevronRight, AlertCircle, FileUp, Camera, PenTool, Lock } from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';

const SUGGESTED_TEMPLATES = [
  { id: 't1', title: 'Đề kiểm tra Giữa kỳ I - Môn Toán 12', subject: 'Toán', grade: '12', questions: 20, difficulty: 'Thông hiểu', topic: 'Hàm số và Khảo sát đồ thị hàm số' },
  { id: 't2', title: 'Đề ôn tập THPT Quốc Gia - Tiếng Anh', subject: 'Tiếng Anh', grade: '12', questions: 20, difficulty: 'Vận dụng', topic: 'Ngữ pháp tổng hợp, Thì, Mệnh đề quan hệ & Đọc hiểu' },
  { id: 't3', title: 'Đề thi Khảo sát Vật Lý 11 - Điện học & Cơ học', subject: 'Vật lý', grade: '11', questions: 20, difficulty: 'Thông hiểu', topic: 'Điện tích, Điện trường & Dòng điện không đổi' },
  { id: 't4', title: 'Đề kiểm tra Hóa Học 10 - Bảng tuần hoàn & Liên kết', subject: 'Hóa học', grade: '10', questions: 20, difficulty: 'Nhận biết', topic: 'Cấu tạo nguyên tử, Bảng tuần hoàn các nguyên tố hóa học' },
  { id: 't5', title: 'Đề kiểm tra Ngữ Văn 9 - Văn học Trung đại', subject: 'Ngữ văn', grade: '9', questions: 15, difficulty: 'Thông hiểu', topic: 'Truyện Kiều, Chuyện người con gái Nam Xương' },
];

function BankQuizCreateContent() {
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
        const currentState = (window.history.state && typeof window.history.state === 'object') ? window.history.state : {};
        window.history.replaceState(currentState, '', '/app/documents/create/bank');
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

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('t1');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGenerateFromBank = async (templateOverride?: (typeof SUGGESTED_TEMPLATES)[0]) => {
    setIsLoading(true);
    setErrorMessage(null);

    const template = templateOverride || SUGGESTED_TEMPLATES.find((t) => t.id === selectedTemplateId);
    const subject = template ? template.subject : selectedSubject;
    const grade = template ? template.grade : selectedGrade;
    const topic = template ? template.topic : (selectedSubject ? `Ngân hàng câu hỏi chuẩn kiến thức môn ${selectedSubject}${selectedGrade ? ` lớp ${selectedGrade}` : ''}` : 'Ngân hàng câu hỏi chuẩn kiến thức tổng hợp');
    const count = template ? template.questions : 20;
    const difficulty = template ? template.difficulty : 'Thông hiểu';

    try {
      const res = await fetch('/api/si/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'topic',
          subject: subject || '',
          grade: grade || '',
          topic,
          numQuestions: count,
          difficulty,
          model: 'gemini-3.5-flash',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.exam) {
        throw new Error(data.error || 'Không thể trích xuất và sinh đề thi lúc này');
      }

      const generatedExam = data.exam;

      let result = AiToolRegistry.createExam({
        title: template ? template.title : generatedExam.title,
        subject: generatedExam.subject || subject,
        grade: generatedExam.grade || grade,
        durationMinutes: generatedExam.durationMinutes || 45,
        questions: generatedExam.questions,
        folderId: folderId || undefined,
      });
      result = await syncExamActionToDocument(token, result);

      setToastMessage(`Đã khởi tạo thành công đề thi ${generatedExam.questions.length} câu hỏi!`);

      setTimeout(() => {
        if (result.data?.examUrl) {
          router.push(result.data.examUrl);
        } else {
          router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error generating bank exam:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi tạo đề thi.');
    } finally {
      setIsLoading(false);
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
              { label: 'Tạo đề trắc nghiệm bằng SI', href: `/app/documents/create/si${targetQuery}`, icon: <Sparkles size={14} className="text-amber-500 shrink-0" /> },
              { label: 'Quét đề thi từ ảnh chụp (OCR)', href: `/app/documents/create/ocr${targetQuery}`, icon: <Camera size={14} className="text-purple-500 shrink-0" /> },
              { label: 'Ngân hàng câu hỏi', href: `/app/documents/create/bank${targetQuery}`, icon: <BookOpen size={14} className="text-emerald-500 shrink-0" /> },
              { label: 'Nhập thủ công', href: `/app/documents/create/manual${targetQuery}`, icon: <PenTool size={14} className="text-rose-500 shrink-0" /> },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Ngân hàng câu hỏi
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

      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl shadow-sm border border-amber-200 dark:border-amber-800">
          <BookOpen size={36} />
        </div>
        
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/40">
            Chưa phát triển
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Nhập từ Ngân hàng câu hỏi
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Tính năng trích xuất đề thi từ kho tài liệu và ngân hàng câu hỏi dùng chung đang được đội ngũ hoàn thiện và sẽ sớm ra mắt trong bản cập nhật tới.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-3">
          <Button
            onClick={() => router.push('/app/documents/create' + targetQuery)}
            className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-6 py-2.5 font-bold text-sm shadow-md"
          >
            Quay lại trang Tạo đề thi
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

export default function BankQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải đề thi mẫu</div>}>
      <BankQuizCreateContent />
    </Suspense>
  );
}
