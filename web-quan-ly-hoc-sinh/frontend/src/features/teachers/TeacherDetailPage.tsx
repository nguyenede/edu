import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { BACKEND_URL } from '../../lib/api';
import {
  User as UserIcon, Mail, Phone, Calendar, BookOpen,
  GraduationCap, Star
} from 'lucide-react';

interface Teacher {
  id: number;
  teacher_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  specialization: string;
  degree: string;
  hire_date: string;
  status: string;
  avatar_url: string;
}

const TeacherDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'classes' | 'subjects'>('info');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [teacherRes, classesRes] = await Promise.all([
          api.get(`/teachers/${id}`),
          api.get('/classes', { params: { limit: 100 } }),
        ]);
        setTeacher(teacherRes.data.data);
        // Filter classes assigned to this teacher
        const teacherClasses = classesRes.data.data.filter(
          (c: any) => c.homeroom_teacher_id === parseInt(id || '0')
        );
        setClasses(teacherClasses);

        // Get subjects taught by this teacher
        const subjectsRes = await api.get('/subjects', { params: { limit: 100 } });
        setSubjects(subjectsRes.data.data || []);
      } catch (error) {
        console.error('Fetch teacher error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) return <div className="p-8 text-center">Đang tải thông tin...</div>;
  if (!teacher) return <div className="p-8 text-center">Không tìm thấy giáo viên.</div>;

  const classColumns = [
    { header: 'Mã lớp', accessor: 'class_code' as const },
    { header: 'Tên lớp', accessor: 'class_name' as const },
    {
      header: 'Sĩ số',
      accessor: (item: any) => `${item.max_students || 0} học sinh`
    },
    {
      header: 'Trạng thái',
      accessor: (item: any) => (
        <Badge variant={item.status === 'active' ? 'success' : 'inactive'}>
          {item.status === 'active' ? 'Đang hoạt động' : 'Ngừng'}
        </Badge>
      )
    },
  ];

  return (
    <div>

      <div className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 md:p-12 bg-[#F5F5F7]/50 border-b border-[#EDEDF2]">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            <div className="w-32 h-32 rounded-full bg-[#EDEDF2] overflow-hidden border-4 border-white shadow-lg shrink-0">
              {teacher.avatar_url ? (
                <img src={`${BACKEND_URL}${teacher.avatar_url}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-full h-full p-6 text-[#6E6E73]" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-[34px] font-semibold text-[#1D1D1F] font-display">{teacher.full_name}</h1>
                <Badge variant={teacher.status === 'active' ? 'success' : 'inactive'}>
                  {teacher.status === 'active' ? 'Đang dạy' : 'Nghỉ dạy'}
                </Badge>
              </div>
              <p className="text-[17px] text-[#6E6E73] mb-6 font-medium">
                {teacher.teacher_code} • {teacher.specialization || 'Chưa phân công'} • {teacher.degree || ''}
              </p>
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-[#333336]"><Mail className="w-4 h-4 text-[#0071E3]" /><span>{teacher.email || 'N/A'}</span></div>
                <div className="flex items-center gap-2 text-[#333336]"><Phone className="w-4 h-4 text-[#0071E3]" /><span>{teacher.phone || 'N/A'}</span></div>
                <div className="flex items-center gap-2 text-[#333336]"><Calendar className="w-4 h-4 text-[#0071E3]" /><span>Ngày vào: {teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('vi-VN') : 'N/A'}</span></div>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button variant="secondary" onClick={() => navigate(`/teachers/${id}/edit`)}>Chỉnh sửa</Button>
              <Button onClick={() => navigate('/notifications')}>Gửi thông báo</Button>
            </div>
          </div>
        </div>

        <div className="scrollbar-hidden flex border-b border-[#EDEDF2] px-8 overflow-x-auto">
          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: UserIcon },
            { id: 'classes', label: 'Lớp chủ nhiệm', icon: BookOpen },
            { id: 'subjects', label: 'Môn giảng dạy', icon: Star },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#0071E3] text-[#0071E3]'
                  : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Thông tin cá nhân</h3>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Ngày sinh</span><span className="font-medium">{teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString('vi-VN') : 'N/A'}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Giới tính</span><span className="font-medium capitalize">{teacher.gender === 'male' ? 'Nam' : 'Nữ'}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Học vị</span><span className="font-medium">{teacher.degree || 'N/A'}</span></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Chuyên môn</h3>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Chuyên ngành</span><span className="font-medium text-[#0071E3] font-semibold">{teacher.specialization || 'N/A'}</span></div>
                <div className="flex justify-between py-3 border-b border-[#F5F5F7]"><span className="text-[#6E6E73]">Số lớp chủ nhiệm</span><span className="font-medium">{classes.length} lớp</span></div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Lớp chủ nhiệm</h3>
              {classes.length > 0 ? (
                <Table columns={classColumns} data={classes} onRowClick={(c) => navigate(`/classes/${c.id}`)} />
              ) : (
                <div className="py-12 text-center text-[#6E6E73]">Chưa được phân công lớp chủ nhiệm.</div>
              )}
            </div>
          )}

          {activeTab === 'subjects' && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Môn giảng dạy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjects.map((s: any) => (
                  <div key={s.id} className="p-6 border border-[#EDEDF2] rounded-2xl hover:border-[#0071E3] transition-colors">
                    <BookOpen className="w-8 h-8 text-[#0071E3] mb-3" />
                    <p className="font-semibold text-[#1D1D1F]">{s.subject_name}</p>
                    <p className="text-xs text-[#6E6E73] mt-1">{s.subject_code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDetailPage;
