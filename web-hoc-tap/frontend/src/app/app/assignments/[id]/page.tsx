'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
} from 'lucide-react';

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

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [token, assignmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assignment Details
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Không thể tải bài tập');
      const data = await res.json();
      setAssignment(data);

      if (isTeacher) {
        // 2. Fetch Submissions for teacher
        const subRes = await fetch(
          `/api/assignments/${assignmentId}/submissions`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (subRes.ok) setSubmissions(await subRes.json());
      } else {
        // 3. Fetch student's own submission
        const mySubRes = await fetch(
          `/api/assignments/${assignmentId}/submission/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (mySubRes.ok) {
          const sub = await mySubRes.json();
          setMySubmission(sub);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: answersList }),
      });

      if (res.ok) {
        setIsSubmitConfirmOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi nộp bài');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSavingGrade(true);

    try {
      const res = await fetch(
        `/api/assignments/submissions/${selectedSub.id}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score: Number(gradeScore),
            feedback: gradeFeedback,
          }),
        }
      );

      if (res.ok) {
        setSelectedSub(null);
        setGradeFeedback('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi lưu điểm');
      }
    } catch (err) {
      console.error(err);
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

  if (loading || !assignment) {
    return (
      <AppShell>
        <p className="text-xs text-slate-400 py-12 text-center">Đang tải bài tập...</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={assignment.title}
      subtitle={`Lớp: ${assignment.class.name} | Thang điểm: ${assignment.maxScore}`}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/classes/${assignment.classId}`)}
          className="gap-1.5"
        >
          <ArrowLeft size={16} /> Quay lại lớp
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assignment Description & Work Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Assignment Meta Card */}
          <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-3">
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
            </div>

            {assignment.description && (
              <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {assignment.description}
              </div>
            )}
          </div>

          {/* Student Interaction Area */}
          {!isTeacher && (
            <div className="space-y-4">
              {mySubmission ? (
                /* Already Submitted Result View */
                <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-4">
                  <div className="flex justify-between items-center">
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
                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-[4px] text-xs space-y-1">
                      <span className="font-bold text-blue-700 dark:text-blue-300 block">
                        Lời phê của giáo viên:
                      </span>
                      <p className="text-slate-700 dark:text-slate-300">
                        {mySubmission.feedback}
                      </p>
                    </div>
                  )}

                  {/* Answers review */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Chi tiết bài làm đã gửi
                    </span>
                    {mySubmission.answers.map((ans: any, idx: number) => (
                      <div
                        key={ans.id}
                        className="p-3 bg-white dark:bg-slate-950 rounded-[4px] text-xs space-y-1"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {assignment.quiz ? `Câu hỏi ${idx + 1}` : 'Nội dung bài làm'}:
                        </span>
                        <p className="text-slate-900 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded-[4px]">
                          {formatSubmittedAnswer(ans)}
                          {typeof ans.isCorrect === 'boolean' && (
                            <span className={ans.isCorrect ? 'ml-2 text-emerald-600' : 'ml-2 text-red-600'}>
                              {ans.isCorrect ? '✓ Đúng' : '✕ Sai'}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Submission Form */
                <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-5">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100">
                    Làm bài tập
                  </h3>

                  {assignment.quiz ? (
                    /* Linked Quiz Mode */
                    <div className="space-y-5">
                      {assignment.quiz.questions.map((qq: any, idx: number) => {
                        const q = qq.question;
                        return (
                          <div
                            key={q.id}
                            className="p-4 bg-white dark:bg-slate-950 rounded-[6px] space-y-3"
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
                                  className={`flex items-center gap-3 p-2.5 rounded-[4px] cursor-pointer text-xs font-medium select-none ${
                                    studentAnswers[q.id] === opt.id
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                                      : 'bg-slate-100/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
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
                    <div className="space-y-5">
                      {documentQuestions.map((q: any, idx: number) => {
                        const questionId = q.id || `q_${idx + 1}`;
                        const options = Array.isArray(q.options) ? q.options : [];
                        return (
                          <div
                            key={questionId}
                            className="p-4 bg-white dark:bg-slate-950 rounded-[6px] space-y-3"
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
                                  className={`flex items-center gap-3 p-2.5 rounded-[4px] cursor-pointer text-xs font-medium select-none ${
                                    studentAnswers[questionId] === String(optIdx)
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-semibold ring-1 ring-blue-500'
                                      : 'bg-slate-100/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
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
                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500 min-h-[160px]"
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
              <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-4 sticky top-20">
                <div className="space-y-1">
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
                  <div className="max-h-48 overflow-y-auto p-3 bg-white dark:bg-slate-950 rounded-[4px] text-xs space-y-2">
                    {selectedSub.answers.map((ans: any, idx: number) => (
                      <div key={ans.id} className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {assignment.quiz ? `Câu ${idx + 1}` : 'Nội dung'}:
                        </span>
                        <p className="font-mono text-slate-800 dark:text-slate-200">
                          {formatSubmittedAnswer(ans)}
                          {typeof ans.isCorrect === 'boolean' && (
                            <span className={ans.isCorrect ? 'ml-2 text-emerald-600' : 'ml-2 text-red-600'}>
                              {ans.isCorrect ? '✓ Đúng' : '✕ Sai'}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

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
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500 min-h-[80px]"
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
                <h3 className="font-bold text-sm text-slate-950 dark:text-slate-100 flex items-center justify-between">
                  <span>Danh sách bài nộp ({submissions.length})</span>
                </h3>

                {submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-[6px]">
                    Chưa có học sinh nào nộp bài.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => selectForGrading(sub)}
                        className="p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-900/80 select-none"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {sub.student.profile?.name || sub.student.email}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}{' '}
                            {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                          </span>
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
    </AppShell>
  );
}
