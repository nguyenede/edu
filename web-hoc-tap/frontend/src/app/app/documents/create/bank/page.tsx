'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { BookOpen, Check, Layers, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
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
        window.history.replaceState(null, '', '/app/documents/create/bank');
      }
    }
  }, [rawFolderId, rawFolderName]);

  const targetQuery = '';
  const token = useAuthStore((state) => state.token);

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
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'topic',
          subject: subject || '',
          grade: grade || '',
          topic,
          numQuestions: count,
          difficulty,
          model: 'gemini-3.5-flash-lite',
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
              { label: 'Tạo đề bằng SI', href: `/app/documents/create/ai${targetQuery}` },
              { label: 'Nhận diện ảnh (OCR)', href: `/app/documents/create/ocr${targetQuery}` },
              { label: 'Ngân hàng câu hỏi', href: `/app/documents/create/bank${targetQuery}` },
              { label: 'Nhập thủ công', href: `/app/documents/create/manual${targetQuery}` },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
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

      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <BookOpen size={24} className="text-google-green shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Ngân hàng đề thi & chuyên đề chuẩn kiến thức SGK mới
              </h2>
              <p className="text-xs text-slate-500">
                Chọn môn học hoặc bộ đề có sẵn, SI sẽ tự động biên soạn và trích xuất thành bộ đề hoàn chỉnh
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chọn môn học
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-emerald-500"
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
                  Chọn khối lớp
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Không chọn</option>
                  <option value="12">Khối 12</option>
                  <option value="11">Khối 11</option>
                  <option value="10">Khối 10</option>
                  <option value="9">Khối 9</option>
                  <option value="8">Khối 8</option>
                  <option value="7">Khối 7</option>
                  <option value="6">Khối 6</option>
                  <option value="5">Khối 5</option>
                  <option value="4">Khối 4</option>
                  <option value="3">Khối 3</option>
                  <option value="2">Khối 2</option>
                  <option value="1">Khối 1</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-google-blue" />
                Bộ đề mẫu gợi ý từ Ngân hàng câu hỏi
              </span>
              <div className="space-y-2 text-xs">
                {SUGGESTED_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setSelectedSubject(tmpl.subject);
                      setSelectedGrade(tmpl.grade);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {tmpl.title}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Chủ đề: {tmpl.topic} • {tmpl.questions} câu
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateFromBank(tmpl);
                      }}
                      disabled={isLoading}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    >
                      <Sparkles size={14} className="mr-1" /> Dùng Đề Này
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="p-6 text-center space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/50">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                SI đang trích xuất và khởi tạo bộ đề thi chuẩn kiến thức...
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => router.push('/app/documents/create' + targetQuery)} disabled={isLoading}>
              Hủy
            </Button>
            <Button
              onClick={() => handleGenerateFromBank()}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Sparkles size={16} className="mr-1.5" /> {isLoading ? 'SI Đang Xử Lý...' : 'Trích Xuất Câu Hỏi & Tạo Đề'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function BankQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải đề thi mẫu...</div>}>
      <BankQuizCreateContent />
    </Suspense>
  );
}
