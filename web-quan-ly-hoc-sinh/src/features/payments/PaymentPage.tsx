import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';
import { Wallet, CheckCircle2, AlertCircle, Search, Plus } from 'lucide-react';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';

interface Payment {
  id: number;
  invoice_code: string;
  student_name: string;
  student_code: string;
  class_name: string;
  payment_type: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  due_date: string;
  paid_date?: string;
  description: string;
}

const PaymentPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [students, setStudents] = useState<{ id: number; full_name: string; student_code: string }[]>([]);
  const [draft, setDraft] = useState({ student_id: '', payment_type: 'tuition', amount: '', due_date: '', description: '' });
  const { confirm, confirmDialog } = useConfirmDialog();

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/payments', { params: { status: selectedStatus, search, limit: 100 } });
      setPayments(response.data.data);
    } catch (error) {
      console.error('Fetch payments error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedStatus, search]);

  useEffect(() => {
    if (isAdmin) api.get('/students', { params: { limit: 100 } }).then((response) => setStudents(response.data.data)).catch(() => setStudents([]));
  }, [isAdmin]);

  const markPaid = async (payment: Payment) => {
    const confirmed = await confirm({
      title: 'Xác nhận thu học phí?',
      description: `Ghi nhận đã thu ${formatCurrency(payment.amount)} từ ${payment.student_name}.`,
      confirmText: 'Xác nhận đã thu',
      variant: 'primary',
    });
    if (!confirmed) return;
    try {
      await api.put(`/payments/${payment.id}/pay`);
      toast.success('Đã xác nhận thanh toán.');
      await fetchPayments();
    } catch { toast.error('Không thể cập nhật thanh toán.'); }
  };

  const createPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/payments', { ...draft, student_id: Number(draft.student_id), amount: Number(draft.amount) });
      toast.success('Đã tạo khoản thu.');
      setDraft({ student_id: '', payment_type: 'tuition', amount: '', due_date: '', description: '' });
      setIsCreateOpen(false);
      await fetchPayments();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể tạo khoản thu.');
    } finally { setIsSaving(false); }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const paymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tuition: 'Học phí', insurance: 'Bảo hiểm', service: 'Phí dịch vụ',
      uniform: 'Đồng phục', books: 'Sách vở', meal: 'Tiền ăn', other: 'Khác',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return <Badge variant="success">Đã thanh toán</Badge>;
      case 'unpaid': return <Badge variant="warning">Chưa thanh toán</Badge>;
      case 'overdue': return <Badge variant="error">Quá hạn</Badge>;
      default: return null;
    }
  };

  const columns = [
    { header: 'Mã hóa đơn', accessor: (item: Payment) => <span className="font-mono text-xs font-bold text-[#0071E3]">{item.invoice_code}</span> },
    {
      header: 'Học sinh',
      accessor: (item: Payment) => (
        <div className="flex flex-col">
          <span className="font-semibold">{item.student_name}</span>
          <span className="text-[10px] text-[#6E6E73]">{item.student_code}</span>
        </div>
      )
    },
    { header: 'Loại phí', accessor: (item: Payment) => paymentTypeLabel(item.payment_type) },
    { header: 'Số tiền', accessor: (item: Payment) => <span className="font-bold text-[#1D1D1F]">{formatCurrency(item.amount)}</span> },
    { header: 'Hạn thanh toán', accessor: (item: Payment) => new Date(item.due_date).toLocaleDateString('vi-VN') },
    { header: 'Trạng thái', accessor: (item: Payment) => getStatusBadge(item.status) },
    {
      header: 'Thao tác',
      accessor: (item: Payment) => item.status !== 'paid' ? <Button size="sm" onClick={() => markPaid(item)}>Xác nhận thu</Button> : <span className="text-xs text-[#6E6E73]">Hoàn tất</span>,
      hidden: !isAdmin
    }
  ];

  const totalUnpaid = payments.filter(p => p.status === 'unpaid' || p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl flex items-center gap-6">
          <div className="w-14 h-14 bg-[#0071E3]/10 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-[#0071E3]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Tổng nợ hiện tại</p>
            <p className="text-2xl font-bold text-[#D70015]">{formatCurrency(totalUnpaid)}</p>
          </div>
        </div>
        <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl flex items-center gap-6">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Đã thanh toán (Tháng)</p>
            <p className="text-2xl font-bold text-[#1D1D1F]">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
        <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">Hóa đơn quá hạn</p>
            <p className="text-2xl font-bold text-[#1D1D1F]">{overdueCount.toString().padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div className="mb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
              <Input label="Tìm kiếm hóa đơn/học sinh" withSearchIcon className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select label="Trạng thái" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="overdue">Quá hạn</option>
            </Select>
          </div>
          {isAdmin && <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Tạo khoản thu</Button>}
        </div>
        <Table columns={columns.filter((column) => !column.hidden)} data={payments} isLoading={isLoading} />
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tạo khoản thu mới">
        <form onSubmit={createPayment} className="space-y-4">
          <Select label="Học sinh" required value={draft.student_id} onChange={(event) => setDraft({ ...draft, student_id: event.target.value })}><option value="">Chọn học sinh</option>{students.map((student) => <option key={student.id} value={student.id}>{student.full_name} • {student.student_code}</option>)}</Select>
          <Select label="Loại khoản thu" value={draft.payment_type} onChange={(event) => setDraft({ ...draft, payment_type: event.target.value })}>{Object.entries({ tuition: 'Học phí', insurance: 'Bảo hiểm', service: 'Phí dịch vụ', uniform: 'Đồng phục', books: 'Sách vở', meal: 'Tiền ăn', other: 'Khác' }).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Số tiền (VND)" type="number" min="1" required value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /><Input label="Hạn thanh toán" type="date" required value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} /></div>
          <Input label="Mô tả" maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Tạo khoản thu</Button></div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default PaymentPage;
