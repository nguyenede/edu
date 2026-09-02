import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { Save, User as UserIcon } from 'lucide-react';
import { toast } from '../../store/toastStore';

interface ClassItem {
  id: number;
  class_name: string;
}

const today = new Date().toLocaleDateString('en-CA');

const StudentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    student_code: '',
    full_name: '',
    email: '',
    phone: '',
    gender: 'male',
    date_of_birth: '',
    place_of_birth: '',
    nationality: 'Việt Nam',
    ethnicity: '',
    identity_number: '',
    identity_issue_date: '',
    identity_issue_place: '',
    address: '',
    permanent_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    class_id: '',
    admission_date: today,
    previous_school: '',
    academic_year: '2025-2026',
    status: 'active',
    note: '',
    create_account: false,
    password: '',
  });

  useEffect(() => {
    api.get('/classes', { params: { limit: 100 } }).then(res => {
      setClasses(res.data.data);
      if (res.data.data.length > 0) {
        setForm(prev => ({ ...prev, class_id: res.data.data[0].id.toString() }));
      }
    }).catch(() => toast.error('Không thể tải danh sách lớp học.'));
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    if (!form.date_of_birth) errs.date_of_birth = 'Vui lòng chọn ngày sinh';
    if (!form.class_id) errs.class_id = 'Vui lòng chọn lớp';
    if (!/^\d{4}-\d{4}$/.test(form.academic_year) || Number(form.academic_year.slice(5)) !== Number(form.academic_year.slice(0, 4)) + 1) errs.academic_year = 'Năm học phải có dạng 2026-2027';
    if ((form.identity_issue_date || form.identity_issue_place.trim()) && !form.identity_number.trim()) errs.identity_number = 'Cần nhập số giấy tờ';
    if (Boolean(form.emergency_contact_name.trim()) !== Boolean(form.emergency_contact_phone.trim())) {
      errs.emergency_contact = 'Vui lòng nhập đủ người và số điện thoại liên hệ khẩn cấp';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = { ...form, class_id: parseInt(form.class_id) };
      await api.post('/students', payload);
      toast.success('Đã tạo hồ sơ học sinh');
      navigate('/students');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div>

      <div className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 md:p-10 bg-[#F5F5F7]/50 border-b border-[#EDEDF2]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 flex items-center justify-center">
              <UserIcon className="w-7 h-7 text-[#0071E3]" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1D1D1F] font-display">Thêm học sinh mới</h1>
              <p className="text-[15px] text-[#6E6E73] mt-0.5">Nhập thông tin để tạo hồ sơ học sinh mới vào hệ thống.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div>
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Mã học sinh"
                value={form.student_code}
                onChange={e => update('student_code', e.target.value)}
                helperText="Để trống để hệ thống tự sinh mã"
              />
              <Input
                label="Họ và tên *"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
                error={errors.full_name}
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                error={errors.email}
              />
              <Input
                label="Số điện thoại"
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
              />
              <Select label="Giới tính" value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </Select>
              <Input
                label="Ngày sinh *"
                type="date"
                max={today}
                value={form.date_of_birth}
                onChange={e => update('date_of_birth', e.target.value)}
                error={errors.date_of_birth}
              />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Thông tin nhân thân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nơi sinh" maxLength={255} value={form.place_of_birth} onChange={e => update('place_of_birth', e.target.value)} />
              <Input label="Quốc tịch" maxLength={100} value={form.nationality} onChange={e => update('nationality', e.target.value)} />
              <Input label="Dân tộc" maxLength={100} value={form.ethnicity} onChange={e => update('ethnicity', e.target.value)} />
              <Input label="Số CCCD/Hộ chiếu" minLength={6} maxLength={20} value={form.identity_number} onChange={e => update('identity_number', e.target.value.replace(/\s/g, ''))} error={errors.identity_number} />
              <Input label="Ngày cấp" type="date" min={form.date_of_birth || undefined} max={today} value={form.identity_issue_date} onChange={e => update('identity_issue_date', e.target.value)} />
              <Input label="Nơi cấp" maxLength={255} value={form.identity_issue_place} onChange={e => update('identity_issue_place', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Thông tin học tập</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select label="Lớp học *" value={form.class_id} onChange={e => update('class_id', e.target.value)} error={errors.class_id}>
                <option value="">-- Chọn lớp --</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                ))}
              </Select>
              <Input
                label="Năm học *"
                value={form.academic_year}
                onChange={e => update('academic_year', e.target.value)}
                error={errors.academic_year}
              />
              <Input
                label="Ngày nhập học"
                type="date"
                max={today}
                value={form.admission_date}
                onChange={e => update('admission_date', e.target.value)}
              />
              <Select label="Trạng thái" value={form.status} onChange={e => update('status', e.target.value)}>
                <option value="active">Đang học</option>
                <option value="inactive">Tạm nghỉ</option>
                <option value="graduated">Đã tốt nghiệp</option>
                <option value="suspended">Đình chỉ</option>
              </Select>
              <Input label="Trường học trước đây" maxLength={255} value={form.previous_school} onChange={e => update('previous_school', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Địa chỉ & liên hệ khẩn cấp</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea label="Địa chỉ hiện tại" maxLength={1000} value={form.address} onChange={e => update('address', e.target.value)} />
              <Textarea label="Địa chỉ thường trú" maxLength={1000} value={form.permanent_address} onChange={e => update('permanent_address', e.target.value)} />
              <Input label="Người liên hệ khẩn cấp" maxLength={100} value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} error={errors.emergency_contact} />
              <Input label="SĐT liên hệ khẩn cấp" type="tel" maxLength={20} value={form.emergency_contact_phone} onChange={e => update('emergency_contact_phone', e.target.value)} error={errors.emergency_contact} />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Ghi chú hồ sơ</h3>
            <Textarea label="Ghi chú" maxLength={2000} value={form.note} onChange={e => update('note', e.target.value)} />
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Tài khoản đăng nhập</h3>
            <label className="flex items-start gap-3 cursor-pointer max-w-xl">
              <input
                type="checkbox"
                checked={form.create_account}
                onChange={(event) => setForm(prev => ({ ...prev, create_account: event.target.checked, password: event.target.checked ? prev.password : '' }))}
                className="mt-1 h-4 w-4 rounded border-[#D2D2D7] text-[#0071E3] focus:ring-[#0071E3]"
              />
              <span>
                <span className="block text-[15px] font-medium text-[#1D1D1F]">Tạo tài khoản cho học sinh</span>
                <span className="block text-[13px] text-[#6E6E73] mt-0.5">Học sinh sẽ đăng nhập bằng email ở trên.</span>
              </span>
            </label>
            {form.create_account && (
              <div className="mt-4 max-w-md">
                <Input label="Mật khẩu tạm thời *" type="password" minLength={8} maxLength={128} required value={form.password} onChange={e => update('password', e.target.value)} helperText="Tối thiểu 8 ký tự; hãy gửi mật khẩu cho học sinh qua kênh an toàn." />
              </div>
            )}
          </div>

          <div className="border-t border-[#EDEDF2] pt-8 flex items-center justify-end gap-4">
            <Button variant="secondary" type="button" onClick={() => navigate('/students')}>Hủy</Button>
            <Button type="submit" isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" /> Lưu học sinh
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentCreatePage;
