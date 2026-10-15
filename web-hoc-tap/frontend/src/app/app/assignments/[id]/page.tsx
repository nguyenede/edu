'use client';

import React, { useEffect, useState, useMemo, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import {
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Send,
  User,
  MessageSquare,
  ArrowLeft,
  ChevronRight,
  FileCheck,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Play,
  RotateCcw,
  Download,
  Lock,
  Users,
  GraduationCap,
  PlusCircle,
  LogIn,
} from 'lucide-react';
import QRCode from 'qrcode';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import {
  fetchClasses,
  getLocalClasses,
  fetchAssignmentDetail,
  fetchAssignmentSubmissions,
  fetchMyAssignmentSubmission,
  submitAssignment,
  gradeAssignmentSubmission,
  deleteClassAssignment,
} from '@/lib/classesApi';
import { BreadcrumbChevron, BreadcrumbDropdownItem } from '@/components/BreadcrumbChevron';
import { safeLocalStorageGet } from '@/lib/safeStorage';

// Error Boundary for Math/KaTeX rendering
class MathErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Math KaTeX rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function MathRenderer({ text, className = '' }: { text: any; className?: string }) {
  if (text === null || text === undefined) return null;
  const rawStr = typeof text === 'string' ? text : typeof text === 'number' ? String(text) : text?.content ? String(text.content) : '';
  if (!rawStr) return null;

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
          {rawStr}
        </ReactMarkdown>
      </span>
    </MathErrorBoundary>
  );
}

interface NormalizedOption {
  id: string;
  content: string;
  isCorrect: boolean;
}

interface NormalizedQuestion {
  id: string;
  content: string;
  options: NormalizedOption[];
  explanation?: string;
  points?: number;
}

function extractNormalizedQuestions(assignment: any): NormalizedQuestion[] {
  if (!assignment) return [];

  const rawList: any[] = [];
  if (Array.isArray(assignment.quiz?.questions) && assignment.quiz.questions.length > 0) {
    rawList.push(...assignment.quiz.questions);
  } else if (Array.isArray(assignment.quizData?.questions) && assignment.quizData.questions.length > 0) {
    rawList.push(...assignment.quizData.questions);
  } else if (Array.isArray(assignment.documentFile?.parsedQuiz?.questions) && assignment.documentFile.parsedQuiz.questions.length > 0) {
    rawList.push(...assignment.documentFile.parsedQuiz.questions);
  } else if (Array.isArray(assignment.parsedQuiz?.questions) && assignment.parsedQuiz.questions.length > 0) {
    rawList.push(...assignment.parsedQuiz.questions);
  } else if (Array.isArray(assignment.questions) && assignment.questions.length > 0) {
    rawList.push(...assignment.questions);
  }

  return rawList.map((qq: any, idx: number) => {
    const q = qq.question || qq;
    const qContent = q.content || q.question || q.title || `Câu hỏi ${idx + 1}`;
    const rawOpts = Array.isArray(q.options)
      ? q.options
      : Array.isArray(q.answers)
      ? q.answers
      : [];

    const options: NormalizedOption[] = rawOpts.map((opt: any, oIdx: number) => {
      const content = typeof opt === 'string'
        ? opt
        : opt?.content || opt?.text || opt?.answer || '';

      let isCorrect = false;
      if (typeof opt === 'object' && opt !== null) {
        isCorrect = Boolean(opt.isCorrect || opt.correct);
      }
      if (!isCorrect && q.correctAnswer !== undefined && q.correctAnswer !== null) {
        const letter = String.fromCharCode(65 + oIdx);
        isCorrect = q.correctAnswer === letter || q.correctAnswer === oIdx || q.correctAnswer === content;
      }

      return {
        id: opt?.id || `opt_${idx + 1}_${oIdx + 1}`,
        content,
        isCorrect,
      };
    });

    return {
      id: q.id || qq.id || `q_${idx + 1}`,
      content: qContent,
      options,
      explanation: q.explanation || '',
      points: q.points || 1,
    };
  });
}

