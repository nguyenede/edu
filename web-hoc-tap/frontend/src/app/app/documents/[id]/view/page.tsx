'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  Layers,
  Printer,
  Loader2,
  Send,
  Gamepad2,
  Play,
  Lock,
} from 'lucide-react';
import { ParsedQuiz } from '@/lib/docParser';
import { cleanAndEnrichMathFormulas } from '@/lib/examStructureParser';
import { normalizeMathFormulas, cleanVietnameseEncoding } from '@/lib/questionValidator';
import { cleanLeakedOleGarbage } from '@/lib/mtefParser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { getDocumentFile, listDocuments } from '@/lib/documentsApi';

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

  let formatted = cleanLeakedOleGarbage(text);
  formatted = cleanAndEnrichMathFormulas(formatted);
  formatted = cleanVietnameseEncoding(formatted);
  formatted = normalizeMathFormulas(formatted);
  formatted = cleanLeakedOleGarbage(formatted);
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
            img: ({ src, alt }) => (
              <span className="block my-3 text-center">
                <img
                  src={src}
                  alt={alt || 'Hình vẽ'}
                  className="max-h-80 max-w-full mx-auto inline-block rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs object-contain bg-white p-1"
                  loading="lazy"
                />
              </span>
            ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-center text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/80 font-medium text-slate-800 dark:text-slate-200">{children}</thead>,
            th: ({ children }) => <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 border-r border-t border-slate-200 dark:border-slate-700 last:border-r-0 text-slate-700 dark:text-slate-300 whitespace-nowrap">{children}</td>,
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
  fileType: string;
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
    let qContent = typeof q === 'string' ? q : q?.content || `Câu hỏi ${idx + 1}`;
    qContent = cleanLeakedOleGarbage(qContent);
    qContent = normalizeMathFormulas(cleanVietnameseEncoding(cleanAndEnrichMathFormulas(qContent)));
    qContent = cleanLeakedOleGarbage(qContent);
    const qPoints = typeof q?.points === 'number' ? q.points : 0.25;

    let options: NormalizedOption[] = [];
    if (Array.isArray(q?.options)) {
      options = q.options.map((opt: any, oIdx: number) => {
        let content = typeof opt === 'string' ? opt : (opt?.content || opt?.text || '');
        const letter = String.fromCharCode(65 + oIdx);

        content = cleanLeakedOleGarbage(content);
        content = cleanAndEnrichMathFormulas(content, { isOption: true, optLetter: letter, questionText: qContent });
        content = normalizeMathFormulas(cleanVietnameseEncoding(content));
        content = cleanLeakedOleGarbage(content);

        const isCorrect = typeof opt === 'object' && opt !== null
          ? Boolean(opt.isCorrect || opt.correct)
          : false;

        return {
          content,
          isCorrect,
        };
      }).filter((o: NormalizedOption) => o.content && o.content.trim().length > 0);
    }

    let qExplanation = q?.explanation ? cleanAndEnrichMathFormulas(q.explanation) : '';
    qExplanation = cleanLeakedOleGarbage(qExplanation);
    qExplanation = normalizeMathFormulas(cleanVietnameseEncoding(qExplanation));
    qExplanation = cleanLeakedOleGarbage(qExplanation);

    // Loại bỏ triệt để bất kỳ đoạn boilerplate giả ("Lời giải chi tiết & Phân tích chuyên sâu / sai chiều bất đẳng thức")
    if (qExplanation) {
      qExplanation = qExplanation
        .replace(/\*\*?Lời giải chi tiết & Phân tích chuyên sâu[:\*\s\S]*$/gi, '')
        .replace(/\*\*?Phân tích từng phương án lựa chọn[:\*\s\S]*$/gi, '')
        .replace(/[-*+]\s*\*\*?Phương án (?:đúng|sai)[^\n]*/gi, '')
        .replace(/[-*+]\s*\*\*?Kết luận: Chọn đáp án[^\n]*/gi, '')
        .trim();
    }

    return {
      id: q?.id || `q_${idx + 1}`,
      rawLabel: q?.rawLabel,
      content: qContent,
      points: qPoints,
      options,
      explanation: qExplanation || '',
      type: q?.type || (options.length >= 2 ? 'multiple_choice' : 'essay'),
      answer: q?.answer ? normalizeMathFormulas(cleanVietnameseEncoding(cleanAndEnrichMathFormulas(q.answer))) : undefined,
    };
  });

  return {
    id,
    name: cleanVietnameseEncoding(name),
    parentId,
    fileType,
    createdAt,
    parsedQuiz: {
      title: cleanVietnameseEncoding(title),
      description: cleanVietnameseEncoding(description),
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
  if (cleanT === cleanS) return true;

  // Khớp nếu cùng chuỗi số timestamp (ví dụ file_1791698305008_... và filc_1791698305008_...)
  const numPartT = targetId.match(/\d{10,}/)?.[0];
  const numPartS = searchId.match(/\d{10,}/)?.[0];
  if (numPartT && numPartS && numPartT === numPartS) {
    return true;
  }

  // Khớp nếu phần đuôi (sau 4 ký tự tiền tố: file vs filc) trùng khớp
  if (cleanT.length >= 10 && cleanS.length >= 10) {
    if (cleanT.slice(4) === cleanS.slice(4)) return true;
  }

  // Khớp nếu ID này chứa ID kia
  if (cleanT.includes(cleanS) || cleanS.includes(cleanT)) {
    return true;
  }

  return false;
}

function DocumentDynamicViewPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const isTeacher = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // BẢO MẬT: Chuyển hướng học sinh về Lớp học nếu truy cập đề thi gốc của giáo viên
  useEffect(() => {
    if (user && !isTeacher) {
      router.replace('/classes');
    }
  }, [user, isTeacher, router]);

  const fileId = (params?.id as string) || '';
  const searchFolderId = searchParams?.get('folderId') || null;
  const searchFolderName = searchParams?.get('folderName') || null;

  const [isLoading, setIsLoading] = useState(true);
  const [fileItem, setFileItem] = useState<DocumentFileItem | null>(null);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);
  const [showAnswers, setShowAnswers] = useState(true);

  // Auto clean up address bar: remove redundant query params (?folderId=...&folderName=...), /view suffix, and /app/ prefix
  useEffect(() => {
    if (fileId && typeof window !== 'undefined') {
      const cleanUrl = `/documents/${encodeURIComponent(fileId)}`;
      if (
        window.location.search ||
        window.location.pathname.endsWith('/view') ||
        window.location.pathname.startsWith('/app/')
      ) {
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [fileId]);

  // Full resilient loader: checks IndexedDB, localStorage, and backend with zero-hang guarantees
  useEffect(() => {
    if (!fileId) {
      setIsLoading(false);
      return;
    }

    let didCancel = false;

    const loadLocalDocument = async (): Promise<DocumentFileItem | null> => {
      let allFiles: any[] = [];

      if (typeof window !== 'undefined') {
        try {
          const { idbGetAllDocuments, idbGetDocument, isDocumentTombstoned } = await import('@/lib/indexedDbStorage');
          if (isDocumentTombstoned(fileId)) {
            return null;
          }
          const directIdb = await idbGetDocument(fileId);
          if (directIdb) {
            if (isDocumentTombstoned(directIdb.id, directIdb.name, directIdb.parsedQuiz?.title)) {
              return null;
            }
            try {
              const cleaned = normalizeDocItem(directIdb, fileId);
              const { idbSaveDocument } = await import('@/lib/indexedDbStorage');
              idbSaveDocument(cleaned as any).catch(() => {});
              return cleaned;
            } catch {
              return directIdb as any;
            }
          }

          const idbFiles = await idbGetAllDocuments();
          if (Array.isArray(idbFiles) && idbFiles.length > 0) {
            allFiles.push(...idbFiles);
          }
        } catch (err) {
          console.warn('Error reading files from IndexedDB in view page:', err);
        }

        try {
          const savedFiles = localStorage.getItem('app_documents_files');
          const customFiles = localStorage.getItem('custom_uploaded_files');
          const list1 = savedFiles ? JSON.parse(savedFiles) : [];
          const list2 = customFiles ? JSON.parse(customFiles) : [];
          allFiles.push(...(Array.isArray(list1) ? list1 : []), ...(Array.isArray(list2) ? list2 : []));

          const savedFolders = localStorage.getItem('app_documents_folders');
          if (savedFolders) {
            const parsedFolders = JSON.parse(savedFolders);
            if (Array.isArray(parsedFolders) && parsedFolders.length > 0) {
              setFolders(parsedFolders);
            }
          }
        } catch (err) {
          console.error('Error reading files from localStorage:', err);
        }
      }

      // 1. Check direct list match
      const { isDocumentTombstoned } = await import('@/lib/indexedDbStorage');
      const found = allFiles.find(
        (f) => f && matchDocId(f.id, fileId) && !isDocumentTombstoned(f.id, f.name, f.parsedQuiz?.title)
      );
      if (found) {
        try {
          return normalizeDocItem(found, fileId);
        } catch {
          return found;
        }
      }

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
                            description: `Đề thi do SI ChatCoi tạo tự động.`,
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
                          ? existingDocs.filter((d: any) => d && !matchDocId(d.id, fileId))
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
      try {
        // 1. Load folders right away
        if (typeof window !== 'undefined') {
          try {
            const savedFolders = localStorage.getItem('app_documents_folders');
            if (savedFolders) {
              const parsedFolders = JSON.parse(savedFolders);
              if (Array.isArray(parsedFolders) && parsedFolders.length > 0) {
                setFolders(parsedFolders);
              }
            }
          } catch {}
        }

        // 2. Fetch document (checks IndexedDB & localStorage FIRST at 0ms, then remote)
        const [docRes, docsListRes] = await Promise.allSettled([
          getDocumentFile(token || '', fileId),
          listDocuments(token || ''),
        ]);

        if (didCancel) return;

        if (docsListRes.status === 'fulfilled' && docsListRes.value?.folders && Array.isArray(docsListRes.value.folders)) {
          setFolders(docsListRes.value.folders);
        }

        if (docRes.status === 'fulfilled' && docRes.value) {
          let normalized: DocumentFileItem;
          try {
            normalized = normalizeDocItem(docRes.value, fileId);
          } catch {
            normalized = docRes.value as any;
          }
          if (!normalized.parentId && searchFolderId) {
            normalized.parentId = searchFolderId;
          }
          setFileItem(normalized);
          import('@/lib/indexedDbStorage').then(({ idbSaveDocument }) => idbSaveDocument(normalized as any).catch(() => {}));
          return;
        }

        // 3. Fallback to full local scans (IndexedDB + localStorage + chat sessions)
        const localFile = await loadLocalDocument();
        if (didCancel) return;
        if (localFile) {
          if (!localFile.parentId && searchFolderId) {
            localFile.parentId = searchFolderId;
          }
          setFileItem(localFile);
          import('@/lib/indexedDbStorage').then(({ idbSaveDocument }) => idbSaveDocument(localFile as any).catch(() => {}));
          return;
        }

        // 4. If completely not found
        setFileItem(null);
      } catch (err) {
        console.warn('Unable to load document:', err);
        setFileItem(null);
      } finally {
        if (!didCancel) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    loadDocument();

    return () => {
      didCancel = true;
    };
  }, [fileId, token, searchFolderId]);

  const handleDownloadJson = () => {
    if (!fileItem) return;
    const jsonOutput = {
      title: fileItem.parsedQuiz.title,
      total_questions: fileItem.parsedQuiz.questions.length,
      questions: fileItem.parsedQuiz.questions.map((q, idx) => {
        const cleanQ = (q.content || '')
          .replace(/^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i, '')
          .replace(/^[:.-]+\s*/, '')
          .trim();
        const correctOpt = q.options?.find((o) => o.isCorrect);
        return {
          id: idx + 1,
          question: cleanQ || q.content,
          options: (q.options || []).map((o) => o.content),
          answer: correctOpt ? correctOpt.content : ((q as any).answer || ''),
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
              onClick={() => router.push('/documents')}
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

  if (user && !isTeacher) {
    return (
      <AppShell title="Xem đề thi">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Lock size={32} />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Quy chế bảo mật bài thi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản học sinh không thể truy cập nội dung đề thi và đáp án của giáo viên. Vui lòng vào mục Lớp học để xem bài tập và đề thi được giao.
            </p>
          </div>
          <Button onClick={() => router.push('/classes')} className="mt-2">
            Về lớp học của tôi
          </Button>
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
              onClick={() => router.push('/documents')}
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
          <Button size="sm" onClick={() => router.push('/documents')}>
            <ArrowLeft size={16} className="mr-1.5" />
            Quay lại Tài liệu của tôi
          </Button>
        </div>
      </AppShell>
    );
  }

  // Resolve full folder path
  const effectiveFolderId = fileItem.parentId || searchFolderId || null;

  const getFolderPath = (): DocumentFolderItem[] => {
    const path: DocumentFolderItem[] = [];
    let curr = effectiveFolderId;
    while (curr) {
      const f = folders.find((item) => item.id === curr);
      if (f) {
        path.unshift(f);
        curr = f.parentId || null;
      } else {
        break;
      }
    }
    if (path.length === 0 && searchFolderId && searchFolderName) {
      path.push({
        id: searchFolderId,
        name: searchFolderName,
        parentId: null,
        createdAt: new Date().toISOString(),
      });
    }
    return path;
  };

  const folderPath = getFolderPath();
  const questions = fileItem.parsedQuiz?.questions || [];
  const totalPoints = Math.round(questions.reduce((sum, q) => sum + (q.points || 1), 0) * 10) / 10;
  const displayTitle = (fileItem.name || 'Đề thi trắc nghiệm').replace(/\.[^/.]+$/, '');

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Tài liệu của tôi
          </button>
          {folderPath.length > 0 ? (
            folderPath.map((folder, idx) => {
              const prevFolderId = idx === 0 ? null : folderPath[idx - 1].id;
              return (
                <React.Fragment key={folder.id || idx}>
                  <BreadcrumbChevron
                    folderId={prevFolderId}
                    allFolders={folders}
                    fallbackToStaticChevron={true}
                    onNavigateFolder={(id) => {
                      if (typeof window !== 'undefined') sessionStorage.setItem('app_active_folder_id', id);
                      router.push('/documents');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') sessionStorage.setItem('app_active_folder_id', folder.id);
                      router.push('/documents');
                    }}
                    className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              );
            })
          ) : null}
          <BreadcrumbChevron
            folderId={folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null}
            allFolders={folders}
            fallbackToStaticChevron={true}
            onNavigateFolder={(id) => {
              if (typeof window !== 'undefined') sessionStorage.setItem('app_active_folder_id', id);
              router.push('/documents');
            }}
            onNavigateFile={(id) => router.push(`/documents/${id}`)}
          />
          <span
            className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal truncate-tight max-w-xs sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-5xl"
            title={displayTitle}
          >
            {displayTitle}
          </span>
        </div>
      }
      action={
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            title="Tải xuống tệp JSON"
            className="rounded-xl text-xs gap-1.5 hidden md:inline-flex"
          >
            <Download size={14} />
            Tải JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="In đề thi"
            className="rounded-xl text-xs gap-1.5 hidden md:inline-flex"
          >
            <Printer size={14} />
            In đề
          </Button>

          {/* Blooket-style Assign & Host Combo */}
          <div className="flex items-center bg-white dark:bg-[#1f2023] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => router.push(`/documents/${encodeURIComponent(fileId)}/assign`)}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer select-none"
              title="Giao bài tập về nhà (Assign)"
            >
              <FileText size={17} className="text-slate-600 dark:text-slate-300" />
              <span>Assign</span>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => router.push(`/app/games?examId=${encodeURIComponent(fileId)}`)}
              className="px-4 py-1.5 rounded-xl bg-[#00c0b6] hover:bg-[#00ad9e] text-white font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_3px_0_#009ca8] active:translate-y-[2px] active:shadow-[0_1px_0_#009ca8] transition-all cursor-pointer select-none"
              title="Tổ chức trò chơi trực tiếp (Host Game)"
            >
              <Play size={15} className="fill-current text-white ml-0.5" />
              <span>Host</span>
            </button>
          </div>
        </div>
      }
    >
      {/* 1. SCREEN VIEW (Google Drive Web UI - Hidden when Printing) */}
      <div className="print-screen-view max-w-4xl mx-auto space-y-6 pb-20 pt-2 print:hidden">
        {/* Document Header (Frameless & Open) */}
        <div className="space-y-4 pt-1 pb-2 px-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#185abd] text-white flex items-center justify-center font-normal text-[11px] shrink-0 shadow-2xs">
                  W
                </div>
                <span className="text-xs font-semibold text-google-blue uppercase tracking-wider">
                  Đề thi trắc nghiệm
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {displayTitle}
              </h1>
              {fileItem.parsedQuiz?.description &&
                !fileItem.parsedQuiz.description.includes('do AI tạo') &&
                !fileItem.parsedQuiz.description.includes('do SI tạo') &&
                !fileItem.parsedQuiz.description.includes('tạo tự động') && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {fileItem.parsedQuiz.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAnswers(!showAnswers)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  showAnswers
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {showAnswers ? '✓ Đang hiện đáp án đúng' : 'Ẩn đáp án đúng'}
              </button>
            </div>
          </div>

          {/* Quick Metrics (Frameless & Clean) */}
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap pt-1 text-xs">
            <div className="flex items-center gap-1.5" title="Tổng số câu">
              <Layers size={17} className="text-google-blue shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{questions.length} câu</span>
            </div>

            <div className="flex items-center gap-1.5" title="Tổng điểm">
              <Award size={17} className="text-google-yellow shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalPoints} điểm</span>
            </div>

            <div className="flex items-center gap-1.5" title="Ngày tạo">
              <Clock size={17} className="text-emerald-500 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {fileItem.createdAt ? new Date(fileItem.createdAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
              </span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const rawStr = String((q as any).rawLabel || '').trim();
            const rawNumMatch = rawStr.match(/^\d+$/);
            let formattedLabel = rawStr;
            if (!formattedLabel || rawNumMatch) {
              formattedLabel = `Câu ${rawNumMatch ? rawNumMatch[0] : idx + 1}`;
            } else if (!/^(?:Câu|Bài|Question|Ví\s*dụ|Dạng)/i.test(formattedLabel)) {
              formattedLabel = `Câu ${formattedLabel}`;
            }
            formattedLabel = formattedLabel.replace(/[:.-]+$/, '').trim();

            const qType = (q as any).type || (q.options && q.options.length >= 2 ? 'multiple_choice' : 'essay');
            const hasOptions = q.options && q.options.length > 0;

            const cleanContent = (q.content || '')
              .replace(
                /^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i,
                ''
              )
              .replace(/^[\s.:\-_–—]+/, '')
              .trim();

            return (
              <div
                key={q.id || idx}
                className="p-5 md:p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950 text-google-blue font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap flex-1">
                          <span className="font-bold text-slate-900 dark:text-white mr-1.5 whitespace-nowrap">
                            {formattedLabel}:
                          </span>
                          <MathRenderer text={cleanContent} />
                        </h4>
                        {qType !== 'multiple_choice' && (
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 select-none ${
                              qType === 'essay'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {qType === 'essay' ? 'Tự luận' : 'Điền từ'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {q.points} điểm
                  </span>
                </div>

                {/* Options A, B, C, D (for Multiple Choice) */}
                {hasOptions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt, optIdx) => {
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
                            <strong
                              className={`mr-2 font-bold ${
                                isCorrect
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-500'
                              }`}
                            >
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
                )}

                {/* Short answer / Đáp án ngắn (for Essay / Fill in blank) */}
                {showAnswers && (q as any).answer && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl text-xs text-blue-900 dark:text-blue-300">
                    <span className="font-bold">Đáp án: </span>
                    <MathRenderer text={(q as any).answer} />
                  </div>
                )}

                {/* Explanation / Lời giải (if available) */}
                {showAnswers && q.explanation && (
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-bold">Hướng dẫn giải / Lời giải: </span>
                    <MathRenderer text={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}
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
          {questions.map((q, idx) => {
            const rawLabel = (q as any).rawLabel || `Câu ${idx + 1}`;
            const hasOptions = q.options && q.options.length > 0;

            return (
              <div key={q.id || idx} className="print-break-avoid mb-3">
                <p className="leading-snug text-justify whitespace-pre-wrap">
                  <span className="font-bold">{rawLabel}: </span>
                  <MathRenderer
                    text={(q.content || '').replace(
                      /^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i,
                      ''
                    )}
                  />
                </p>

                {/* 4 options in clean aligned row or 2-column grid */}
                {hasOptions && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-1 pl-4">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <div key={optIdx} className="leading-snug flex items-center">
                          <span className="font-bold mr-1">{letter}. </span>
                          <MathRenderer text={opt.content} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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

export default function DocumentDynamicViewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-google-blue mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang tải và chuẩn bị nội dung đề thi...</p>
        </div>
      }
    >
      <DocumentDynamicViewPageContent />
    </Suspense>
  );
}
