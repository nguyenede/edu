import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import {
  BookOpen, Users, Calendar, ClipboardCheck,
  Info, Clock, DoorOpen
} from 'lucide-react';

interface ClassItem {
  id: number;
  class_code: string;
  class_name: string;
  grade_level: string;
  academic_year: string;
  homeroom_teacher_id: number;
  room: string;
  max_students: number;
  status: string;
}

const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'grades' | 'attendance' | 'schedule'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [classRes, studentsRes, gradesRes, attendanceRes, schedulesRes] = await Promise.all([
          api.get(`/classes/${id}`),
          api.get('/students', { params: { class_id: id, limit: 100 } }),
          api.get('/grades', { params: { class_id: id } }),
          api.get('/attendance', { params: { class_id: id, limit: 50 } }),
          api.get('/schedules', { params: { class_id: id } }),
        ]);
        setClassItem(classRes.data.data);
        setStudents(studentsRes.data.data);
        setGrades(gradesRes.data.data);
        setAttendance(attendanceRes.data.data);
        setSchedules(schedulesRes.data.data);
      } catch (error) {
        console.error('Fetch class detail error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
  if (!classItem) return <div className="p-8 text-center">Không tìm thấy lớp học.</div>;

  const studentColumns = [
    { header: 'Mã HS', accessor: 'student_code' as const, className: 'font-semibold' },
    { header: 'Họ và tên', accessor: 'full_name' as const },
    { header: 'Email', accessor: 'email' as const },
    {
      header: 'Trạng thái',
      accessor: (item: any) => (
        <Badge variant={item.status === 'active' ? 'success' : 'inactive'}>
          {item.status === 'active' ? 'Đang học' : 'Nghỉ học'}
        </Badge>
      )
    },
  ];

  const gradeColumns = [
    { header: 'Học sinh', accessor: 'student_name' as const },
    { header: 'Môn', accessor: 'subject_name' as const },
    { header: 'TB', accessor: (item: any) => <span className="font-bold text-[#0071E3]">{item.average_score || '-'}</span> },
    { header: 'Xếp loại', accessor: (item: any) => <Badge variant={item.grade_letter === 'A' ? 'success' : 'warning'}>{item.grade_letter || '-'}</Badge> },
  ];

  const attendanceColumns = [
    { header: 'Học sinh', accessor: 'student_name' as const },
    { header: 'Ngày', accessor: (item: any) => new Date(item.date).toLocaleDateString('vi-VN') },
    { header: 'Trạng thái', accessor: (item: any) => (
      <Badge variant={item.status === 'present' ? 'success' : item.status === 'absent' ? 'error' : 'warning'}>
        {item.status === 'present' ? 'Có mặt' : item.status === 'absent' ? 'Vắng' : item.status === 'late' ? 'Muộn' : 'Có phép'}
      </Badge>
    )},
  ];

  return (
    <div>

      <div className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 md:p-12 bg-[#F5F5F7]/50 border-b border-[#EDEDF2]">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="w-20 h-20 rounded-2xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-10 h-10 text-[#0071E3]" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-[34px] font-semibold text-[#1D1D1F] font-display">{classItem.class_name}</h1>
                <Badge variant={classItem.status === 'active' ? 'success' : 'inactive'}>
                  {classItem.status === 'active' ? 'Đang hoạt động' : 'Ngừng'}
                </Badge>
              </div>
              <p className="text-[17px] text-[#6E6E73] mb-4">{classItem.class_code} • Khối {classItem.grade_level} • Năm học {classItem.academic_year}</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-[#333336]">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-[#0071E3]" /> {students.length}/{classItem.max_students} học sinh</span>
                <span className="flex items-center gap-1.5"><DoorOpen className="w-4 h-4 text-[#0071E3]" /> {classItem.room || 'Chưa có'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="scrollbar-hidden flex border-b border-[#EDEDF2] px-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Tổng quan', icon: Info },
            { id: 'students', label: 'Học sinh', icon: Users },
            { id: 'grades', label: 'Điểm số', icon: ClipboardCheck },
            { id: 'attendance', label: 'Chuyên cần', icon: Calendar },
            { id: 'schedule', label: 'Thời khóa biểu', icon: Clock },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-[#0071E3] text-[#0071E3]' : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            ><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Thông tin lớp</h3>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Mã lớp</span><span className="font-medium">{classItem.class_code}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Khối</span><span className="font-medium">{classItem.grade_level}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Năm học</span><span className="font-medium">{classItem.academic_year}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Phòng học</span><span className="font-medium">{classItem.room || 'N/A'}</span></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Thống kê</h3>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Sĩ số hiện tại</span><span className="font-medium text-[#0071E3] font-semibold">{students.length} / {classItem.max_students}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Số môn học</span><span className="font-medium">8 môn</span></div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <Table columns={studentColumns} data={students} onRowClick={(s) => navigate(`/students/${s.id}`)} />
          )}

          {activeTab === 'grades' && (
            <Table columns={gradeColumns} data={grades} emptyMessage="Chưa có điểm số cho lớp này." />
          )}

          {activeTab === 'attendance' && (
            <Table columns={attendanceColumns} data={attendance} emptyMessage="Chưa có dữ liệu điểm danh." />
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {schedules.length > 0 ? schedules.map((s: any, i: number) => (
                <div key={i} className="p-4 border border-[#EDEDF2] rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-[#1D1D1F]">{s.subject_name}</p>
                    <p className="text-sm text-[#6E6E73]">{s.teacher_name} • {s.room}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#0071E3]">{s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}</p>
                    <p className="text-xs text-[#6E6E73] capitalize">{s.day_of_week}</p>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-[#6E6E73]">Chưa có thời khóa biểu cho lớp này.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetailPage;
