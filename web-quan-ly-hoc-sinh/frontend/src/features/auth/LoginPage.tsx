import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { CheckCircle2 } from 'lucide-react';
import { toast } from '../../store/toastStore';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { user, token } = response.data.data;
      login(user, token, remember);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không đúng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setValue('email', email);
    setValue('password', '123456');
  };

  return (
    <div className="min-h-screen flex bg-white font-text">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center p-12 lg:p-24 bg-[#F5F5F7]">
        <div className="max-w-[520px]">
          <h1 className="text-[40px] font-semibold leading-[44px] tracking-tight text-[#1D1D1F] font-display">
            Quản lý học sinh, sinh viên thông minh hơn.
          </h1>
          <p className="mt-5 text-[17px] leading-[25px] text-[#333336]">
            Một hệ thống web sạch, nhanh và bảo mật để quản lý học sinh, lớp học, điểm số, chuyên cần và học phí.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Quản lý học sinh tập trung',
              'Theo dõi điểm và chuyên cần',
              'Phân quyền Admin, Teacher, Student, Parent',
              'Báo cáo rõ ràng theo thời gian thực',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0071E3]" />
                <span className="text-[17px] text-[#1D1D1F]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
             <h2 className="text-2xl font-bold text-primary-blue">StudentOS</h2>
          </div>
          
          <div className="bg-white border border-[#EDEDF2] p-10">
            <h2 className="text-[28px] font-semibold leading-8 text-[#1D1D1F] font-display">Đăng nhập</h2>
            <p className="mt-2 text-[17px] leading-[25px] text-[#6E6E73]">
              Nhập tài khoản của bạn để tiếp tục.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
              {error && (
                <div className="p-3 bg-[#D70015]/5 border border-[#D70015]/20 rounded-lg text-[#D70015] text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Mật khẩu"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                error={errors.password?.message}
              />

              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="w-4 h-4 rounded border-[#D5D5D7] text-[#0071E3] focus:ring-[#0071E3]/20" />
                  <span className="text-sm text-[#333336]">Ghi nhớ đăng nhập</span>
                </label>
                <button type="button" onClick={() => toast.info('Vui lòng liên hệ quản trị viên nhà trường để đặt lại mật khẩu.')} className="text-sm font-semibold text-[#0071E3] hover:underline">Quên mật khẩu?</button>
              </div>

              <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
                Đăng nhập
              </Button>
            </form>

            {showDemoAccounts && <div className="mt-8 border-t border-[#EDEDF2] pt-8">
              <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider text-center mb-4">
                Chọn vai trò để nhập nhanh tài khoản
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'Admin', email: 'admin@school.com', bg: 'hover:bg-[#0071E3]/5 hover:border-[#0071E3]/35' },
                  { role: 'Giáo viên', email: 'teacher@school.com', bg: 'hover:bg-[#0071E3]/5 hover:border-[#0071E3]/35' },
                  { role: 'Học sinh', email: 'student@school.com', bg: 'hover:bg-[#0071E3]/5 hover:border-[#0071E3]/35' },
                  { role: 'Phụ huynh', email: 'parent@school.com', bg: 'hover:bg-[#0071E3]/5 hover:border-[#0071E3]/35' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickLogin(demo.email)}
                    className={`flex flex-col items-center justify-center p-3 border border-[#EDEDF2] rounded-xl text-center transition-all duration-150 bg-white ${demo.bg}`}
                  >
                    <span className="text-sm font-semibold text-[#1D1D1F]">{demo.role}</span>
                    <span className="text-[11px] text-[#6E6E73] mt-0.5">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
