import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Save, GraduationCap } from 'lucide-react';
import { toast } from '../../store/toastStore';

const TeacherCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    teacher_code: '',
    full_name: '',
    email: '',
    phone: '',
    gender: 'male',
    date_of_birth: '',
    specialization: '',
    degree: 'Cử nhân',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    create_account: false,
    password: '',
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    if (!form.date_of_birth) errs.date_of_birth = 'Vui lòng chọn ngày sinh';
    if (!form.specialization.trim()) errs.specialization = 'Vui lòng nhập chuyên môn';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await api.post('/teachers', form);
      toast.success('Đã tạo hồ sơ giáo viên');
      navigate('/teachers');
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
              <GraduationCap className="w-7 h-7 text-[#0071E3]" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1D1D1F] font-display">Thêm giáo viên mới</h1>
              <p className="text-[15px] text-[#6E6E73] mt-0.5">Nhập thông tin để tạo hồ sơ giáo viên mới vào hệ thống.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div>
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Mã giáo viên"
                value={form.teacher_code}
                onChange={e => update('teacher_code', e.target.value)}
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
                value={form.date_of_birth}
                onChange={e => update('date_of_birth', e.target.value)}
                error={errors.date_of_birth}
              />
            </div>
          </div>

          <div className="border-t border-[#EDEDF2] pt-8">
            <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-4">Thông tin chuyên môn</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Chuyên môn *"
                value={form.specialization}
                onChange={e => update('specialization', e.target.value)}
                error={errors.specialization}
              />
              <Select label="Học vị" value={form.degree} onChange={e => update('degree', e.target.value)}>
                <option value="Cử nhân">Cử nhân</option>
                <option value="Thạc sĩ">Thạc sĩ</option>
                <option value="Tiến sĩ">Tiến sĩ</option>
                <option value="Giáo sư">Giáo sư</option>
              </Select>
              <Input
                label="Ngày vào làm"
                type="date"
                value={form.hire_date}
                onChange={e => update('hire_date', e.target.value)}
              />
              <Select label="Trạng thái" value={form.status} onChange={e => update('status', e.target.value)}>
                <option value="active">Đang dạy</option>
                <option value="inactive">Đã nghỉ</option>
              </Select>
            </div>
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
                <span className="block text-[15px] font-medium text-[#1D1D1F]">Tạo tài khoản cho giáo viên</span>
                <span className="block text-[13px] text-[#6E6E73] mt-0.5">Giáo viên sẽ đăng nhập bằng email ở trên.</span>
              </span>
            </label>
            {form.create_account && (
              <div className="mt-4 max-w-md">
                <Input label="Mật khẩu tạm thời *" type="password" minLength={8} maxLength={128} required value={form.password} onChange={e => update('password', e.target.value)} helperText="Tối thiểu 8 ký tự; hãy gửi mật khẩu cho giáo viên qua kênh an toàn." />
              </div>
            )}
          </div>

          <div className="border-t border-[#EDEDF2] pt-8 flex items-center justify-end gap-4">
            <Button variant="secondary" type="button" onClick={() => navigate('/teachers')}>Hủy</Button>
            <Button type="submit" isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" /> Lưu giáo viên
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherCreatePage;
