import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Download, PieChart as PieIcon, BarChart3, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { toast } from '../../store/toastStore';

const COLORS = ['#0071E3', '#333336', '#6E6E73', '#EDEDF2', '#D70015'];

const ReportsPage: React.FC = () => {
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [gradeData, setGradeData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [growthRes, gradeRes, statsRes] = await Promise.all([
          api.get('/reports/student-growth'),
          api.get('/reports/grade-distribution'),
          api.get('/reports/dashboard')
        ]);
        setGrowthData(growthRes.data.data);
        setGradeData(gradeRes.data.data);
        setStats(statsRes.data.data);
      } catch (error) {
        console.error('Fetch report error:', error);
        setLoadError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return <div className="min-h-72 rounded-2xl border border-[#EDEDF2] bg-white grid place-items-center text-[#6E6E73]">Đang tải báo cáo...</div>;
  if (loadError) return <div role="alert" className="min-h-72 rounded-2xl border border-red-200 bg-red-50 grid place-items-center p-8 text-center"><div><p className="text-red-700">{loadError}</p><Button className="mt-4" onClick={() => window.location.reload()}>Tải lại</Button></div></div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <Button variant="secondary" className="gap-2" onClick={() => window.print()}>
          <Download className="w-4 h-4" /> In báo cáo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Chart */}
        <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-6 h-6 text-[#0071E3]" />
            <h2 className="text-[24px] font-semibold font-display">Tăng trưởng học sinh</h2>
          </div>
          <div className="h-[300px] w-full min-w-0">
            {growthData.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280} initialDimension={{ width: 1, height: 280 }}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEDF2" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6E6E73', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6E6E73', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #EDEDF2',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }} 
                />
                <Line 
                  isAnimationActive={false}
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0071E3" 
                  strokeWidth={3} 
                  dot={{ r: 6, fill: '#0071E3', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer> : <div className="h-full grid place-items-center text-sm text-[#6E6E73]">Chưa có dữ liệu tăng trưởng.</div>}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-8">
            <PieIcon className="w-6 h-6 text-[#0071E3]" />
            <h2 className="text-[24px] font-semibold font-display">Phân bổ xếp loại</h2>
          </div>
          <div className="min-h-[300px] w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            {gradeData.length ? <>
             <div className="h-[260px] sm:h-[300px] flex-1 min-w-0 w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260} initialDimension={{ width: 1, height: 260 }}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 sm:ml-4 shrink-0">
              {gradeData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-[#333336]">{item.name}: {item.value} học sinh</span>
                </div>
              ))}
            </div>
            </> : <div className="h-[300px] grid place-items-center text-sm text-[#6E6E73]">Chưa có dữ liệu xếp loại.</div>}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0071E3] text-white p-8 transition-transform hover:-translate-y-1 rounded-2xl shadow-sm">
          <p className="text-[12px] font-semibold uppercase opacity-80">Tổng học sinh</p>
          <p className="text-[34px] font-semibold mt-2">{stats?.students || 0}</p>
          <p className="text-[15px] mt-4 opacity-80">Đang theo học tại trường</p>
        </div>
        <div className="bg-white border border-[#EDEDF2] p-8 transition-transform hover:-translate-y-1 rounded-2xl shadow-sm">
          <p className="text-[12px] font-semibold text-[#6E6E73] uppercase">Tổng giáo viên</p>
          <p className="text-[34px] font-semibold text-[#1D1D1F] mt-2">{stats?.teachers || 0}</p>
          <p className="text-[15px] text-[#333336] mt-4">Đang giảng dạy</p>
        </div>
        <div className="bg-white border border-[#EDEDF2] p-8 transition-transform hover:-translate-y-1 rounded-2xl shadow-sm">
          <p className="text-[12px] font-semibold text-[#6E6E73] uppercase">Lớp học</p>
          <p className="text-[34px] font-semibold text-[#1D1D1F] mt-2">{stats?.classes || 0}</p>
          <p className="text-[15px] text-[#333336] mt-4">Lớp đang hoạt động</p>
        </div>
      </div>

      {/* AI Academic Diagnostics Hub */}
      <AiDiagnosticsHub />
    </div>
  );
};

