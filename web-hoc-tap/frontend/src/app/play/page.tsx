'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle2,
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
} from 'lucide-react';
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

  // Result States
  const [resultScore, setResultScore] = useState<number>(0);
  const [resultCorrectCount, setResultCorrectCount] = useState<number>(0);
  const [showReview, setShowReview] = useState(false);

  // Auto-load PIN if provided in query
  useEffect(() => {
    if (initialPin && initialPin.trim().length === 6) {
      handleLookupPin(initialPin.trim());
    }
  }, [initialPin]);

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

    const recordViolation = (type: HomeworkViolationLog['type'], message: string) => {
      if (warningModalOpen) return;
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 3500) return;
      lastViolationTimeRef.current = now;

      setViolationCount((prev) => {
        const nextCount = prev + 1;
        const newLog: HomeworkViolationLog = {
          type,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          message: `${message} (Lần ${nextCount}/${maxAllowed})`,
        };
        setViolationLogs((prevLogs) => [...prevLogs, newLog]);

        setLatestWarningMessage(newLog.message);
        setWarningModalOpen(true);

        // Nếu vượt quá số lần vi phạm -> TỰ ĐỘNG KHÓA VÀ NỘP BÀI
        if (nextCount >= maxAllowed) {
          setTimeout(() => {
            handleFinalSubmit(
              `Bài thi đã tự động nộp do vi phạm quy chế chống gian lận (${nextCount}/${maxAllowed} lần)!`
            );
          }, 1500);
        }

        return nextCount;
      });
    };

    // 1. Phát hiện chuyển tab (visibility change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('tab_switch', 'Phát hiện rời khỏi tab làm bài thi');
      }
    };

    // 2. Phát hiện mất focus cửa sổ (window blur)
    const handleWindowBlur = () => {
      if (warningModalOpen) return;
      recordViolation('window_blur', 'Phát hiện chuyển sang cửa sổ hoặc ứng dụng khác');
    };

    // 3. Phát hiện thoát toàn màn hình (fullscreen exit)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && homework.antiCheatConfig?.forceFullscreen) {
        recordViolation('exit_fullscreen', 'Phát hiện thoát khỏi chế độ Toàn màn hình');
      }
    };

    // 4. Chống sao chép văn bản, chuột phải, phím tắt
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_attempt', 'Cố gắng sao chép nội dung câu hỏi');
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ['c', 'v', 'u', 'a'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        recordViolation('copy_attempt', `Nhấn phím tắt bị cấm (${e.key})`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
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
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }

    if (reasonNotice) {
      alert(reasonNotice);
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
              onClick={() => router.push('/documents')}
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

              {/* HOMEWORK INFO CARD */}
              {homework && (
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-1.5 text-xs animate-in fade-in">
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {homework.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Số câu: {homework.quizData?.questions?.length || 0} câu</span>
                    <span>
                      {homework.durationMinutes > 0 ? `${homework.durationMinutes} phút` : 'Tự do thời gian'}
                    </span>
                    {homework.antiCheating && (
                      <span className="flex items-center gap-1 text-google-blue font-semibold">
                        <ShieldCheck size={13} /> Chống gian lận
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* NAME INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Họ và tên của bạn
                </label>
                <Input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="rounded-2xl text-sm"
                />
              </div>

              <Button
                variant="primary"
                onClick={handleStartExamFlow}
                disabled={loadingHw || !studentName.trim()}
                className="w-full py-3.5 rounded-2xl bg-google-blue hover:bg-[#1557b0] text-white font-bold text-sm shadow-sm transition-all"
              >
                VÀO LÀM BÀI NGAY
              </Button>
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
            <div className="flex items-start gap-2">
              <span className="text-google-blue font-bold shrink-0">1.</span>
              <span><strong>Toàn màn hình bắt buộc:</strong> Bạn phải làm bài ở chế độ Fullscreen.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-google-blue font-bold shrink-0">2.</span>
              <span><strong>Không rời khỏi màn hình:</strong> Hệ thống sẽ phát hiện và ghi nhận số lần chuyển tab hoặc mở ứng dụng khác.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-google-blue font-bold shrink-0">3.</span>
              <span><strong>Giới hạn 3 lần:</strong> Nếu vi phạm quá 3 lần, bài thi sẽ <strong>tự động khóa và nộp ngay lập tức</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-google-blue font-bold shrink-0">4.</span>
              <span><strong>Không sao chép:</strong> Vô hiệu hóa chuột phải và các thao tác copy câu hỏi.</span>
            </div>
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

            {/* Anti-Cheating Audit Summary */}
            {homework?.antiCheating && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-500">Giám sát chống gian lận:</span>
                {violationCount === 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> 0 vi phạm (Trung thực)
                  </span>
                ) : (
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <AlertTriangle size={14} /> Rời màn hình {violationCount} lần
                  </span>
                )}
              </div>
            )}

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
                onClick={() => router.push('/documents')}
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

                return (
                  <div
                    key={q.id || idx}
                    className="p-5 bg-white dark:bg-[#1e1f20] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Câu {idx + 1}</span>
                      <span className={isCorrect ? 'text-emerald-600' : 'text-red-500'}>
                        {isCorrect ? '✓ Đúng' : '✕ Sai'}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      <PlayMathRenderer text={q.content} />
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                      <div>
                        <span className="text-slate-400">Bạn chọn: </span>
                        <strong>{userAns || '(Chưa chọn)'}</strong>
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
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
            >
              Tôi hiểu và quay lại làm bài
            </Button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Homework title & student name */}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {homework?.title || 'Bài tập trực tuyến'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Học sinh: <strong className="text-slate-700 dark:text-slate-300">{studentName}</strong></span>
              {homework?.antiCheating && (
                <span className="flex items-center gap-1 text-google-blue font-semibold">
                  <ShieldCheck size={12} /> Chống gian lận (Lỗi: {violationCount}/3)
                </span>
              )}
            </div>
          </div>

          {/* Right: Timer & Submit Button */}
          <div className="flex items-center gap-2.5">
            {secondsLeft !== null && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold ${
                  secondsLeft < 60
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Clock size={14} />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn nộp bài ngay bây giờ?')) {
                  handleFinalSubmit();
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
            >
              Nộp bài
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-2.5">
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-google-blue transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Question View */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {currentQ ? (
          <div className="bg-white dark:bg-[#1e1f20] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-google-blue uppercase tracking-wider">
                Câu {currentIndex + 1} / {totalQ}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {currentQ.points ? `${currentQ.points} điểm` : '1 điểm'}
              </span>
            </div>

            {/* Question Content */}
            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap select-none">
              <PlayMathRenderer text={currentQ.content || ''} />
            </div>

            {/* Multiple Choice Options */}
            {Array.isArray(currentQ.options) && currentQ.options.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQ.options.map((opt: any, optIdx: number) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const optContent = typeof opt === 'string' ? opt : opt.content || '';
                  const isSelected = selectedAnswers[currentQ.id] === optContent;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, optContent)}
                      className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all select-none cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-google-blue text-slate-900 dark:text-slate-100 font-bold shadow-xs ring-1 ring-google-blue'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-google-blue text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {letter}
                      </span>
                      <div className="flex-1 text-sm sm:text-base leading-snug pt-0.5">
                        <PlayMathRenderer text={optContent} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Essay answer input */
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-500">
                  Nhập câu trả lời tự luận của bạn:
                </label>
                <textarea
                  rows={4}
                  value={selectedAnswers[currentQ.id] || ''}
                  onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                  placeholder="Gõ lời giải / câu trả lời..."
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-google-blue"
                />
              </div>
            )}
          </div>
        ) : null}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="gap-1.5 text-xs rounded-xl"
          >
            <ChevronLeft size={16} /> Câu trước
          </Button>

          {/* Quick jump pills */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center">
            {questions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  currentIndex === idx
                    ? 'bg-google-blue text-white'
                    : selectedAnswers[q.id]
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
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
            className="gap-1.5 text-xs rounded-xl bg-google-blue hover:bg-[#1557b0] text-white"
          >
            Câu tiếp <ChevronRight size={16} />
          </Button>
        </div>
      </main>

      {/* Footer info */}
      <footer className="text-center text-xs text-slate-400 py-3 border-t border-slate-200/50 dark:border-slate-800/50">
        HocRealtime Play &bull; Đã hoàn thành {Object.keys(selectedAnswers).length} / {totalQ} câu
      </footer>
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
