import React, { useEffect, useState } from 'react';
import api, { BACKEND_URL } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, User as UserIcon, Eye, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface Student {
  id: number;
  student_code: string;
  full_name: string;
  email: string;
  class_name: string;
  class_id: number;
  gender: string;
  status: string;
  phone: string;
  date_of_birth: string;
  address: string;
  admission_date: string;
  academic_year: string;
  note: string;
  avatar_url?: string;
}

const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const fetchStudents = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await api.get('/students', {
        params: { page, limit: 10, search }
      });
      setStudents(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Fetch students error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = [
    {
      header: 'Mã HS',
      accessor: 'student_code' as const,
      className: 'font-semibold w-[120px]'
    },
    {
      header: 'Học sinh',
      accessor: (item: Student) => (
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 overflow-hidden">
            {item.avatar_url ? (
              <img src={`${BACKEND_URL}${item.avatar_url}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-[#6E6E73]" />
            )}
          </div>
          <div>
            <p className="font-semibold text-[#1D1D1F]">{item.full_name}</p>
            <p className="text-[12px] text-[#6E6E73]">{item.email}</p>
          </div>
        </div>
      ),
      className: 'min-w-[240px]'
    },
    { header: 'Lớp', accessor: 'class_name' as const },
    { header: 'Ngày sinh', accessor: (item: Student) => item.date_of_birth ? item.date_of_birth.slice(0, 10).split('-').reverse().join('/') : 'Chưa cập nhật' },
    {
      header: 'Giới tính',
      accessor: (item: Student) => (
        <span className="capitalize">{item.gender === 'male' ? 'Nam' : item.gender === 'female' ? 'Nữ' : 'Khác'}</span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: (item: Student) => (
        <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
          {item.status === 'active' ? 'Đang học' : item.status === 'graduated' ? 'Đã tốt nghiệp' : item.status === 'suspended' ? 'Đình chỉ' : 'Tạm nghỉ'}
        </Badge>
      )
    },
    {
      header: '',
      accessor: (item: Student) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigate(`/students/${item.id}`)}
            className="p-2 hover:bg-black/5 rounded-full text-[#6E6E73] transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-[60px]'
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input label="Tìm tên, mã HS, email hoặc CCCD" withSearchIcon className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && <Button onClick={() => navigate('/students/create')} className="gap-2">
          <Plus className="w-4 h-4" /> Thêm mới
        </Button>}
      </div>

      <Table columns={columns} data={students} isLoading={isLoading} />

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <p className="text-sm text-[#6E6E73]">
          Hiển thị {students.length} trong tổng số {pagination.total} học sinh
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pagination.page === 1} onClick={() => fetchStudents(pagination.page - 1)}>Trước</Button>
          <Button variant="secondary" size="sm" disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0} onClick={() => fetchStudents(pagination.page + 1)}>Sau</Button>
        </div>
      </div>
    </div>
  );
};

export default StudentManagementPage;
