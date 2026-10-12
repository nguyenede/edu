'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ThemeToggle } from '../../components/ThemeToggle';
import { UserPlus } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải dài ít nhất 2 ký tự'),
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  role: z.enum(['STUDENT', 'TEACHER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const loginUser = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.access_token || !result?.user) {
        throw new Error(result?.message || 'Không thể tạo tài khoản');
      }

      loginUser(result.user, result.access_token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err.message || 'Không kết nối được máy chủ đăng ký');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 bg-google-bg dark:bg-google-bg-dark font-sans">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2.5 cursor-pointer mb-2"
        >
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shadow-xs">
            <svg viewBox="0 0 24 24" width="24" height="24" className="w-full h-full" style={{ maxWidth: '24px', maxHeight: '24px' }}>
              <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
              <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
              <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
              <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
            </svg>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200">
            HocRealtime
          </span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Tạo tài khoản mới
        </h2>
        <p className="text-xs text-slate-500">
          Đăng ký để trải nghiệm hệ thống học tập và kiểm tra trực tuyến
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="p-8 bg-white dark:bg-google-card-dark rounded-3xl space-y-5 shadow-sm border border-slate-100 dark:border-slate-800">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-2xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Vai trò người dùng
              </label>
              <div className="grid grid-cols-2 gap-3 p-1 bg-google-hover dark:bg-google-hover-dark rounded-full">
                <button
                  type="button"
                  onClick={() => setValue('role', 'STUDENT')}
                  className={`py-2 text-xs font-bold rounded-full transition-all ${
                    selectedRole === 'STUDENT'
                      ? 'bg-white dark:bg-slate-800 text-google-blue shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setValue('role', 'TEACHER')}
                  className={`py-2 text-xs font-bold rounded-full transition-all ${
                    selectedRole === 'TEACHER'
                      ? 'bg-white dark:bg-slate-800 text-google-blue shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Giáo viên
                </button>
              </div>
            </div>

            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              pill
              {...register('name')}
              error={errors.name?.message}
            />

            <Input
              label="Địa chỉ Email"
              type="email"
              placeholder="ten@hoc.edu.vn"
              pill
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              pill
              {...register('password')}
              error={errors.password?.message}
            />

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="gap-2 font-bold shadow-md"
              size="lg"
            >
              <UserPlus size={18} />
              {loading ? 'Đang đăng ký...' : 'Tạo tài khoản ngay'}
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="font-bold text-google-blue hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
