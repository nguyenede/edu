import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import { Search, User as UserIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';

interface Parent {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  relationship: string;
  address: string;
}

const emptyDraft = { full_name: '', email: '', phone: '', relationship: 'guardian', address: '', create_account: false, password: '' };

const ParentManagementPage: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/parents', { params: { search, limit: 50 } });
      setParents(res.data.data);
    } catch (error) {
      console.error('Fetch parents error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchParents(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const relationshipLabel = (rel: string) => {
    const labels: Record<string, string> = { father: 'Cha', mother: 'Mẹ', guardian: 'Người giám hộ', other: 'Khác' };
    return labels[rel] || rel;
  };

  const openCreate = () => { setEditingParent(null); setDraft(emptyDraft); setIsEditorOpen(true); };
  const openEdit = (parent: Parent) => { setEditingParent(parent); setDraft({ full_name: parent.full_name, email: parent.email || '', phone: parent.phone || '', relationship: parent.relationship || 'guardian', address: parent.address || '', create_account: false, password: '' }); setIsEditorOpen(true); };
  const saveParent = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true);
    try {
      if (editingParent) await api.put(`/parents/${editingParent.id}`, draft); else await api.post('/parents', draft);
      toast.success(editingParent ? 'Đã cập nhật phụ huynh.' : 'Đã thêm phụ huynh.'); setIsEditorOpen(false); await fetchParents();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể lưu phụ huynh.');
    } finally { setIsSaving(false); }
  };
  const deleteParent = async (parent: Parent) => {
    const confirmed = await confirm({
      title: 'Xóa hồ sơ phụ huynh?',
      description: `Hồ sơ của ${parent.full_name} sẽ bị xóa nếu không còn liên kết hoặc dữ liệu phụ thuộc.`,
      confirmText: 'Xóa hồ sơ',
      variant: 'danger',
    });
    if (!confirmed) return;
    try { await api.delete(`/parents/${parent.id}`); toast.success('Đã xóa phụ huynh.'); await fetchParents(); }
    catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể xóa phụ huynh.');
    }
  };

  const columns = [
    {
      header: 'Phụ huynh',
      accessor: (item: Parent) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-[#6E6E73]" />
          </div>
          <div>
            <p className="font-semibold text-[#1D1D1F]">{item.full_name}</p>
            <p className="text-[12px] text-[#6E6E73]">{item.email || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    { header: 'SĐT', accessor: 'phone' as const },
    {
      header: 'Quan hệ',
      accessor: (item: Parent) => relationshipLabel(item.relationship),
    },
    { header: 'Địa chỉ', accessor: (item: Parent) => item.address || 'N/A' },
    { header: 'Thao tác', accessor: (item: Parent) => <div className="flex gap-1"><button type="button" aria-label="Sửa phụ huynh" onClick={() => openEdit(item)} className="p-2 rounded-lg text-[#0071E3] hover:bg-blue-50"><Pencil className="w-4 h-4" /></button><button type="button" aria-label="Xóa phụ huynh" onClick={() => deleteParent(item)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button></div> },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input label="Tìm kiếm" withSearchIcon className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Thêm phụ huynh</Button>
      </div>

      <Table columns={columns} data={parents} isLoading={isLoading} />

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingParent ? 'Cập nhật phụ huynh' : 'Thêm phụ huynh'}>
        <form onSubmit={saveParent} className="space-y-4">
          <Input label="Họ và tên" required minLength={2} maxLength={100} value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Email" type="email" maxLength={120} value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /><Input label="Số điện thoại" type="tel" maxLength={20} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></div>
          <Select label="Quan hệ với học sinh" value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })}><option value="father">Cha</option><option value="mother">Mẹ</option><option value="guardian">Người giám hộ</option><option value="other">Khác</option></Select>
          <Input label="Địa chỉ" maxLength={1000} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
          {!editingParent && <div className="rounded-2xl bg-[#F5F5F7] p-4 space-y-4"><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={draft.create_account} onChange={(event) => setDraft({ ...draft, create_account: event.target.checked, password: event.target.checked ? draft.password : '' })} className="mt-1 h-4 w-4 rounded border-[#D2D2D7] text-[#0071E3] focus:ring-[#0071E3]" /><span><span className="block text-sm font-medium text-[#1D1D1F]">Tạo tài khoản đăng nhập</span><span className="block text-xs text-[#6E6E73] mt-0.5">Phụ huynh sẽ đăng nhập bằng email ở trên.</span></span></label>{draft.create_account && <Input label="Mật khẩu tạm thời" type="password" required minLength={8} maxLength={128} value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} helperText="Tối thiểu 8 ký tự." />}</div>}
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Lưu phụ huynh</Button></div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default ParentManagementPage;
