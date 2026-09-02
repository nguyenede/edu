'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  ChevronRight,
  Play,
  Download,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  Layers,
  Printer,
  Loader2,
} from 'lucide-react';
import { ParsedQuiz } from '@/lib/docParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { getDocumentFile } from '@/lib/documentsApi';

// Safe Error Boundary for Math / KaTeX rendering
class MathErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Math KaTeX rendering error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function formatMathString(raw: any): string {
  if (raw === null || raw === undefined) return '';
  const text = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : raw?.content ? String(raw.content) : '';
  if (!text) return '';

  let formatted = text;
  if (
    (formatted.includes('\\text{') ||
      formatted.includes('\\dfrac') ||
      formatted.includes('\\frac') ||
      formatted.includes('\\lim') ||
      formatted.includes('\\sqrt') ||
      formatted.includes('\\alpha') ||
      formatted.includes('\\beta') ||
      formatted.includes('\\lambda') ||
      formatted.includes('\\omega') ||
      formatted.includes('\\pi') ||
      formatted.includes('\\in') ||
      formatted.includes('\\mathbb') ||
      formatted.includes('\\setminus') ||
      formatted.includes('\\times') ||
      formatted.includes('\\dots')) &&
    !formatted.includes('$')
  ) {
    formatted = `$${formatted}$`;
  }
  return formatted;
}

