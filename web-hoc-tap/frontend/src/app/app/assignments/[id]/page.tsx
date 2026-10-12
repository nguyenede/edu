'use client';

import React, { useEffect, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
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
} from 'lucide-react';
import QRCode from 'qrcode';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import {
  fetchAssignmentDetail,
  fetchAssignmentSubmissions,
  fetchMyAssignmentSubmission,
  submitAssignment,
  gradeAssignmentSubmission,
  deleteClassAssignment,
} from '@/lib/classesApi';

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

  // Teacher UI State
  const [teacherTab, setTeacherTab] = useState<'questions' | 'try'>('questions');

  // Student State
  const [studentAnswers, setStudentAnswers] = useState<{ [qId: string]: string }>({});
  const [essayContent, setEssayContent] = useState('');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const isTeacher = useMemo(() => {
    if (!user) return true;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  const displayPin = useMemo(() => {
    return (
      assignment?.pin ||
      assignment?.pinCode ||
      (assignment?.id ? String(assignment.id).replace(/\D/g, '').slice(-6) : '') ||
      '123456'
    );
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

  const handleStudentSubmit = async () => {
    setSubmitting(true);
    const answersList = normalizedQuestions.length > 0
      ? Object.entries(studentAnswers).map(([questionId, answerContent]) => ({
          questionId,
          answerContent,
        }))
      : [{ questionId: assignment.id, answerContent: essayContent }];

    try {
      await submitAssignment(token, String(assignmentId), answersList);
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

  const classNameDisplay = assignment.class?.name || assignment.className || 'Lớp học';

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
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[2]" />
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
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[2]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450] truncate max-w-md">
            {assignment.title}
          </span>
        </div>
      }
      subtitle={`Lớp: ${classNameDisplay} | Thang điểm: ${assignment.maxScore || 10}đ`}
      action={
        <div className="flex items-center gap-2">
          {isTeacher && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold bg-google-blue hover:bg-[#1557b0] text-white shadow-xs"
              title="Mở mã QR và mã PIN cho học sinh làm bài"
            >
              <QrCode size={15} />
              <span>Mã QR & PIN làm bài</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (assignment.classId && assignment.classId !== 'public') {
                router.push(`/app/classes/${assignment.classId}`);
              } else {
                router.push('/app/classes');
              }
            }}
            className="gap-1.5"
          >
            <ArrowLeft size={16} /> Quay lại lớp
          </Button>

          {isTeacher && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteAssignOpen(true)}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Xóa bài tập"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {assignment.description && (
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                {assignment.description}
              </div>
            )}
          </div>

          {/* ================= TEACHER VIEW ================= */}
          {isTeacher && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Đề thi & Danh sách câu hỏi ({normalizedQuestions.length})
                </h3>
              </div>

              {normalizedQuestions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <HelpCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 font-medium">
                    Bài tập này là bài tập tự luận hoặc chưa có câu hỏi trắc nghiệm liên kết.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {normalizedQuestions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="py-4 first:pt-1 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          Câu {qIdx + 1}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Trắc nghiệm đơn
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                        <MathRenderer text={q.content} />
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
                  ))}
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
                    <Badge variant={mySubmission.status === 'GRADED' ? 'success' : 'warning'}>
                      {mySubmission.status === 'GRADED'
                        ? `Điểm: ${mySubmission.score} / ${assignment.maxScore}`
                        : 'Đang chờ giáo viên chấm'}
                    </Badge>
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
              ) : (
                /* Student Submission Form */
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
                      Làm bài tập
                    </h3>
                    {assignment.pin && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(`/play?pin=${assignment.pin}`, '_blank')}
                        className="gap-1.5 text-xs text-blue-600"
                      >
                        <Play size={13} /> Làm qua Blooket Game
                      </Button>
                    )}
                  </div>

                  {normalizedQuestions.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {normalizedQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="py-4 first:pt-1 space-y-2.5"
                        >
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block uppercase">
                            Câu {idx + 1}
                          </span>
                          <div className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                            <MathRenderer text={q.content} />
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
                      ))}
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

                  <Button
                    size="md"
                    fullWidth
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="gap-2 font-bold"
                  >
                    <Send size={16} /> Nộp bài tập ngay
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Teacher Submissions List & Grading Panel */}
        {isTeacher && (
          <div className="md:col-span-1 space-y-4">
            {/* Quick PIN & QR Card for Teacher */}
            <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode size={14} className="text-blue-600 dark:text-blue-400" />
                  Mã làm bài của học sinh
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                  PIN & QR
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block uppercase">
                    Mã PIN làm bài:
                  </span>
                  <div className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-wider">
                    {displayPin}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPin(displayPin)}
                  className="text-xs py-1.5 px-3 rounded-xl gap-1 shrink-0"
                  title="Sao chép mã PIN"
                >
                  {copiedPin ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedPin ? 'Đã chép' : 'Chép PIN'}</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex-1 text-xs rounded-xl bg-google-blue hover:bg-[#1557b0] text-white gap-1.5 shadow-xs"
                >
                  <QrCode size={14} />
                  <span>Mở mã QR chiếu TV</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="text-xs rounded-xl gap-1 shrink-0"
                  title="Sao chép link làm bài"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span className="hidden sm:inline">{copiedLink ? 'Đã chép' : 'Chép link'}</span>
                </Button>
              </div>
            </div>

            {selectedSub ? (
              /* Grading Form Panel */
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl space-y-4 sticky top-20">
                <div className="space-y-1 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
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
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-semibold text-sm text-slate-950 dark:text-slate-100">
                    Danh sách bài nộp ({submissions.length})
                  </h3>
                </div>

                {submissions.length === 0 ? (
                  <div className="py-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <p className="text-xs text-slate-400">
                      Chưa có học sinh nào nộp bài.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsQrModalOpen(true)}
                      className="mx-auto text-xs rounded-xl gap-1.5 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                    >
                      <QrCode size={14} />
                      <span>Mở mã QR cho học sinh quét</span>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {submissions.map((sub) => {
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
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Học sinh có thể quét mã QR bằng Camera điện thoại / Zalo hoặc vào <strong>kiyoedu.com/play</strong> và nhập mã PIN.
          </p>

          {qrCodeUrl ? (
            <div className="p-4 bg-white rounded-3xl inline-block mx-auto shadow-md border border-slate-200/80">
              <img src={qrCodeUrl} alt="Mã QR làm bài" className="w-56 h-56 mx-auto object-contain" />
              <span className="text-[11px] font-bold text-slate-500 mt-1 block">
                Quét bằng Camera điện thoại hoặc Zalo
              </span>
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
