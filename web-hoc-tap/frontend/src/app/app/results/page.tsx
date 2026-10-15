'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import {
  BarChart3,
  Award,
  CheckCircle2,
  TrendingUp,
  Calendar,
  FileText,
  Users,
  Clock,
  ArrowUpRight,
  Download,
  RefreshCw,
  Search,
  GraduationCap,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Percent,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import {
  fetchClasses,
  fetchClassAssignments,
  fetchClassMembers,
  fetchAssignmentSubmissions,
  ClassItem,
} from '@/lib/classesApi';
import * as XLSX from 'xlsx';

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classSearch, setClassSearch] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'week' | 'month' | 'term1' | 'term2'>('all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'excellent' | 'good' | 'average' | 'needs_attention'>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classAssignments, setClassAssignments] = useState<any[]>([]);
  const [classMembers, setClassMembers] = useState<any[]>([]);
  const [assignmentSubmissionsMap, setAssignmentSubmissionsMap] = useState<Record<string, any[]>>({});
  const [studentSubmissionsList, setStudentSubmissionsList] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const queryClassId = searchParams?.get('classId');
    if (queryClassId) {
      setSelectedClassId(queryClassId);
    }

    loadInitialData();
  }, [token, isTeacher]);

  useEffect(() => {
    if (selectedClassId && isTeacher) {
      loadClassDetailedAnalytics(selectedClassId);
    }
  }, [selectedClassId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const loadedClasses = await fetchClasses(token, isTeacher);
      setClasses(loadedClasses);

      if (!isTeacher) {
        await loadStudentSubmissions(loadedClasses);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetailedAnalytics = async (classId: string) => {
    setRefreshing(true);
    try {
      const [asgs, members] = await Promise.all([
        fetchClassAssignments(token, classId),
        fetchClassMembers(token, classId),
      ]);

      setClassAssignments(asgs);
      setClassMembers(members);

      const subsMap: Record<string, any[]> = {};
      await Promise.all(
        asgs.map(async (asg) => {
          try {
            const subs = await fetchAssignmentSubmissions(token, asg.id);
            subsMap[asg.id] = Array.isArray(subs) ? subs : [];
          } catch {
            subsMap[asg.id] = [];
          }
        })
      );
      setAssignmentSubmissionsMap(subsMap);
    } catch (err) {
      console.error('Error loading class analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadStudentSubmissions = async (studentClasses: ClassItem[]) => {
    try {
      const res = await fetch('/api/results/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.submissions)) {
          setStudentSubmissionsList(data.submissions);
          return;
        }
      }

      const allSubs: any[] = [];
      for (const cls of studentClasses) {
        try {
          const asgs = await fetchClassAssignments(token, cls.id);
          for (const asg of asgs) {
            const subs = await fetchAssignmentSubmissions(token, asg.id);
            const mySub = subs.find(
              (s: any) =>
                s.student?.id === user?.id ||
                s.student?.email === user?.email ||
                s.id?.startsWith('sub_my_')
            );
            if (mySub) {
              allSubs.push({
                ...mySub,
                assignment: {
                  ...asg,
                  class: { name: cls.name },
                },
              });
            }
          }
        } catch (_) {}
      }
      setStudentSubmissionsList(allSubs);
    } catch (err) {
      console.error('Error loading student submissions:', err);
      setStudentSubmissionsList([]);
    }
  };

  const classStats = useMemo(() => {
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const totalStudents = classMembers.length || (selectedClass?._count?.members ?? 0);
    const totalAssignments = classAssignments.length;

    let totalSubmissionsCount = 0;
    let totalScoreSum = 0;
    let gradedSubmissionsCount = 0;
    let pendingGradingCount = 0;
    let maxScoreFound: number | null = null;
    let minScoreFound: number | null = null;

    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      average: 0,
      poor: 0,
    };

    const assignmentMetrics = classAssignments.map((asg) => {
      const subs = assignmentSubmissionsMap[asg.id] || [];
      const subCount = subs.length;
      totalSubmissionsCount += subCount;

      let asgScoreSum = 0;
      let asgGradedCount = 0;

      subs.forEach((s) => {
        if (s.status === 'GRADED' && typeof s.score === 'number') {
          asgScoreSum += s.score;
          asgGradedCount++;
          totalScoreSum += s.score;
          gradedSubmissionsCount++;

          if (maxScoreFound === null || s.score > maxScoreFound) maxScoreFound = s.score;
          if (minScoreFound === null || s.score < minScoreFound) minScoreFound = s.score;

          if (s.score >= 9.0) distribution.excellent++;
          else if (s.score >= 8.0) distribution.good++;
          else if (s.score >= 6.5) distribution.fair++;
          else if (s.score >= 5.0) distribution.average++;
          else distribution.poor++;
        } else {
          pendingGradingCount++;
        }
      });

      const avgScore = asgGradedCount > 0 ? (asgScoreSum / asgGradedCount).toFixed(1) : '--';
      const completionRate = totalStudents > 0 ? Math.min(100, Math.round((subCount / totalStudents) * 100)) : 0;

      return {
        ...asg,
        submissionCount: subCount,
        averageScore: avgScore,
        completionRate,
      };
    });

    const overallAverage = gradedSubmissionsCount > 0
      ? (totalScoreSum / gradedSubmissionsCount).toFixed(1)
      : '--';

    const expectedTotalSubmissions = totalStudents * totalAssignments;
    const overallCompletionRate = expectedTotalSubmissions > 0
      ? Math.min(100, Math.round((totalSubmissionsCount / expectedTotalSubmissions) * 100))
      : 0;

    const studentLeaderboard = classMembers.map((member) => {
      const studentId = member.student?.id || member.id;
      const studentEmail = member.student?.email || member.email || '';
      const name = member.student?.profile?.name || member.name || studentEmail || 'Học sinh';

      let mySubCount = 0;
      let myScoreSum = 0;
      let myGradedCount = 0;

      classAssignments.forEach((asg) => {
        const subs = assignmentSubmissionsMap[asg.id] || [];
        const found = subs.find(
          (s: any) =>
            s.student?.id === studentId ||
            s.student?.email === studentEmail ||
            (s.id && s.id.includes(studentId))
        );
        if (found) {
          mySubCount++;
          if (typeof found.score === 'number') {
            myScoreSum += found.score;
            myGradedCount++;
          }
        }
      });

      const avgScoreNum = myGradedCount > 0 ? myScoreSum / myGradedCount : null;
      const completionPercent = totalAssignments > 0 ? Math.round((mySubCount / totalAssignments) * 100) : 0;

      let rankLabel = 'Chưa có điểm';
      let rankColor = 'text-slate-500 dark:text-slate-400';

      if (avgScoreNum !== null) {
        if (avgScoreNum >= 9.0) {
          rankLabel = 'Xuất sắc';
          rankColor = 'text-emerald-600 dark:text-emerald-400';
        } else if (avgScoreNum >= 8.0) {
          rankLabel = 'Giỏi';
          rankColor = 'text-blue-600 dark:text-blue-400';
        } else if (avgScoreNum >= 6.5) {
          rankLabel = 'Khá';
          rankColor = 'text-cyan-600 dark:text-cyan-400';
        } else if (avgScoreNum >= 5.0) {
          rankLabel = 'Trung bình';
          rankColor = 'text-amber-600 dark:text-amber-400';
        } else {
          rankLabel = 'Cần cố gắng';
          rankColor = 'text-rose-600 dark:text-rose-400';
        }
      }

      return {
        id: studentId,
        name,
        email: studentEmail,
        submittedCount: mySubCount,
        averageScore: avgScoreNum !== null ? avgScoreNum.toFixed(1) : '--',
        rawAvgScore: avgScoreNum ?? -1,
        completionPercent,
        rankLabel,
        rankColor,
      };
    });

    studentLeaderboard.sort((a, b) => b.rawAvgScore - a.rawAvgScore);

    return {
      totalStudents,
      totalAssignments,
      totalSubmissionsCount,
      overallAverage,
      overallCompletionRate,
      pendingGradingCount,
      maxScore: maxScoreFound,
      minScore: minScoreFound,
      distribution,
      assignmentMetrics,
      studentLeaderboard,
    };
  }, [classes, selectedClassId, classAssignments, classMembers, assignmentSubmissionsMap]);

  const globalOverview = useMemo(() => {
    const totalClassCount = classes.length;
    const totalStudentCount = classes.reduce((sum, c) => sum + (c._count?.members || 0), 0);
    return {
      totalClassCount,
      totalStudentCount,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!classSearch.trim()) return classes;
    const query = classSearch.toLowerCase();
    return classes.filter(
      (c) => c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
    );
  }, [classes, classSearch]);

  const filteredStudents = useMemo(() => {
    return classStats.studentLeaderboard.filter((st) => {
      const matchSearch =
        st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        st.email.toLowerCase().includes(studentSearch.toLowerCase());

      if (!matchSearch) return false;

      if (scoreFilter === 'excellent') return st.rawAvgScore >= 9.0;
      if (scoreFilter === 'good') return st.rawAvgScore >= 8.0 && st.rawAvgScore < 9.0;
      if (scoreFilter === 'average') return st.rawAvgScore >= 6.5 && st.rawAvgScore < 8.0;
      if (scoreFilter === 'needs_attention') return st.rawAvgScore >= 0 && st.rawAvgScore < 6.5;

      return true;
    });
  }, [classStats.studentLeaderboard, studentSearch, scoreFilter]);

  const handleCopyClassCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(code);
    showToast(`Đã sao chép mã lớp "${code}"!`);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleExportExcel = () => {
    if (classStats.studentLeaderboard.length === 0) {
      showToast('Lớp học chưa có danh sách học sinh để xuất báo cáo.');
      return;
    }

    const exportData = classStats.studentLeaderboard.map((st, idx) => ({
      'Hạng': idx + 1,
      'Họ và tên': st.name,
      'Email': st.email,
      'Số bài đã nộp': st.submittedCount,
      'Điểm trung bình': st.averageScore,
      'Tỷ lệ hoàn thành': `${st.completionPercent}%`,
      'Xếp loại': st.rankLabel,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 8 },   // Hạng
      { wch: 26 },  // Họ và tên
      { wch: 30 },  // Email
      { wch: 16 },  // Số bài đã nộp
      { wch: 18 },  // Điểm trung bình
      { wch: 18 },  // Tỷ lệ hoàn thành
      { wch: 15 },  // Xếp loại
    ];

    const wb = XLSX.utils.book_new();
    const sheetTitle = (selectedClass?.name || 'Bao_cao').replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

    const safeName = (selectedClass?.name || 'hoc_tap').trim().replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(wb, `Bao_cao_lop_${safeName}.xlsx`);
    showToast('Đã xuất báo cáo Excel (.xlsx) thành công!');
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const studentGpa = useMemo(() => {
    const graded = studentSubmissionsList.filter(
      (s) => s.status === 'GRADED' && typeof s.score === 'number'
    );
    if (graded.length === 0) return null;
    const sum = graded.reduce((acc, curr) => acc + curr.score, 0);
    return (sum / graded.length).toFixed(1);
  }, [studentSubmissionsList]);

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => setSelectedClassId('')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 font-semibold text-slate-900 dark:text-white"
          >
            Báo cáo
          </button>
          {selectedClass && (
            <>
              <BreadcrumbChevron
                menuTitle="Danh sách lớp học"
                items={classes.map((c) => ({
                  label: c.name,
                  icon: <Users size={14} className="text-blue-500 shrink-0" />,
                  onClick: () => setSelectedClassId(c.id),
                }))}
              />
              <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal truncate max-w-xs md:max-w-md">
                {selectedClass.name}
              </span>
            </>
          )}
        </div>
      }
      subtitle={
        isTeacher
          ? selectedClass
            ? `Chi tiết tiến độ, bảng điểm và kết quả học tập của ${selectedClass.name}`
            : 'Chọn lớp học để xem chi tiết tiến độ làm bài, phổ điểm và bảng xếp hạng học sinh'
          : 'Lịch sử làm bài tập và điểm số cá nhân của học sinh'
      }
      action={
        <div className="flex items-center gap-2">
          {isTeacher && (
            <>
              {selectedClass ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Download size={14} />
                    <span>Xuất báo cáo Excel</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/app/classes')}
                    className="flex items-center gap-1.5 text-xs font-normal"
                  >
                    <Plus size={14} />
                    <span>Tạo lớp học mới</span>
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Đang tải dữ liệu báo cáo...</p>
          </div>
        ) : isTeacher ? (
          /* ================= TEACHER VIEW ================= */
          selectedClassId === '' ? (
            /* 1. MÀN HÌNH CHỌN LỚP HỌC (100% Khung Đã Bỏ - Frameless Open Layout) */
            <div className="space-y-8">
              {/* Frameless Global KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Tổng số lớp phụ trách
                  </span>
                  <div className="text-3xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight">
                    {globalOverview.totalClassCount} <span className="text-xs text-slate-400 font-normal">lớp</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Tổng số học sinh
                  </span>
                  <div className="text-3xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight">
                    {globalOverview.totalStudentCount} <span className="text-xs text-slate-400 font-normal">học sinh</span>
                  </div>
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Trạng thái hệ thống
                  </span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                    Đang hoạt động
                  </div>
                </div>
              </div>

              {/* Class Selection Section */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <GraduationCap size={18} className="text-blue-600 dark:text-blue-400" />
                      Chọn lớp học để xem báo cáo chi tiết
                    </h3>
                  </div>

                  {classes.length > 0 && (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm lớp học hoặc mã lớp..."
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-100/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none w-[220px]"
                      />
                    </div>
                  )}
                </div>

                {classes.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto text-slate-400 flex items-center justify-center">
                      <GraduationCap size={32} />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Bạn chưa tạo lớp học nào
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hãy tạo lớp học đầu tiên để bắt đầu giao bài tập và theo dõi báo cáo.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => router.push('/app/classes')}
                      className="font-bold text-xs"
                    >
                      Tạo lớp học ngay
                    </Button>
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">
                    Không tìm thấy lớp học phù hợp với từ khóa tìm kiếm.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className="py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg transition-colors group"
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cls.name}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {cls._count?.members ?? 0} học sinh
                            </span>
                            <span>•</span>
                            <span className="font-mono">Mã: {cls.code}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => handleCopyClassCode(cls.code, e)}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5"
                            title="Sao chép mã lớp"
                          >
                            {copiedCodeId === cls.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>

                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            Xem báo cáo
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 2. MÀN HÌNH CHI TIẾT BÁO CÁO CỦA LỚP (100% Khung Đã Bỏ - Frameless Open Layout) */
            <div className="space-y-8">
              {/* Frameless Filter & Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectedClassId && loadClassDetailedAnalytics(selectedClassId)}
                    disabled={refreshing}
                    className="p-1.5 h-7 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title="Làm mới số liệu"
                  >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                  </Button>
                </div>

                {/* Time Range Pills */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'week', label: '7 ngày qua' },
                    { id: 'month', label: 'Tháng này' },
                    { id: 'term1', label: 'Học kỳ I' },
                    { id: 'term2', label: 'Học kỳ II' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTimeRange(tab.id as any)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                        selectedTimeRange === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. FRAMELESS KEY KPI METRICS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Tổng học sinh
                  </span>
                  <div className="text-3xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight">
                    {classStats.totalStudents}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Bài tập đã giao
                  </span>
                  <div className="text-3xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight">
                    {classStats.totalAssignments}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Điểm trung bình
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                      {classStats.overallAverage}
                    </span>
                    {classStats.overallAverage !== '--' && (
                      <span className="text-xs text-slate-400">/ 10</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Tỷ lệ nộp bài
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {classStats.overallCompletionRate}%
                  </div>
                </div>
              </div>

              {/* 2. FRAMELESS SCORE DISTRIBUTION & SUMMARY */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-600 dark:text-blue-400" />
                        Phổ điểm & Phân loại học lực
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Thang điểm 10
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: 'Xuất sắc (9.0 - 10.0)',
                        count: classStats.distribution.excellent,
                        color: 'bg-emerald-500',
                        textColor: 'text-emerald-600 dark:text-emerald-400',
                      },
                      {
                        label: 'Giỏi (8.0 - 8.9)',
                        count: classStats.distribution.good,
                        color: 'bg-blue-500',
                        textColor: 'text-blue-600 dark:text-blue-400',
                      },
                      {
                        label: 'Khá (6.5 - 7.9)',
                        count: classStats.distribution.fair,
                        color: 'bg-cyan-500',
                        textColor: 'text-cyan-600 dark:text-cyan-400',
                      },
                      {
                        label: 'Trung bình (5.0 - 6.4)',
                        count: classStats.distribution.average,
                        color: 'bg-amber-500',
                        textColor: 'text-amber-600 dark:text-amber-400',
                      },
                      {
                        label: 'Yếu / Chưa đạt (< 5.0)',
                        count: classStats.distribution.poor,
                        color: 'bg-rose-500',
                        textColor: 'text-rose-600 dark:text-rose-400',
                      },
                    ].map((item, idx) => {
                      const totalGraded =
                        classStats.distribution.excellent +
                        classStats.distribution.good +
                        classStats.distribution.fair +
                        classStats.distribution.average +
                        classStats.distribution.poor;
                      const pct = totalGraded > 0 ? Math.round((item.count / totalGraded) * 100) : 0;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${item.textColor}`}>
                                {item.count} bài
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({pct}%)
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                              style={{ width: `${Math.max(pct, totalGraded > 0 ? 1 : 0)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Thông tin tổng hợp lớp</h4>
                  </div>


                  <div className="pt-2 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Điểm cao nhất:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {classStats.maxScore !== null ? `${classStats.maxScore}` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Điểm thấp nhất:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {classStats.minScore !== null ? `${classStats.minScore}` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Bài cần chấm:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {classStats.pendingGradingCount} bài
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">Mã lớp:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedClass?.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. FRAMELESS ASSIGNMENTS PERFORMANCE TABLE */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                      Danh sách bài tập đã giao {classStats.assignmentMetrics.length}
                    </h3>
                  </div>
                  {classStats.assignmentMetrics.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/app/documents')}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400"
                    >
                      + Giao thêm bài tập
                    </Button>
                  )}
                </div>

                {classStats.assignmentMetrics.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Lớp học này chưa có bài tập nào được giao.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push('/app/documents')}
                      className="text-xs font-bold"
                    >
                      Tạo & Giao bài tập ngay
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-2">Tên bài tập / Đề kiểm tra</th>
                          <th className="py-2.5 px-2 text-center">Thang điểm</th>
                          <th className="py-2.5 px-2 text-center">Đã nộp</th>
                          <th className="py-2.5 px-2 text-center">Tiến độ nộp</th>
                          <th className="py-2.5 px-2 text-center">ĐTB</th>
                          <th className="py-2.5 px-2 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStats.assignmentMetrics.map((asg) => (
                          <tr
                            key={asg.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {asg.title}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} />
                                  {asg.deadline
                                    ? `Hạn nộp: ${new Date(asg.deadline).toLocaleDateString('vi-VN')}`
                                    : 'Không giới hạn hạn nộp'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                              {asg.maxScore || 10}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-900 dark:text-slate-100">
                              {asg.submissionCount} / {classStats.totalStudents}
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                              {asg.completionRate}%
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400">
                              {asg.averageScore}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/app/assignments/${asg.id}`)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400"
                              >
                                Xem bài nộp
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. FRAMELESS STUDENT LEADERBOARD & INDIVIDUAL STATS */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Award size={16} className="text-amber-500" />
                      Danh sách học sinh trong lớp {classStats.studentLeaderboard.length}
                    </h3>
                  </div>

                  {classStats.studentLeaderboard.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm học sinh..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="pl-8 pr-3 py-1 bg-slate-100/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-medium outline-none w-[180px]"
                        />
                      </div>

                      <select
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value as any)}
                        className="px-2 py-1 bg-transparent text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none"
                      >
                        <option value="all">Tất cả học lực</option>
                        <option value="excellent">Xuất sắc (≥ 9.0)</option>
                        <option value="good">Giỏi (8.0 - 8.9)</option>
                        <option value="average">Khá (6.5 - 7.9)</option>
                        <option value="needs_attention">Cần cố gắng (&lt; 6.5)</option>
                      </select>
                    </div>
                  )}
                </div>

                {classStats.studentLeaderboard.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Lớp này hiện chưa có học sinh nào tham gia.</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyClassCode(selectedClass?.code || '')}
                        className="text-xs font-bold gap-1.5"
                      >
                        <Copy size={13} />
                        Sao chép mã lớp ({selectedClass?.code})
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/app/classes/${selectedClass?.id}`)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400"
                      >
                        Thêm học sinh
                      </Button>
                    </div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    Không tìm thấy học sinh phù hợp với bộ lọc tìm kiếm.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-2 w-12 text-center">Hạng</th>
                          <th className="py-2.5 px-2">Học sinh</th>
                          <th className="py-2.5 px-2 text-center">Số bài đã nộp</th>
                          <th className="py-2.5 px-2 text-center">Điểm TB</th>
                          <th className="py-2.5 px-2 text-center">Xếp loại</th>
                          <th className="py-2.5 px-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((st, idx) => (
                          <tr
                            key={st.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                          >
                            <td className="py-3 px-2 text-center">
                              {st.rawAvgScore >= 0 && idx === 0 ? (
                                <span className="font-bold text-xs">🥇</span>
                              ) : st.rawAvgScore >= 0 && idx === 1 ? (
                                <span className="font-bold text-xs">🥈</span>
                              ) : st.rawAvgScore >= 0 && idx === 2 ? (
                                <span className="font-bold text-xs">🥉</span>
                              ) : (
                                <span className="font-mono font-bold text-slate-400">
                                  #{idx + 1}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {st.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {st.email || 'Học sinh lớp'}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {st.submittedCount} / {classStats.totalAssignments}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400">
                                {st.averageScore}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs font-bold ${st.rankColor}`}>
                                {st.rankLabel}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              {classStats.totalAssignments > 0 && st.submittedCount >= classStats.totalAssignments ? (
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                  <CheckCircle2 size={13} />
                                  Đã nộp đủ
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                                  <AlertCircle size={13} />
                                  {classStats.totalAssignments > 0 ? 'Chưa đủ bài' : 'Chưa có bài'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ================= STUDENT DASHBOARD VIEW ================= */
          <div className="space-y-8">
            {/* Frameless Student KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Điểm trung bình (GPA)
                </span>
                <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {studentGpa || '--'} {studentGpa && <span className="text-xs text-slate-400 font-normal">/ 10</span>}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Bài tập đã hoàn thành
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {studentSubmissionsList.length}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Lớp học đang tham gia
                </span>
                <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                  {classes.length}
                </div>
              </div>
            </div>

            {/* Frameless Submissions List */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                Lịch sử các bài kiểm tra & bài tập đã làm
              </h3>

              {studentSubmissionsList.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-400">Bạn chưa nộp bài tập nào. Hãy vào mục Lớp học để hoàn thành bài được giao!</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/app/classes')}
                    className="text-xs font-bold"
                  >
                    Xem danh sách lớp học
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {studentSubmissionsList.map((sub: any) => (
                    <div
                      key={sub.id}
                      onClick={() => router.push(`/app/assignments/${sub.assignment?.id || sub.id}`)}
                      className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {sub.assignment?.title || 'Bài tập trắc nghiệm'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {sub.assignment?.class?.name || 'Lớp học của tôi'} • Nộp ngày{' '}
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-base text-blue-600 dark:text-blue-400">
                          {sub.score !== null && sub.score !== undefined
                            ? `${sub.score} / ${sub.assignment?.maxScore || 10}`
                            : 'Chờ chấm'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          {sub.status === 'GRADED' ? 'Đã chấm điểm' : 'Đã nộp bài'}
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
    </AppShell>
  );
}
