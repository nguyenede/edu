import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, Calendar, CheckCircle2, Clock, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';

interface ChildSummary {
  id: number;
  full_name: string;
  class_name?: string;
  avgGrade: number | null;
  attendanceRate: number;
  pendingPayments: number;
}

interface DashboardStats {
  students?: number;
  teachers?: number;
  classes?: number;
  scheduleItems?: number;
  pendingPayments?: number;
  avgGrade?: string;
  attendanceRate?: string;
  unreadNotifications?: number;
  gradeTrend?: ChartPoint[];
  children?: ChildSummary[];
}

interface ChartPoint { name: string; count?: number; grade?: number }
interface ScheduleItem { id: number; start_time: string; end_time: string; subject_name: string; room?: string; teacher_name?: string }
interface Activity { id: number; user_name?: string; action: string; entity_type: string; created_at: string }
interface GradeItem { id: number; subject_name: string; semester: string; average_score: number | null }

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const activityActionLabels: Record<string, string> = {
  LOGIN: 'Đăng nhập hệ thống',
  CREATE: 'Tạo',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
};
const activityEntityLabels: Record<string, string> = {
  user: 'tài khoản', student: 'học sinh', teacher: 'giáo viên', parent: 'phụ huynh',
  class: 'lớp học', subject: 'môn học', grade: 'điểm số', attendance: 'chuyên cần',
  payment: 'học phí', schedule: 'lịch học', notification: 'thông báo', document: 'tài liệu',
};
const formatSemester = (value: string) => {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return `HK ${normalized}`;
  const english = normalized.match(/^semester\s*(.+)$/i);
  return english ? `HK ${english[1]}` : normalized;
};
const formatTrendName = (value: string) => {
  const [semester, ...rest] = value.split(' • ');
  return [formatSemester(semester), ...rest].join(' • ');
};
const describeActivity = (activity: Activity) => {
  if (activity.action === 'LOGIN') return activityActionLabels.LOGIN;
  const action = activityActionLabels[activity.action] || activity.action;
  const entity = activityEntityLabels[activity.entity_type] || activity.entity_type;
  return `${action} ${entity}`;
};

