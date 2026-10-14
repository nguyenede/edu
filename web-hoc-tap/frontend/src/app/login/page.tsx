'use client';

import React, { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LogIn, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || searchParams?.get('next') || '/dashboard';
  const loginUser = useAuthStore((state) => state.login);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleDemoLogin = (email: string, role: 'ADMIN' | 'TEACHER' | 'STUDENT', name: string) => {
    loginUser(
      {
        id: `demo-${role.toLowerCase()}`,
        email,
        role,
        name,
      },
      'demo-token-session',
    );
    router.push(redirectUrl);
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.access_token || !result?.user) {
        throw new Error(result?.message || 'Email hoặc mật khẩu không đúng');
      }

      loginUser(result.user, result.access_token);
      router.push(redirectUrl);
    } catch (err: any) {
      // Backend offline fallback: auto-login demo mode
      if (err.message?.includes('fetch') || err.message?.includes('Failed') || err.message?.includes('NetworkError')) {
        let role: 'ADMIN' | 'TEACHER' | 'STUDENT' = 'STUDENT';
        let name = 'Em Nguyễn Văn Học';
        const emailLower = data.email.toLowerCase();
        if (emailLower.includes('admin')) {
          role = 'ADMIN';
          name = 'Quản Trị Viên Kiyo';
        } else if (emailLower.includes('teacher')) {
          role = 'TEACHER';
          name = 'Thầy Nguyễn Văn Giáo';
        }
        handleDemoLogin(data.email, role, name);
        return;
      }
      setErrorMsg(err.message || 'Không kết nối được máy chủ đăng nhập');
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
          Đăng nhập vào hệ thống
        </h2>
        <p className="text-xs text-slate-500">
          Truy cập lớp học, bài tập và kho đề trắc nghiệm của bạn
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
              <LogIn size={18} />
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </Button>
          </form>

          {/* Quick Demo Login Buttons */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-500 mb-2.5 text-center">Hoặc đăng nhập nhanh bằng tài khoản Demo:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@kiyovn.com', 'ADMIN', 'Quản Trị Viên Kiyo')}
                className="py-2 px-1 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition border border-purple-200 dark:border-purple-800 text-center"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('teacher@kiyovn.com', 'TEACHER', 'Thầy Nguyễn Văn Giáo')}
                className="py-2 px-1 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition border border-blue-200 dark:border-blue-800 text-center"
              >
                👨‍🏫 Giáo viên
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('student@kiyovn.com', 'STUDENT', 'Em Nguyễn Văn Học')}
                className="py-2 px-1 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800 text-center"
              >
                🎓 Học sinh
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            Chưa có tài khoản?{' '}
            <Link
              href={redirectUrl !== '/dashboard' ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
              className="font-bold text-google-blue hover:underline"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-google-bg dark:bg-google-bg-dark">
          <Loader2 className="animate-spin text-google-blue" size={32} />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
