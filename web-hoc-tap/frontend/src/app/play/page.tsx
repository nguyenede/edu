'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Modal } from '@/components/Modal';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Eye,
  Home,
  QrCode,
  Loader2,
  ArrowLeft,
  Check,
  Sparkles,
  Lock,
  LogIn,
  UserCheck,
  UserX,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { checkUserInClass } from '@/lib/classesApi';
import {
  getHomeworkByPin,
  submitHomework,
  HomeworkItem,
  HomeworkViolationLog,
} from '@/lib/homeworkApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cleanAndEnrichMathFormulas } from '@/lib/examStructureParser';
import { normalizeMathFormulas, cleanVietnameseEncoding } from '@/lib/questionValidator';

function PlayMathRenderer({ text }: { text: string }) {
  if (!text) return null;
  let formatted = cleanVietnameseEncoding(text);
  formatted = cleanAndEnrichMathFormulas(formatted);
  formatted = normalizeMathFormulas(formatted);

  return (
    <span className="inline leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: '#d97706', strict: false }]]}
        components={{
          p: ({ children }) => <span className="inline leading-relaxed">{children}</span>,
        }}
      >
        {formatted}
      </ReactMarkdown>
    </span>
  );
}

function BlooketPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams?.get('pin') || '';

  // Phases: 'lobby' | 'anti_cheat_prompt' | 'playing' | 'completed'
  const [phase, setPhase] = useState<'lobby' | 'anti_cheat_prompt' | 'playing' | 'completed'>('lobby');

  // Auth & Class Security
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const [classCheckStatus, setClassCheckStatus] = useState<'idle' | 'checking' | 'allowed' | 'not_logged_in' | 'not_in_class'>('idle');

  // Lobby States
  const [pinInput, setPinInput] = useState(initialPin);
  const [studentName, setStudentName] = useState('');
  const [homework, setHomework] = useState<HomeworkItem | null>(null);
  const [loadingHw, setLoadingHw] = useState(false);
  const [lobbyError, setLobbyError] = useState('');

  // Playing States
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: string]: string }>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Anti-Cheating States
  const [violationCount, setViolationCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState<HomeworkViolationLog[]>([]);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [latestWarningMessage, setLatestWarningMessage] = useState('');
  const lastViolationTimeRef = useRef(0);
  const warningModalOpenRef = useRef(false);
  const modalCooldownUntilRef = useRef(0);
  const hasEnteredFullscreenRef = useRef(false);
  const blurTimeoutRef = useRef<any>(null);
  const [floatingToast, setFloatingToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFloatingToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setFloatingToast(null);
    }, 2500);
  };

  // Result States
  const [resultScore, setResultScore] = useState<number>(0);
  const [resultCorrectCount, setResultCorrectCount] = useState<number>(0);
  const [showReview, setShowReview] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [minTimeWarning, setMinTimeWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Auto-load PIN if provided in query
  useEffect(() => {
    if (initialPin && initialPin.trim().length > 0) {
      handleLookupPin(initialPin.trim());
    }
  }, [initialPin]);

  // Kiểm tra quyền truy cập lớp học khi bài tập được tải
  useEffect(() => {
    if (!homework) {
      setClassCheckStatus('idle');
      return;
    }

    // 1. Nếu là bài tập công khai: Bất cứ ai cũng vào được
    if (!homework.classId || homework.classId === 'public') {
      setClassCheckStatus('allowed');
      if (user?.name && !studentName) {
        setStudentName(user.name);
      }
      return;
    }

    // 2. Nếu là bài tập giao cho lớp: Bắt buộc đăng nhập đúng tài khoản lớp
    if (!isAuthenticated || !user) {
      setClassCheckStatus('not_logged_in');
      return;
    }

    let isMounted = true;
    setClassCheckStatus('checking');

    checkUserInClass(user, homework.classId, token).then((res) => {
      if (!isMounted) return;
      if (res.allowed) {
        setClassCheckStatus('allowed');
        setStudentName(user.name || user.email);
      } else {
        setClassCheckStatus('not_in_class');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [homework, user, isAuthenticated, token]);

  const handleLookupPin = async (pinToLookup: string) => {
    setLoadingHw(true);
    setLobbyError('');
    try {
      const hw = await getHomeworkByPin(pinToLookup);
      if (!hw) {
        setLobbyError('Không tìm thấy bài tập với mã PIN này. Vui lòng kiểm tra lại!');
        setHomework(null);
      } else {
        setHomework(hw);
      }
    } catch (err) {
      setLobbyError('Lỗi kết nối khi tìm bài tập.');
    } finally {
      setLoadingHw(false);
    }
  };

  const handleStartExamFlow = () => {
    if (!homework) {
      if (!pinInput.trim()) {
        setLobbyError('Vui lòng nhập mã PIN 6 số');
        return;
      }
      handleLookupPin(pinInput.trim());
      return;
    }

    // Kiểm tra quyền vào lớp nếu bài tập có chỉ định lớp học
    if (homework.classId && homework.classId !== 'public') {
      if (classCheckStatus === 'not_logged_in') {
        setLobbyError(`Bài tập này yêu cầu đăng nhập tài khoản học sinh lớp ${homework.className}`);
        return;
      }
      if (classCheckStatus === 'not_in_class') {
        setLobbyError(`Tài khoản hiện tại không thuộc danh sách lớp ${homework.className}`);
        return;
      }
      if (classCheckStatus !== 'allowed') {
        setLobbyError('Đang kiểm tra quyền truy cập lớp học, vui lòng đợi trong giây lát');
        return;
      }
    }

    if (!studentName.trim()) {
      setLobbyError('Vui lòng nhập Họ và tên để bắt đầu làm bài');
      return;
    }

    // Chuẩn bị câu hỏi
    let qs = [...(homework.quizData?.questions || [])];
    if (homework.shuffleQuestions) {
      qs = qs.sort(() => Math.random() - 0.5);
    }

    // Chuẩn hóa phương án và làm sạch nội dung câu hỏi
    qs = qs.map((q, idx) => {
      let cleanQ = (q.content || '')
        .replace(/^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i, '')
        .replace(/^[\s.:\-_–—]+/, '')
        .trim();
      let opts = Array.isArray(q.options) ? [...q.options] : [];
      if (homework.shuffleOptions && opts.length > 0) {
        opts = opts.sort(() => Math.random() - 0.5);
      }
      return {
        ...q,
        id: q.id || `q_${idx + 1}`,
        content: cleanQ || q.content,
        options: opts,
      };
    });

    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setTimeSpent(0);

    // Thời gian
    if (homework.durationMinutes > 0) {
      setSecondsLeft(homework.durationMinutes * 60);
    } else {
      setSecondsLeft(null);
    }

    // Kiểm tra chống gian lận
    if (homework.antiCheating) {
      setPhase('anti_cheat_prompt');
    } else {
      setPhase('playing');
    }
  };

  const handleEnterFullscreenAndPlay = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        hasEnteredFullscreenRef.current = true;
      }
    } catch (e) {
      console.warn('Không thể vào toàn màn hình tự động:', e);
    }
    setPhase('playing');
  };

  // 🛡️ BỘ LẮNG NGHE CHỐNG GIAN LẬN THỜI GIAN THỰC (ANTI-CHEATING LISTENERS) 🛡️
  useEffect(() => {
    if (phase !== 'playing' || !homework?.antiCheating) return;

    const maxAllowed = homework.antiCheatConfig?.maxViolations || 3;
    const autoSubmit = homework.antiCheatConfig?.autoSubmitOnLimit !== false;
    const forceFullscreen = homework.antiCheatConfig?.forceFullscreen !== false;
    const detectTabSwitch = homework.antiCheatConfig?.detectTabSwitch !== false;
    const preventCopyPaste = homework.antiCheatConfig?.preventCopyPaste !== false;

    const recordViolation = (type: HomeworkViolationLog['type'], message: string) => {
      if (warningModalOpenRef.current) return;
      const now = Date.now();
      if (now < modalCooldownUntilRef.current) return;
      if (now - lastViolationTimeRef.current < 2500) return;
      lastViolationTimeRef.current = now;

      setViolationCount((prev) => {
        const nextCount = prev + 1;
        const newLog: HomeworkViolationLog = {
          type,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          message: `${message} - Lần ${nextCount}/${maxAllowed}`,
        };
        setViolationLogs((prevLogs) => [...prevLogs, newLog]);

        setLatestWarningMessage(
          nextCount >= maxAllowed && !autoSubmit
            ? `${message}. Bạn đã vi phạm ${nextCount} lần, vượt mức cho phép ${maxAllowed} lần. Hệ thống đã ghi nhận đầy đủ vi phạm để báo cáo cho giáo viên!`
            : newLog.message
        );
        warningModalOpenRef.current = true;
        setWarningModalOpen(true);

        // Nếu vượt quá số lần vi phạm & bật tự động nộp bài -> TỰ ĐỘNG KHÓA VÀ NỘP BÀI
        if (nextCount >= maxAllowed && autoSubmit) {
          setTimeout(() => {
            handleFinalSubmit(
              `Bài thi đã tự động nộp do vi phạm quy chế chống gian lận: ${nextCount}/${maxAllowed} lần!`
            );
          }, 1500);
        }

        return nextCount;
      });
    };

    // 1. Phát hiện chuyển tab (visibility change)
    const handleVisibilityChange = () => {
      if (!detectTabSwitch) return;
      if (document.visibilityState === 'hidden') {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        recordViolation('tab_switch', 'Phát hiện rời khỏi tab làm bài thi');
      }
    };

    // 2. Phát hiện mất focus cửa sổ (window blur) với 1.5s grace period để chống báo động nhầm
    const handleWindowBlur = () => {
      if (!detectTabSwitch) return;
      if (warningModalOpenRef.current) return;
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        if (typeof document !== 'undefined' && document.hasFocus && !document.hasFocus() && !warningModalOpenRef.current) {
          recordViolation('window_blur', 'Phát hiện chuyển sang cửa sổ hoặc ứng dụng khác');
        }
      }, 1500);
    };

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    // 3. Phát hiện thoát toàn màn hình (fullscreen exit)
    const handleFullscreenChange = () => {
      if (!forceFullscreen) return;
      if (document.fullscreenElement) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current) {
        recordViolation('exit_fullscreen', 'Phát hiện thoát khỏi chế độ Toàn màn hình');
      }
    };

    // 4. Chống chuột phải, sao chép văn bản, phím tắt & DevTools
    const handleContextMenu = (e: MouseEvent) => {
      if (!preventCopyPaste) return;
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        showToast('Chuột phải đã bị vô hiệu hóa trong phòng thi');
      }
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      if (!preventCopyPaste) return;
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput) {
        e.preventDefault();
        showToast('Không được phép sao chép nội dung bài thi!');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!preventCopyPaste) return;
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        recordViolation('copy_attempt', 'Cố gắng mở công cụ nhà phát triển (DevTools)');
        return;
      }

      if (e.ctrlKey && ['c', 'u'].includes(e.key.toLowerCase())) {
        if (!isInput) {
          e.preventDefault();
          showToast('Thao tác sao chép phím tắt bị cấm trong phòng thi!');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, homework]);

  // Bộ đếm thời gian làm bài
  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);

      if (secondsLeft !== null) {
        setSecondsLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            handleFinalSubmit('Hết giờ làm bài! Hệ thống tự động thu bài.');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  const handleSelectOption = (qId: string, optionContent: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionContent,
    }));
  };

  const handleFinalSubmit = async (reasonNotice?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }

    if (reasonNotice) {
      setSubmissionNotice(reasonNotice);
    }

    // Chấm điểm trắc nghiệm
    let correct = 0;
    const formattedAnswers: any = {};

    questions.forEach((q) => {
      const selected = selectedAnswers[q.id] || '';
      let isCorr = false;

      if (Array.isArray(q.options) && q.options.length > 0) {
        const matchingOpt = q.options.find(
          (o: any) => (typeof o === 'string' ? o : o.content) === selected
        );
        if (matchingOpt && Boolean(matchingOpt.isCorrect)) {
          isCorr = true;
          correct++;
        }
      }

      formattedAnswers[q.id] = {
        selectedAnswer: selected,
        isCorrect: isCorr,
      };
    });

    const total = questions.length || 1;
    const score = Math.round((correct / total) * 10 * 10) / 10; // Thang 10

    setResultScore(score);
    setResultCorrectCount(correct);

    // Gửi kết quả về hệ thống
    if (homework) {
      try {
        await submitHomework({
          homeworkId: homework.id,
          pin: homework.pin,
          studentName: studentName.trim(),
          studentId: user?.id || undefined,
          score,
          correctCount: correct,
          totalQuestions: total,
          timeSpentSeconds: timeSpent,
          violationCount,
          violationLogs,
          answers: formattedAnswers,
        });
      } catch (err) {
        console.error('Error submitting homework:', err);
      }
    }

    setPhase('completed');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // RENDER PHASE: LOBBY (SYNCHRONIZED WITH WEB DESIGN SYSTEM)
  // -------------------------------------------------------------
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-google-bg dark:bg-[#131314] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app/documents')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Quay lại tài liệu"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-google-blue font-bold text-sm flex items-center justify-center">
                E
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
                HocRealtime
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Lobby Center Card */}
        <main className="max-w-md w-full mx-auto px-4 py-8 my-auto">
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-center">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-google-blue">
                <Sparkles size={13} /> Phòng thi trực tuyến
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Vào làm bài tập
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập mã PIN 6 số hoặc quét mã QR do giáo viên cung cấp
              </p>
            </div>

            {lobbyError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2 text-left">
                <AlertTriangle size={16} className="shrink-0 text-red-500" />
                <span>{lobbyError}</span>
              </div>
            )}

            <div className="space-y-4 text-left">
              {/* PIN INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã PIN (6 chữ số)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPinInput(val);
                      if (val.length === 6) handleLookupPin(val);
                    }}
                    placeholder="VD: 829143"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-google-blue"
                  />
                  {loadingHw && (
                    <div className="absolute right-3.5 top-3.5">
                      <Loader2 size={20} className="animate-spin text-google-blue" />
                    </div>
                  )}
                </div>
              </div>

              {/* THÔNG TIN BÀI TẬP (GỌN GÀNG, TỐI GIẢN) */}
              {homework && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1 text-left animate-in fade-in">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {homework.title}
                  </div>
                  {homework.classId && homework.classId !== 'public' && classCheckStatus === 'allowed' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Học sinh: <strong className="text-slate-800 dark:text-slate-200">{user?.name || studentName}</strong>
                      {homework.className && (
                        <span> &bull; Lớp: <strong className="text-slate-800 dark:text-slate-200">{homework.className}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CHECK QUYỀN TRUY CẬP: TỰ DO vs BẮT BUỘC ĐÚNG TÀI KHOẢN LỚP */}
              {homework && homework.classId && homework.classId !== 'public' ? (
                /* BÀI TẬP CỦA LỚP HỌC */
                classCheckStatus === 'checking' ? (
                  <div className="p-4 text-center space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <Loader2 size={20} className="animate-spin text-google-blue mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Đang kiểm tra tài khoản lớp học</p>
                  </div>
                ) : classCheckStatus === 'not_logged_in' ? (
                  /* 1. CHƯA ĐĂNG NHẬP */
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-3 text-center animate-in fade-in">
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                      <Lock size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Yêu cầu đăng nhập tài khoản lớp
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        Bài tập này được giao riêng cho lớp <strong>{homework.className}</strong>. Vui lòng đăng nhập đúng tài khoản học sinh ở lớp đó.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => {
                        const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : `/play?pin=${homework.pin}`;
                        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                      }}
                      className="w-full py-2.5 rounded-xl bg-google-blue hover:bg-[#1557b0] text-white font-bold text-xs gap-1.5 justify-center shadow-xs"
                    >
                      <LogIn size={14} />
                      Đăng nhập để vào làm bài
                    </Button>
                  </div>
                ) : classCheckStatus === 'not_in_class' ? (
                  /* 2. ĐÃ ĐĂNG NHẬP NHƯNG KHÔNG THUỘC LỚP */
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 space-y-3 text-center animate-in fade-in">
                    <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center mx-auto">
                      <UserX size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Tài khoản không thuộc lớp học
                      </h4>
                      <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                        Tài khoản <strong>{user?.name || user?.email}</strong> không nằm trong danh sách lớp <strong>{homework.className}</strong>.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        logout();
                        const currentPath = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : `/play?pin=${homework.pin}`;
                        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
                      }}
                      className="w-full py-2 rounded-xl text-xs gap-1.5 justify-center text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    >
                      <LogOut size={13} />
                      Đổi tài khoản khác
                    </Button>
                  </div>
                ) : (
                  /* 3. ĐÃ XÁC THỰC THÀNH CÔNG VÀO LỚP -> CHỈ HIỂN THỊ NÚT BẤM (CÙNG MÀU XANH DƯƠNG, KHÔNG ĐỔI MÀU) */
                  <Button
                    variant="primary"
                    onClick={handleStartExamFlow}
                    disabled={loadingHw || !studentName.trim()}
                    className="w-full py-3.5 rounded-2xl bg-google-blue hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-bold text-sm shadow-sm transition-all"
                  >
                    VÀO LÀM BÀI NGAY
                  </Button>
                )
              ) : (
                /* BÀI TẬP TỰ DO: BẤT CỨ AI CŨNG VÀO ĐƯỢC */
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Họ và tên của bạn
                    </label>
                    <Input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Nhập họ và tên"
                      className="rounded-2xl text-sm"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleStartExamFlow}
                    disabled={loadingHw || !studentName.trim()}
                    className="w-full py-3.5 rounded-2xl bg-google-blue hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-bold text-sm shadow-sm transition-all"
                  >
                    VÀO LÀM BÀI NGAY
                  </Button>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 py-3">
          HocRealtime &bull; Hệ thống làm bài trực tuyến chuẩn GDPT
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PHASE: ANTI-CHEAT PROMPT (FULLSCREEN MODAL)
  // -------------------------------------------------------------
  if (phase === 'anti_cheat_prompt') {
    return (
      <div className="min-h-screen bg-google-bg dark:bg-[#131314] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1e1f20] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-google-blue flex items-center justify-center mx-auto">
            <ShieldCheck size={36} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Quy chế chống gian lận
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bài thi này đã kích hoạt tính năng giám sát công bằng. Vui lòng tuân thủ các quy tắc sau:
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
            {homework?.antiCheatConfig?.forceFullscreen !== false && (
              <div className="flex items-start gap-2">
                <span className="text-google-blue font-bold shrink-0">•</span>
                <span><strong>Toàn màn hình bắt buộc:</strong> Bạn phải làm bài ở chế độ Fullscreen, không thoát ra ngoài.</span>
              </div>
            )}
            {homework?.antiCheatConfig?.detectTabSwitch !== false && (
              <div className="flex items-start gap-2">
                <span className="text-google-blue font-bold shrink-0">•</span>
                <span><strong>Giám sát chuyển tab & cửa sổ:</strong> Hệ thống tự động ghi nhận khi bạn chuyển tab hoặc mở ứng dụng khác.</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-google-blue font-bold shrink-0">•</span>
              <span>
                <strong>Giới hạn {homework?.antiCheatConfig?.maxViolations || 3} lần vi phạm:</strong>{' '}
                {homework?.antiCheatConfig?.autoSubmitOnLimit !== false ? (
                  <>Nếu vi phạm quá {homework?.antiCheatConfig?.maxViolations || 3} lần, bài thi sẽ <strong>tự động khóa và nộp ngay lập tức</strong>.</>
                ) : (
                  <>Nếu vượt quá số lần cho phép, toàn bộ lịch sử vi phạm sẽ được <strong>gửi trực tiếp về giáo viên</strong>.</>
                )}
              </span>
            </div>
            {homework?.antiCheatConfig?.preventCopyPaste !== false && (
              <div className="flex items-start gap-2">
                <span className="text-google-blue font-bold shrink-0">•</span>
                <span><strong>Chống sao chép:</strong> Vô hiệu hóa chuột phải, sao chép câu hỏi và phím tắt DevTools F12.</span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={handleEnterFullscreenAndPlay}
            className="w-full py-3.5 rounded-2xl bg-google-blue hover:bg-[#1557b0] text-white font-bold text-sm shadow-sm gap-2"
          >
            <Maximize2 size={16} />
            Tôi cam kết trung thực & Bắt đầu làm bài
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PHASE: COMPLETED (SCORECARD)
  // -------------------------------------------------------------
  if (phase === 'completed') {
    const totalQ = questions.length || 1;
    const accuracy = Math.round((resultCorrectCount / totalQ) * 100);

    return (
      <div className="min-h-screen bg-google-bg dark:bg-[#131314] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans">
        {/* Header */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-google-blue font-bold text-sm flex items-center justify-center">
              E
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
              Kết quả làm bài
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Scorecard Body */}
        <main className="max-w-lg w-full mx-auto px-4 py-8 my-auto">
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <Award size={36} />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Hoàn thành bài thi!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Học sinh: <strong className="text-slate-700 dark:text-slate-300">{studentName}</strong>
              </p>
            </div>

            {submissionNotice && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-3 text-left">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  {submissionNotice}
                </p>
              </div>
            )}

            {/* Score Display */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Điểm số đạt được
              </span>
              <div className="text-5xl font-black text-google-blue font-mono">
                {resultScore} <span className="text-2xl text-slate-400 font-normal">/ 10</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block">Số câu đúng</span>
                <strong className="text-emerald-600 text-sm">{resultCorrectCount} / {totalQ} câu</strong>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block">Độ chính xác</span>
                <strong className="text-slate-800 dark:text-slate-200 text-sm">{accuracy}%</strong>
              </div>
            </div>


            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {homework?.showAnswersAfterSubmit && (
                <Button
                  variant="outline"
                  onClick={() => setShowReview(!showReview)}
                  className="flex-1 rounded-2xl text-xs gap-1.5"
                >
                  <Eye size={15} /> {showReview ? 'Ẩn đáp án' : 'Xem lại đáp án'}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => router.push('/app/documents')}
                className="flex-1 rounded-2xl text-xs gap-1.5 bg-google-blue hover:bg-[#1557b0] text-white"
              >
                <Home size={15} /> Về trang chủ
              </Button>
            </div>
          </div>

          {/* Answer Review Section */}
          {showReview && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Chi tiết bài làm từng câu
              </h3>
              {questions.map((q, idx) => {
                const userAns = selectedAnswers[q.id];
                const correctOpt = (q.options || []).find((o: any) => o.isCorrect);
                const isCorrect = userAns && correctOpt && (typeof correctOpt === 'string' ? correctOpt : correctOpt.content) === userAns;

                const cleanContent = (q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '');
                return (
                  <div
                    key={q.id || idx}
                    className="p-5 bg-white dark:bg-[#1e1f20] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                        <span className="font-bold text-google-blue dark:text-blue-400 mr-1.5 whitespace-nowrap">
                          Câu {idx + 1}:
                        </span>
                        <PlayMathRenderer text={cleanContent} />
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isCorrect ? '✓ Đúng' : '✕ Sai'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                      <div>
                        <span className="text-slate-400">Bạn chọn: </span>
                        <strong>{userAns || 'Chưa chọn'}</strong>
                      </div>
                      {correctOpt && (
                        <div>
                          <span className="text-emerald-600">Đáp án đúng: </span>
                          <strong className="text-emerald-600">
                            {typeof correctOpt === 'string' ? correctOpt : correctOpt.content}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <footer className="text-center text-xs text-slate-400 py-3">
          HocRealtime &bull; Đã lưu kết quả bài nộp an toàn
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER PHASE: PLAYING (CLEAN GOOGLE WORKSPACE LOOK & FEEL)
  // -------------------------------------------------------------
  const currentQ = questions[currentIndex];
  const totalQ = questions.length;

  const answeredCount = Object.values(selectedAnswers).filter(
    (ans) => typeof ans === 'string' && ans.trim().length > 0
  ).length;

  const minSubmitMinutes = Number(homework?.minSubmitMinutes) || 0;
  const minSubmitSeconds = minSubmitMinutes * 60;
  const hasMetMinTime = minSubmitMinutes <= 0 || timeSpent >= minSubmitSeconds;
  const remainingLockSeconds = Math.max(0, minSubmitSeconds - timeSpent);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          hasEnteredFullscreenRef.current = true;
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  const handleAttemptSubmit = () => {
    if (isSubmitting) return;

    // 1. Kiểm tra nếu chưa đủ thời gian làm bài tối thiểu -> Không cho nộp bài
    if (!hasMetMinTime) {
      const remMin = Math.floor(remainingLockSeconds / 60);
      const remSec = remainingLockSeconds % 60;
      const timeStr = remMin > 0 ? `${remMin} phút ${remSec < 10 ? '0' : ''}${remSec} giây` : `${remSec} giây`;
      setMinTimeWarning(
        `Bài thi quy định học sinh chỉ được nộp bài sau tối thiểu ${minSubmitMinutes} phút kể từ khi bắt đầu. Bạn cần tiếp tục làm bài thêm: ${timeStr} nữa mới có thể nộp bài.`
      );
      return;
    }

    // 2. Mở modal xác nhận nộp bài
    setIsConfirmSubmitOpen(true);
  };

  return (
    <div className="min-h-screen bg-google-bg dark:bg-[#131314] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white">
      {/* ⚠️ VIOLATION WARNING MODAL (ANTI-CHEATING) */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-[#1e1f20] border border-red-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={30} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">
                Cảnh báo vi phạm quy chế
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {latestWarningMessage}
              </p>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                Số lần vi phạm: {violationCount} / {homework?.antiCheatConfig?.maxViolations || 3} lần
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setWarningModalOpen(false);
                warningModalOpenRef.current = false;
                modalCooldownUntilRef.current = Date.now() + 3000;
                if (
                  homework?.antiCheatConfig?.forceFullscreen !== false &&
                  document.documentElement.requestFullscreen &&
                  !document.fullscreenElement
                ) {
                  document.documentElement.requestFullscreen().then(() => {
                    hasEnteredFullscreenRef.current = true;
                  }).catch(() => {});
                }
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
            >
              Tôi hiểu và quay lại làm bài
            </Button>
          </div>
        </div>
      )}

      {/* Modal xác nhận nộp bài (thay thế confirm mặc định của trình duyệt) */}
      <Modal
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        title="Xác nhận nộp bài thi"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {totalQ - answeredCount > 0
              ? `Bạn đã hoàn thành ${answeredCount}/${totalQ} câu hỏi, còn ${totalQ - answeredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài ngay bây giờ không?`
              : `Bạn đã trả lời đầy đủ tất cả ${totalQ} câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ không?`}
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsConfirmSubmitOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setIsConfirmSubmitOpen(false);
                handleFinalSubmit();
              }}
            >
              Nộp bài ngay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal cảnh báo chưa đủ thời gian nộp bài (thay thế alert mặc định của trình duyệt) */}
      <Modal
        isOpen={Boolean(minTimeWarning)}
        onClose={() => setMinTimeWarning(null)}
        title="Chưa đến giờ nộp bài"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5">
            <Clock size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              {minTimeWarning}
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setMinTimeWarning(null)}
            >
              Tiếp tục làm bài
            </Button>
          </div>
        </div>
      </Modal>

      {/* 🍞 FLOATING TOAST THÔNG BÁO NHẸ (KHÔNG PHẠT THẺ ĐỎ) */}
      {floatingToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 pointer-events-none">
          {floatingToast}
        </div>
      )}

      {/* Top Header Bar - Full Width with Max Constraint */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 lg:px-12 py-3.5 shadow-2xs">
        <div className="w-full max-w-[1680px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Homework title & student name */}
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {homework?.title || 'Bài tập trực tuyến'}
            </h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Học sinh: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{studentName}</strong></span>
            </div>
          </div>

          {/* Right: Timer & Submit Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

            {secondsLeft !== null && (
              <div
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold shadow-2xs ${
                  secondsLeft < 60
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Clock size={15} />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}

            {/* Min Submit Time Lock Badge */}
            {minSubmitMinutes > 0 && !hasMetMinTime && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/60 dark:border-amber-900/60"
                title={`Yêu cầu làm bài tối thiểu ${minSubmitMinutes} phút mới được nộp bài`}
              >
                <Lock size={13} className="text-amber-600 dark:text-amber-400" />
                <span>Nộp bài sau: <b className="font-mono">{formatTimer(remainingLockSeconds)}</b></span>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleAttemptSubmit}
              className={`${
                !hasMetMinTime
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-google-blue hover:bg-[#1557b0] text-white'
              } font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer`}
              title={
                !hasMetMinTime
                  ? `Chưa đến thời gian nộp bài: còn ${formatTimer(remainingLockSeconds)}`
                  : 'Nộp bài ngay'
              }
            >
              {!hasMetMinTime && minSubmitMinutes > 0 ? (
                <Lock size={14} />
              ) : null}
              <span>
                {isSubmitting
                  ? 'Đang nộp'
                  : !hasMetMinTime
                  ? `Nộp bài: còn ${formatTimer(remainingLockSeconds)}`
                  : 'Nộp bài'}
              </span>
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-[1680px] mx-auto mt-3">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-google-blue transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Question View - Expansive Full Screen Area */}
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1 flex flex-col justify-between">
        {currentQ ? (
          <div className="w-full bg-white dark:bg-[#1e1f20] rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 sm:space-y-8 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs sm:text-sm font-bold text-google-blue uppercase tracking-wider">
                  Câu {currentIndex + 1} / {totalQ}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400">
                  {currentQ.points ? `${currentQ.points} điểm` : '1 điểm'}
                </span>
              </div>

              {/* Question Content - Large, crisp typography */}
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap select-none">
                <span className="font-bold text-google-blue dark:text-blue-400 mr-2.5 whitespace-nowrap">
                  Câu {currentIndex + 1}:
                </span>
                <PlayMathRenderer text={(currentQ.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')} />
              </div>

              {/* Multiple Choice Options - Large Cards Grid */}
              {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 pt-3">
                  {currentQ.options.map((opt: any, optIdx: number) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const optContent = typeof opt === 'string' ? opt : opt.content || '';
                    const isSelected = selectedAnswers[currentQ.id] === optContent;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, optContent)}
                        className={`p-5 sm:p-6 lg:p-7 rounded-2xl border text-left flex items-start gap-4 transition-all select-none cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 dark:bg-blue-950/50 border-google-blue text-slate-900 dark:text-slate-100 font-bold shadow-sm ring-2 ring-google-blue'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${
                            isSelected
                              ? 'bg-google-blue text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {letter}
                        </span>
                        <div className="flex-1 text-base sm:text-lg lg:text-xl leading-relaxed pt-0.5">
                          <PlayMathRenderer text={optContent} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Essay answer input */
                <div className="space-y-3 pt-3">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Nhập câu trả lời tự luận của bạn:
                  </label>
                  <textarea
                    rows={6}
                    value={selectedAnswers[currentQ.id] || ''}
                    onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                    placeholder="Gõ lời giải / câu trả lời của bạn vào đây"
                    className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-google-blue"
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-5 py-2.5 sm:px-6 sm:py-3 gap-2 text-xs sm:text-sm font-semibold rounded-2xl cursor-pointer"
          >
            <ChevronLeft size={18} /> Câu trước
          </Button>

          {/* Quick jump pills */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-center">
            {questions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'bg-google-blue text-white shadow-xs scale-105'
                    : selectedAnswers[q.id]
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            disabled={currentIndex === totalQ - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
            className="px-5 py-2.5 sm:px-6 sm:py-3 gap-2 text-xs sm:text-sm font-semibold rounded-2xl bg-google-blue hover:bg-[#1557b0] text-white shadow-xs cursor-pointer"
          >
            Câu tiếp <ChevronRight size={18} />
          </Button>
        </div>
      </main>

      {/* Footer info */}
      {minSubmitMinutes > 0 && (
        <footer className="w-full max-w-[1680px] mx-auto text-center text-xs text-slate-400 py-3.5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-1 px-4">
          <div className="text-[11px]">
            {hasMetMinTime ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Đã đạt thời gian làm bài tối thiểu {minSubmitMinutes} phút &bull; Có thể nộp bài
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Yêu cầu làm bài tối thiểu: còn {formatTimer(remainingLockSeconds)} nữa mới được nộp
              </span>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-google-bg dark:bg-[#131314] flex items-center justify-center p-8 text-slate-400">
          <Loader2 size={32} className="animate-spin text-google-blue" />
        </div>
      }
    >
      <BlooketPlayContent />
    </Suspense>
  );
}