const AiDiagnosticsHub: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get('/students', { params: { limit: 100 } });
        if (res.data && Array.isArray(res.data.data)) {
          setStudents(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedStudentId(res.data.data[0].id.toString());
          }
        }
      } catch (e) {
        console.error('Error fetching students for AI diagnostics:', e);
      }
    };
    fetchStudents();
  }, []);

  const runDiagnostic = async () => {
    if (!selectedStudentId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/students/${selectedStudentId}/si-prediction`);
      setPrediction(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Có lỗi khi tải phân tích SI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-white border border-[#EDEDF2] rounded-3xl p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F5F5F7]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071E3]/5 text-[#0071E3] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1D1D1F]">SI Academic Predictor - Chẩn đoán & Can thiệp sớm</h3>
            <p className="text-sm text-[#6E6E73] mt-0.5">Dự báo nguy cơ học thuật và đưa ra giải pháp sư phạm tự động.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Select label="Học sinh" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            {(students || []).map(s => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.student_code})</option>
            ))}
          </Select>
          <Button onClick={runDiagnostic} disabled={isLoading || !selectedStudentId}>
            {isLoading ? 'Đang phân tích...' : 'Chạy Chẩn đoán SI'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-[#6E6E73] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-[#0071E3] border-t-transparent animate-spin" />
          <span className="text-sm font-semibold">Thuật toán SI đang quét điểm số và lịch sử chuyên cần...</span>
        </div>
      ) : prediction ? (
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* KPI Analytics */}
          <div className="space-y-4">
            <h4 className="text-[12px] font-bold text-[#A1A1A6] uppercase tracking-wider">Chỉ số học thuật quét được</h4>
            
            <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
              <span className="text-sm text-[#333336]">Điểm trung bình (GPA)</span>
              <span className="font-bold text-sm text-[#1D1D1F]">{prediction.gpa !== null ? `${prediction.gpa} / 10` : 'Chưa có điểm'}</span>
            </div>

            <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
              <span className="text-sm text-[#333336]">Tỷ lệ đi học</span>
              <span className="font-bold text-sm text-[#1D1D1F]">{prediction.attendance_rate}%</span>
            </div>

            <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
              <span className="text-sm text-[#333336]">Mức độ rủi ro</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  prediction.risk_level === 'High' ? 'bg-[#D70015]' : prediction.risk_level === 'Medium' ? 'bg-orange-500' : 'bg-[#34C759]'
                }`} />
                <span className={`font-bold text-sm ${
                  prediction.risk_level === 'High' ? 'text-[#D70015]' : prediction.risk_level === 'Medium' ? 'text-orange-500' : 'text-[#34C759]'
                }`}>{prediction.risk_level_vi}</span>
              </div>
            </div>
          </div>

          {/* AI Narration Card */}
          <div className="lg:col-span-2 p-6 bg-[#0071E3]/5 rounded-3xl border border-[#0071E3]/10 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#0071E3] uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-pulse" /> SI Advisor Insight
              </span>
              <h5 className="font-bold text-base text-[#1D1D1F] mt-1">Chẩn đoán và Dự báo kết quả cuối kỳ</h5>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-[#6E6E73] uppercase mb-1">Đánh giá chung</p>
              <p className="text-sm text-[#1D1D1F] leading-relaxed font-medium">{prediction.prediction_message}</p>
            </div>

            <div className="pt-3 border-t border-[#0071E3]/10">
              <p className="text-xs font-semibold text-[#6E6E73] uppercase mb-1">Phương án Can thiệp sớm đề xuất</p>
              <p className="text-sm text-[#333336] leading-relaxed">{prediction.recommendation}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-[#6E6E73] text-sm">
          Vui lòng chọn học sinh phía trên và click **Chạy Chẩn đoán SI** để nhận kết quả phân tích.
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
