import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, School, Eye, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';

interface Class {
  id: number;
  class_code: string;
  class_name: string;
  grade_level: string;
  academic_year: string;
  homeroom_teacher_name: string;
  homeroom_teacher_id?: number;
  student_count: number;
  room: string;
  max_students: number;
  status: string;
}

const emptyDraft = { class_code: '', class_name: '', grade_level: '', academic_year: '2025-2026', homeroom_teacher_id: '', room: '', max_students: '40', status: 'active' };

const ClassManagementPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const [teachers, setTeachers] = useState<{ id: number; full_name: string }[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/classes', { params: { search } });
      setClasses(response.data.data);
    } catch (error) {
      console.error('Fetch classes error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [search]);

  useEffect(() => {
    if (isAdmin) api.get('/teachers', { params: { limit: 100 } }).then((response) => setTeachers(response.data.data)).catch(() => setTeachers([]));
  }, [isAdmin]);

  const openCreate = () => { setEditingClass(null); setDraft(emptyDraft); setIsEditorOpen(true); };
  const openEdit = (schoolClass: Class) => {
    setEditingClass(schoolClass);
    setDraft({
      class_code: schoolClass.class_code, class_name: schoolClass.class_name, grade_level: schoolClass.grade_level || '',
      academic_year: schoolClass.academic_year, homeroom_teacher_id: schoolClass.homeroom_teacher_id ? String(schoolClass.homeroom_teacher_id) : '',
      room: schoolClass.room || '', max_students: String(schoolClass.max_students || 40), status: schoolClass.status
    });
    setIsEditorOpen(true);
  };
  const saveClass = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true);
    try {
      const payload = { ...draft, homeroom_teacher_id: draft.homeroom_teacher_id ? Number(draft.homeroom_teacher_id) : null, max_students: Number(draft.max_students) };
      if (editingClass) await api.put(`/classes/${editingClass.id}`, payload); else await api.post('/classes', payload);
      toast.success(editingClass ? 'Đã cập nhật lớp học.' : 'Đã tạo lớp học.'); setIsEditorOpen(false); await fetchClasses();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể lưu lớp học.');
    } finally { setIsSaving(false); }
  };
  const deleteClass = async (schoolClass: Class) => {
    const confirmed = await confirm({
      title: 'Xóa lớp học?',
      description: `Lớp ${schoolClass.class_name} sẽ bị xóa vĩnh viễn nếu chưa có dữ liệu liên quan.`,
      confirmText: 'Xóa lớp',
      variant: 'danger',
    });
    if (!confirmed) return;
    try { await api.delete(`/classes/${schoolClass.id}`); toast.success('Đã xóa lớp học.'); await fetchClasses(); }
    catch { toast.error('Không thể xóa lớp đang có dữ liệu liên quan. Hãy chuyển sang trạng thái lưu trữ.'); }
  };

  const columns = [
    {
      header: 'Mã lớp',
      accessor: 'class_code' as const,
      className: 'font-semibold w-[100px]'
    },
    {
      header: 'Tên lớp',
      accessor: (item: Class) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
            <School className="w-4 h-4 text-[#6E6E73]" />
          </div>
          <span className="font-medium">{item.class_name}</span>
        </div>
      )
    },
    { header: 'Khối', accessor: 'grade_level' as const },
    { header: 'Năm học', accessor: 'academic_year' as const },
    {
      header: 'GV Chủ nhiệm',
      accessor: (item: Class) => item.homeroom_teacher_name || 'Chưa phân công'
    },
    {
      header: 'Sĩ số',
      accessor: (item: Class) => (
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-[#6E6E73]" />
          <span>{item.student_count}/{item.max_students}</span>
        </div>
      )
    },
    {
      header: 'Trạng thái',
      accessor: (item: Class) => (
        <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
          {item.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
        </Badge>
      )
    },
    {
      header: '',
      accessor: (item: Class) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && <><button onClick={() => openEdit(item)} className="p-2 hover:bg-blue-50 rounded-full text-[#0071E3]" aria-label="Sửa lớp"><Pencil className="w-4 h-4" /></button><button onClick={() => deleteClass(item)} className="p-2 hover:bg-red-50 rounded-full text-red-600" aria-label="Xóa lớp"><Trash2 className="w-4 h-4" /></button></>}
          <button
            onClick={() => navigate(`/classes/${item.id}`)}
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
          <Input label="Tìm kiếm" withSearchIcon className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Thêm lớp</Button>}
      </div>

      <Table columns={columns} data={classes} isLoading={isLoading} />

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingClass ? 'Cập nhật lớp học' : 'Thêm lớp học'}>
        <form onSubmit={saveClass} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Mã lớp" required maxLength={30} disabled={Boolean(editingClass)} value={draft.class_code} onChange={(event) => setDraft({ ...draft, class_code: event.target.value })} /><Input label="Tên lớp" required maxLength={100} value={draft.class_name} onChange={(event) => setDraft({ ...draft, class_name: event.target.value })} /><Input label="Khối" maxLength={20} value={draft.grade_level} onChange={(event) => setDraft({ ...draft, grade_level: event.target.value })} /><Input label="Năm học" required pattern="\d{4}-\d{4}" value={draft.academic_year} onChange={(event) => setDraft({ ...draft, academic_year: event.target.value })} /><Input label="Phòng" maxLength={50} value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} /><Input label="Sĩ số tối đa" type="number" min="1" max="200" required value={draft.max_students} onChange={(event) => setDraft({ ...draft, max_students: event.target.value })} /></div>
          <Select label="Giáo viên chủ nhiệm" value={draft.homeroom_teacher_id} onChange={(event) => setDraft({ ...draft, homeroom_teacher_id: event.target.value })}><option value="">Chưa phân công</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</Select>
          <Select label="Trạng thái" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="active">Hoạt động</option><option value="inactive">Tạm dừng</option><option value="archived">Lưu trữ</option></Select>
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Lưu lớp</Button></div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default ClassManagementPage;
