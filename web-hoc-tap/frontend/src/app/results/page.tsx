'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { BarChart3, Award, CheckCircle2, TrendingUp, Calendar, Zap, FileText } from 'lucide-react';

export default function ResultsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classStats, setClassStats] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (isTeacher) {
      fetchTeacherClasses();
    } else {
      fetchStudentHistory();
    }
  }, [token]);

  useEffect(() => {
    if (selectedClassId && isTeacher) {
      fetchClassStats(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchTeacherClasses = async () => {
    try {
      const res = await fetch('/api/classes/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchClassStats = async (classId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/results/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClassStats(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/results/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStudentHistory(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Báo cáo"
      subtitle={
        isTeacher
          ? 'Theo dõi tiến độ nộp bài, điểm trung bình và phân tích kết quả từng lớp học'
          : 'Lịch sử làm bài tập và kết quả các trận đấu trắc nghiệm realtime'
      }
    >
      <div className="space-y-6">
        {isTeacher ? (
          /* Teacher Analytics View */
          <div className="space-y-6">
            {/* Class Selector */}
            <div className="flex flex-wrap gap-3 items-center p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px]">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Chọn lớp học:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs font-semibold focus:ring-1 focus:ring-blue-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count?.members ?? 0} học sinh)
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Đang tổng hợp số liệu thống kê...
              </p>
            ) : !classStats ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Chưa có dữ liệu thống kê cho lớp này.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Metric Summary Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Tổng học sinh
                    </span>
                    <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
                      {classStats.totalStudents}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Bài tập đã giao
                    </span>
                    <p className="text-2xl font-bold text-slate-950 dark:text-slate-100">
                      {classStats.totalAssignments}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Điểm trung bình
                    </span>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {classStats.overallAverage}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Tỷ lệ hoàn thành
                    </span>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {classStats.overallCompletionRate}%
                    </p>
                  </div>
                </div>

                {/* Assignments Performance Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100">
                    Phân tích chi tiết từng bài tập
                  </h3>

                  {classStats.assignmentStats.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center bg-slate-50/40 dark:bg-slate-900/20 rounded-[6px]">
                      Lớp này chưa có bài tập nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {classStats.assignmentStats.map((assign: any) => (
                        <div
                          key={assign.id}
                          className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {assign.title}
                            </h4>
                            <span className="text-xs text-slate-500">
                              Thang điểm: {assign.maxScore}
                            </span>
                          </div>

                          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                            <span>Đã nộp: {assign.submissionCount}</span>
                            <span>Hoàn thành: {Math.round(assign.completionRate)}%</span>
                            <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                              ĐTB: {assign.averageScore}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Student History View */
          <div className="space-y-8">
            {loading ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Đang tải lịch sử học tập...
              </p>
            ) : !studentHistory ? (
              <p className="text-xs text-slate-400 py-12 text-center">
                Chưa có dữ liệu bài làm.
              </p>
            ) : (
              <>
                {/* Assignment Submissions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                    Lịch sử bài tập đã làm
                  </h3>

                  {studentHistory.submissions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center bg-slate-50/40 dark:bg-slate-900/20 rounded-[6px]">
                      Bạn chưa nộp bài tập nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentHistory.submissions.map((sub: any) => (
                        <div
                          key={sub.id}
                          onClick={() => router.push(`/assignments/${sub.assignment.id}`)}
                          className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {sub.assignment.title}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Lớp: {sub.assignment.class.name}
                            </p>
                          </div>

                          <div className="text-right">
                            <Badge variant={sub.status === 'GRADED' ? 'success' : 'warning'}>
                              {sub.score !== null
                                ? `Điểm: ${sub.score} / ${sub.assignment.maxScore}`
                                : 'Chờ chấm'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 block pt-1">
                              {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multiplayer Game History */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-slate-100 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    Lịch sử thi đấu Game Realtime
                  </h3>

                  {studentHistory.gameHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center bg-slate-50/40 dark:bg-slate-900/20 rounded-[6px]">
                      Bạn chưa tham gia trận đấu game nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentHistory.gameHistory.map((game: any) => (
                        <div
                          key={game.id}
                          className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex justify-between items-center"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {game.room.quiz.title}
                            </h4>
                            <span className="text-xs text-slate-500">
                              Biệt danh: {game.nickname}
                            </span>
                          </div>

                          <div className="flex gap-6 items-center text-xs text-slate-500 font-semibold">
                            <span>Đúng: {game.correctCount}</span>
                            <span>Độ chính xác: {Math.round(game.accuracy)}%</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {game.score} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
