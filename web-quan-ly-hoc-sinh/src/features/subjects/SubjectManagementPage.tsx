import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  description: string;
  periods_per_week: number;
  status: string;
}

const emptyDraft = { subject_code: '', subject_name: '', description: '', periods_per_week: '0', status: 'active' };

const SubjectManagementPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/subjects', { params: { search } });
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Fetch subjects error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [search]);

  const openCreate = () => { setEditingSubject(null); setDraft(emptyDraft); setIsEditorOpen(true); };
  const openEdit = (subject: Subject) => { setEditingSubject(subject); setDraft({ subject_code: subject.subject_code, subject_name: subject.subject_name, description: subject.description || '', periods_per_week: String(subject.periods_per_week || 0), status: subject.status }); setIsEditorOpen(true); };
  const saveSubject = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true);
    try {
      const payload = { ...draft, periods_per_week: Number(draft.periods_per_week) };
      if (editingSubject) await api.put(`/subjects/${editingSubject.id}`, payload); else await api.post('/subjects', payload);
      toast.success(editingSubject ? 'Đã cập nhật môn học.' : 'Đã tạo môn học.'); setIsEditorOpen(false); await fetchSubjects();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể lưu môn học.');
    } finally { setIsSaving(false); }
  };
  const deleteSubject = async (subject: Subject) => {
    const confirmed = await confirm({
      title: 'Xóa môn học?',
      description: `Môn ${subject.subject_name} sẽ bị xóa nếu chưa có dữ liệu liên quan.`,
      confirmText: 'Xóa môn học',
      variant: 'danger',
    });
    if (!confirmed) return;
    try { await api.delete(`/subjects/${subject.id}`); toast.success('Đã xóa môn học.'); await fetchSubjects(); }
    catch { toast.error('Không thể xóa môn đang có dữ liệu liên quan. Hãy chuyển sang tạm dừng.'); }
  };

  const columns = [
    {
      header: 'Mã môn',
      accessor: 'subject_code' as const,
      className: 'font-semibold w-[120px]'
    },
    {
      header: 'Tên môn học',
      accessor: (item: Subject) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-[#6E6E73]" />
          </div>
          <span className="font-medium">{item.subject_name}</span>
        </div>
      )
    },
    { header: 'Số tiết/tuần', accessor: (item: Subject) => `${item.periods_per_week} tiết` },
    {
      header: 'Mô tả',
      accessor: 'description' as const,
      className: 'text-[#6E6E73] max-w-[300px] truncate'
    },
    {
      header: 'Trạng thái',
      accessor: (item: Subject) => (
        <Badge variant={item.status === 'active' ? 'active' : 'inactive'}>
          {item.status === 'active' ? 'Đang dạy' : 'Tạm dừng'}
        </Badge>
      )
    },
    {
      header: 'Thao tác',
      accessor: (item: Subject) => <div className="flex gap-1"><button type="button" aria-label="Sửa môn học" onClick={() => openEdit(item)} className="p-2 rounded-lg text-[#0071E3] hover:bg-blue-50"><Pencil className="w-4 h-4" /></button><button type="button" aria-label="Xóa môn học" onClick={() => deleteSubject(item)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>,
      hidden: !isAdmin
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input label="Tìm kiếm" withSearchIcon className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Thêm môn học</Button>}
      </div>

      <Table columns={columns.filter((column) => !column.hidden)} data={subjects} isLoading={isLoading} />

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingSubject ? 'Cập nhật môn học' : 'Thêm môn học'}>
        <form onSubmit={saveSubject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Mã môn" required maxLength={30} disabled={Boolean(editingSubject)} value={draft.subject_code} onChange={(event) => setDraft({ ...draft, subject_code: event.target.value })} /><Input label="Tên môn học" required maxLength={100} value={draft.subject_name} onChange={(event) => setDraft({ ...draft, subject_name: event.target.value })} /></div>
          <Input label="Mô tả" maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Số tiết/tuần" type="number" min="0" max="30" value={draft.periods_per_week} onChange={(event) => setDraft({ ...draft, periods_per_week: event.target.value })} /><Select label="Trạng thái" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="active">Đang dạy</option><option value="inactive">Tạm dừng</option></Select></div>
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Lưu môn học</Button></div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default SubjectManagementPage;
