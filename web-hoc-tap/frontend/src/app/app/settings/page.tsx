'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import {
  User,
  Lock,
  Check,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Mail,
  Globe,
  Laptop,
  ShieldAlert,
  Camera,
  Home,
  Key,
  Database,
  Crown,
  Sparkles,
  Zap,
  HardDrive,
  Download,
  Trash2,
  Ruler,
  LayoutDashboard,
} from 'lucide-react';

export type SettingsTabType =
  | 'overview'
  | 'account'
  | 'security'
  | 'password'
  | 'unit'
  | 'data_privacy'
  | 'pro_plan';

export default function SettingsPage(props: any) {
  const initialTab: SettingsTabType = props?.initialTab || 'overview';
  const router = useRouter();
  const { user, initialize } = useAuthStore();

  // Navigation Tab State: 'overview' | 'account' | 'security' | 'password' | 'unit' | 'data_privacy' | 'pro_plan'
  const [activeTab, setActiveTab] = useState<SettingsTabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Helper: switch tab and navigate to sub-URL
  const switchTab = (tab: SettingsTabType) => {
    const scrollEl = document.querySelector('main');
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'instant' });
    setActiveTab(tab);

    const urlMap: Record<SettingsTabType, string> = {
      overview: '/app/settings/overview',
      account: '/app/settings/account',
      security: '/app/settings/security',
      password: '/app/settings/password',
      unit: '/app/settings/units',
      data_privacy: '/app/settings/privacy',
      pro_plan: '/app/settings/pro',
    };
    router.push(urlMap[tab]);
  };

  // Personal Info State
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || 'Chưa đặt');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || 'Chưa đặt');
  const [birthday, setBirthday] = useState(user?.birthday || 'Chưa đặt');
  const [language, setLanguage] = useState(user?.language || 'Tiếng Việt (Việt Nam)');
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress || 'Chưa đặt');
  const [workAddress, setWorkAddress] = useState(user?.workAddress || 'Chưa đặt');

  // Security State
  const [passkeysCount] = useState(3);
  const [skipPasswordEnabled, setSkipPasswordEnabled] = useState(true);
  const [recoveryPhone] = useState('0369 575 506');
  const [recoveryEmail] = useState('sonnguyendaison340@gmail.com');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Active Edit Modal State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
    setGender(user?.gender || 'Chưa đặt');
    setPhone(user?.phone || 'Chưa đặt');
    setBirthday(user?.birthday || 'Chưa đặt');
    setLanguage(user?.language || 'Tiếng Việt (Việt Nam)');
    setHomeAddress(user?.homeAddress || 'Chưa đặt');
    setWorkAddress(user?.workAddress || 'Chưa đặt');
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <AppShell>
      {/* Global Success Toast (Fixed position outside space/layout containers) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce pointer-events-none">
          <Check size={16} className="text-google-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {!user ? (
        <div className="flex items-center justify-center p-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
        </div>
      ) : (
        <div className="w-full pb-12">

          {/* FULL HEIGHT TWO-COLUMN LAYOUT: Left pinned, Right scrolls */}
          <div className="flex flex-col md:flex-row gap-0 items-start w-full min-h-full">
            {/* LEFT SUB-NAVIGATION TABS - sticky top-0 so it stays when scrolling */}
            <div className="w-full md:w-56 shrink-0 flex flex-row md:flex-col gap-1 pt-0 pl-0 pr-1 pb-2 md:pb-0 sticky top-0 self-start">
              {/* 1. Tổng quan (Renamed from Trang chủ) */}
              <button
                onClick={() => switchTab('overview')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'overview'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <LayoutDashboard
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'overview'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Tổng quan</span>
              </button>

              {/* 2. Tài khoản */}
              <button
                onClick={() => switchTab('account')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'account'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <User
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'account'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Tài khoản</span>
              </button>

              {/* 3. Bảo mật */}
              <button
                onClick={() => switchTab('security')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'security'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Lock
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'security'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Bảo mật</span>
              </button>

              {/* 4. Đổi mật khẩu */}
              <button
                onClick={() => switchTab('password')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'password'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Key
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'password'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Đổi mật khẩu</span>
              </button>

              {/* 5. Đơn vị đo (Measurement Units with Ruler icon) */}
              <button
                onClick={() => switchTab('unit')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'unit'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Ruler
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'unit'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Đơn vị đo</span>
              </button>

              {/* 6. Dữ liệu và quyền riêng tư */}
              <button
                onClick={() => switchTab('data_privacy')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'data_privacy'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Database
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'data_privacy'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium whitespace-nowrap">
                  Dữ liệu & quyền riêng tư
                </span>
              </button>

              {/* 7. Gói Pro */}
              <button
                onClick={() => switchTab('pro_plan')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'pro_plan'
                    ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-600 font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Crown
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'pro_plan'
                      ? 'text-amber-500'
                      : 'text-amber-500 group-hover:text-amber-600'
                  }`}
                />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Gói Pro
                </span>
              </button>
            </div>

            {/* RIGHT MAIN CONTENT BODY AREA */}
            <div className="flex-1 w-full pl-0 md:pl-6 pt-2 md:pt-0">
              {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <LayoutDashboard size={20} className="text-google-blue" />
                        Tổng quan cài đặt hệ thống
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tóm tắt thông tin tài khoản, mức độ bảo mật và các thiết lập hiện tại
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Info Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User size={20} className="text-google-blue" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Thông tin cá nhân</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('account')}>
                            Chi tiết
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">Họ và tên: {name}</p>
                          <p className="text-slate-500">Email: {email}</p>
                          <p className="text-slate-500">Số điện thoại: {phone}</p>
                        </div>
                      </div>

                      {/* Security Status Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Lock size={20} className="text-google-green" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Trạng thái bảo mật</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('security')}>
                            Quản lý
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-emerald-600 font-medium flex items-center gap-1">
                            <Check size={14} /> Xác minh 2 bước đang bật
                          </p>
                          <p className="text-slate-500">Khóa truy cập: {passkeysCount} thiết bị</p>
                          <p className="text-slate-500">Thiết bị hoạt động: 5 phiên Windows, 3 Android</p>
                        </div>
                      </div>

                      {/* Measurement Units Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Ruler size={20} className="text-google-yellow" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Đơn vị đo lường</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('unit')}>
                            Cấu hình
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">Hệ độ dài: Mét / Kilômét (SI)</p>
                          <p className="text-slate-500">Nhiệt độ: Độ C (°C)</p>
                          <p className="text-slate-500">Thời gian: 24h (GMT+7)</p>
                        </div>
                      </div>

                      {/* Pro Plan Summary */}
                      <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Crown size={20} className="text-amber-500" />
                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Hội viên Pro</span>
                          </div>
                          <Button size="sm" onClick={() => switchTab('pro_plan')}>
                            Nâng cấp
                          </Button>
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Truy cập không giới hạn Ngân hàng câu hỏi, Đề thi Realtime AI & Tính năng lưu trữ không giới hạn.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 2: TÀI KHOẢN (ACCOUNT) */}
              {activeTab === 'account' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <User size={20} className="text-google-blue" />
                        Thông tin cá nhân
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Thông tin cơ bản về bạn và tài khoản sử dụng trên hệ thống HocRealtime
                      </p>
                    </div>

                    {/* Profile Banner Card */}
                    <div className="p-6 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-google-blue text-white flex items-center justify-center text-2xl font-bold uppercase shadow-md">
                            {name ? name.charAt(0) : 'A'}
                          </div>
                          <button
                            onClick={() => router.push('/app/settings/edit-name')}
                            className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            title="Đổi ảnh đại diện"
                          >
                            <Camera size={14} />
                          </button>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="primary">
                              {user?.role === 'TEACHER'
                                ? 'Giáo viên'
                                : user?.role === 'ADMIN'
                                ? 'Quản trị viên'
                                : 'Học sinh'}
                            </Badge>
                            <Badge variant="success">Tài khoản xác thực</Badge>
                          </div>
                        </div>
                      </div>

                      <Button size="sm" variant="outline" onClick={() => router.push('/app/settings/edit-name')}>
                        Chỉnh sửa hồ sơ
                      </Button>
                    </div>

                    {/* Basic Info List */}
                    <div className="space-y-[2px]">
                      {/* Name */}
                      <button
                        onClick={() => router.push('/app/settings/edit-name')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-t-xl rounded-b-[4px] transition-colors text-left group"
                      >
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Tên</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {name}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Gender */}
                      <button
                        onClick={() => router.push('/app/settings/edit-gender')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-[4px] transition-colors text-left group"
                      >
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Giới tính</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {gender}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Phone */}
                      <button
                        onClick={() => router.push('/app/settings/edit-phone')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-[4px] transition-colors text-left group"
                      >
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Số điện thoại</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {phone}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Birthday */}
                      <button
                        onClick={() => router.push('/app/settings/edit-birthday')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-[4px] transition-colors text-left group"
                      >
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Ngày sinh</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {birthday}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {/* Language */}
                      <button
                        onClick={() => router.push('/app/settings/edit-language')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-b-xl rounded-t-[4px] transition-colors text-left group"
                      >
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Ngôn ngữ</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {language}
                          </span>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 3: BẢO MẬT (SECURITY) */}
              {activeTab === 'security' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Lock size={20} className="text-google-green" />
                        Bảo mật và đăng nhập
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cài đặt và đề xuất giúp bạn bảo vệ an toàn cho tài khoản
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-center gap-4">
                      <ShieldCheck size={28} className="text-google-green shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                          Tài khoản của bạn được bảo vệ an toàn
                        </h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                          Kiểm tra bảo mật đã xem xét tài khoản của bạn và không tìm thấy hành động khẩn cấp nào.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-[2px]">
                      <button
                        onClick={() => router.push('/app/settings/devices')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-t-xl rounded-b-[4px] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Laptop size={20} className="text-google-blue shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                              Các thiết bị của bạn (5 thiết bị)
                            </span>
                            <span className="text-xs text-slate-400 block font-normal">
                              Quản lý các máy tính và điện thoại đã đăng nhập
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>

                      <button
                        onClick={() => router.push('/app/settings/edit-phone')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-b-xl rounded-t-[4px] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <ShieldCheck size={20} className="text-google-green shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                              Xác minh 2 bước (2FA)
                            </span>
                            <span className="text-xs text-slate-400 block font-normal">
                              Đã bật từ 3 thg 8 · Bảo vệ tối đa bằng SMS & Mã xác thực
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 4: ĐỔI MẬT KHẨU (PASSWORD) */}
              {activeTab === 'password' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Key size={20} className="text-google-blue" />
                        Thay đổi mật khẩu
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tạo mật khẩu mới mạnh để bảo vệ tài khoản khỏi truy cập trái phép
                      </p>
                    </div>

                    <div className="p-6 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-4">
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Bấm vào nút dưới đây để chuyển đến trang thay đổi mật khẩu tài khoản của bạn.
                      </p>
                      <Button size="sm" onClick={() => router.push('/app/settings/edit-password')}>
                        Đến trang Đổi mật khẩu
                      </Button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 5: ĐƠN VỊ ĐO (MEASUREMENT UNITS - RULER ICON) */}
              {activeTab === 'unit' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Ruler size={20} className="text-google-blue" />
                        Thông tin & Cấu hình đơn vị đo
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tùy chỉnh hệ đo lường, quy đổi nhiệt độ, dung lượng và định dạng hiển thị hệ thống
                      </p>
                    </div>

                    <div className="space-y-[2px]">
                      {/* 1. Hệ đơn vị mặc định */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-t-xl rounded-b-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Hệ đơn vị độ dài / khoảng cách</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Mét / Kilômét (Hệ mét - SI)</span>
                        </div>
                        <Badge variant="primary">Mặc định (m, km)</Badge>
                      </div>

                      {/* 2. Đơn vị nhiệt độ */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Đơn vị đo nhiệt độ</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Độ C (°C - Celsius)</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium font-mono">°C</span>
                      </div>

                      {/* 3. Đơn vị dung lượng dữ liệu */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Đơn vị lưu trữ dữ liệu</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">MB / GB (Thập phân - Base 1000)</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">1000 MB = 1 GB</span>
                      </div>

                      {/* 4. Đơn vị khối lượng */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Đơn vị đo khối lượng</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Gam / Kilôgam (g / kg)</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">kg</span>
                      </div>

                      {/* 5. Định dạng thời gian & múi giờ */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-b-xl rounded-t-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Định dạng thời gian & Múi giờ hệ thống</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">24 giờ (Asia/Ho_Chi_Minh - GMT+7)</span>
                        </div>
                        <Badge variant="default">24h</Badge>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 6: DỮ LIỆU VÀ QUYỀN RIÊNG TƯ (DATA & PRIVACY) */}
              {activeTab === 'data_privacy' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Database size={20} className="text-google-blue" />
                        Dữ liệu và quyền riêng tư
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tùy chọn cho dữ liệu của bạn trên hệ thống HocRealtime
                      </p>
                    </div>

                    <div className="space-y-[2px]">
                      <button
                        onClick={() => showToast('Đang khởi tạo bản sao dữ liệu...')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-t-xl rounded-b-[4px] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Download size={20} className="text-google-blue shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                              Tải xuống dữ liệu cá nhân
                            </span>
                            <span className="text-xs text-slate-400 block font-normal">
                              Tạo bản sao lưu tất cả bài tập, kết quả học tập và nhật ký
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>

                      <button
                        onClick={() => showToast('Đã xóa nhật ký tìm kiếm')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-[4px] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <HardDrive size={20} className="text-google-green shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                              Nhật ký hoạt động và tìm kiếm
                            </span>
                            <span className="text-xs text-slate-400 block font-normal">
                              Quản lý dữ liệu lịch sử hệ thống tự động ghi lại
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>

                      <button
                        onClick={() => showToast('Vui lòng liên hệ quản trị viên để yêu cầu xoá')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-b-xl rounded-t-[4px] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 size={20} className="text-google-red shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-google-red block">
                              Yêu cầu xóa tài khoản
                            </span>
                            <span className="text-xs text-slate-400 block font-normal">
                              Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu kèm theo
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 7: GÓI PRO (PRO PLAN) */}
              {activeTab === 'pro_plan' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <Crown size={20} className="text-amber-500" />
                        Gói Hội viên Pro
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nâng cấp tài khoản để mở khóa toàn bộ sức mạnh của HocRealtime
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Gói đề xuất
                          </span>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            HocRealtime Pro Unlimted
                          </h3>
                        </div>
                        <Badge variant="warning">VIP</Badge>
                      </div>

                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <li className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 shrink-0" /> Tạo đề thi AI không giới hạn
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-500 shrink-0" /> Phòng đấu không giới hạn người chơi
                        </li>
                        <li className="flex items-center gap-2">
                          <HardDrive size={14} className="text-amber-500 shrink-0" /> Dung lượng lưu trữ 100GB Cloud tài liệu
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-amber-500 shrink-0" /> Trình tạo ma trận đề thi chuẩn Bộ GD&ĐT
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-amber-500 shrink-0" /> Trộn đáp án tự động 20+ mã đề
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-amber-500 shrink-0" /> Chế độ Giám sát thi chống gian lận
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-amber-500 shrink-0" /> Xuất bảng điểm Excel tự động
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-amber-500 shrink-0" /> Tùy chỉnh logo, màu sắc lớp học
                        </li>
                      </ul>

                      <Button
                        size="md"
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold w-full sm:w-auto"
                        onClick={() => router.push('/app/settings/plans')}
                      >
                        Nâng cấp ngay - 99k/tháng
                      </Button>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
