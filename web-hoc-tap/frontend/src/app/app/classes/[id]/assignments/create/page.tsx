'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, FileText, Check, ChevronRight, Users, PlusCircle, LogIn, GraduationCap } from 'lucide-react';
import { listDocumentFiles } from '@/lib/documentsApi';
import { createClassAssignment, fetchClasses, getLocalClasses } from '@/lib/classesApi';
import { BreadcrumbChevron, BreadcrumbDropdownItem } from '@/components/BreadcrumbChevron';
import DateTimePicker from '@/components/DateTimePicker';
import { CustomSelect } from '@/components/Select';

export default function CreateAssignmentPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { token, user } = useAuthStore();

  const isTeacher = React.useMemo(() => {
    if (!user) return true;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // Breadcrumb dropdown state: all classes
  const [allClasses, setAllClasses] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalClasses();
    }
    return [];
  });

  useEffect(() => {
    let isCancelled = false;
    const loadAll = async () => {
      try {
        const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        const list = await fetchClasses(activeToken, isTeacher);
        if (!isCancelled && Array.isArray(list) && list.length > 0) {
          setAllClasses(list);
        }
      } catch (_) {}
    };
    loadAll();
    return () => {
      isCancelled = true;
    };
  }, [token, isTeacher]);

  const classBreadcrumbItems = React.useMemo<BreadcrumbDropdownItem[]>(() => {
    const items: BreadcrumbDropdownItem[] = [
      {
        label: 'Tất cả lớp học',
        href: '/app/classes',
        icon: <Users size={14} className="text-blue-500 shrink-0" />,
      },
    ];

    if (isTeacher) {
      items.push({
        label: 'Tạo lớp học mới',
        href: '/app/classes/create',
        icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" />,
      });
    }

    items.push({
      label: 'Tham gia lớp học',
      href: '/app/classes/join',
      icon: <LogIn size={14} className="text-purple-500 shrink-0" />,
    });

    if (allClasses && allClasses.length > 0) {
      items.push({ isDivider: true });
      allClasses.forEach((c) => {
        const isCurrent = String(c.id) === String(classId);
        items.push({
          id: String(c.id),
          label: c.name,
          href: `/app/classes/${c.id}`,
          isActive: isCurrent,
          icon: (
            <GraduationCap
              size={14}
              className={isCurrent ? 'text-google-blue shrink-0' : 'text-slate-400 dark:text-slate-500 shrink-0'}
            />
          ),
        });
      });
    }

    return items;
  }, [allClasses, classId, isTeacher]);

  const currentClassObj = React.useMemo(() => {
    const found = allClasses.find((c) => String(c.id) === String(classId));
    if (found) return found;
    if (typeof window !== 'undefined') {
      try {
        const activeRaw = sessionStorage.getItem('current_active_class');
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          if (parsed && (String(parsed.id) === String(classId) || parsed.code === String(classId))) {
            return parsed;
          }
        }
        const cachedName = sessionStorage.getItem('current_active_class_name') || sessionStorage.getItem('current_assignment_class_name');
        if (cachedName) return { id: classId, name: cachedName };
      } catch {}
    }
    return null;
  }, [allClasses, classId]);

  const [documentFiles, setDocumentFiles] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [linkedDocumentFileId, setLinkedDocumentFileId] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [minSubmitMinutes, setMinSubmitMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    fetchDocumentFiles();
  }, [token]);

  const fetchDocumentFiles = async () => {
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const docs = await listDocumentFiles(activeToken || '');
      setDocumentFiles(
        Array.isArray(docs)
          ? docs.filter((doc) => Array.isArray(doc?.parsedQuiz?.questions) && doc.parsedQuiz.questions.length > 0)
          : []
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setFormError(null);
    setLoading(true);

    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      await createClassAssignment(activeToken, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        classId: String(classId),
        documentFileId: linkedDocumentFileId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore),
        durationMinutes: Number(durationMinutes),
        minSubmitMinutes: Number(minSubmitMinutes),
      });

      setToast(true);
      setTimeout(() => {
        router.push(`/app/classes/${classId}`);
      }, 700);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi giao bài tập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={classBreadcrumbItems}
          />
          <button
            type="button"
            onClick={() => router.push(`/app/classes/${classId}`)}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            {currentClassObj?.name || 'Chi tiết lớp'}
          </button>
          <BreadcrumbChevron
            menuTitle={currentClassObj?.name || 'Chi tiết lớp'}
            items={[
              {
                label: currentClassObj?.name ? `Về lớp: ${currentClassObj.name}` : 'Chi tiết lớp',
                href: `/app/classes/${classId}`,
                icon: <GraduationCap size={14} className="text-blue-500 shrink-0" />,
              },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Giao bài tập mới
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã giao bài tập thành công
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <Input
              label="Tiêu đề bài tập"
              placeholder="Ví dụ: Kiểm tra 15 phút Chương 1 - Đại số"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ghi chú / Hướng dẫn học sinh
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Nhập hướng dẫn làm bài cho học sinh"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-google-blue"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hạn nộp (Deadline)
                </label>
                <DateTimePicker
                  value={deadline}
                  onChange={setDeadline}
                  placeholder="Chọn ngày và giờ hạn nộp"
                />
              </div>
              <Input
                label="Thang điểm tối đa"
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                min={1}
                max={100}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thời gian làm bài (Phút)
                </label>
                <CustomSelect
                  value={durationMinutes}
                  onChange={(val) => setDurationMinutes(Number(val))}
                  options={[
                    { value: 0, label: 'Không giới hạn thời gian' },
                    { value: 15, label: '15 phút' },
                    { value: 30, label: '30 phút' },
                    { value: 45, label: '45 phút (Mặc định)' },
                    { value: 60, label: '60 phút' },
                    { value: 90, label: '90 phút' },
                  ]}
                  size="sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thời gian nộp bài tối thiểu
                </label>
                <CustomSelect
                  value={minSubmitMinutes}
                  onChange={(val) => setMinSubmitMinutes(Number(val))}
                  options={[
                    { value: 0, label: 'Không yêu cầu (Nộp bất kỳ lúc nào)' },
                    { value: 5, label: 'Sau tối thiểu 5 phút' },
                    { value: 10, label: 'Sau tối thiểu 10 phút' },
                    { value: 15, label: 'Sau tối thiểu 15 phút' },
                    { value: 20, label: 'Sau tối thiểu 20 phút' },
                    { value: 30, label: 'Sau tối thiểu 30 phút' },
                  ]}
                  size="sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Giao đề từ Kho tài liệu / Đề thi SI (Tùy chọn)
              </label>
              <CustomSelect
                value={linkedDocumentFileId}
                onChange={(val) => setLinkedDocumentFileId(String(val))}
                options={[
                  { value: '', label: '-- Không đính kèm đề thi --' },
                  ...documentFiles.map((doc) => ({
                    value: doc.id,
                    label: `${doc.parsedQuiz?.title || doc.name} (${doc.parsedQuiz?.questions?.length || 0} câu)`,
                  })),
                ]}
                placeholder="-- Không đính kèm đề thi --"
                size="sm"
              />
              <p className="text-[11px] text-slate-500">
                Giao đề trắc nghiệm tạo bằng SI hoặc tải lên từ Kho tài liệu.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang giao...' : 'Giao bài tập ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
