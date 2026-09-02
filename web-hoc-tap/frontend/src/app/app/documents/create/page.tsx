'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { parseDocxFile, ParsedQuiz } from '@/lib/docParser';
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
} from 'lucide-react';

interface ManualQuestion {
  id: string;
  content: string;
  points: number;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

function DocumentCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');
  const targetQuery = folderId && folderName ? `?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}` : '';

  // Shared Document Metadata
  const [docTitle, setDocTitle] = useState('');
  const [docSubject, setDocSubject] = useState('Môn Toán');
  const [docGrade, setDocGrade] = useState('Lớp 12');

  // Left Side: File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedQuiz | null>(null);

  // Right Side Action Modals / Drawers
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  // Manual Builder Questions State
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([
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

  // AI Prompt State
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState('10');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      router.push('/app/documents');
    }, 1200);
  };

  // Upload File Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.(docx|txt|pdf)$/i, ''));
      }
      setIsParsing(true);
      try {
        const parsed = await parseDocxFile(file);
        setParsedPreview(parsed);
      } catch (err) {
        console.error('Error parsing file:', err);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleConfirmUpload = () => {
    if (!docTitle) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }
    showSuccessToast('Đã tải lên và tạo đề thi từ file thành công!');
  };

  // Manual Question Builder Handlers
  const handleAddQuestion = () => {
    setManualQuestions((prev) => [
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
    if (manualQuestions.length <= 1) {
      alert('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }
    setManualQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleQuestionChange = (qId: string, field: 'content' | 'explanation', value: string) => {
    setManualQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, [field]: value } : q))
    );
  };

  const handleOptionChange = (qId: string, optIdx: number, value: string) => {
    setManualQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = { ...newOpts[optIdx], content: value };
        return { ...q, options: newOpts };
      })
    );
  };

  const handleSelectCorrectOption = (qId: string, optIdx: number) => {
    setManualQuestions((prev) =>
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

  const handleConfirmManualCreate = () => {
    if (!docTitle) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }
    const hasEmptyQuestion = manualQuestions.some((q) => !q.content.trim());
    if (hasEmptyQuestion) {
      alert('Vui lòng điền nội dung cho tất cả các câu hỏi!');
      return;
    }
    setIsManualModalOpen(false);
    showSuccessToast('Đã tạo đề thi thủ công thành công!');
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
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
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
            <div className="min-h-[520px] md:min-h-[580px] p-8 md:p-12 border-2 border-dashed border-google-blue/40 dark:border-google-blue/60 rounded-3xl bg-blue-50/40 dark:bg-slate-800/40 text-center flex flex-col justify-center items-center space-y-5 hover:bg-blue-50/70 transition-all shadow-xs">
              {/* Cloud Upload Icon */}
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950 text-google-blue flex items-center justify-center mx-auto shadow-md">
                <Upload size={40} />
              </div>

              {/* Title & Description Lines (Exact like screenshot) */}
              <div className="space-y-2 max-w-xl mx-auto">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  Chọn File hoặc kéo thả File vào đây
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Hỗ trợ các định dạng .pdf, .docx, .xlsx, .azt, .tex, .zip, Ảnh
                </p>
                <p className="text-xs text-slate-500 font-normal">
                  Có thể Upload File <strong className="text-slate-800 dark:text-slate-200">Bài tập</strong>, <strong className="text-slate-800 dark:text-slate-200">Đề thi</strong> Hoặc <strong className="text-slate-800 dark:text-slate-200">Bảng đáp án</strong> để chấm offline. <span className="text-google-blue hover:underline cursor-pointer">Tìm hiểu thêm</span>
                </p>
              </div>

              {/* File Button & Selection Status */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3 max-w-full">
                <input
                  type="file"
                  id="custom-doc-file-input"
                  accept=".docx,.txt,.pdf"
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
                <span className="hover:underline cursor-pointer">Đề mẫu Pdf</span>
                <span className="text-slate-300 font-normal">|</span>
                <span className="hover:underline cursor-pointer">Đề mẫu Docx</span>
                <span className="text-slate-300 font-normal">|</span>
                <span className="hover:underline cursor-pointer">File Excel bảng đáp án đề Offline</span>
                <span className="text-slate-300 font-normal">|</span>
                <span className="hover:underline cursor-pointer">File Latex mẫu .tex</span>
                <span className="text-slate-300 font-normal">|</span>
                <span className="hover:underline cursor-pointer">File Latex mẫu .zip</span>
              </div>

              {/* Bottom Announcement Text (Frameless) */}
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center pt-1">
                HocRealtime đã hỗ trợ nhận dạng đề từ file ảnh (ảnh chụp đề hoặc viết tay)
              </p>
            </div>

            {/* File Parsing Loading */}
            {isParsing && (
              <div className="mt-4 p-4 text-center space-y-2 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/50">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-google-blue mx-auto" />
                <p className="text-xs text-google-blue font-semibold">
                  Đang bóc tách câu hỏi từ file...
                </p>
              </div>
            )}

            {/* Parsed Questions Success Notification */}
            {parsedPreview && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-google-green shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Đã bóc tách thành công {parsedPreview.questions.length} câu hỏi!
                    </span>
                  </div>
                  <Button size="sm" onClick={handleConfirmUpload}>
                    Hoàn tất & Lưu Đề Thi
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
                className="w-full p-4 bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 text-google-blue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-google-blue transition-colors">
                      Soạn đề thi thủ công
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                       Tự nhập nội dung câu hỏi, đáp án A/B/C/D và lời giải
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-google-blue transition-colors" />
              </button>

              {/* DÒNG 2: TẠO ĐỀ THI BẰNG AI */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/ai' + targetQuery)}
                className="w-full p-4 bg-white dark:bg-slate-900 hover:bg-amber-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-amber-600 transition-colors">
                      Tạo đề thi bằng AI
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Tự động tạo câu hỏi trắc nghiệm từ từ khóa hoặc chủ đề
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
              </button>

              {/* DÒNG 3: NHẬP TỪ NGÂN HÀNG CÂU HỎI */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/bank' + targetQuery)}
                className="w-full p-4 bg-white dark:bg-slate-900 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-google-green flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-google-green transition-colors">
                      Nhập từ Ngân hàng câu hỏi
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Trích xuất câu hỏi từ kho tài liệu và đề thi có sẵn
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-google-green transition-colors" />
              </button>

              {/* DÒNG 4: QUÉT ĐỀ THI TỪ ẢNH CHỤP (OCR) */}
              <button
                type="button"
                onClick={() => router.push('/app/documents/create/ocr' + targetQuery)}
                className="w-full p-4 bg-white dark:bg-slate-900 hover:bg-purple-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-left flex items-center justify-between group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Camera size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-purple-600 transition-colors">
                      Quét đề thi từ ảnh chụp (OCR)
                    </span>
                    <span className="text-xs text-slate-400 block font-normal">
                      Nhận diện câu hỏi từ hình ảnh đề thi in giấy
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* MODAL 1: SOẠN ĐỀ THI THỦ CÔNG */}
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title="Soạn đề thi thủ công"
          description="Nhập nội dung câu hỏi, các phương án trả lời và chỉ định đáp án đúng"
        >
          <div className="space-y-6 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <Input
              label="Tên đề thi"
              placeholder="Nhập tên đề thi..."
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required
            />

            <div className="space-y-4">
              {manualQuestions.map((q, qIdx) => (
                <div
                  key={q.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-google-blue bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                      Câu {qIdx + 1}
                    </span>
                    {manualQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1 text-slate-400 hover:text-google-red"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    placeholder={`Nội dung câu hỏi ${qIdx + 1}...`}
                    value={q.content}
                    onChange={(e) => handleQuestionChange(q.id, 'content', e.target.value)}
                    className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2 rounded-xl border ${
                          opt.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct_modal_${q.id}`}
                          checked={opt.isCorrect}
                          onChange={() => handleSelectCorrectOption(q.id, optIdx)}
                          className="w-3.5 h-3.5 text-google-green"
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
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus size={15} className="mr-1" /> Thêm câu hỏi
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsManualModalOpen(false)}>
                  Hủy
                </Button>
                <Button size="sm" onClick={handleConfirmManualCreate}>
                  Lưu & Tạo Đề Thi
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* MODAL 2: TẠO ĐỀ BẰNG AI */}
        <Modal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          title="Tạo đề thi bằng AI"
          description="Nhập chủ đề hoặc từ khóa để AI tự động soạn câu hỏi"
        >
          <div className="space-y-4 pt-2">
            <Input
              label="Chủ đề bài học / Từ khóa"
              placeholder="Ví dụ: Hàm số lũy thừa Lớp 12, Thì Quá khứ đơn..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số lượng câu hỏi
              </label>
              <select
                value={aiNumQuestions}
                onChange={(e) => setAiNumQuestions(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="5">5 câu hỏi</option>
                <option value="10">10 câu hỏi</option>
                <option value="20">20 câu hỏi</option>
                <option value="40">40 câu hỏi</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setIsAiModalOpen(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!aiTopic) {
                    alert('Vui lòng nhập chủ đề!');
                    return;
                  }
                  setIsAiModalOpen(false);
                  showSuccessToast(`AI đã tạo thành công ${aiNumQuestions} câu hỏi về chủ đề ${aiTopic}!`);
                }}
              >
                <Sparkles size={15} className="mr-1" /> Tạo bằng AI
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL 3: NGÂN HÀNG CÂU HỎI */}
        <Modal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          title="Trích xuất từ Ngân hàng câu hỏi"
          description="Chọn câu hỏi từ thư viện đề thi có sẵn trên hệ thống"
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border text-xs space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">
                Ngân hàng câu hỏi sẵn có: 1,250+ câu hỏi Môn Toán, Tiếng Anh & Lý
              </p>
              <p className="text-slate-500">
                Hệ thống tự động lọc câu hỏi chuẩn theo chương trình SGK mới.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBankModalOpen(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsBankModalOpen(false);
                  showSuccessToast('Đã trích xuất 20 câu hỏi từ Ngân hàng câu hỏi!');
                }}
              >
                Trích xuất câu hỏi
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL 4: OCR QUÉT ẢNH */}
        <Modal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          title="Quét đề thi từ ảnh chụp (OCR)"
          description="Tải ảnh đề thi để AI nhận diện văn bản và đáp án"
        >
          <div className="space-y-4 pt-2">
            <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
              <Camera size={32} className="mx-auto text-purple-600" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Chọn hoặc chụp ảnh đề thi (.png, .jpg)
              </p>
              <input
                type="file"
                accept="image/*"
                className="w-full max-w-xs mx-auto text-xs text-slate-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsOcrModalOpen(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsOcrModalOpen(false);
                  showSuccessToast('Đã nhận diện OCR và tạo đề thi từ ảnh thành công!');
                }}
              >
                Quét & Tạo Đề Thi
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}

export default function DocumentCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải biểu mẫu tạo đề...</div>}>
      <DocumentCreateContent />
    </Suspense>
  );
}

