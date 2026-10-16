'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import {
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Calendar,
  Shuffle,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Users,
  QrCode,
  Download,
  Sparkles,
  ArrowLeft,
  FileText,
  Loader2,
  AlertTriangle,
  Globe,
  GraduationCap,
  Lock,
} from 'lucide-react';
import DateTimePicker, { formatDateTimeToInputValue } from '@/components/DateTimePicker';
import { createHomework, HomeworkItem } from '@/lib/homeworkApi';
import { getLocalClasses, ClassItem, createClassAssignment } from '@/lib/classesApi';
import { getDocumentFile } from '@/lib/documentsApi';
import { useAuthStore } from '@/store/useAuthStore';
import QRCode from 'qrcode';
import { cleanLeakedOleGarbage } from '@/lib/mtefParser';
import { cleanAndEnrichMathFormulas } from '@/lib/examStructureParser';
import { normalizeMathFormulas, cleanVietnameseEncoding } from '@/lib/questionValidator';

interface DocumentFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

function matchDocId(targetId: string, searchId: string): boolean {
  if (!targetId || !searchId) return false;
  if (targetId === searchId) return true;
  if (decodeURIComponent(targetId) === searchId) return true;
  if (targetId === decodeURIComponent(searchId)) return true;

  const cleanT = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanS = searchId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanT === cleanS) return true;

  const numPartT = targetId.match(/\d{10,}/)?.[0];
  const numPartS = searchId.match(/\d{10,}/)?.[0];
  if (numPartT && numPartS && numPartT === numPartS) {
    return true;
  }

  if (cleanT.length >= 10 && cleanS.length >= 10) {
    if (cleanT.slice(4) === cleanS.slice(4)) return true;
  }

  if (cleanT.includes(cleanS) || cleanS.includes(cleanT)) {
    return true;
  }

  return false;
}

function normalizeDocItem(raw: any, fallbackId: string): any {
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

  const normalizedQuestions = rawQuestions.map((q: any, idx: number) => {
    let qContent = typeof q === 'string' ? q : q?.content || `Câu hỏi ${idx + 1}`;
    qContent = cleanLeakedOleGarbage(qContent);
    qContent = normalizeMathFormulas(cleanVietnameseEncoding(cleanAndEnrichMathFormulas(qContent)));
    qContent = cleanLeakedOleGarbage(qContent);
    const qPoints = typeof q?.points === 'number' ? q.points : 0.25;

    let options: any[] = [];
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
      }).filter((o: any) => o.content && o.content.trim().length > 0);
    }

    let qExplanation = q?.explanation ? cleanAndEnrichMathFormulas(q.explanation) : '';
    qExplanation = cleanLeakedOleGarbage(qExplanation);
    qExplanation = normalizeMathFormulas(cleanVietnameseEncoding(qExplanation));
    qExplanation = cleanLeakedOleGarbage(qExplanation);

    // Xóa hoàn toàn các đoạn boilerplate giải thích giả
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

function AssignPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const fileId = (params?.id as string) || '';
  const { user, token } = useAuthStore();

  const isTeacher = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // BẢO MẬT: Chuyển hướng học sinh về Lớp học nếu truy cập trang giao bài của giáo viên
  useEffect(() => {
    if (user && !isTeacher) {
      router.replace('/classes');
    }
  }, [user, isTeacher, router]);

  const [isLoading, setIsLoading] = useState(true);
  const [fileItem, setFileItem] = useState<any>(null);
  const [folders, setFolders] = useState<DocumentFolderItem[]>([]);

  // Config States
  const [title, setTitle] = useState('');
  const queryClassId = searchParams?.get('classId') || searchParams?.get('assignClassId') || 'public';
  const [assignMode, setAssignMode] = useState<'public' | 'class'>(
    queryClassId && queryClassId !== 'public' ? 'class' : 'public'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    queryClassId === 'public' ? '' : queryClassId
  );
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [minSubmitMinutes, setMinSubmitMinutes] = useState<number>(0);
  const [customMinSubmit, setCustomMinSubmit] = useState<string>('');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(true);

  // Anti-cheating State (NÚT BẬT / TẮT & CẤU HÌNH CHI TIẾT)
  const [antiCheating, setAntiCheating] = useState(true);
  const [maxViolations, setMaxViolations] = useState<number>(3);
  const [forceFullscreen, setForceFullscreen] = useState(true);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [preventCopyPaste, setPreventCopyPaste] = useState(true);
  const [autoSubmitOnLimit, setAutoSubmitOnLimit] = useState(true);

  // Loading & Created State
  const [creating, setCreating] = useState(false);
  const [createdHomework, setCreatedHomework] = useState<HomeworkItem | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load document and classes
  useEffect(() => {
    if (!fileId) {
      setIsLoading(false);
      return;
    }

    let didCancel = false;

    const loadData = async () => {
      try {
        // Load classes
        const localCls = getLocalClasses();
        setClasses(localCls);
        if (localCls.length > 0 && queryClassId && queryClassId !== 'public') {
          setSelectedClassId(queryClassId);
          setAssignMode('class');
        } else if (localCls.length > 0 && !selectedClassId) {
          setSelectedClassId(localCls[0].id);
        }

        // Load folders
        if (typeof window !== 'undefined') {
          try {
            const savedFolders = localStorage.getItem('app_documents_folders');
            if (savedFolders) {
              const parsed = JSON.parse(savedFolders);
              if (Array.isArray(parsed)) setFolders(parsed);
            }
          } catch {}
        }

        // Load document from IDB first
        let foundDoc: any = null;
        if (typeof window !== 'undefined') {
          try {
            const { idbGetDocument, idbGetAllDocuments } = await import('@/lib/indexedDbStorage');
            foundDoc = await idbGetDocument(fileId);
            if (!foundDoc) {
              const allIdb = await idbGetAllDocuments();
              foundDoc = allIdb.find((d: any) => d && matchDocId(d.id, fileId));
            }
          } catch {}

          if (!foundDoc) {
            try {
              const rawFiles = localStorage.getItem('app_documents_files');
              if (rawFiles) {
                const list = JSON.parse(rawFiles);
                foundDoc = list.find((d: any) => d && matchDocId(d.id, fileId));
              }
            } catch {}
          }
        }

        // Fallback remote
        if (!foundDoc && token) {
          try {
            foundDoc = await getDocumentFile(token, fileId);
          } catch {}
        }

        if (didCancel) return;

        if (foundDoc) {
          const cleanedDoc = normalizeDocItem(foundDoc, fileId);
          setFileItem(cleanedDoc);
          const defaultTitle =
            cleanedDoc.parsedQuiz?.title ||
            cleanedDoc.name?.replace(/\.[^/.]+$/, '') ||
            'Bài tập trắc nghiệm';
          setTitle(`Bài tập: ${defaultTitle}`);
          setDurationMinutes(cleanedDoc.parsedQuiz?.durationMinutes || 45);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu giao bài:', err);
      } finally {
        if (!didCancel) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      didCancel = true;
    };
  }, [fileId, token]);

  // Sinh mã QR khi bài tập được tạo
  useEffect(() => {
    if (createdHomework) {
      const playUrl = getPlayUrl(createdHomework.pin);
      QRCode.toDataURL(playUrl, {
        width: 340,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Lỗi sinh mã QR:', err));
    }
  }, [createdHomework]);

  const getPlayUrl = (pin: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/play?pin=${pin}`;
    }
    return `http://localhost:3000/play?pin=${pin}`;
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyLink = (pin: string) => {
    navigator.clipboard.writeText(getPlayUrl(pin));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !createdHomework) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR_${createdHomework.pin}_${createdHomework.title.slice(0, 20)}.png`;
    a.click();
  };

  const getDefaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return formatDateTimeToInputValue(d);
  };

  const handleCreate = async () => {
    if (!title.trim() || !fileItem) return;
    if (assignMode === 'class' && !selectedClassId) {
      alert('Vui lòng chọn lớp học để giao bài.');
      return;
    }
    setCreating(true);

    try {
      const finalClassId = assignMode === 'class' ? selectedClassId : null;
      const selectedClass = classes.find((c) => c.id === finalClassId);
      const questions = fileItem.parsedQuiz?.questions || [];

      const finalMinSubmit = Number(minSubmitMinutes === -1 ? customMinSubmit : minSubmitMinutes) || 0;

      const hw = await createHomework({
        title: title.trim(),
        description: fileItem.parsedQuiz?.description || `Bài tập từ tài liệu ${fileItem.name}`,
        documentId: fileItem.id,
        classId: finalClassId,
        className: selectedClass ? selectedClass.name : 'Công khai / Tự do',
        deadline: hasDeadline && deadline ? new Date(deadline).toISOString() : null,
        durationMinutes: Number(durationMinutes),
        minSubmitMinutes: finalMinSubmit,
        shuffleQuestions,
        shuffleOptions,
        showAnswersAfterSubmit,
        antiCheating,
        antiCheatConfig: {
          forceFullscreen,
          detectTabSwitch,
          maxViolations: Number(maxViolations) || 3,
          preventCopyPaste,
          autoSubmitOnLimit,
        },
        quizData: {
          title: fileItem.parsedQuiz?.title || title,
          durationMinutes: Number(durationMinutes),
          questions,
        },
      });

      if (finalClassId) {
        const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        await createClassAssignment(activeToken, {
          classId: finalClassId,
          title: title.trim(),
          description: fileItem.parsedQuiz?.description || `Bài tập từ tài liệu ${fileItem.name}`,
          documentFileId: fileItem.id,
          deadline: hasDeadline && deadline ? new Date(deadline).toISOString() : undefined,
          durationMinutes: Number(durationMinutes),
          minSubmitMinutes: finalMinSubmit,
          antiCheat: antiCheating,
          antiCheatConfig: {
            enabled: antiCheating,
            fullscreen: forceFullscreen,
            forceFullscreen,
            preventTabSwitch: detectTabSwitch,
            detectTabSwitch,
            maxViolations: Number(maxViolations) || 3,
            disableCopy: preventCopyPaste,
            preventCopyPaste,
            autoSubmitOnLimit,
          },
        });
      }

      setCreatedHomework(hw);
    } catch (err) {
      console.error('Error creating homework:', err);
    } finally {
      setCreating(false);
    }
  };

  const getFolderPath = (): DocumentFolderItem[] => {
    if (!fileItem) return [];
    const path: DocumentFolderItem[] = [];
    let curr = fileItem.parentId || null;
    let guard = 0;
    while (curr && guard < 10) {
      guard++;
      const f = folders.find((item) => item.id === curr);
      if (f) {
        path.unshift(f);
        curr = f.parentId || null;
      } else {
        break;
      }
    }
    return path;
  };

  const folderPath = getFolderPath();
  const displayTitle = (fileItem?.name || 'Đề thi').replace(/\.[^/.]+$/, '');
  const questionsCount = fileItem?.parsedQuiz?.questions?.length || 0;

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-16 text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-google-blue mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang tải thông tin tài liệu...</p>
        </div>
      </AppShell>
    );
  }

  if (user && !isTeacher) {
    return (
      <AppShell title="Giao bài tập">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Lock size={32} />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Quyền truy cập bị từ chối
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản học sinh không thể truy cập tính năng giao bài tập của giáo viên. Vui lòng vào mục Lớp học để xem bài tập và đề thi được giao.
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
      <AppShell>
        <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
          <AlertTriangle size={36} className="text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Không tìm thấy tài liệu
          </h2>
          <p className="text-xs text-slate-500">
            Tài liệu này không tồn tại hoặc đã bị xóa. Vui lòng quay lại danh sách tài liệu.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/documents')}
            className="rounded-xl text-xs bg-google-blue text-white"
          >
            Quay lại Tài liệu của tôi
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('app_active_folder_id');
              router.push('/documents');
            }}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Tài liệu của tôi
          </button>
          {folderPath.map((folder, idx) => (
            <React.Fragment key={folder.id || idx}>
              <BreadcrumbChevron
                folderId={idx === 0 ? null : folderPath[idx - 1].id}
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
          ))}
          <BreadcrumbChevron
            folderId={folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null}
            allFolders={folders}
            fallbackToStaticChevron={true}
            onNavigateFolder={() => router.push('/documents')}
            onNavigateFile={(id) => router.push(`/documents/${id}`)}
          />
          <button
            type="button"
            onClick={() => router.push(`/documents/${encodeURIComponent(fileId)}`)}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal truncate-tight max-w-xs sm:max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-5xl text-left"
            title={displayTitle}
          >
            {displayTitle}
          </button>
          <BreadcrumbChevron isStatic={true} />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Giao bài tập
          </span>
        </div>
      }
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2 space-y-8">
        {createdHomework ? (
          /* TRANG THÀNH CÔNG: TÙY THEO HÌNH THỨC GIAO BÀI */
          /* 1. NẾU LÀ GIAO CÔNG KHAI (BẤT KỲ AI CŨNG VÀO ĐƯỢC): HIỆN GIAO DIỆN MÃ PIN & MÃ QR */
          /* 2. NẾU LÀ GIAO CHO LỚP (BẮT BUỘC ĐĂNG NHẬP ĐÚNG TK LỚP): HIỆN GIAO DIỆN BẢO MẬT LỚP HỌC */
          <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
            {(!createdHomework.classId || createdHomework.classId === 'public') ? (
              /* GIAO DIỆN CÔNG KHAI: MÃ PIN & MÃ QR SCANNABLE */
              <>
                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check size={32} className="stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-slate-100">
                      Giao bài tập tự do thành công!
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bất cứ ai có mã PIN hoặc quét mã QR đều có thể vào làm bài ngay mà không cần tài khoản.
                    </p>
                  </div>
                </div>

                {/* Showcase Box: PIN & QR Code */}
                <div className="p-8 bg-slate-50/80 dark:bg-slate-900/60 rounded-3xl text-center space-y-6">
                  {/* 1. MÃ PIN */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                      Mã PIN làm bài
                    </span>
                    <div className="font-mono text-4xl sm:text-5xl font-extrabold tracking-wider text-google-blue select-all">
                      {createdHomework.pin.slice(0, 3)} {createdHomework.pin.slice(3)}
                    </div>
                  </div>

                  {/* 2. MÃ QR SCANNABLE */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-white rounded-2xl shadow-xs inline-block">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Mã QR làm bài"
                          className="w-56 h-56 rounded-xl object-contain mx-auto"
                        />
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                          Đang tạo mã QR...
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 justify-center">
                      <QrCode size={14} className="text-google-blue shrink-0" />
                      Quét bằng Camera điện thoại hoặc Zalo để vào làm bài ngay
                    </p>
                  </div>

                  {/* Quick Share Buttons */}
                  <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(createdHomework.pin)}
                      className="gap-1.5 text-xs rounded-xl"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedLink ? 'Đã sao chép link' : 'Sao chép liên kết'}
                    </Button>
                    {qrCodeUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadQr}
                        className="gap-1.5 text-xs rounded-xl"
                        title="Tải ảnh QR về máy để in hoặc chia sẻ"
                      >
                        <Download size={14} /> Tải ảnh QR
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* GIAO DIỆN GIAO CHO LỚP: BẢO MẬT & BẮT BUỘC ĐĂNG NHẬP ĐÚNG TÀI KHOẢN LỚP */
              <>
                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                    <GraduationCap size={32} className="stroke-[2.2]" />
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-2xl font-normal tracking-tight text-slate-900 dark:text-slate-100">
                      Đã giao bài tập thành công cho lớp {createdHomework.className}!
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                      Bài tập đã được đăng trực tiếp vào lớp học. Học sinh cần <strong>đăng nhập đúng tài khoản trong danh sách lớp</strong> để vào làm bài.
                    </p>
                  </div>
                </div>

                {/* Class Security Notice Box */}
                <div className="p-6 sm:p-8 bg-slate-50/80 dark:bg-slate-900/60 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 text-center space-y-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <Lock size={13} />
                    <span>Chế độ bảo mật lớp học: Đã kích hoạt</span>
                  </div>

                  <div className="space-y-2 max-w-lg mx-auto text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p>
                      🔒 Học sinh ngoài lớp hoặc chưa đăng nhập tài khoản <strong>sẽ không thể vào làm bài</strong>.
                    </p>
                    <p>
                      Học sinh chỉ cần đăng nhập tài khoản của lớp là có thể làm bài ngay từ danh sách bài tập lớp hoặc qua đường dẫn trực tiếp.
                    </p>
                  </div>

                  {/* Share Link Button for Class */}
                  <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(createdHomework.pin)}
                      className="gap-1.5 text-xs rounded-xl"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copiedLink ? 'Đã sao chép link' : 'Sao chép link làm bài của lớp'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push(`/app/classes/${createdHomework.classId}`)}
                      className="gap-1.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <ArrowLeft size={14} /> Về trang lớp {createdHomework.className}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Assignment Overview */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Tiêu đề bài tập</span>
                <strong className="text-slate-900 dark:text-slate-100">{createdHomework.title}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Hình thức giao</span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {createdHomework.classId && createdHomework.classId !== 'public'
                    ? `Lớp ${createdHomework.className} (Đăng nhập tài khoản lớp)`
                    : 'Bất cứ ai có mã PIN/QR (Tự do)'}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Số lượng câu hỏi</span>
                <strong className="text-slate-900 dark:text-slate-100">{questionsCount} câu</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Thời gian làm bài</span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {createdHomework.durationMinutes > 0 ? `${createdHomework.durationMinutes} phút` : 'Không giới hạn'}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Nộp bài tối thiểu</span>
                <strong className="text-slate-900 dark:text-slate-100">
                  {createdHomework.minSubmitMinutes && createdHomework.minSubmitMinutes > 0
                    ? `Sau ${createdHomework.minSubmitMinutes} phút`
                    : 'Không yêu cầu (Nộp bài bất kỳ lúc nào)'}
                </strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Quy tắc nộp bài</span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Bắt buộc làm ít nhất 1 câu (Chặn nộp bài trống)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Chống gian lận</span>
                {createdHomework.antiCheating ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-google-blue dark:bg-blue-950/60 dark:text-blue-300">
                    Đang BẬT (Tối đa 3 lần)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Đang TẮT
                  </span>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              {createdHomework.classId && createdHomework.classId !== 'public' && (
                <Button
                  variant="primary"
                  onClick={() => router.push(`/app/classes/${createdHomework.classId}`)}
                  className="rounded-2xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ArrowLeft size={14} /> Về trang lớp học
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/app/assignments/${createdHomework.id}`)}
                className="rounded-2xl text-xs gap-1.5"
              >
                Xem trang kết quả bài nộp
              </Button>
              <Button
                variant="primary"
                onClick={() => window.open(getPlayUrl(createdHomework.pin), '_blank')}
                className="rounded-2xl text-xs gap-1.5 bg-google-blue hover:bg-[#1557b0] text-white"
              >
                <ExternalLink size={14} /> Mở làm thử ngay
              </Button>
            </div>
          </div>
        ) : (
          /* TRANG CẤU HÌNH GIAO BÀI TẬP (MỞ RỘNG HAI BÊN, KHÔNG KHUNG HỘP) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* CỘT TRÁI (8 COLS): CÁC CÀI ĐẶT BÀI TẬP (KHÔNG KHUNG) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Phần 1: Thông tin bài tập */}
              <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-slate-800/80">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Thông tin bài tập
                </h2>

                {/* Tiêu đề */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tiêu đề bài tập <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tên bài tập"
                    className="rounded-xl text-sm"
                  />
                </div>

                {/* Hình thức giao bài (2 Tùy chọn) */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users size={15} className="text-slate-400" />
                    Hình thức giao bài <span className="text-red-500">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                    {/* Mục 1: Bất cứ ai có liên kết / Mã PIN */}
                    <div
                      onClick={() => setAssignMode('public')}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        assignMode === 'public'
                          ? 'border-google-blue bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${
                          assignMode === 'public' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          <Globe size={18} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Bất cứ ai có liên kết
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="assignMode"
                        checked={assignMode === 'public'}
                        onChange={() => setAssignMode('public')}
                        className="text-google-blue focus:ring-google-blue cursor-pointer"
                      />
                    </div>

                    {/* Mục 2: Chỉ học sinh trong lớp học - Kết hợp chọn lớp học */}
                    <div
                      onClick={() => {
                        setAssignMode('class');
                        if (!selectedClassId && classes.length > 0) {
                          setSelectedClassId(classes[0].id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                        assignMode === 'class'
                          ? 'border-google-blue bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs ${
                            assignMode === 'class' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <GraduationCap size={18} />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Chỉ học sinh trong lớp
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="assignMode"
                          checked={assignMode === 'class'}
                          onChange={() => {
                            setAssignMode('class');
                            if (!selectedClassId && classes.length > 0) {
                              setSelectedClassId(classes[0].id);
                            }
                          }}
                          className="text-google-blue focus:ring-google-blue cursor-pointer"
                        />
                      </div>

                      {/* Dropdown chọn lớp học kết hợp trực tiếp */}
                      {assignMode === 'class' && (
                        <div className="pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 animate-in fade-in duration-150 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <span>Chọn lớp học:</span>
                            <span className="text-red-500">*</span>
                          </label>
                          {classes.length > 0 ? (
                            <select
                              value={selectedClassId}
                              onChange={(e) => setSelectedClassId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-google-blue cursor-pointer shadow-xs"
                            >
                              {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  Lớp: {cls.name} • {cls._count?.members || 0} học sinh
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                              <span className="text-[11px]">Chưa có lớp học</span>
                              <Button
                                size="sm"
                                onClick={() => router.push('/app/classes')}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] px-2.5 py-1 h-7 shrink-0"
                              >
                                Tạo lớp ngay
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thời gian & Hạn nộp */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
                  {/* Thời gian làm bài */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={15} className="text-slate-400" />
                      Thời gian làm bài
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                    >
                      <option value={0}>Không giới hạn thời gian</option>
                      <option value={15}>15 phút</option>
                      <option value={30}>30 phút</option>
                      <option value={45}>45 phút (Mặc định)</option>
                      <option value={60}>60 phút</option>
                      <option value={90}>90 phút</option>
                    </select>
                  </div>

                  {/* Thời gian nộp bài tối thiểu */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={15} className="text-slate-400" />
                      Nộp bài tối thiểu
                    </label>
                    <select
                      value={minSubmitMinutes}
                      onChange={(e) => setMinSubmitMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                    >
                      <option value={0}>Không yêu cầu (Nộp bất kỳ lúc nào)</option>
                      <option value={5}>Sau tối thiểu 5 phút</option>
                      <option value={10}>Sau tối thiểu 10 phút</option>
                      <option value={15}>Sau tối thiểu 15 phút</option>
                      <option value={20}>Sau tối thiểu 20 phút</option>
                      <option value={30}>Sau tối thiểu 30 phút</option>
                      <option value={45}>Sau tối thiểu 45 phút</option>
                      <option value={-1}>Tùy chỉnh số phút</option>
                    </select>
                    {minSubmitMinutes === -1 && (
                      <Input
                        type="number"
                        min={1}
                        placeholder="Nhập số phút tối thiểu"
                        value={customMinSubmit}
                        onChange={(e) => setCustomMinSubmit(e.target.value)}
                        className="text-xs rounded-xl mt-1.5"
                      />
                    )}
                  </div>

                  {/* Hạn chót nộp bài */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar size={15} className="text-slate-400" />
                        Hạn chót nộp bài
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasDeadline}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setHasDeadline(checked);
                            if (checked && !deadline) {
                              setDeadline(getDefaultDeadline());
                            }
                          }}
                          className="rounded text-google-blue focus:ring-0 cursor-pointer"
                        />
                        Đặt hạn nộp
                      </label>
                    </div>
                    {hasDeadline ? (
                      <DateTimePicker
                        value={deadline}
                        onChange={setDeadline}
                        placeholder="Chọn ngày và giờ hạn nộp"
                      />
                    ) : (
                      <div className="py-2.5 text-slate-400 text-xs">
                        Không giới hạn ngày nộp
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Phần 2: Tùy chọn xáo trộn & Đáp án */}
              <div className="space-y-5 pb-8 border-b border-slate-100 dark:border-slate-800/80">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tùy chọn xáo trộn và Đáp án
                </h2>

                <div className="space-y-3.5 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer select-none group py-1">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium group-hover:text-google-blue transition-colors">
                      Xáo trộn thứ tự câu hỏi trong đề
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none group py-1">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium group-hover:text-google-blue transition-colors">
                      Xáo trộn các phương án lựa chọn (A, B, C, D)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none group py-1">
                    <input
                      type="checkbox"
                      checked={showAnswersAfterSubmit}
                      onChange={(e) => setShowAnswersAfterSubmit(e.target.checked)}
                      className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium group-hover:text-google-blue transition-colors">
                      Cho phép học sinh xem đáp án và lời giải chi tiết sau khi hoàn thành bài nộp
                    </span>
                  </label>
                </div>
              </div>

              {/* Phần 3: TÍNH NĂNG CHỐNG GIAN LẬN (ANTI-CHEATING) */}
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        antiCheating
                          ? 'bg-blue-50 dark:bg-blue-950 text-google-blue'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Tính năng chống gian lận
                        {antiCheating ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-google-blue dark:bg-blue-950 dark:text-blue-300 uppercase">
                            Đang BẬT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 uppercase">
                            Đang TẮT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NÚT BẬT / TẮT (TOGGLE SWITCH) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={antiCheating}
                    onClick={() => setAntiCheating(!antiCheating)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      antiCheating ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        antiCheating ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Chi tiết cơ chế bảo vệ khi BẬT */}
                {antiCheating && (
                  <div className="pt-2 space-y-5 animate-in fade-in">
                    {/* Hàng 1: Giới hạn số lần vi phạm */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Số lần vi phạm tối đa cho phép
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {maxViolations === 1 ? 'Cực kỳ nghiêm ngặt' : maxViolations === 3 ? 'Khuyên dùng' : 'Linh hoạt'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setMaxViolations(num)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              maxViolations === num
                                ? 'bg-google-blue text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {num} lần
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hàng 2: Tùy chọn xử lý khi vượt quá số lần vi phạm */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <label className="flex items-center gap-3 cursor-pointer group select-none py-1">
                        <input
                          type="checkbox"
                          checked={autoSubmitOnLimit}
                          onChange={(e) => setAutoSubmitOnLimit(e.target.checked)}
                          className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-google-blue transition-colors">
                          Tự động khóa và thu bài khi chạm mức vi phạm tối đa
                        </span>
                      </label>
                    </div>

                    {/* Hàng 3: Các quy tắc giám sát chi tiết */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Các biện pháp giám sát được áp dụng
                      </span>

                      <div className="space-y-3 pt-1">
                        {/* 1. Fullscreen */}
                        <label className="flex items-center gap-3 cursor-pointer select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={forceFullscreen}
                            onChange={(e) => setForceFullscreen(e.target.checked)}
                            className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-google-blue transition-colors">
                            Toàn màn hình bắt buộc
                          </span>
                        </label>

                        {/* 2. Chuyển tab */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group py-0.5">
                          <input
                            type="checkbox"
                            checked={detectTabSwitch}
                            onChange={(e) => setDetectTabSwitch(e.target.checked)}
                            className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-google-blue transition-colors">
                            Giám sát chuyển tab và cửa sổ
                          </span>
                        </label>

                        {/* 3. Chống copy & chuột phải */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group py-0.5">
                          <input
                            type="checkbox"
                            checked={preventCopyPaste}
                            onChange={(e) => setPreventCopyPaste(e.target.checked)}
                            className="w-4 h-4 rounded text-google-blue border-slate-300 dark:border-slate-600 focus:ring-google-blue"
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-google-blue transition-colors">
                            Chống sao chép, vô hiệu chuột phải và DevTools
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI (4 COLS): TỔNG QUAN TÀI LIỆU & NÚT TẠO (GỌN GÀNG, KHÔNG KHUNG HỘP DÀY) */}
            <div className="lg:col-span-4 space-y-6 sticky top-6">
              <div className="bg-slate-50/70 dark:bg-slate-900/40 rounded-3xl p-6 sm:p-7 space-y-5">
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Đề thi gốc
                  </span>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={displayTitle}>
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {questionsCount} câu hỏi &bull; {fileItem.parsedQuiz?.durationMinutes || 45} phút
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs pt-3">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Số câu hỏi</span>
                    <strong className="text-slate-900 dark:text-slate-100">{questionsCount} câu</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Thời gian làm</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {durationMinutes > 0 ? `${durationMinutes} phút` : 'Không giới hạn'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Hình thức giao</span>
                    <strong className="text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                      {assignMode === 'public' ? 'Tự do (Mã PIN / QR)' : (classes.find(c => c.id === selectedClassId)?.name || 'Chưa chọn lớp')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Yêu cầu đăng nhập</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {assignMode === 'public' ? 'Không bắt buộc' : 'Bắt buộc tài khoản lớp'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Chế độ bảo mật</span>
                    {antiCheating ? (
                      <span className="text-google-blue font-semibold">Chống gian lận</span>
                    ) : (
                      <span className="text-slate-500">Tiêu chuẩn</span>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2.5">
                  <Button
                    variant="primary"
                    onClick={handleCreate}
                    disabled={creating || !title.trim() || (assignMode === 'class' && !selectedClassId)}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-xs gap-2 bg-google-blue hover:bg-[#1557b0] transition-colors"
                  >
                    {assignMode === 'class' ? <GraduationCap size={18} /> : <Send size={18} />}
                    <span>{creating ? 'Đang giao bài...' : 'Giao bài'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/documents/${encodeURIComponent(fileId)}`)}
                    className="w-full text-xs rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Hủy và quay lại
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DocumentAssignPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-16 text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-google-blue mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải...</p>
          </div>
        </AppShell>
      }
    >
      <AssignPageContent />
    </Suspense>
  );
}
