'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  HardDrive,
  Users,
  Copy,
  CheckCircle2,
  ChevronRight,
  Settings,
  User,
  Lock,
  Laptop,
} from 'lucide-react';

export default function PlansPage() {
  const router = useRouter();
  const { user, setPlan } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activatingFree, setActivatingFree] = useState(false);

  // Checkout Modal State
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    billing: string;
    variant: 'plus' | 'pro';
  } | null>(null);

  const [paymentStep, setPaymentStep] = useState<'checkout' | 'success'>('checkout');
  const [copyToast, setCopyToast] = useState<string | null>(null);

  React.useEffect(() => {
    // Đánh dấu tài khoản hiện tại đã xem trang bảng giá (để các lần đăng nhập sau không hiện lại)
    if (typeof window !== 'undefined') {
      const email = user?.email || (user?.id ? String(user.id) : null);
      if (email) {
        localStorage.setItem(`app_first_login_seen_${email.toLowerCase().trim()}`, 'true');
      }
    }

    // Tự động cuộn xuống phần thông tin các gói dịch vụ mà không bị che mất tiêu đề
    const scrollToPackage = () => {
      const packageEl = document.getElementById('package');
      const viewport = document.getElementById('app-main-viewport');
      if (packageEl && viewport) {
        const targetScrollTop = Math.max(0, packageEl.offsetTop - 24);
        viewport.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      } else if (packageEl) {
        packageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Cuộn ngay và sau khi các thẻ thành phần được mount / tải ảnh xong
    scrollToPackage();
    const t1 = setTimeout(scrollToPackage, 150);
    const t2 = setTimeout(scrollToPackage, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [user]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(label);
    setTimeout(() => setCopyToast(null), 2000);
  };

  const handleSelectFreePlan = () => {
    setActivatingFree(true);
    setPlan('FREE');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingPlanSelection');
    }
    setCopyToast('Gói Miễn phí');
    setTimeout(() => {
      router.push('/app/dashboard');
    }, 500);
  };

  const handleCheckout = (variant: 'plus' | 'pro') => {
    const isYearly = billingCycle === 'yearly';
    if (variant === 'plus') {
      setSelectedPlan({
        name: 'Gói Plus',
        price: isYearly ? '15.000đ / tháng - 180.000đ mỗi năm' : '19.000đ / tháng',
        billing: isYearly ? 'Thanh toán 1 năm' : 'Thanh toán hàng tháng',
        variant: 'plus',
      });
    } else {
      setSelectedPlan({
        name: 'Gói Pro VIP',
        price: isYearly ? '79.000đ / tháng - 948.000đ mỗi năm' : '99.000đ / tháng',
        billing: isYearly ? 'Thanh toán 1 năm' : 'Thanh toán hàng tháng',
        variant: 'pro',
      });
    }
    setPaymentStep('checkout');
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            Cài đặt
          </button>
          <BreadcrumbChevron
            menuTitle="Cài đặt"
            items={[
              { label: 'Cài đặt chung', href: '/app/settings', icon: <Settings size={14} className="text-slate-500 shrink-0" /> },
              { label: 'Hồ sơ cá nhân', href: '/app/settings/edit-name', icon: <User size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Đổi mật khẩu', href: '/app/settings/edit-password', icon: <Lock size={14} className="text-rose-500 shrink-0" /> },
              { label: 'Thiết bị đăng nhập', href: '/app/settings/devices', icon: <Laptop size={14} className="text-purple-500 shrink-0" /> },
              { label: 'Gói', href: '/app/settings/plans', icon: <Crown size={14} className="text-amber-500 shrink-0" /> },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Gói
          </span>
        </div>
      }
    >
      {/* Copy Toast (Fixed outside space-y container to prevent layout shift) */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce pointer-events-none">
          <Check size={16} className="text-google-green shrink-0" />
          <span>Đã sao chép {copyToast}!</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10 pt-2 sm:pt-4 pb-32 sm:pb-48">

        {/* TOP SECTION: ỦNG HỘ NHÀ PHÁT TRIỂN & VIETQR CARD TO HƠN */}
        <section className="space-y-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 text-center leading-tight">
            Ủng hộ nhà phát triển
          </h1>

          {/* Developer Support Main Bank & QR (Không viền khung) */}
          <div className="py-2 flex flex-col md:flex-row items-center gap-6 md:gap-10">
            {/* Left: VietQR Image (To hơn & Không khung) */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-full max-w-xs md:max-w-sm flex flex-col items-center justify-center relative">
                <img
                  src="/qr-mb.png"
                  alt="Mã VietQR chuyển khoản MBBank KIYO GROUP"
                  className="w-full h-auto object-contain shadow-none border-0"
                  loading="eager"
                />
              </div>
            </div>

            {/* Right: Bank Details List (Chiều rộng gọn hơn) */}
            <div className="flex-1 w-full max-w-lg space-y-3.5">
              <div className="space-y-2.5">
                {/* 1. Ngân hàng */}
                <div className="p-3.5 md:p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Ngân hàng</span>
                  <span className="text-sm md:text-base font-normal text-slate-900 dark:text-white break-words sm:text-right">
                    MB - Ngân hàng TMCP Quân đội
                  </span>
                </div>

                {/* 2. Số tài khoản */}
                <div className="p-3.5 md:p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Số tài khoản</span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-lg md:text-xl font-extrabold font-mono text-google-blue dark:text-blue-400 tracking-wider">
                      6666662018
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('6666662018', 'số tài khoản')}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-google-blue hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>

                {/* 3. Chủ tài khoản */}
                <div className="p-3.5 md:p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Chủ tài khoản</span>
                  <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-wide">
                    KIYO GROUP
                  </span>
                </div>

                {/* 4. Nội dung chuyển khoản */}
                <div className="p-3.5 md:p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium">Nội dung chuyển khoản</span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xs md:text-sm font-bold font-mono text-slate-900 dark:text-slate-100 break-all">
                      UNG HO HOCREALTIME
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('UNG HO HOCREALTIME', 'nội dung chuyển khoản')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SECTION: THÔNG TIN CÁC GÓI DỊCH VỤ */}
        <section id="package" className="space-y-6 pt-12 md:pt-16 scroll-mt-20">
          <div className="flex flex-col items-center justify-center gap-2.5 pt-3">
            <span className="inline-flex items-center px-4 py-1.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 rounded-full text-xs font-semibold shadow-2xs">
              Tính năng này đang được phát triển
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
              Thông tin các gói dịch vụ
            </h2>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex flex-wrap justify-center items-center gap-3">
            <span
              className={`text-xs font-medium cursor-pointer ${
                billingCycle === 'monthly' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Thanh toán theo Tháng
            </span>

            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`w-12 h-7 rounded-full p-1 transition-colors relative ${
                billingCycle === 'yearly' ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setBillingCycle('yearly')}>
              <span
                className={`text-xs font-medium ${
                  billingCycle === 'yearly' ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500'
                }`}
              >
                Thanh toán theo Năm
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 rounded-full whitespace-nowrap">
                Tiết kiệm 20%
              </span>
            </div>
          </div>

          {/* 3 Pricing Cards Grid */}
          <div id="package-cards-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* 1. Gói Miễn Phí (Free) */}
            <div className="p-5 sm:p-6 bg-slate-100/90 dark:bg-slate-800/70 rounded-3xl flex flex-col justify-between space-y-6 min-w-0">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 tracking-wider">Cơ bản</span>
                    <Badge variant="default">Miễn phí</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gói Miễn phí</h3>
                </div>

                <div className="py-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100">0đ</span>
                  <span className="text-xs text-slate-500 font-medium"> / vĩnh viễn</span>
                </div>

                <div className="pt-4">
                  <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2.5">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Tạo tối đa 5 đề thi SI</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Phòng đấu tối đa 15 người</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Lưu trữ 1GB dữ liệu Cloud</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Hỗ trợ cộng đồng online</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Button
                size="md"
                variant={user?.hasSelectedPlan ? 'outline' : 'primary'}
                disabled={activatingFree}
                className={`w-full font-bold rounded-full py-3 transition-all cursor-pointer ${
                  user?.hasSelectedPlan
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:text-slate-200'
                    : 'bg-google-blue hover:bg-blue-600 text-white shadow-md'
                }`}
                onClick={handleSelectFreePlan}
              >
                {activatingFree
                  ? 'Đang kích hoạt'
                  : (user?.hasSelectedPlan
                    ? 'Gói hiện tại của bạn'
                    : 'Bắt đầu với Gói Miễn phí')}
              </Button>
            </div>

            {/* 2. Gói Plus - Grayed out & Non-clickable */}
            <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl flex flex-col justify-between space-y-6 shadow-xs relative grayscale opacity-50 pointer-events-none select-none cursor-not-allowed overflow-hidden min-w-0">
              {/* Overlay Layer for Gói Plus */}
              <div className="absolute inset-0 bg-slate-500/10 dark:bg-slate-900/40 z-10 pointer-events-auto cursor-not-allowed" />

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-google-blue tracking-wider">Cá nhân</span>
                    <Badge variant="primary">Hot</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap size={22} className="text-google-blue" />
                    Gói Plus
                  </h3>
                </div>

                <div className="py-2">
                  {billingCycle === 'yearly' ? (
                    <div>
                      <span className="text-3xl sm:text-4xl font-extrabold text-google-blue">15.000đ</span>
                      <span className="text-xs text-slate-500 font-medium"> / tháng</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">180.000đ thanh toán hàng năm</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl sm:text-4xl font-extrabold text-google-blue">19.000đ</span>
                      <span className="text-xs text-slate-500 font-medium"> / tháng</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
                    <li className="flex items-center gap-2.5 font-semibold text-google-blue">
                      <Zap size={16} className="text-google-blue shrink-0" />
                      <span>Tạo 100 đề thi SI</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-semibold text-google-blue">
                      <Users size={16} className="text-google-blue shrink-0" />
                      <span>Phòng đấu tối đa 60 người chơi</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <HardDrive size={16} className="text-google-blue shrink-0" />
                      <span>Lưu trữ 20GB dữ liệu Cloud tài liệu</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Chấm điểm SI tự động kèm lời giải chi tiết</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Xuất file không watermark</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Phân tích lộ trình học tập SI từng học sinh</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Hỗ trợ 6 dạng câu hỏi trắc nghiệm</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-google-blue shrink-0" />
                      <span>Luyện tập lật thẻ ghi nhớ thông minh</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="w-full py-3 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold shadow-xs cursor-not-allowed opacity-80 text-sm select-none"
              >
                Mua ngay Gói Plus
              </button>
            </div>

            {/* 3. Gói Pro (VIP) - Grayed out & Non-clickable */}
            <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900 rounded-3xl flex flex-col justify-between space-y-6 shadow-xs relative grayscale opacity-50 pointer-events-none select-none cursor-not-allowed overflow-hidden min-w-0">
              {/* Overlay Layer for Gói Pro */}
              <div className="absolute inset-0 bg-slate-500/10 dark:bg-slate-900/40 z-10 pointer-events-auto cursor-not-allowed" />

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider">Trường học</span>
                    <Badge variant="warning">Pro VIP</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Crown size={22} className="text-amber-500" />
                    Gói Pro
                  </h3>
                </div>

                <div className="py-2">
                  {billingCycle === 'yearly' ? (
                    <div>
                      <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400">79.000đ</span>
                      <span className="text-xs text-slate-500 font-medium"> / tháng</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">948.000đ thanh toán hàng năm</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400">99.000đ</span>
                      <span className="text-xs text-slate-500 font-medium"> / tháng</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-200">
                    <li className="flex items-center gap-2.5 font-bold text-amber-700 dark:text-amber-300">
                      <Sparkles size={16} className="text-amber-500 shrink-0" />
                      <span>Tạo đề thi SI không giới hạn</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-bold text-amber-700 dark:text-amber-300">
                      <Users size={16} className="text-amber-500 shrink-0" />
                      <span>Phòng đấu không giới hạn người chơi</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-bold text-amber-700 dark:text-amber-300">
                      <HardDrive size={16} className="text-amber-500 shrink-0" />
                      <span>Dung lượng lưu trữ 100GB Cloud tài liệu</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-semibold text-amber-800 dark:text-amber-200">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Trình tạo ma trận đề thi chuẩn Bộ GD&ĐT</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-semibold text-amber-800 dark:text-amber-200">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Trộn đáp án tự động 20+ mã đề</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-semibold text-amber-800 dark:text-amber-200">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Chế độ Giám sát thi chống gian lận</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Xuất bảng điểm Excel tự động</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Ngân hàng câu hỏi nâng cao</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Tùy chỉnh logo, màu sắc lớp học</span>
                    </li>
                    <li className="flex items-center gap-2.5 font-medium">
                      <Check size={16} className="text-amber-500 shrink-0" />
                      <span>Hỗ trợ ưu tiên 24/7 từ đội ngũ kỹ thuật</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="w-full py-3 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold shadow-xs cursor-not-allowed opacity-80 text-sm select-none"
              >
                Mua ngay Gói Pro
              </button>
            </div>
          </div>
        </section>

        {/* Checkout Modal */}
        <Modal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          title={paymentStep === 'checkout' ? `Thanh toán Nâng cấp ${selectedPlan?.name}` : 'Xác nhận thanh toán nâng cấp'}
          description={
            paymentStep === 'checkout'
              ? 'Quét mã QR bằng ứng dụng Ngân hàng để chuyển khoản thanh toán nâng cấp tài khoản'
              : 'Đơn đăng ký của bạn đã được ghi nhận thành công'
          }
        >
          {selectedPlan && (
            <div className="space-y-6 pt-2">
              {paymentStep === 'checkout' ? (
                <>
                  {/* VietQR Bank Details */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="w-72 flex flex-col items-center justify-center relative">
                        <img
                          src="/qr-mb.png"
                          alt="Mã VietQR chuyển khoản MBBank KIYO GROUP"
                          className="w-full h-auto object-contain shadow-none border-0"
                          loading="eager"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-left text-xs">
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border">
                        <span className="text-slate-500">Ngân hàng</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          MB - Ngân hàng TMCP Quân đội
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border">
                        <span className="text-slate-500">Số tài khoản</span>
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-white">
                          <span>6666662018</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('6666662018', 'số tài khoản')}
                            className="p-1 text-slate-400 hover:text-google-blue"
                            title="Copy STK"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border">
                        <span className="text-slate-500">Chủ tài khoản</span>
                        <span className="font-bold text-slate-900 dark:text-white">KIYO GROUP</span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border">
                        <span className="text-slate-500">Nội dung chuyển khoản</span>
                        <div className="flex items-center gap-2 font-mono font-bold text-google-blue">
                          <span>UNG HO HOCREALTIME</span>
                          <button
                            type="button"
                            onClick={() => handleCopy('UNG HO HOCREALTIME', 'nội dung chuyển khoản')}
                            className="p-1 text-slate-400 hover:text-google-blue"
                            title="Copy Nội dung"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                      Hủy bỏ
                    </Button>
                    <Button size="sm" onClick={() => setPaymentStep('success')}>
                      Xác nhận đã chuyển khoản
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shadow-lg">
                      <CheckCircle2 size={36} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      Cảm ơn sự ủng hộ của bạn!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Đội ngũ phát triển KiyoEdu chân thành cảm ơn đóng góp của bạn.
                    </p>
                  </div>

                  <Button
                    size="md"
                    className="w-full bg-google-blue hover:bg-blue-600 text-white font-bold"
                    onClick={() => {
                      setSelectedPlan(null);
                    }}
                  >
                    Hoàn tất
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