export default function AssignmentDetailPage() {
  const { id: assignmentId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Danh sách bài nộp được gộp theo từng học sinh (Mỗi học sinh chỉ hiển thị 1 bài nộp mới nhất)
  const deduplicatedSubmissions = useMemo(() => {
    const studentMap = new Map<string, any>();
    for (const sub of submissions) {
      if (!sub) continue;
      const stuName = (sub.student?.profile?.name || sub.student?.name || sub.studentName || '').trim().toLowerCase();
      const stuId = sub.student?.id && !sub.student.id.startsWith('stu_my_') && !sub.student.id.startsWith('stu_current') && !sub.student.id.startsWith('stu_sub_')
        ? sub.student.id
        : null;
      const key = stuId || stuName || sub.id;

      if (!studentMap.has(key)) {
        studentMap.set(key, sub);
      } else {
        const existing = studentMap.get(key);
        const existingTime = new Date(existing.submittedAt).getTime() || 0;
        const curTime = new Date(sub.submittedAt).getTime() || 0;
        if (curTime >= existingTime || (sub.status === 'GRADED' && existing.status !== 'GRADED')) {
          studentMap.set(key, sub);
        }
      }
    }
    return Array.from(studentMap.values()).sort(
      (a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0)
    );
  }, [submissions]);

  // Teacher UI State
  const [teacherTab, setTeacherTab] = useState<'questions' | 'try'>('questions');

  // Student State
  const [studentAnswers, setStudentAnswers] = useState<{ [qId: string]: string }>({});
  const [essayContent, setEssayContent] = useState('');
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentViolations, setStudentViolations] = useState<any[]>([]);
  const [studentViolationCount, setStudentViolationCount] = useState(0);
  const [antiCheatWarning, setAntiCheatWarning] = useState<string | null>(null);
  const studentViolationTimeRef = useRef(0);

  // Teacher Grading State
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [isDeleteAssignOpen, setIsDeleteAssignOpen] = useState(false);

  // QR Code State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [showInlineFallback, setShowInlineFallback] = useState(false);

  const isTeacher = useMemo(() => {
    if (!user) return true;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // Breadcrumb dropdown state: all classes
  const [allClasses, setAllClasses] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalClasses();
    }
    return [];
  });

  useEffect(() => {
    let isCancelled = false;
    const loadAll = async () => {
      try {
        const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        const list = await fetchClasses(activeToken, isTeacher);
        if (!isCancelled && Array.isArray(list) && list.length > 0) {
          setAllClasses(list);
        }
      } catch (_) {}
    };
    loadAll();
    return () => {
      isCancelled = true;
    };
  }, [token, isTeacher]);

  const classBreadcrumbItems = useMemo<BreadcrumbDropdownItem[]>(() => {
    const items: BreadcrumbDropdownItem[] = [
      {
        label: 'Tất cả lớp học',
        href: '/app/classes',
        icon: <Users size={14} className="text-blue-500 shrink-0" />,
      },
    ];

    if (isTeacher) {
      items.push({
        label: 'Tạo lớp học mới',
        href: '/app/classes/create',
        icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" />,
      });
    }

    items.push({
      label: 'Tham gia lớp học',
      href: '/app/classes/join',
      icon: <LogIn size={14} className="text-purple-500 shrink-0" />,
    });

    if (allClasses && allClasses.length > 0) {
      items.push({ isDivider: true });
      allClasses.forEach((c) => {
        const isCurrent = String(c.id) === String(assignment?.classId);
        items.push({
          id: String(c.id),
          label: c.name,
          href: `/app/classes/${c.id}`,
          isActive: isCurrent,
          icon: (
            <GraduationCap
              size={14}
              className={isCurrent ? 'text-google-blue shrink-0' : 'text-slate-400 dark:text-slate-500 shrink-0'}
            />
          ),
        });
      });
    }

    return items;
  }, [allClasses, assignment?.classId, isTeacher]);

  const classNameDisplay = assignment?.class?.name || assignment?.className || 'Lớp học';

  const assignmentBreadcrumbItems = useMemo<BreadcrumbDropdownItem[]>(() => {
    if (!assignment?.classId || assignment.classId === 'public') return [];
    const items: BreadcrumbDropdownItem[] = [
      {
        label: `Về lớp: ${classNameDisplay}`,
        href: `/app/classes/${assignment.classId}`,
        icon: <GraduationCap size={14} className="text-blue-500 shrink-0" />,
      },
    ];
    if (isTeacher) {
      items.push({
        label: 'Giao bài tập mới cho lớp',
        href: `/app/classes/${assignment.classId}/assignments/create`,
        icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" />,
      });
    }
    return items;
  }, [assignment?.classId, classNameDisplay, isTeacher]);

  const displayPin = useMemo(() => {
    if (assignment?.pin && String(assignment.pin).trim()) return String(assignment.pin).trim();
    if (assignment?.pinCode && String(assignment.pinCode).trim()) return String(assignment.pinCode).trim();
    try {
      const rawHw = safeLocalStorageGet('app_blooket_homeworks');
      if (rawHw) {
        const hwList = JSON.parse(rawHw);
        if (Array.isArray(hwList)) {
          const found = hwList.find((h: any) => h.id === assignment?.id || h.title === assignment?.title || h.pin === assignment?.id);
          if (found?.pin) return String(found.pin).trim();
        }
      }
    } catch (_) {}
    if (assignment?.description && typeof assignment.description === 'string') {
      const match = assignment.description.match(/"pin":\s*"(\d+)"/);
      if (match && match[1]) return match[1];
    }
    const numericPart = assignment?.id ? String(assignment.id).replace(/\D/g, '').slice(-6) : '';
    if (numericPart && numericPart.length === 6) return numericPart;
    return assignment?.id || '123456';
  }, [assignment]);

  const playUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/play?pin=${displayPin}`;
    }
    return `http://localhost:3000/play?pin=${displayPin}`;
  }, [displayPin]);

  useEffect(() => {
    if (assignment) {
      QRCode.toDataURL(playUrl, {
        width: 360,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [assignment, playUrl]);

  // Tự động chuyển hướng xóa bỏ dấu gạch dưới '_' trên URL nếu assignmentId chứa '_'
  useEffect(() => {
    if (assignmentId && typeof assignmentId === 'string' && assignmentId.includes('_')) {
      const cleanId = assignmentId.replace(/_/g, '');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath.includes(assignmentId)) {
        router.replace(currentPath.replace(assignmentId, cleanId));
      } else {
        router.replace(`/app/assignments/${cleanId}`);
      }
    }
  }, [assignmentId, router]);

  useEffect(() => {
    fetchData();
  }, [token, assignmentId]);

  const fetchData = async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const aId = String(assignmentId);
      const data = await fetchAssignmentDetail(token, aId);
      setAssignment(data);

      if (isTeacher) {
        const subs = await fetchAssignmentSubmissions(token, aId);
        setSubmissions(subs);
      } else {
        const mySub = await fetchMyAssignmentSubmission(token, aId);
        setMySubmission(mySub);
      }
    } catch (err) {
      console.error('Error fetching assignment detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuestions = useMemo(() => {
    return extractNormalizedQuestions(assignment);
  }, [assignment]);

  const handleDeleteAssignment = async () => {
    if (!assignment) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClassAssignment(activeToken, assignment.classId, assignment.id);
    if (assignment.classId && assignment.classId !== 'public') {
      router.push(`/app/classes/${assignment.classId}`);
    } else {
      router.push('/app/classes');
    }
  };

  const handleCopyPin = (pin?: string) => {
    const p = pin || displayPin;
    navigator.clipboard.writeText(p);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(playUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR_${displayPin}_${(assignment?.title || 'BaiTap').slice(0, 20)}.png`;
    a.click();
  };

  // Student Anti-Cheating real-time listener on /assignments/[id] (Chỉ kích hoạt khi chọn làm bài trực tiếp trên trang này)
  useEffect(() => {
    if (isTeacher || mySubmission || !assignment?.antiCheat || !showInlineFallback) return;

    const maxAllowed = assignment.antiCheatConfig?.maxViolations || 3;

    const recordStudentViolation = (message: string) => {
      const now = Date.now();
      if (now - studentViolationTimeRef.current < 2500) return;
      studentViolationTimeRef.current = now;

      setStudentViolationCount((prev) => {
        const nextCount = prev + 1;
        const newLog = {
          type: 'tab_switch',
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          message: `${message} (Lần ${nextCount}/${maxAllowed})`,
        };
        setStudentViolations((prevLogs) => {
          const updated = [...prevLogs, newLog];
          if (nextCount >= maxAllowed) {
            setTimeout(() => {
              alert(`Bạn đã vi phạm quy chế chống gian lận ${nextCount}/${maxAllowed} lần! Hệ thống tự động nộp bài.`);
              handleStudentSubmit({
                violationCount: nextCount,
                violationLogs: updated,
              });
            }, 800);
          }
          return updated;
        });

        setAntiCheatWarning(`⚠️ ${message}! (Vi phạm lần ${nextCount}/${maxAllowed})`);
        return nextCount;
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        recordStudentViolation('Phát hiện rời khỏi tab làm bài thi');
      }
    };

    const handleWindowBlur = () => {
      recordStudentViolation('Phát hiện chuyển sang cửa sổ hoặc ứng dụng khác');
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      recordStudentViolation('Cố gắng sao chép nội dung đề thi');
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      recordStudentViolation('Nhấp chuột phải bị cấm trong phòng thi');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isTeacher, mySubmission, assignment?.antiCheat, showInlineFallback]);

  // Bộ đếm thời gian làm bài của học sinh
  useEffect(() => {
    if (isTeacher || mySubmission) return;
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTeacher, mySubmission]);

  const answeredQuestionsCount = Object.keys(studentAnswers).filter(
    (k) => typeof studentAnswers[k] === 'string' && studentAnswers[k].trim().length > 0
  ).length;
  const hasEssayAnswer = Boolean(essayContent.trim());
  const totalAnswered = normalizedQuestions.length > 0 ? answeredQuestionsCount : (hasEssayAnswer ? 1 : 0);

  const minSubmitMinutes = Number(assignment?.minSubmitMinutes) || 0;
  const minSubmitSeconds = minSubmitMinutes * 60;
  const hasMetMinTime = minSubmitMinutes <= 0 || timeSpent >= minSubmitSeconds;
  const remainingLockSeconds = Math.max(0, minSubmitSeconds - timeSpent);

  const handleAttemptStudentSubmit = () => {
    if (submitting) return;

    // 1. Chặn nộp bài nếu học sinh chưa làm câu nào
    if (totalAnswered === 0) {
      alert(
        '⚠️ BẠN CHƯA LÀM CÂU NÀO!\n\nHệ thống không cho phép nộp bài trống. Vui lòng làm ít nhất một câu hỏi hoặc nhập nội dung bài làm trước khi nộp.'
      );
      return;
    }

    // 2. Chặn nộp bài nếu chưa đủ thời gian làm bài tối thiểu
    if (!hasMetMinTime) {
      const remMin = Math.floor(remainingLockSeconds / 60);
      const remSec = remainingLockSeconds % 60;
      const timeStr = remMin > 0 ? `${remMin} phút ${remSec < 10 ? '0' : ''}${remSec} giây` : `${remSec} giây`;
      alert(
        `⏳ CHƯA ĐẾN THỜI GIAN ĐƯỢC PHÉP NỘP BÀI!\n\nBài thi quy định học sinh chỉ được nộp bài sau tối thiểu ${minSubmitMinutes} phút kể từ khi bắt đầu.\n\nBạn cần tiếp tục làm bài thêm: ${timeStr} nữa mới có thể nộp.`
      );
      return;
    }

    setIsSubmitConfirmOpen(true);
  };

  const handleStudentSubmit = async (overrideMeta?: any) => {
    if (totalAnswered === 0 && !overrideMeta) {
      alert('⚠️ Bạn chưa làm câu nào! Vui lòng trả lời ít nhất một câu hỏi trước khi nộp bài.');
      setIsSubmitConfirmOpen(false);
      return;
    }
    if (!hasMetMinTime && !overrideMeta) {
      alert(`⏳ Chưa đủ thời gian làm bài tối thiểu (${minSubmitMinutes} phút)!`);
      setIsSubmitConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    const answersList = normalizedQuestions.length > 0
      ? Object.entries(studentAnswers).map(([questionId, answerContent]) => ({
          questionId,
          answerContent,
        }))
      : [{ questionId: assignment.id, answerContent: essayContent }];

    try {
      const meta = overrideMeta || {
        violationCount: studentViolationCount,
        violationLogs: studentViolations,
      };
      await submitAssignment(token, String(assignmentId), answersList, meta);
      setIsSubmitConfirmOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSavingGrade(true);

    try {
      await gradeAssignmentSubmission(
        token,
        String(assignmentId),
        selectedSub.id,
        Number(gradeScore),
        gradeFeedback
      );
      setSelectedSub(null);
      setGradeFeedback('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu điểm');
    } finally {
      setSavingGrade(false);
    }
  };

  const selectForGrading = (sub: any) => {
    setSelectedSub(sub);
    setGradeScore(sub.score || 0);
    setGradeFeedback(sub.feedback || '');
  };

  const formatSubmittedAnswer = (ans: any) => {
    if (normalizedQuestions.length > 0) {
      const question = normalizedQuestions.find((q, idx) => q.id === ans.questionId || `q_${idx + 1}` === ans.questionId);
      if (question) {
        const option = question.options.find((opt, oIdx) => opt.id === ans.answerContent || String(oIdx) === String(ans.answerContent));
        if (option) return option.content;
      }
    }
    return ans.answerContent;
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-xs text-slate-500">Đang tải thông tin bài tập...</p>
        </div>
      </AppShell>
    );
  }

  if (!assignment) {
    return (
      <AppShell>
        <div className="p-8 text-center space-y-4">
          <p className="text-sm text-slate-500">Không tìm thấy bài tập hoặc bài tập đã bị xóa.</p>
          <Button variant="secondary" onClick={() => router.push('/app/classes')}>
            Quay lại lớp học
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={classBreadcrumbItems}
          />
          {assignment.classId && assignment.classId !== 'public' ? (
            <button
              type="button"
              onClick={() => router.push(`/app/classes/${assignment.classId}`)}
              className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
            >
              {classNameDisplay}
            </button>
          ) : (
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
              {classNameDisplay}
            </span>
          )}
          <BreadcrumbChevron
            menuTitle={classNameDisplay}
            items={assignmentBreadcrumbItems}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450] truncate max-w-md">
            {assignment.title}
          </span>
        </div>
      }
      subtitle={`Lớp: ${classNameDisplay} | Thang điểm: ${assignment.maxScore || 10}đ`}
      action={
        isTeacher ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteAssignOpen(true)}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            title="Xóa bài tập"
          >
            <Trash2 size={16} />
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Main Content Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Assignment Meta Header */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap gap-2.5 items-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Hạn nộp:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {assignment.deadline
                    ? new Date(assignment.deadline).toLocaleString('vi-VN')
                    : 'Không giới hạn'}
                </span>
              </span>

              <span className="text-slate-300 dark:text-slate-700">•</span>

              <span className="flex items-center gap-1.5">
                <Award size={13} className="text-amber-500" />
                Thang điểm:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{assignment.maxScore || 10}đ</span>
              </span>

              {assignment.durationMinutes ? (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-500" />
                    Thời gian:{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{assignment.durationMinutes} phút</span>
                  </span>
                </>
              ) : null}

              {normalizedQuestions.length > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Trắc nghiệm ({normalizedQuestions.length} câu)
                  </span>
                </>
              )}

              {assignment.antiCheat && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    <ShieldCheck size={12} /> Chống gian lận
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ================= TEACHER VIEW ================= */}
          {isTeacher && (
            <div className="space-y-4">
              {normalizedQuestions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <HelpCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 font-medium">
                    Bài tập này là bài tập tự luận hoặc chưa có câu hỏi trắc nghiệm liên kết.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {normalizedQuestions.map((q, qIdx) => {
                    const cleanContent = (q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '');
                    return (
                      <div
                        key={q.id || qIdx}
                        className="py-4 first:pt-1 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed flex-1">
                            <span className="font-bold text-blue-600 dark:text-blue-400 mr-1.5 whitespace-nowrap">
                              Câu {qIdx + 1}:
                            </span>
                            <MathRenderer text={cleanContent} />
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 select-none">
                            Trắc nghiệm đơn
                          </span>
                        </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const label = String.fromCharCode(65 + optIdx);
                          const isCorrect = opt.isCorrect;
                          return (
                            <div
                              key={opt.id || optIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                                isCorrect
                                  ? 'border-emerald-500/80 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-500/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {label}
                              </span>
                              <div className="flex-1 leading-relaxed">
                                <MathRenderer text={opt.content} />
                                {isCorrect && (
                                  <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    ✓ Đáp án đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-2 pl-3 py-1 border-l-2 border-blue-500/70 text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 mr-1.5">Lời giải:</span>
                          <MathRenderer text={q.explanation} />
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}

          {/* ================= STUDENT VIEW ================= */}
          {!isTeacher && (
            <div className="space-y-4">
              {mySubmission ? (
                /* Already Submitted Result View */
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-sm text-slate-950 dark:text-slate-100">
                        Bạn đã hoàn thành bài tập này
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(playUrl, '_blank')}
                        className="gap-1.5 text-xs text-blue-600 cursor-pointer"
                      >
                        <Play size={13} className="fill-current" />
                        <span>Xem trong phòng thi (Tab mới)</span>
                        <ExternalLink size={12} className="opacity-80" />
                      </Button>
                      <Badge variant={mySubmission.status === 'GRADED' ? 'success' : 'warning'}>
                        {mySubmission.status === 'GRADED'
                          ? `Điểm: ${mySubmission.score} / ${assignment.maxScore}`
                          : 'Đang chờ giáo viên chấm'}
                      </Badge>
                    </div>
                  </div>

                  {mySubmission.feedback && (
                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg text-xs space-y-1">
                      <span className="font-bold text-blue-700 dark:text-blue-300 block">
                        Lời phê của giáo viên:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">
                        {mySubmission.feedback}
                      </p>
                    </div>
                  )}

                  {/* Answers review */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Chi tiết bài làm đã gửi
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(mySubmission.answers || []).map((ans: any, idx: number) => (
                        <div key={ans.id || idx} className="py-3 text-xs space-y-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            Câu {idx + 1}:
                          </span>
                          <p className="text-slate-900 dark:text-slate-100 font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg flex items-center justify-between">
                            <span>{formatSubmittedAnswer(ans)}</span>
                            {typeof ans.isCorrect === 'boolean' && (
                              <span className={ans.isCorrect ? 'text-emerald-600 font-bold ml-2' : 'text-red-600 font-bold ml-2'}>
                                {ans.isCorrect ? '✓ Đúng' : '✕ Sai'}
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !showInlineFallback ? (
                /* Primary Exam Entry: Open in dedicated clean player tab */
                <div className="p-8 sm:p-10 bg-white dark:bg-[#1f2023] border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center space-y-6 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs">
                    <Play size={32} className="fill-current ml-1" />
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                      <BookOpen size={13} />
                      <span>Phòng thi trực tuyến chuyên dụng</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {assignment.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Bài thi được thực hiện trên phòng thi toàn màn hình chuyên biệt để đảm bảo không bị gián đoạn và áp dụng quy chế làm bài công bằng.
                    </p>
                  </div>

                  {/* Badges / Exam Metadata */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-500" />
                      <span>{assignment.durationMinutes ? `${assignment.durationMinutes} phút` : 'Không giới hạn giờ'}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <FileCheck size={14} className="text-emerald-500" />
                      <span>{normalizedQuestions.length > 0 ? `${normalizedQuestions.length} câu trắc nghiệm` : 'Tự luận'}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <Award size={14} className="text-amber-500" />
                      <span>Thang điểm: {assignment.maxScore || 10}</span>
                    </div>
                    {assignment.antiCheat && (
                      <div className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-1.5 border border-purple-200/50 dark:border-purple-800/50">
                        <ShieldCheck size={14} className="text-purple-500" />
                        <span>Giám sát chống gian lận</span>
                      </div>
                    )}
                  </div>

                  {/* Primary CTA Button: Launch Exam in New Tab */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      size="lg"
                      onClick={() => window.open(playUrl, '_blank')}
                      className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold bg-google-blue hover:bg-[#1557b0] active:scale-95 text-white rounded-xl shadow-md gap-2.5 transition-all cursor-pointer"
                    >
                      <Play size={18} className="fill-current" />
                      <span>VÀO PHÒNG THI LÀM BÀI (MỞ TAB MỚI)</span>
                      <ExternalLink size={16} className="opacity-80" />
                    </Button>
                  </div>

                  <div className="pt-2 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Đã nộp bài ở tab kia? Nhấn để tải lại kết quả</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInlineFallback(true)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer mt-1"
                    >
                      Làm bài trực tiếp tại trang này (chế độ dự phòng)
                    </button>
                  </div>
                </div>
              ) : (
                /* Student Submission Form (Fallback) */
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowInlineFallback(false)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <ArrowLeft size={13} /> Quay lại chế độ phòng thi mở tab mới
                    </button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(playUrl, '_blank')}
                      className="gap-1.5 text-xs text-blue-600"
                    >
                      <Play size={13} /> Mở phòng thi (Tab mới)
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
                        Làm bài tập (Dự phòng)
                      </h3>
                      {assignment.antiCheat && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          <ShieldCheck size={13} />
                          <span>Chống gian lận đang bật (Vi phạm: {studentViolationCount}/{assignment.antiCheatConfig?.maxViolations || 3})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {antiCheatWarning && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" />
                        <span>{antiCheatWarning}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAntiCheatWarning(null)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-xs font-bold underline ml-2 cursor-pointer"
                      >
                        Đã hiểu
                      </button>
                    </div>
                  )}

                  {normalizedQuestions.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {normalizedQuestions.map((q, idx) => {
                        const cleanContent = (q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '');
                        return (
                          <div
                            key={q.id}
                            className="py-4 first:pt-1 space-y-2.5"
                          >
                            <div className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                              <span className="font-bold text-blue-600 dark:text-blue-400 mr-1.5 whitespace-nowrap">
                                Câu {idx + 1}:
                              </span>
                              <MathRenderer text={cleanContent} />
                            </div>

                          <div className="space-y-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const label = String.fromCharCode(65 + optIdx);
                              const isSelected = studentAnswers[q.id] === opt.id || studentAnswers[q.id] === String(optIdx);
                              return (
                                <label
                                  key={opt.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-xs font-medium select-none border transition-colors ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-400 font-semibold ring-1 ring-blue-500/30'
                                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt.id}
                                    checked={isSelected}
                                    onChange={() =>
                                      setStudentAnswers({
                                        ...studentAnswers,
                                        [q.id]: opt.id,
                                      })
                                    }
                                    className="h-3.5 w-3.5 text-blue-600"
                                  />
                                  <span className="font-bold mr-1">{label}.</span>
                                  <MathRenderer text={opt.content} />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  ) : (
                    /* Essay Mode */
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Nội dung bài làm tự luận của bạn
                      </label>
                      <textarea
                        placeholder="Nhập chi tiết lời giải, bài văn hoặc câu trả lời tại đây..."
                        className="w-full px-3 py-2.5 bg-white dark:bg-[#1a1b1d] text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:ring-1 focus:ring-blue-500 min-h-[160px]"
                        value={essayContent}
                        onChange={(e) => setEssayContent(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  {/* Min Submit Time Notice */}
                  {minSubmitMinutes > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-amber-600 shrink-0" />
                        <span>
                          {hasMetMinTime ? (
                            <b className="text-emerald-700 dark:text-emerald-300">✓ Đã đủ thời gian tối thiểu ({minSubmitMinutes} phút) để nộp bài</b>
                          ) : (
                            <span>Yêu cầu làm bài tối thiểu: <b>{minSubmitMinutes} phút</b></span>
                          )}
                        </span>
                      </div>
                      {!hasMetMinTime && (
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                          Còn {Math.floor(remainingLockSeconds / 60)}p{remainingLockSeconds % 60 < 10 ? '0' : ''}{remainingLockSeconds % 60}s
                        </span>
                      )}
                    </div>
                  )}

                  <Button
                    size="md"
                    fullWidth
                    onClick={handleAttemptStudentSubmit}
                    className={`gap-2 font-bold ${
                      totalAnswered === 0
                        ? 'bg-slate-400 hover:bg-slate-500'
                        : !hasMetMinTime
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : ''
                    }`}
                  >
                    {!hasMetMinTime && minSubmitMinutes > 0 ? (
                      <Lock size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>
                      {submitting
                        ? 'Đang nộp bài...'
                        : totalAnswered === 0
                        ? 'Nộp bài tập ngay (chưa làm)'
                        : !hasMetMinTime
                        ? `Nộp bài tập (khóa: còn ${Math.floor(remainingLockSeconds / 60)}p${remainingLockSeconds % 60 < 10 ? '0' : ''}${remainingLockSeconds % 60}s)`
                        : 'Nộp bài tập ngay'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Teacher Submissions List & Grading Panel */}
        {isTeacher && (
          <div className="md:col-span-1 space-y-4 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-5.5rem)] flex flex-col">
            {/* Nút mở mã mời */}
            <Button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="w-full text-xs font-semibold py-2.5 rounded-xl bg-google-blue hover:bg-[#1557b0] text-white gap-2 shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            >
              <QrCode size={15} />
              <span>Mã mời</span>
            </Button>

            {selectedSub ? (
              /* Grading Form Panel */
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)] pr-1 [scrollbar-width:thin]">
                <div className="space-y-1 pb-2 border-b border-slate-200/60 dark:border-slate-800/60 sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs z-10 -mt-1 pt-1">
                  <h3 className="font-semibold text-sm text-slate-950 dark:text-slate-100">
                    Chấm điểm bài nộp
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Học sinh: {selectedSub.student?.profile?.name || selectedSub.student?.name || selectedSub.student?.email || 'Học sinh'}
                  </p>
                </div>

                {/* Answers Content */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Bài làm đã gửi:
                  </span>
                  <div className="max-h-52 overflow-y-auto p-2.5 bg-white/80 dark:bg-[#1a1b1d]/80 rounded-xl text-xs space-y-2">
                    {(selectedSub.answers || []).map((ans: any, idx: number) => (
                      <div key={ans.id || idx} className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          Câu {idx + 1}:
                        </span>
                        <p className="font-mono text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>{formatSubmittedAnswer(ans)}</span>
                          {typeof ans.isCorrect === 'boolean' && (
                            <span className={ans.isCorrect ? 'ml-2 text-emerald-600 font-bold' : 'ml-2 text-red-600 font-bold'}>
                              {ans.isCorrect ? '✓ Đúng' : '✕ Sai'}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anti-Cheating Audit Logs */}
                {selectedSub.violationLogs && selectedSub.violationLogs.length > 0 && (
                  <div className="p-2.5 bg-red-50/70 dark:bg-red-950/30 rounded-xl space-y-1.5 text-xs">
                    <div className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <ShieldAlert size={14} /> Nhật ký vi phạm ({selectedSub.violationLogs.length} lần):
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {selectedSub.violationLogs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="text-[10px] text-red-600 dark:text-red-300 flex items-start gap-1">
                          <span className="font-mono text-slate-400 shrink-0">[{log.timestamp}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveGrade} className="space-y-3">
                  <Input
                    label={`Điểm số (Tối đa ${assignment.maxScore || 10})`}
                    type="number"
                    step="0.1"
                    min="0"
                    max={assignment.maxScore || 10}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(Number(e.target.value))}
                    required
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Lời phê & Nhận xét
                    </label>
                    <textarea
                      placeholder="Nhập nhận xét gửi đến học sinh..."
                      className="w-full px-3 py-2 bg-white dark:bg-[#1a1b1d] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 min-h-[70px]"
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSub(null)}
                      className="w-1/2"
                    >
                      Hủy
                    </Button>
                    <Button type="submit" size="sm" disabled={savingGrade} className="w-1/2">
                      {savingGrade ? 'Đang lưu...' : 'Lưu điểm'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Submissions List */
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <h3 className="font-semibold text-sm text-slate-950 dark:text-slate-100">
                    Danh sách bài nộp ({deduplicatedSubmissions.length})
                  </h3>
                </div>

                {deduplicatedSubmissions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center shrink-0">
                    Chưa có học sinh nào nộp bài.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1.5 [scrollbar-width:thin]">
                    {deduplicatedSubmissions.map((sub) => {
                      const studentName = sub.student?.profile?.name || sub.student?.name || sub.student?.email || 'Học sinh';
                      return (
                        <div
                          key={sub.id}
                          onClick={() => selectForGrading(sub)}
                          className="py-2.5 px-2 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors select-none"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {studentName}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}{' '}
                              {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge variant={sub.status === 'GRADED' ? 'success' : 'warning'}>
                              {sub.status === 'GRADED'
                                ? `${sub.score} / ${assignment.maxScore || 10}đ`
                                : 'Chờ chấm'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Mã QR & PIN làm bài kiểm tra"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1 text-center">
          {qrCodeUrl ? (
            <div className="p-4 bg-white rounded-3xl inline-block mx-auto shadow-md border border-slate-200/80">
              <img src={qrCodeUrl} alt="Mã QR làm bài" className="w-56 h-56 mx-auto object-contain" />
            </div>
          ) : (
            <div className="w-56 h-56 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-xs text-slate-400">
              Đang tạo mã QR...
            </div>
          )}

          {/* PIN box */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60">
            <div className="text-left">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                Mã PIN làm bài
              </span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-blue-700 dark:text-blue-300 tracking-wider">
                {displayPin}
              </div>
            </div>
            <Button size="sm" onClick={() => handleCopyPin(displayPin)} className="gap-1.5 rounded-xl">
              {copiedPin ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedPin ? 'Đã sao chép' : 'Sao chép PIN'}</span>
            </Button>
          </div>

          {/* Link box */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10">
            <div className="text-left truncate mr-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Đường dẫn trực tiếp
              </span>
              <div className="text-xs text-slate-600 dark:text-zinc-300 font-medium truncate">
                {playUrl}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0 rounded-xl">
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {qrCodeUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="rounded-xl text-xs gap-1.5"
                title="Tải ảnh QR về máy để in hoặc gửi lên nhóm"
              >
                <Download size={14} />
                <span>Tải ảnh QR về máy</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open(playUrl, '_blank')}
              className="rounded-xl text-xs gap-1.5 bg-google-blue hover:bg-[#1557b0] text-white"
            >
              <ExternalLink size={14} />
              <span>Mở làm thử ngay</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Assignment Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteAssignOpen}
        onClose={() => setIsDeleteAssignOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Xóa bài tập này?"
        message={`Bạn có chắc chắn muốn xóa bài tập "${assignment.title}"? Dữ liệu bài nộp liên quan sẽ bị xóa vĩnh viễn.`}
        isDestructive
        confirmText="Xóa bài tập"
      />

      {/* Student Submit Confirmation */}
      <ConfirmDialog
        isOpen={isSubmitConfirmOpen}
        onClose={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleStudentSubmit}
        title="Xác nhận nộp bài tập?"
        message="Sau khi nộp, bạn sẽ không thể chỉnh sửa lại nội dung bài làm. Bạn có chắc chắn muốn nộp ngay?"
        confirmText="Xác nhận nộp bài"
        loading={submitting}
      />
    </AppShell>
  );
}