const StatCard: React.FC<{ title: string; value: string | number; meta: string; icon: React.ElementType }> = ({ title, value, meta, icon: Icon }) => (
  <div className="bg-white border border-[#EDEDF2] p-5 sm:p-6 min-h-[150px] flex flex-col justify-between rounded-2xl shadow-sm">
    <div className="flex justify-between items-start gap-3">
      <span className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider">{title}</span>
      <div className="p-2 bg-[#F5F5F7] rounded-lg"><Icon className="w-5 h-5 text-[#333336]" /></div>
    </div>
    <div>
      <h3 className="text-[28px] sm:text-[32px] font-semibold leading-tight text-[#1D1D1F] font-display break-words">{value}</h3>
      <p className="text-[14px] text-[#6E6E73] mt-2">{meta}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [growthData, setGrowthData] = useState<ChartPoint[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<ScheduleItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const loadChildData = useCallback(async (studentId: number) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const [scheduleRes, gradesRes] = await Promise.all([
      api.get('/schedules', { params: { day_of_week: days[new Date().getDay()], student_id: studentId } }),
      api.get('/grades', { params: { student_id: studentId, limit: 100 } })
    ]);
    setTodaySchedules(scheduleRes.data.data);
    setGrowthData((gradesRes.data.data as GradeItem[])
      .filter((grade) => grade.average_score !== null)
      .map((grade) => ({ name: `${grade.subject_name} • ${formatSemester(grade.semester)}`, grade: Number(grade.average_score) })));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!role) return;
      setIsLoading(true);
      setError('');
      try {
        const statsRes = await api.get('/reports/dashboard');
        const nextStats = statsRes.data.data as DashboardStats;
        setStats(nextStats);

        if (isAdmin) {
          const [growthRes, activityRes] = await Promise.all([
            api.get('/reports/student-growth'),
            api.get('/audit', { params: { limit: 5 } })
          ]);
          setGrowthData(growthRes.data.data);
          setRecentActivities(activityRes.data.data);
        } else if (isStudent) {
          setGrowthData((nextStats.gradeTrend || []).map((point) => ({ ...point, name: formatTrendName(point.name) })));
        }

        if (isParent && nextStats.children?.length) {
          const firstId = nextStats.children[0].id;
          setSelectedChildId(firstId);
          await loadChildData(firstId);
        } else {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const scheduleRes = await api.get('/schedules', { params: { day_of_week: days[new Date().getDay()] } });
          setTodaySchedules(scheduleRes.data.data);
        }
      } catch (requestError) {
        console.error('Fetch dashboard data error:', requestError);
        setError('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [role, isAdmin, isStudent, isParent, loadChildData]);

  const selectedChild = useMemo(
    () => stats?.children?.find((child) => child.id === selectedChildId),
    [stats?.children, selectedChildId]
  );

  const changeChild = async (id: number) => {
    setSelectedChildId(id);
    setIsLoading(true);
    setError('');
    try { await loadChildData(id); }
    catch { setError('Không thể tải dữ liệu của học sinh đã chọn.'); }
    finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="min-h-[50vh] grid place-items-center text-sm text-[#6E6E73]">Đang tải dữ liệu tổng quan...</div>;

  return (
    <div className="min-w-0">
      {error && <div role="alert" className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {isParent && (stats?.children?.length || 0) > 1 && (
        <div className="max-w-xs mb-6">
          <Select label="Chọn học sinh" value={selectedChildId || ''} onChange={(event) => changeChild(Number(event.target.value))}>
            {stats?.children?.map((child) => <option key={child.id} value={child.id}>{child.full_name}</option>)}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {isAdmin && <>
          <StatCard title="Học sinh hoạt động" value={stats?.students || 0} meta="Tổng hồ sơ đang theo học" icon={Users} />
          <StatCard title="Giáo viên hoạt động" value={stats?.teachers || 0} meta="Tổng hồ sơ đang công tác" icon={GraduationCap} />
          <StatCard title="Lớp đang hoạt động" value={stats?.classes || 0} meta="Theo trạng thái hiện tại" icon={BookOpen} />
          <StatCard title="Công nợ học phí" value={currency.format(stats?.pendingPayments || 0)} meta="Chưa thanh toán hoặc quá hạn" icon={Wallet} />
        </>}
        {isTeacher && <>
          <StatCard title="Học sinh phụ trách" value={stats?.students || 0} meta="Trong các lớp được phân công" icon={Users} />
          <StatCard title="Lớp phụ trách" value={stats?.classes || 0} meta="Chủ nhiệm hoặc giảng dạy" icon={BookOpen} />
          <StatCard title="Tiết được phân công" value={stats?.scheduleItems || 0} meta="Trong thời khóa biểu hiện tại" icon={Calendar} />
          <StatCard title="Lịch hôm nay" value={todaySchedules.length} meta="Số tiết trong ngày" icon={Clock} />
        </>}
        {isStudent && <>
          <StatCard title="Điểm trung bình" value={stats?.avgGrade || 'N/A'} meta="Trên dữ liệu điểm hiện có" icon={TrendingUp} />
          <StatCard title="Chuyên cần" value={stats?.attendanceRate || '100%'} meta="Có mặt trên tổng số buổi" icon={CheckCircle2} />
          <StatCard title="Thông báo mới" value={stats?.unreadNotifications || 0} meta="Thông báo chưa đọc" icon={Clock} />
          <StatCard title="Công nợ học phí" value={currency.format(stats?.pendingPayments || 0)} meta="Khoản chưa hoàn thành" icon={Wallet} />
        </>}
        {isParent && <>
          <StatCard title="Điểm trung bình" value={selectedChild?.avgGrade ?? 'N/A'} meta={selectedChild?.full_name || 'Chưa liên kết học sinh'} icon={TrendingUp} />
          <StatCard title="Chuyên cần" value={`${selectedChild?.attendanceRate ?? 100}%`} meta={selectedChild?.class_name || 'Chưa xếp lớp'} icon={CheckCircle2} />
          <StatCard title="Công nợ học phí" value={currency.format(selectedChild?.pendingPayments || 0)} meta="Khoản chưa hoàn thành" icon={Wallet} />
          <StatCard title="Lịch hôm nay" value={todaySchedules.length} meta="Số tiết trong ngày" icon={Calendar} />
        </>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        <section className="xl:col-span-2 bg-white border border-[#EDEDF2] p-5 sm:p-8 rounded-2xl min-w-0">
          <h2 className="text-xl font-semibold">{isAdmin ? 'Tăng trưởng học sinh' : 'Tiến độ học tập'}</h2>
          <p className="text-sm text-[#6E6E73] mt-1">{isAdmin ? 'Hồ sơ nhập học trong 6 tháng gần nhất' : 'Điểm trung bình trên dữ liệu hiện có'}</p>
          {growthData.length ? (
            <div className="h-[280px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280} initialDimension={{ width: 1, height: 280 }}>
                <AreaChart data={growthData} margin={{ left: -20, right: 8 }}>
                  <defs><linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0071E3" stopOpacity={0.18}/><stop offset="95%" stopColor="#0071E3" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEDF2" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6E6E73', fontSize: 11 }} />
                  <YAxis domain={isAdmin ? undefined : [0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#6E6E73', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EDEDF2' }} />
                  <Area isAnimationActive={false} type="monotone" dataKey={isAdmin ? 'count' : 'grade'} stroke="#0071E3" strokeWidth={3} fill="url(#dashboardArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-[280px] mt-6 grid place-items-center rounded-xl bg-[#F5F5F7] text-sm text-[#6E6E73]">Chưa có đủ dữ liệu để hiển thị biểu đồ.</div>}
        </section>

        <section className="bg-white border border-[#EDEDF2] p-5 sm:p-8 rounded-2xl min-w-0">
          <h2 className="text-xl font-semibold">Lịch học hôm nay</h2>
          <p className="text-sm text-[#6E6E73] mt-1 mb-6 capitalize">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <div className="space-y-3 max-h-[270px] overflow-y-auto">
            {todaySchedules.length ? todaySchedules.map((lesson) => (
              <div key={lesson.id} className="p-4 bg-[#F5F5F7] rounded-xl border-l-4 border-[#0071E3]">
                <p className="text-xs font-semibold text-[#6E6E73]">{lesson.start_time.slice(0, 5)} - {lesson.end_time.slice(0, 5)}</p>
                <p className="font-semibold text-[#1D1D1F] mt-1">{lesson.subject_name}</p>
                <p className="text-xs text-[#6E6E73] mt-1">{lesson.room || 'Chưa xếp phòng'}{lesson.teacher_name ? ` • ${lesson.teacher_name}` : ''}</p>
              </div>
            )) : <div className="py-10 px-4 text-center text-sm text-[#6E6E73] bg-[#F5F5F7] rounded-xl">Chưa có lịch học hôm nay.</div>}
          </div>
          <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/schedules')}>Xem toàn bộ</Button>
        </section>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'xl:grid-cols-2' : ''} gap-5 mt-5`}>
        {isAdmin && <section className="bg-white border border-[#EDEDF2] p-5 sm:p-8 rounded-2xl">
          <h2 className="text-xl font-semibold mb-5">Hoạt động gần đây</h2>
          {recentActivities.length ? <div className="space-y-4">{recentActivities.map((activity) => (
            <div key={activity.id} className="flex gap-3"><div className="w-9 h-9 rounded-full bg-[#F5F5F7] grid place-items-center shrink-0"><span className="w-2 h-2 rounded-full bg-[#0071E3]" /></div><div><p className="text-sm text-[#1D1D1F]">{activity.user_name || 'Hệ thống'} • {describeActivity(activity)}</p><p className="text-xs text-[#6E6E73] mt-1">{new Date(activity.created_at).toLocaleString('vi-VN')}</p></div></div>
          ))}</div> : <p className="text-sm text-[#6E6E73]">Chưa có hoạt động nào.</p>}
        </section>}

        <section className="bg-white border border-[#EDEDF2] p-5 sm:p-8 rounded-2xl">
          <h2 className="text-xl font-semibold mb-5">Truy cập nhanh</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(isAdmin || isTeacher) && <button className="quick-action" onClick={() => navigate('/students')}><Users />Học sinh</button>}
            <button className="quick-action" onClick={() => navigate('/grades')}><TrendingUp />Điểm số</button>
            <button className="quick-action" onClick={() => navigate('/schedules')}><Calendar />Lịch học</button>
            {(isAdmin || isStudent || isParent) && <button className="quick-action" onClick={() => navigate('/payments')}><Wallet />Học phí</button>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
