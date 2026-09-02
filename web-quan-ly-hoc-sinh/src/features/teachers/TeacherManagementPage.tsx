import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, User as UserIcon, Eye, Plus } from 'lucide-react';

interface Teacher {
  id: number;
  teacher_code: string;
  full_name: string;
  email: string;
  specialization: string;
  class_count: number;
  status: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  degree: string;
  hire_date: string;
}

const TeacherManagementPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const fetchTeachers = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await api.get('/teachers', {
        params: { page, limit: 10, search }
      });
      setTeachers(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Fetch teachers error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = [
    {
      header: 'Mã GV',
      accessor: 'teacher_code' as const,
      className: 'font-semibold w-[120px]'
    },
    {
      header: 'Giáo viên',
      accessor: (item: Teacher) => (
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5 text-[#6E6E73]" />
          </div>
          <div>
            <p className="font-semibold text-[#1D1D1F]">{item.full_name}</p>
            <p className="text-[12px] text-[#6E6E73]">{item.email}</p>
          </div>
        </div>
      ),
      className: 'min-w-[240px]'
    },
    { header: 'Chuyên môn', accessor: 'specialization' as const },
    {
      header: 'Số lớp',
      accessor: (item: Teacher) => (
        <span className="font-medium">{item.class_count} lớp</span>
      )
    },
    { header: 'Số điện thoại', accessor: 'phone' as const },
    {
      header: 'Trạng thái',
      accessor: (item: Teacher) => (
        <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
          {item.status === 'active' ? 'Đang dạy' : 'Đã nghỉ'}
        </Badge>
      )
    },
    {
      header: '',
      accessor: (item: Teacher) => (
        <div className="flex items-center justify-end">
          <button
            onClick={() => navigate(`/teachers/${item.id}`)}
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
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input label="Tìm kiếm" withSearchIcon className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => navigate('/teachers/create')} className="gap-2">
          <Plus className="w-4 h-4" /> Thêm mới
        </Button>
      </div>

      <Table columns={columns} data={teachers} isLoading={isLoading} />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-[#6E6E73]">
          Hiển thị {teachers.length} trong tổng số {pagination.total} giáo viên
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pagination.page === 1} onClick={() => fetchTeachers(pagination.page - 1)}>Trước</Button>
          <Button variant="secondary" size="sm" disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0} onClick={() => fetchTeachers(pagination.page + 1)}>Sau</Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherManagementPage;
