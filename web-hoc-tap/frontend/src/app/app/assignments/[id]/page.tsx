'use client';

import React, { useEffect, useState } from 'react';
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
  Maximize2,
  Minimize2,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';

import {
  fetchAssignmentDetail,
  fetchAssignmentSubmissions,
  fetchMyAssignmentSubmission,
  submitAssignment,
  gradeAssignmentSubmission,
  deleteClassAssignment,
} from '@/lib/classesApi';

export default function AssignmentDetailPage() {
  const { id: assignmentId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (assignment?.pin) {
      const playUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/play?pin=${assignment.pin}`
          : `http://localhost:3000/play?pin=${assignment.pin}`;
      QRCode.toDataURL(playUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [assignment?.pin]);

  const isTeacher = user?.role === 'TEACHER';

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignment) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClassAssignment(activeToken, assignment.classId, assignment.id);
    router.push(`/app/classes/${assignment.classId}`);
  };

  const handleStudentSubmit = async () => {
    setSubmitting(true);
    const linkedDocumentQuestions = Array.isArray(assignment.documentFile?.parsedQuiz?.questions)
      ? assignment.documentFile.parsedQuiz.questions
      : [];
    const answersList = assignment.quiz
      ? Object.entries(studentAnswers).map(([questionId, answerContent]) => ({
          questionId,
          answerContent,
        }))
      : linkedDocumentQuestions.length > 0
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

  const documentQuestions = Array.isArray(assignment?.documentFile?.parsedQuiz?.questions)
    ? assignment.documentFile.parsedQuiz.questions
    : [];

  const formatSubmittedAnswer = (ans: any) => {
    if (assignment?.quiz) {
      const quizQuestion = assignment.quiz.questions?.find((qq: any) => qq.questionId === ans.questionId);
      const option = quizQuestion?.question?.options?.find((opt: any) => opt.id === ans.answerContent);
      return option?.content || ans.answerContent;
    }

    if (documentQuestions.length > 0) {
      const question = documentQuestions.find((q: any, idx: number) => (q.id || `q_${idx + 1}`) === ans.questionId);
      const selectedIndex = Number(ans.answerContent);
      const option = Number.isInteger(selectedIndex) ? question?.options?.[selectedIndex] : null;
      return option?.content || ans.answerContent;
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
      title={assignment.title}
      subtitle={`Lớp: ${assignment.class.name} | Thang điểm: ${assignment.maxScore}`}
      action={
        <div className="flex items-center gap-2">
          {assignment.pin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="gap-1.5 text-xs rounded-xl"
              title="Xem mã QR để học sinh quét làm bài"
            >
              <QrCode size={15} /> Mã QR
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/app/classes/${assignment.classId}`)}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Assignment Description & Work Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Assignment Meta */}
          <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-4 items-center text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Hạn nộp:{' '}
                {assignment.deadline
                  ? new Date(assignment.deadline).toLocaleString('vi-VN')
                  : 'Không giới hạn'}
              </span>
              <span className="flex items-center gap-1">
                <Award size={14} /> Điểm tối đa: {assignment.maxScore}
              </span>
              {assignment.quiz && <Badge variant="info">Trắc nghiệm liên kết</Badge>}
              {assignment.documentFile && <Badge variant="success">Đề từ Kho tài liệu</Badge>}
              {assignment.antiCheat ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  <ShieldCheck size={12} /> Chống gian lận: BẬT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Shield size={12} /> Chống gian lận: TẮT
                </span>
              )}
              {assignment.pin && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                  Mã PIN Blooket: {assignment.pin}
                </span>
              )}
            </div>

            {assignment.description && (
              <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {assignment.description}
              </div>
            )}
          </div>

          {/* Student Interaction Area */}
          {!isTeacher && (
            <div className="space-y-4">
              {mySubmission ? (
                /* Already Submitted Result View */
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-sm text-slate-950 dark:text-slate-100">
                        Bạn đã nộp bài tập này
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
                      {mySubmission.answers.map((ans: any, idx: number) => (
                        <div
                          key={ans.id}
                          className="py-3 text-xs space-y-1"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            {assignment.quiz ? `Câu hỏi ${idx + 1}` : 'Nội dung bài làm'}:
                          </span>
                          <p className="text-slate-900 dark:text-slate-100 font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg">
                            {formatSubmittedAnswer(ans)}
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
                </div>
              ) : (
                /* Submission Form */
                <div className="space-y-5">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
                    Làm bài tập
                  </h3>

                  {assignment.quiz ? (
                    /* Linked Quiz Mode */
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {assignment.quiz.questions.map((qq: any, idx: number) => {
                        const q = qq.question;
                        return (
                          <div
                            key={q.id}
                            className="py-4 space-y-3"
                          >
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase">
                              Câu {idx + 1}
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {q.content}
                            </p>

                            <div className="space-y-2 pt-1">
                              {q.options.map((opt: any) => (
                                <label
                                  key={opt.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-xs font-medium select-none ${
                                    studentAnswers[q.id] === opt.id
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt.id}
                                    checked={studentAnswers[q.id] === opt.id}
                                    onChange={(e) =>
                                      setStudentAnswers({
                                        ...studentAnswers,
                                        [q.id]: e.target.value,
                                      })
                                    }
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  {opt.content}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : documentQuestions.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documentQuestions.map((q: any, idx: number) => {
                        const questionId = q.id || `q_${idx + 1}`;
                        const options = Array.isArray(q.options) ? q.options : [];
                        return (
                          <div
                            key={questionId}
                            className="py-4 space-y-3"
                          >
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase">
                              Câu {idx + 1}
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {q.content}
                            </p>

                            <div className="space-y-2 pt-1">
                              {options.map((opt: any, optIdx: number) => (
                                <label
                                  key={`${questionId}_${optIdx}`}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-xs font-medium select-none ${
                                    studentAnswers[questionId] === String(optIdx)
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                                      : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={questionId}
                                    value={optIdx}
                                    checked={studentAnswers[questionId] === String(optIdx)}
                                    onChange={(e) =>
                                      setStudentAnswers({
                                        ...studentAnswers,
                                        [questionId]: e.target.value,
                                      })
                                    }
                                    className="h-4 w-4 text-blue-600"
                                  />
                                  {opt.content}
                                </label>
                              ))}
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
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 min-h-[160px]"
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
            {selectedSub ? (
              /* Grading Form Panel */
              <div className="space-y-4 sticky top-20 pb-4">
                <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
                    Chấm điểm bài nộp
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Học sinh: {selectedSub.student.profile?.name || selectedSub.student.email}
                  </p>
                </div>

                {/* Answers Content */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Bài làm đã gửi:
                  </span>
                  <div className="max-h-56 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-2">
                    {selectedSub.answers.map((ans: any, idx: number) => (
                      <div key={ans.id} className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {assignment.quiz ? `Câu ${idx + 1}` : 'Nội dung'}:
                        </span>
                        <p className="font-mono text-slate-800 dark:text-slate-200">
                          {formatSubmittedAnswer(ans)}
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
                  <div className="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl space-y-1.5 text-xs">
                    <div className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <ShieldAlert size={14} /> Nhật ký vi phạm chống gian lận ({selectedSub.violationLogs.length} lần):
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedSub.violationLogs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="text-[11px] text-red-600 dark:text-red-300 flex items-start gap-1">
                          <span className="font-mono text-slate-400 shrink-0">[{log.timestamp}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveGrade} className="space-y-3">
                  <Input
                    label={`Điểm số (Tối đa ${assignment.maxScore})`}
                    type="number"
                    step="0.1"
                    min="0"
                    max={assignment.maxScore}
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
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
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
                <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span>Danh sách bài nộp ({submissions.length})</span>
                </h3>

                {submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Chưa có học sinh nào nộp bài.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => selectForGrading(sub)}
                        className="py-3 px-2 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors select-none group"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {sub.student.profile?.name || sub.student.email}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>
                              {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}{' '}
                              {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                            </span>
                            {sub.violationCount !== undefined && sub.violationCount > 0 ? (
                              <span className="text-red-500 font-bold flex items-center gap-0.5">
                                <ShieldAlert size={10} /> Rời tab {sub.violationCount} lần
                              </span>
                            ) : sub.violationCount === 0 ? (
                              <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                <ShieldCheck size={10} /> 0 vi phạm
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant={sub.status === 'GRADED' ? 'success' : 'warning'}>
                            {sub.status === 'GRADED'
                              ? `${sub.score} / ${assignment.maxScore}`
                              : 'Chờ chấm'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Teacher Delete Assignment Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteAssignOpen}
        onClose={() => setIsDeleteAssignOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Xóa bài tập này?"
        message={`Bạn có chắc chắn muốn xóa bài tập "${assignment.title}"? Tất cả bài nộp của học sinh đối với bài tập này cũng sẽ bị xóa.`}
        isDestructive
        confirmText="Xóa bài tập"
      />

      {/* QR Code Presentation Modal */}
      {isQrModalOpen && assignment?.pin && (
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title="Mã QR làm bài tập"
          maxWidth="md"
        >
          <div className="p-6 text-center space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Mã PIN làm bài
              </span>
              <div className="font-mono text-4xl font-extrabold text-google-blue">
                {assignment.pin.slice(0, 3)} {assignment.pin.slice(3)}
              </div>
            </div>

            {qrCodeUrl ? (
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block mx-auto">
                <img src={qrCodeUrl} alt="Mã QR" className="w-56 h-56 rounded-xl mx-auto object-contain" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400 mx-auto">
                Đang tạo mã QR...
              </div>
            )}

            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Học sinh dùng điện thoại (Camera hoặc Zalo) quét mã này để vào thẳng phòng thi và làm bài ngay.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url =
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/play?pin=${assignment.pin}`
                      : `http://localhost:3000/play?pin=${assignment.pin}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="gap-1.5 text-xs rounded-xl"
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copiedLink ? 'Đã sao chép link' : 'Sao chép link làm bài'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
