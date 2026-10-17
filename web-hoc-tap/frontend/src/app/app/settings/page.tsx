'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { changePasswordApi } from '@/lib/profileApi';
import { listDocuments } from '@/lib/documentsApi';
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
  Bell,
  Palette,
  SlidersHorizontal,
  Cloud,
  Volume2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export type SettingsTabType =
  | 'overview'
  | 'account'
  | 'security'
  | 'password'
  | 'unit'
  | 'notifications'
  | 'appearance'
  | 'storage'
  | 'data_privacy'
  | 'pro_plan';

interface StorageData {
  userCreatedBytes: number;
  aiCreatedBytes: number;
  submissionsBytes: number;
  totalUsedBytes: number;
  userExamCount: number;
  aiExamCount: number;
  submissionCount: number;
  fileCount: number;
}

const TOTAL_QUOTA_BYTES = 1024 * 1024 * 1024; // 1.0 GB

const formatStorageSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0.0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

const formatStoragePercent = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0.0%';
  const pct = (bytes / TOTAL_QUOTA_BYTES) * 100;
  if (pct < 0.01) return '< 0.01%';
  if (pct < 0.1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
};

export default function SettingsPage(props: any) {
  const initialTab: SettingsTabType = props?.initialTab || 'overview';
  const router = useRouter();
  const { user, token, initialize, logout } = useAuthStore();

  // Navigation Tab State
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
      password: '/app/settings/security',
      unit: '/app/settings/units',
      notifications: '/app/settings/notifications',
      appearance: '/app/settings/appearance',
      storage: '/app/settings/storage',
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Active Edit Modal State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teacher Notification Settings State
  const [studentSubmissionNotif, setStudentSubmissionNotif] = useState(true);
  const [joinClassRequestNotif, setJoinClassRequestNotif] = useState(true);
  const [cheatAlertNotif, setCheatAlertNotif] = useState(true);
  const [examSummaryReportNotif, setExamSummaryReportNotif] = useState(true);
  const [liveSubmissionSound, setLiveSubmissionSound] = useState(true);
  const [parentReportEmail, setParentReportEmail] = useState(false);

  // Appearance & Editor Settings State
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [lineSpacing, setLineSpacing] = useState<'normal' | 'relaxed'>('normal');

  // Cloud Storage State
  const [autoCompress, setAutoCompress] = useState(true);
  const [weeklyBackup, setWeeklyBackup] = useState(true);
  const [storageData, setStorageData] = useState<StorageData>({
    userCreatedBytes: 0,
    aiCreatedBytes: 0,
    submissionsBytes: 0,
    totalUsedBytes: 0,
    userExamCount: 0,
    aiExamCount: 0,
    submissionCount: 0,
    fileCount: 0,
  });

  const refreshStorageData = useCallback(async () => {
    let userCreatedBytes = 0;
    let aiCreatedBytes = 0;
    let submissionsBytes = 0;
    let userExamCount = 0;
    let aiExamCount = 0;
    let submissionCount = 0;

    if (typeof window !== 'undefined') {
      try {
        const rawFiles = localStorage.getItem('app_documents_files');
        if (rawFiles) {
          const files = JSON.parse(rawFiles);
          if (Array.isArray(files)) {
            for (const f of files) {
              if (!f) continue;
              const bytes = typeof f.size === 'number' && f.size > 0 
                ? f.size 
                : new Blob([JSON.stringify(f)]).size;
              const isAi = Boolean(
                f.source === 'ai_gateway' ||
                f.isAiGenerated ||
                (f.name && /ai|si|tự động|auto/i.test(f.name)) ||
                (f.parsedQuiz?.description && /ai|si|tự động/i.test(f.parsedQuiz.description))
              );
              if (isAi) {
                aiCreatedBytes += bytes;
                aiExamCount += 1;
              } else {
                userCreatedBytes += bytes;
                userExamCount += 1;
              }
            }
          }
        }

        const rawCustom = localStorage.getItem('custom_uploaded_files');
        if (rawCustom) {
          const customFiles = JSON.parse(rawCustom);
          if (Array.isArray(customFiles)) {
            for (const f of customFiles) {
              if (!f) continue;
              const bytes = typeof f.size === 'number' && f.size > 0 
                ? f.size 
                : new Blob([JSON.stringify(f)]).size;
              userCreatedBytes += bytes;
              userExamCount += 1;
            }
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (
            key.startsWith('app_assignment_subs_') ||
            key.startsWith('app_my_assignment_sub_') ||
            key.startsWith('app_custom_submissions')
          ) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const bytes = new Blob([raw]).size;
              submissionsBytes += bytes;
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  submissionCount += parsed.length;
                } else if (parsed && typeof parsed === 'object') {
                  submissionCount += 1;
                }
              } catch (_) {
                submissionCount += 1;
              }
            }
          }
        }
      } catch (err) {
        console.error('Error calculating storage size:', err);
      }
    }

    const totalUsedBytes = userCreatedBytes + aiCreatedBytes + submissionsBytes;
    const fileCount = userExamCount + aiExamCount + submissionCount;

    setStorageData({
      userCreatedBytes,
      aiCreatedBytes,
      submissionsBytes,
      totalUsedBytes,
      userExamCount,
      aiExamCount,
      submissionCount,
      fileCount,
    });

    if (token) {
      try {
        const remote = await listDocuments(token);
        if (remote && Array.isArray(remote.files) && remote.files.length > 0) {
          const localRaw = typeof window !== 'undefined' ? localStorage.getItem('app_documents_files') : null;
          const localList = localRaw ? JSON.parse(localRaw) : [];
          const localIds = new Set(localList.map((f: any) => f?.id));

          let extraAiBytes = 0;
          let extraUserBytes = 0;
          let extraAiCount = 0;
          let extraUserCount = 0;

          for (const rf of remote.files) {
            if (!rf || localIds.has(rf.id)) continue;
            const bytes = typeof rf.size === 'number' && rf.size > 0
              ? rf.size
              : new Blob([JSON.stringify(rf)]).size;
            const isAi = Boolean(
              rf.source === 'ai_gateway' ||
              rf.isAiGenerated ||
              (rf.name && /ai|si|tự động|auto/i.test(rf.name)) ||
              (rf.parsedQuiz?.description && /ai|si|tự động/i.test(rf.parsedQuiz.description))
            );
            if (isAi) {
              extraAiBytes += bytes;
              extraAiCount += 1;
            } else {
              extraUserBytes += bytes;
              extraUserCount += 1;
            }
          }

          if (extraAiCount > 0 || extraUserCount > 0) {
            setStorageData((prev) => ({
              ...prev,
              userCreatedBytes: prev.userCreatedBytes + extraUserBytes,
              aiCreatedBytes: prev.aiCreatedBytes + extraAiBytes,
              totalUsedBytes: prev.totalUsedBytes + extraUserBytes + extraAiBytes,
              userExamCount: prev.userExamCount + extraUserCount,
              aiExamCount: prev.aiExamCount + extraAiCount,
              fileCount: prev.fileCount + extraUserCount + extraAiCount,
            }));
          }
        }
      } catch (_) {}
    }
  }, [token]);

  useEffect(() => {
    refreshStorageData();
    const handleStorageChange = () => refreshStorageData();
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshStorageData]);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedNotifs = localStorage.getItem('edu_teacher_notifs');
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (parsed.studentSubmissionNotif !== undefined) setStudentSubmissionNotif(parsed.studentSubmissionNotif);
        if (parsed.joinClassRequestNotif !== undefined) setJoinClassRequestNotif(parsed.joinClassRequestNotif);
        if (parsed.cheatAlertNotif !== undefined) setCheatAlertNotif(parsed.cheatAlertNotif);
        if (parsed.examSummaryReportNotif !== undefined) setExamSummaryReportNotif(parsed.examSummaryReportNotif);
        if (parsed.liveSubmissionSound !== undefined) setLiveSubmissionSound(parsed.liveSubmissionSound);
        if (parsed.parentReportEmail !== undefined) setParentReportEmail(parsed.parentReportEmail);
      }
      const savedApp = localStorage.getItem('edu_settings_appearance');
      if (savedApp) {
        const parsed = JSON.parse(savedApp);
        if (parsed.themeMode) setThemeMode(parsed.themeMode);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.animationsEnabled !== undefined) setAnimationsEnabled(parsed.animationsEnabled);
        if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
        if (parsed.lineSpacing) setLineSpacing(parsed.lineSpacing);
      }
      const savedStorage = localStorage.getItem('edu_settings_storage');
      if (savedStorage) {
        const parsed = JSON.parse(savedStorage);
        if (parsed.autoCompress !== undefined) setAutoCompress(parsed.autoCompress);
        if (parsed.weeklyBackup !== undefined) setWeeklyBackup(parsed.weeklyBackup);
      }
    } catch (_) {}
  }, []);

  const updateTeacherNotif = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    try {
      const cur = JSON.parse(localStorage.getItem('edu_teacher_notifs') || '{}');
      cur[key] = val;
      localStorage.setItem('edu_teacher_notifs', JSON.stringify(cur));
    } catch (_) {}
    showToast('Đã lưu thiết lập thông báo');
  };

  const updateAppearanceSetting = (key: string, val: any, setter: (v: any) => void) => {
    setter(val);
    try {
      const cur = JSON.parse(localStorage.getItem('edu_settings_appearance') || '{}');
      cur[key] = val;
      localStorage.setItem('edu_settings_appearance', JSON.stringify(cur));
    } catch (_) {}

    if (key === 'themeMode') {
      useThemeStore.getState().setThemeMode(val);
    } else if (key === 'fontSize') {
      useThemeStore.getState().setFontSize(val);
    }

    showToast('Đã áp dụng cài đặt giao diện');
  };



  const updateStorageSetting = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    try {
      const cur = JSON.parse(localStorage.getItem('edu_settings_storage') || '{}');
      cur[key] = val;
      localStorage.setItem('edu_settings_storage', JSON.stringify(cur));
    } catch (_) {}
    showToast('Đã cập nhật cài đặt lưu trữ');
  };

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải dài ít nhất 8 ký tự theo quy định bảo mật');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await changePasswordApi(token, currentPassword, newPassword);

      setPasswordSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Đã đổi mật khẩu thành công');
    } catch (err: any) {
      setPasswordError(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const userPct = (storageData.userCreatedBytes / TOTAL_QUOTA_BYTES) * 100;
  const aiPct = (storageData.aiCreatedBytes / TOTAL_QUOTA_BYTES) * 100;
  const subPct = (storageData.submissionsBytes / TOTAL_QUOTA_BYTES) * 100;

  const barWidthUser = storageData.userCreatedBytes > 0 ? Math.max(1.2, userPct) : 0;
  const barWidthAi = storageData.aiCreatedBytes > 0 ? Math.max(1.2, aiPct) : 0;
  const barWidthSub = storageData.submissionsBytes > 0 ? Math.max(1.2, subPct) : 0;

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

              {/* 3. Bảo mật & Mật khẩu */}
              <button
                onClick={() => switchTab('security')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'security' || activeTab === 'password'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Lock
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'security' || activeTab === 'password'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Bảo mật</span>
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

              {/* 6. Thông báo & Âm thanh */}
              <button
                onClick={() => switchTab('notifications')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'notifications'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Bell
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'notifications'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Thông báo giảng dạy</span>
              </button>

              {/* 7. Giao diện & Hiển thị */}
              <button
                onClick={() => switchTab('appearance')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'appearance'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Palette
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'appearance'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">Giao diện & Hiển thị</span>
              </button>



              {/* 9. Dung lượng đám mây */}
              <button
                onClick={() => switchTab('storage')}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all text-left group ${
                  activeTab === 'storage'
                    ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue font-medium shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                }`}
              >
                <Cloud
                  size={20}
                  className={`shrink-0 ${
                    activeTab === 'storage'
                      ? 'text-google-blue'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium whitespace-nowrap">Bộ nhớ đám mây</span>
              </button>

              {/* 10. Dữ liệu và quyền riêng tư */}
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

                      {/* Notifications Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bell size={20} className="text-google-blue" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Thông báo giảng dạy</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('notifications')}>
                            Cấu hình
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">Học sinh nộp bài: {studentSubmissionNotif ? 'Bật email & chuông' : 'Tắt'}</p>
                          <p className="text-slate-500">Yêu cầu vào lớp: {joinClassRequestNotif ? 'Bật thông báo' : 'Tắt'}</p>
                          <p className="text-slate-500">Cảnh báo gian lận thi: {cheatAlertNotif ? 'Thời gian thực' : 'Tắt'}</p>
                        </div>
                      </div>

                      {/* Appearance Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Palette size={20} className="text-purple-500" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Giao diện & Hiển thị</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('appearance')}>
                            Tùy chỉnh
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            Chủ đề: {themeMode === 'system' ? 'Theo hệ thống' : themeMode === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}
                          </p>
                          <p className="text-slate-500">
                            Cỡ chữ đề thi: {fontSize === 'medium' ? 'Tiêu chuẩn (14px)' : fontSize === 'large' ? 'Lớn (16px)' : fontSize === 'xlarge' ? 'Rất lớn (18px)' : 'Nhỏ (13px)'}
                          </p>
                          <p className="text-slate-500">Hiệu ứng động: {animationsEnabled ? 'Mượt mà' : 'Tiết kiệm pin'}</p>
                        </div>
                      </div>



                      {/* Cloud Storage Summary */}
                      <div className="p-5 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Cloud size={20} className="text-cyan-500" />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Dung lượng đám mây</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => switchTab('storage')}>
                            Quản lý
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            Đã dùng: {formatStorageSize(storageData.totalUsedBytes)} / 1.0 GB ({formatStoragePercent(storageData.totalUsedBytes)})
                          </p>
                          <p className="text-slate-500">Đề thi & Bài làm: {storageData.fileCount} tệp đã lưu</p>
                          <p className="text-slate-500">Tự động nén tệp: {autoCompress ? 'Bật (Tiết kiệm)' : 'Tắt'}</p>
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
                          Truy cập không giới hạn Ngân hàng câu hỏi, Đề thi Realtime SI & Tính năng lưu trữ không giới hạn.
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
                        Thông tin cơ bản về bạn và tài khoản sử dụng trên hệ thống KiyoEdu
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

              {/* TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU (SECURITY & PASSWORD) */}
              {(activeTab === 'security' || activeTab === 'password') && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Lock size={20} className="text-google-green" />
                        Bảo mật và đăng nhập
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cài đặt và đề xuất giúp bạn bảo vệ an toàn cho tài khoản giáo viên
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

                  {/* Phần Thay đổi mật khẩu gộp chung trong Bảo mật */}
                  <section className="space-y-4 pt-2">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Key size={18} className="text-google-blue" />
                        Thay đổi mật khẩu
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tạo mật khẩu mới mạnh để bảo vệ tài khoản giáo viên khỏi truy cập trái phép
                      </p>
                    </div>

                    <div className="p-6 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-5">
                      {passwordError && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-shake">
                          <AlertCircle size={16} className="text-red-500 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-fadeIn">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          <span>{passwordSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                        {/* Mật khẩu hiện tại */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                            Mật khẩu hiện tại <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                if (passwordError) setPasswordError(null);
                              }}
                              placeholder="Nhập mật khẩu đang sử dụng"
                              className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm outline-none focus:border-google-blue dark:focus:border-google-blue transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                              title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Mật khẩu mới */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                            Mật khẩu mới <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (passwordError) setPasswordError(null);
                              }}
                              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                              className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm outline-none focus:border-google-blue dark:focus:border-google-blue transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                              title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Xác nhận mật khẩu mới */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                            Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordError) setPasswordError(null);
                              }}
                              placeholder="Nhập lại mật khẩu mới"
                              className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm outline-none focus:border-google-blue dark:focus:border-google-blue transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                              title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Password rules indicator */}
                        <div className="p-3 bg-slate-200/50 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                              newPassword.length >= 8 ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                            }`}>
                              ✓
                            </span>
                            <span className={newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                              Tối thiểu 8 ký tự
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                              confirmPassword && confirmPassword === newPassword ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                            }`}>
                              ✓
                            </span>
                            <span className={confirmPassword && confirmPassword === newPassword ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                              Mật khẩu xác nhận trùng khớp
                            </span>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            type="submit"
                            size="md"
                            disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmPassword}
                          >
                            {isSubmittingPassword ? (
                              <span className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                Đang cập nhật
                              </span>
                            ) : (
                              'Cập nhật mật khẩu'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            disabled={isSubmittingPassword}
                            onClick={() => {
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordError(null);
                              setPasswordSuccess(null);
                            }}
                          >
                            Hủy
                          </Button>
                        </div>
                      </form>
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

              {/* TAB 6: THÔNG BÁO GIẢNG DẠY (NOTIFICATIONS) */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Bell size={20} className="text-google-blue" />
                        Thông báo Giảng dạy & Lớp học
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cài đặt thông báo khi học sinh nộp bài, yêu cầu vào lớp và báo cáo kết quả thi
                      </p>
                    </div>

                    <div className="space-y-[2px]">
                      {/* Học sinh nộp bài mới */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-t-xl rounded-b-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Thông báo khi có học sinh nộp bài tập và đề thi
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Gửi email và thông báo đẩy tức thì khi học sinh hoàn thành bài nộp vào lớp của bạn
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('studentSubmissionNotif', !studentSubmissionNotif, setStudentSubmissionNotif)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            studentSubmissionNotif ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              studentSubmissionNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Yêu cầu vào lớp học */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Yêu cầu tham gia lớp học của học sinh mới
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Nhận thông báo khi học sinh nhập mã lớp cần giáo viên phê duyệt danh sách
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('joinClassRequestNotif', !joinClassRequestNotif, setJoinClassRequestNotif)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            joinClassRequestNotif ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              joinClassRequestNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Cảnh báo gian lận thời gian thực */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Cảnh báo học sinh chuyển tab & vi phạm thi cử (Realtime)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Cảnh báo ngay lập tức trên màn hình giáo viên khi phát hiện học sinh thoát màn hình thi
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('cheatAlertNotif', !cheatAlertNotif, setCheatAlertNotif)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            cheatAlertNotif ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              cheatAlertNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Báo cáo tổng kết phổ điểm */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Báo cáo tổng kết phổ điểm khi đóng phòng thi
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Tự động gửi báo cáo thống kê điểm trung bình, câu hỏi sai nhiều nhất sau khi buổi thi kết thúc
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('examSummaryReportNotif', !examSummaryReportNotif, setExamSummaryReportNotif)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            examSummaryReportNotif ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              examSummaryReportNotif ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Chuông báo nộp bài trực tiếp */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Chuông âm thanh khi có bài nộp trong phòng thi trực tiếp
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Phát âm thanh thông báo nhẹ trên máy giáo viên khi học sinh vừa hoàn thành nộp bài
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('liveSubmissionSound', !liveSubmissionSound, setLiveSubmissionSound)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            liveSubmissionSound ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              liveSubmissionSound ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Gửi email cho phụ huynh */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-b-xl rounded-t-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Tự động gửi email thông báo điểm thi cho phụ huynh học sinh
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Gửi kết quả bảng điểm và nhận xét bài thi về email phụ huynh sau khi giáo viên duyệt điểm
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateTeacherNotif('parentReportEmail', !parentReportEmail, setParentReportEmail)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            parentReportEmail ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              parentReportEmail ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 7: GIAO DIỆN & HIỂN THỊ (APPEARANCE) */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Palette size={20} className="text-purple-500" />
                        Giao diện & Hiển thị
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tùy chỉnh màu sắc nền, cỡ chữ và trải nghiệm thị giác khi sử dụng hệ thống
                      </p>
                    </div>

                    <div className="space-y-[2px]">
                      {/* Chế độ màu nền */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-t-xl rounded-b-[4px] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Chủ đề giao diện</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {themeMode === 'system' ? 'Tự động theo hệ thống' : themeMode === 'dark' ? 'Giao diện Tối' : 'Giao diện Sáng'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => updateAppearanceSetting('themeMode', 'system', setThemeMode)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              themeMode === 'system'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                          >
                            Hệ thống
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppearanceSetting('themeMode', 'light', setThemeMode)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              themeMode === 'light'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                          >
                            Sáng
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppearanceSetting('themeMode', 'dark', setThemeMode)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              themeMode === 'dark'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                          >
                            Tối
                          </button>
                        </div>
                      </div>

                      {/* Cỡ chữ */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Cỡ chữ khi đọc đề thi & làm bài</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {fontSize === 'small' ? 'Nhỏ (13px)' : fontSize === 'medium' ? 'Tiêu chuẩn (14px)' : fontSize === 'large' ? 'Lớn (16px)' : 'Rất lớn (18px)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
                          {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => updateAppearanceSetting('fontSize', size, setFontSize)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                fontSize === size
                                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                              }`}
                            >
                              {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Chuẩn' : size === 'large' ? 'Lớn' : 'Cực lớn'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hiệu ứng chuyển động */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Hiệu ứng chuyển trang & hoạt họa mượt mà (Animations)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Tắt tùy chọn này nếu bạn muốn giao diện phản hồi nhanh tức thì trên máy tính cấu hình yếu
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateAppearanceSetting('animationsEnabled', !animationsEnabled, setAnimationsEnabled)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            animationsEnabled ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              animationsEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Độ tương phản cao */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Chế độ độ tương phản cao (High Contrast)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Tăng độ sắc nét của chữ và đường viền bảng câu hỏi, giúp người có mắt yếu đọc dễ hơn
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateAppearanceSetting('highContrast', !highContrast, setHighContrast)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            highContrast ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              highContrast ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Độ giãn dòng */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-b-xl rounded-t-[4px] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Khoảng cách giãn dòng câu hỏi</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {lineSpacing === 'normal' ? 'Tiêu chuẩn (1.5x)' : 'Thoáng đãng (1.8x)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => updateAppearanceSetting('lineSpacing', 'normal', setLineSpacing)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              lineSpacing === 'normal'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                          >
                            Tiêu chuẩn
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAppearanceSetting('lineSpacing', 'relaxed', setLineSpacing)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              lineSpacing === 'relaxed'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                            }`}
                          >
                            Thoáng
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}



              {/* TAB 9: DUNG LƯỢNG LƯU TRỮ ĐÁM MÂY (STORAGE) */}
              {activeTab === 'storage' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Cloud size={20} className="text-cyan-500" />
                        Dung lượng lưu trữ đám mây
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Quản lý bộ nhớ lưu trữ đề thi tự tạo, đề thi SI và kết quả bài làm học sinh
                      </p>
                    </div>

                    {/* Storage Meter Card */}
                    <div className="p-6 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Bộ nhớ đám mây của bạn (Gói thường)</span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {formatStorageSize(storageData.totalUsedBytes)}{' '}
                            <span className="text-xs font-normal text-slate-500">trên 1.0 GB khả dụng</span>
                          </h3>
                        </div>
                        <Badge variant="primary">{formatStoragePercent(storageData.totalUsedBytes)} đã dùng</Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="bg-google-blue h-full transition-all duration-300"
                          style={{ width: `${barWidthUser}%` }}
                          title={`Đề thi tự tạo: ${formatStorageSize(storageData.userCreatedBytes)}`}
                        />
                        <div
                          className="bg-purple-500 h-full transition-all duration-300"
                          style={{ width: `${barWidthAi}%` }}
                          title={`Đề thi SI tạo: ${formatStorageSize(storageData.aiCreatedBytes)}`}
                        />
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${barWidthSub}%` }}
                          title={`Bài làm học sinh: ${formatStorageSize(storageData.submissionsBytes)}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-google-blue shrink-0" />
                          <span>Đề thi tự tạo: {formatStorageSize(storageData.userCreatedBytes)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                          <span>Đề thi SI tạo: {formatStorageSize(storageData.aiCreatedBytes)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Bài làm học sinh: {formatStorageSize(storageData.submissionsBytes)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-[2px]">
                      {/* Nén tài liệu */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-t-xl rounded-b-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Tự động nén dữ liệu đề thi (Smart Compression)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Nén thông minh câu hỏi và hình minh họa đề thi để tiết kiệm 40% dung lượng
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateStorageSetting('autoCompress', !autoCompress, setAutoCompress)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            autoCompress ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              autoCompress ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sao lưu tự động */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Tự động sao lưu dữ liệu hàng tuần
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Tạo snapshot bản sao lưu đề thi và kết quả lớp học vào Chủ nhật hàng tuần
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateStorageSetting('weeklyBackup', !weeklyBackup, setWeeklyBackup)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                            weeklyBackup ? 'bg-google-blue' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              weeklyBackup ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Dọn dẹp cache */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Dọn dẹp bộ nhớ đệm tạm thời (Cache & Temporary Data)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Xóa bộ nhớ đệm ảnh đề thi cũ để tăng tốc độ phản hồi của trình duyệt
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showToast('Đã giải phóng bộ nhớ đệm thành công!')}
                        >
                          Dọn dẹp ngay
                        </Button>
                      </div>

                      {/* Tải sao lưu */}
                      <div className="p-4 bg-slate-100/90 dark:bg-slate-800/70 border border-transparent dark:border-slate-800/60 rounded-b-xl rounded-t-[4px] flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 block">
                            Tải bản sao lưu toàn bộ kho đề thi & bài làm (.zip)
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            Xuất tất cả {storageData.fileCount} tệp đề thi và bài làm do SI hoặc bạn tạo để lưu trữ ngoại tuyến
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showToast(`Đang khởi tạo gói sao lưu .zip (${formatStorageSize(storageData.totalUsedBytes)})`)}
                        >
                          <Download size={14} className="mr-1.5" />
                          Tải về
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 10: DỮ LIỆU VÀ QUYỀN RIÊNG TƯ (DATA & PRIVACY) */}
              {activeTab === 'data_privacy' && (
                <div className="space-y-6 animate-fadeIn">
                  <section className="space-y-4">
                    <div className="space-y-0.5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Database size={20} className="text-google-blue" />
                        Dữ liệu và quyền riêng tư
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tùy chọn cho dữ liệu của bạn trên hệ thống KiyoEdu
                      </p>
                    </div>

                    <div className="space-y-[2px]">
                      <button
                        onClick={() => showToast('Đang khởi tạo bản sao dữ liệu')}
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
                        Nâng cấp tài khoản để mở khóa toàn bộ sức mạnh của KiyoEdu
                      </p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Gói đề xuất
                          </span>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            KiyoEdu Pro Unlimited
                          </h3>
                        </div>
                        <Badge variant="warning">VIP</Badge>
                      </div>

                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <li className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 shrink-0" /> Tạo đề thi SI không giới hạn
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
