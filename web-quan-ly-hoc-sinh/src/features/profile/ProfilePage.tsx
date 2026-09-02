import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { User as UserIcon, Mail, Phone, Shield, LogOut, Save, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api, { BACKEND_URL } from '../../lib/api';
import { toast } from '../../store/toastStore';
import { useNavigate } from 'react-router-dom';

interface ProfileForm { full_name: string; phone: string }
interface PasswordForm { current_password: string; new_password: string; confirm_password: string }
const roleLabels: Record<string, string> = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' };

const ProfilePage: React.FC = () => {
  const { user, logout, setUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const navigate = useNavigate();

  const { register: profileReg, handleSubmit: handleProfileSubmit } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    }
  });

  const { register: passReg, handleSubmit: handlePassSubmit, reset: resetPass } = useForm<PasswordForm>();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/auth/avatar', formData);
      const newAvatarUrl = response.data.data.avatar_url;
      
      setUser({ ...user!, avatar_url: newAvatarUrl });
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const onUpdateProfile = async (data: ProfileForm) => {
    setIsUpdating(true);
    try {
      await api.put('/auth/profile', data);
      setUser({ ...user!, ...data });
      toast.success('Cập nhật hồ sơ thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsUpdating(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    if (data.new_password !== data.confirm_password) {
      toast.warning('Mật khẩu xác nhận không khớp');
      return;
    }
    setIsChangingPass(true);
    try {
      await api.post('/auth/change-password', data);
      toast.success('Đổi mật khẩu thành công!');
      resetPass();
      logout();
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-[#EDEDF2] p-8 flex flex-col items-center text-center rounded-2xl">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-6 overflow-hidden border-4 border-white shadow-sm">
                {user?.avatar_url ? (
                  <img src={`${BACKEND_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-[#6E6E73]" />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer mb-6">
                <span className="text-xs font-semibold">Thay đổi</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <h2 className="text-[24px] font-semibold font-display text-[#1D1D1F]">{user?.full_name}</h2>
            <div className="mt-2 inline-flex items-center px-3 py-1 bg-[#0071E3]/10 text-[#0071E3] rounded-full text-xs font-semibold uppercase tracking-wider">
              {user ? roleLabels[user.role] || user.role : ''}
            </div>
            
            <div className="w-full border-t border-[#EDEDF2] mt-8 pt-8 flex flex-col gap-4">
               <div className="flex items-center gap-3 text-[#333336]">
                  <Mail className="w-4 h-4 text-[#6E6E73]" />
                  <span className="text-[15px] truncate">{user?.email}</span>
               </div>
               <div className="flex items-center gap-3 text-[#333336]">
                  <Phone className="w-4 h-4 text-[#6E6E73]" />
                  <span className="text-[15px]">{user?.phone || 'Chưa cập nhật'}</span>
               </div>
               <div className="flex items-center gap-3 text-[#333336]">
                  <Shield className="w-4 h-4 text-[#6E6E73]" />
                  <span className="text-[15px]">Tài khoản đã xác minh</span>
               </div>
            </div>

            <Button 
              variant="secondary" 
              className="w-full mt-8 gap-2 text-red-500 border-red-500 hover:bg-red-50 hover:border-red-600 hover:text-red-600"
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </Button>
          </div>
        </div>

        {/* Edit Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 text-[#0071E3]" />
              <h3 className="text-[20px] font-semibold">Thông tin chi tiết</h3>
            </div>
            <form onSubmit={handleProfileSubmit(onUpdateProfile)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Họ và tên" {...profileReg('full_name')} />
                <Input label="Email (Không thể đổi)" defaultValue={user?.email} readOnly disabled className="bg-[#F5F5F7]" />
                <Input label="Số điện thoại" {...profileReg('phone')} />
              </div>
              <div className="mt-8">
                <Button type="submit" isLoading={isUpdating}>
                  <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-5 h-5 text-[#0071E3]" />
              <h3 className="text-[20px] font-semibold">Đổi mật khẩu</h3>
            </div>
            <form onSubmit={handlePassSubmit(onChangePassword)}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Mật khẩu hiện tại" type="password" {...passReg('current_password')} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Mật khẩu mới" type="password" {...passReg('new_password')} required />
                  <Input label="Xác nhận mật khẩu" type="password" {...passReg('confirm_password')} required />
                </div>
              </div>
              <div className="mt-8">
                <Button variant="secondary" type="submit" isLoading={isChangingPass}>Cập nhật mật khẩu</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