function MathRenderer({ text, className = '' }: { text: any; className?: string }) {
  if (text === null || text === undefined) return null;
  const rawStr = typeof text === 'string' ? text : typeof text === 'number' ? String(text) : text?.content ? String(text.content) : '';
  if (!rawStr) return null;

  const processedText = formatMathString(rawStr);

  return (
    <MathErrorBoundary fallback={<span className={`inline leading-relaxed ${className}`}>{rawStr}</span>}>
      <span className={`inline ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: '#d97706', strict: false }]]}
          components={{
            p: ({ children }) => <span className="inline leading-relaxed">{children}</span>,
          }}
        >
          {processedText}
        </ReactMarkdown>
      </span>
    </MathErrorBoundary>
  );
}

interface DocumentFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface NormalizedOption {
  content: string;
  isCorrect: boolean;
}

interface NormalizedQuestion {
  id: string;
  content: string;
  points: number;
  options: NormalizedOption[];
  explanation?: string;
}

interface DocumentFileItem {
  id: string;
  name: string;
  parentId: string | null;
  fileType: 'docx' | 'txt' | 'pdf' | 'other';
  parsedQuiz: {
    title: string;
    description?: string;
    durationMinutes?: number;
    questions: NormalizedQuestion[];
  };
  createdAt: string;
}

const DEFAULT_FILES: DocumentFileItem[] = [];
const DEFAULT_FOLDERS: DocumentFolderItem[] = [];

function normalizeDocItem(raw: any, fallbackId: string): DocumentFileItem {
  const id = raw?.id || fallbackId;
  const name = raw?.name || (raw?.parsedQuiz?.title ? `${raw.parsedQuiz.title}.docx` : 'Đề thi trắc nghiệm.docx');
  const parentId = raw?.parentId || null;
  const fileType = raw?.fileType || 'docx';
  const createdAt = raw?.createdAt || new Date().toISOString();

  const title = raw?.parsedQuiz?.title || raw?.name?.replace(/\.[^/.]+$/, '') || 'Đề thi trắc nghiệm';
  const description = raw?.parsedQuiz?.description || '';
  const durationMinutes = Number(raw?.parsedQuiz?.durationMinutes) || 45;

  const rawQuestions = Array.isArray(raw?.parsedQuiz?.questions)
    ? raw?.parsedQuiz.questions
    : Array.isArray(raw?.questions)
    ? raw.questions
    : [];

  const normalizedQuestions: NormalizedQuestion[] = rawQuestions.map((q: any, idx: number) => {
    const qContent = typeof q === 'string' ? q : q?.content || `Câu hỏi ${idx + 1}`;
    const qPoints = typeof q?.points === 'number' ? q.points : 0.25;

    let options: NormalizedOption[] = [];
    if (Array.isArray(q?.options)) {
      options = q.options.map((opt: any, oIdx: number) => {
        if (typeof opt === 'string') {
          return { content: opt, isCorrect: oIdx === 0 };
        }
        return {
          content: opt?.content || opt?.text || `Lựa chọn ${oIdx + 1}`,
          isCorrect: Boolean(opt?.isCorrect || opt?.correct),
        };
      });
    }

    return {
      id: q?.id || `q_${idx + 1}`,
      content: qContent,
      points: qPoints,
      options,
      explanation: q?.explanation || '',
    };
  });

  return {
    id,
    name,
    parentId,
    fileType,
    createdAt,
    parsedQuiz: {
      title,
      description,
      durationMinutes,
      questions: normalizedQuestions,
    },
  };
}

function matchDocId(targetId: string, searchId: string): boolean {
  if (!targetId || !searchId) return false;
  if (targetId === searchId) return true;
  if (decodeURIComponent(targetId) === searchId) return true;
  const cleanT = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanS = searchId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleanT === cleanS;
}

export default function DocumentDynamicViewPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();

  const fileId = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [fileItem, setFileItem] = useState<DocumentFileItem | null>(null);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [showAnswers, setShowAnswers] = useState(true);

  // Full resilient loader: prefer backend, keep localStorage fallback for old/offline data
  useEffect(() => {
    if (!fileId) {
      setIsLoading(false);
      return;
    }

    let didCancel = false;

    const loadLocalDocument = (): DocumentFileItem | null => {
      let allFiles: any[] = [];

      if (typeof window !== 'undefined') {
        try {
          const savedFiles = localStorage.getItem('app_documents_files');
          const customFiles = localStorage.getItem('custom_uploaded_files');
          const list1 = savedFiles ? JSON.parse(savedFiles) : [];
          const list2 = customFiles ? JSON.parse(customFiles) : [];
          allFiles = [...(Array.isArray(list1) ? list1 : []), ...(Array.isArray(list2) ? list2 : [])];

          const savedFolders = localStorage.getItem('app_documents_folders');
          if (savedFolders) {
            const parsedFolders = JSON.parse(savedFolders);
            if (Array.isArray(parsedFolders)) setFolders(parsedFolders);
          }
        } catch (err) {
          console.error('Error reading files from localStorage:', err);
        }
      }

      // 1. Check direct list match
      const found = allFiles.find((f) => f && matchDocId(f.id, fileId));
      if (found) return normalizeDocItem(found, fileId);

      // 2. Scan chatcoi_history_sessions for any matching exam action
      if (typeof window !== 'undefined') {
        try {
          const rawSessions = localStorage.getItem('chatcoi_history_sessions');
          if (rawSessions) {
            const sessions = JSON.parse(rawSessions);
            if (Array.isArray(sessions)) {
              for (const s of sessions) {
                for (const msg of s.messages || []) {
                  for (const act of msg.executedActions || []) {
                    if (act.actionType === 'exam' && act.data && matchDocId(act.data.examId, fileId)) {
                      const examData = act.data;
                      const questionsList = Array.isArray(examData.questions) && examData.questions.length > 0
                        ? examData.questions
                        : [];

                      if (questionsList.length > 0) {
                        const recoveredDoc: DocumentFileItem = {
                          id: fileId,
                          name: `${examData.title || 'Đề thi trắc nghiệm'}.docx`,
                          parentId: null,
                          fileType: 'docx',
                          createdAt: new Date().toISOString(),
                          parsedQuiz: {
                            title: examData.title || 'Đề thi trắc nghiệm',
                            description: `Đề thi do AI ChatCoi tạo tự động.`,
                            durationMinutes: Number(examData.durationMinutes) || 45,
                            questions: questionsList.map((q: any, idx: number) => ({
                              id: q.id || `q_${idx + 1}`,
                              content: (q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim(),
                              points: q.points || 0.25,
                              options: (q.options || []).map((opt: any) => ({
                                content: typeof opt === 'string' ? opt : opt?.content || '',
                                isCorrect: Boolean(opt?.isCorrect),
                              })),
                            })),
                          },
                        };

                        const existingDocs = JSON.parse(localStorage.getItem('app_documents_files') || '[]');
                        const filtered = Array.isArray(existingDocs)
                          ? existingDocs.filter((d: any) => d && !matchDocId(d.id, fileId)).slice(0, 20)
                          : [];
                        safeLocalStorageSet('app_documents_files', JSON.stringify([recoveredDoc, ...filtered]));
                        return recoveredDoc;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error recovering exam from chat sessions:', e);
        }
      }

      return null;
    };

    const loadDocument = async () => {
      if (token) {
        try {
          const remoteFile = await getDocumentFile(token, fileId);
          if (didCancel) return;
          setFileItem(normalizeDocItem(remoteFile, fileId));
          setIsLoading(false);
          return;
        } catch (err) {
          console.warn('Unable to load document from server, falling back to local data:', err);
        }
      }

      const localFile = loadLocalDocument();
      if (didCancel) return;
      setFileItem(localFile);
      setIsLoading(false);
    };

    setIsLoading(true);
    loadDocument();

    return () => {
      didCancel = true;
    };
  }, [fileId, token]);

  const handleDownloadJson = () => {
    if (!fileItem) return;
    const jsonOutput = {
      title: fileItem.parsedQuiz.title,
      total_questions: fileItem.parsedQuiz.questions.length,
      questions: fileItem.parsedQuiz.questions.map((q, idx) => {
        const correctOpt = q.options.find((o) => o.isCorrect);
        return {
          id: idx + 1,
          question: q.content,
          options: q.options.map((o) => o.content),
          answer: correctOpt ? correctOpt.content : (q.options[0]?.content || ''),
        };
      }),
    };
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(jsonOutput, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${fileItem.name.replace(/\.[^/.]+$/, '')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
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
            <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
              Đang tải đề thi...
            </span>
          </div>
        }
      >
        <div className="p-16 text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-google-blue mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang tải và chuẩn bị nội dung đề thi...</p>
        </div>
      </AppShell>
    );
  }

  if (!fileItem) {
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
            <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
              Chi tiết đề thi
            </span>
          </div>
        }
      >
        <div className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Không tìm thấy tài liệu đề thi</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tài liệu này có thể đã bị xóa hoặc đường dẫn không hợp lệ.
          </p>
          <Button size="sm" onClick={() => router.push('/app/documents')}>
            <ArrowLeft size={16} className="mr-1.5" />
            Quay lại Tài liệu của tôi
          </Button>
        </div>
      </AppShell>
    );
  }

  // Automatically resolve parent folder hierarchy without needing query parameters
  const matchedFolder = fileItem.parentId ? folders.find((f) => f.id === fileItem.parentId) : null;
  const resolvedFolderName = matchedFolder?.name;
  const resolvedFolderId = matchedFolder?.id;

  const questions = fileItem.parsedQuiz?.questions || [];
  const totalPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 1), 0) * 10) / 10;
  const displayTitle = (fileItem.name || 'Đề thi trắc nghiệm').replace(/\.[^/.]+$/, '');

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/documents')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-[450]"
          >
            Tài liệu của tôi
          </button>
          {resolvedFolderName && (
            <>
              <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
              <button
                type="button"
                onClick={() => router.push(`/app/documents?folderId=${resolvedFolderId || ''}`)}
                className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-[450]"
              >
                {resolvedFolderName}
              </button>
            </>
          )}
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450] truncate max-w-xs md:max-w-md">
            {displayTitle}
          </span>
        </div>
      }
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            title="Tải xuống tệp JSON"
          >
            <Download size={15} className="mr-1.5" />
            Tải JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="In đề thi"
          >
            <Printer size={15} className="mr-1.5" />
            In đề
          </Button>
          <Button
            size="sm"
            onClick={() => router.push('/quizzes')}
            className="bg-google-blue hover:bg-blue-600 text-white font-medium"
          >
            <Play size={15} className="mr-1.5" />
            Bắt đầu làm bài / Host Chaos
          </Button>
        </div>
      }
    >
      {/* 1. SCREEN VIEW (Google Drive Web UI - Hidden when Printing) */}
      <div className="print-screen-view max-w-4xl mx-auto space-y-6 pb-20 pt-2 print:hidden">
        {/* Document Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#185abd] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                  W
                </div>
                <span className="text-xs font-semibold text-google-blue uppercase tracking-wider">
                  Đề thi trắc nghiệm
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {displayTitle}
              </h1>
              {fileItem.parsedQuiz?.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fileItem.parsedQuiz.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAnswers(!showAnswers)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  showAnswers
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {showAnswers ? '✓ Đang hiện đáp án đúng' : 'Ẩn đáp án đúng'}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <Layers size={18} className="text-google-blue shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Tổng số câu</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{questions.length} câu</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <Award size={18} className="text-google-yellow shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Tổng điểm</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{totalPoints} điểm</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
              <Clock size={18} className="text-emerald-500 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Ngày tạo</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {fileItem.createdAt ? new Date(fileItem.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950 text-google-blue font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                    <MathRenderer text={(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')} />
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  {q.points} điểm
                </span>
              </div>

              {/* Options A, B, C, D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {(q.options || []).map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isCorrect = showAnswers && opt.isCorrect;
                  return (
                    <div
                      key={optIdx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-sm md:text-base flex items-center">
                        <strong className={`mr-2 font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          {letter}.
                        </strong>
                        <MathRenderer text={opt.content} />
                      </span>
                      {isCorrect && (
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation (if available) */}
              {showAnswers && q.explanation && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Lời giải: </span>
                  <MathRenderer text={q.explanation} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. DEDICATED FORMAL VIETNAMESE EXAM PAPER (.DOCX / A4 PRINT LAYOUT) */}
      <div id="print-exam-paper" className="hidden print:block text-black bg-white leading-relaxed text-[13pt]">
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, sans-serif !important;
              font-size: 13pt !important;
              letter-spacing: normal !important;
              word-spacing: normal !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            header, aside, #sidebar, .print-screen-view, .print\\:hidden, [role="navigation"], h1, nav {
              display: none !important;
            }
            #main-scroll, #app-main-viewport, #main-scroll > div, #main-scroll > div > div {
              position: static !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
              height: auto !important;
              width: 100% !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }
            #print-exam-paper {
              display: block !important;
              width: 100% !important;
              color: #000000 !important;
              background: #ffffff !important;
              font-family: Arial, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, sans-serif !important;
              padding: 20mm 15mm 20mm 20mm !important;
              box-sizing: border-box !important;
            }
            .print-break-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />

        {/* Formal Header: School / Ministry info + Official Exam Title */}
        <div className="flex justify-between items-start pb-2 mb-3">
          <div className="w-[45%] text-center">
            <p className="font-bold text-[11pt] uppercase tracking-wide">SỞ GD&ĐT ................................</p>
            <p className="font-bold text-[11pt] uppercase tracking-wide">TRƯỜNG THPT ........................</p>
            {questions.length > 5 && (
              <p className="italic text-[10pt] mt-0.5">(Đề thi gồm {Math.ceil(questions.length / 5)} trang)</p>
            )}
          </div>

          <div className="w-[50%] text-center">
            <p className="font-bold text-[12pt] uppercase tracking-wide">
              {displayTitle}
            </p>
            <p className="font-semibold text-[11pt] mt-0.5">NĂM HỌC 2025 - 2026</p>
            <p className="italic text-[10pt] mt-0.5">Thời gian làm bài: {fileItem.parsedQuiz?.durationMinutes || 45} phút (không kể phát đề)</p>
          </div>
        </div>

        {/* Candidate / Student Info line & Exam Code */}
        <div className="flex justify-between items-center text-[11pt] pb-2 mb-4">
          <div className="flex-1">
            Họ và tên thí sinh: ................................................................ Lớp: ....................
          </div>
          <div className="font-bold text-[11pt] shrink-0">
            MÃ ĐỀ: 101
          </div>
        </div>

        {/* List of Questions in Formal Docx Style */}
        <div className="space-y-3 text-[12pt]">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="print-break-avoid mb-3">
              <p className="leading-snug text-justify">
                <span className="font-bold">Câu {idx + 1}: </span>
                <MathRenderer text={(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')} />
              </p>

              {/* 4 options in clean aligned row or 2-column grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1 pl-4">
                {(q.options || []).map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <div key={optIdx} className="leading-snug flex items-center">
                      <span className="font-bold mr-1">{letter}. </span>
                      <MathRenderer text={opt.content} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* End marker */}
        <div className="text-center text-[11pt] italic mt-6 pt-3 print-break-avoid">
          <p className="font-bold tracking-widest uppercase">--------- HẾT ---------</p>
          <p className="text-[10pt] mt-0.5">(Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm)</p>
        </div>
      </div>
    </AppShell>
  );
}
