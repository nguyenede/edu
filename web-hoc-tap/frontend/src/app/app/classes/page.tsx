'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { CustomSelect } from '@/components/Select';
import {
  GraduationCap,
  Users,
  Plus,
  ChevronRight,
  Copy,
  Check,
  ChevronDown,
  FileSpreadsheet,
  BookOpen,
  Download,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  fetchClasses as apiFetchClasses,
  getLocalClasses,
  ClassItem,
  createClass,
  bulkCreateClasses,
} from '@/lib/classesApi';

const SCHOOL_YEAR_OPTIONS = [
  '2026 - 2027',
  '2025 - 2026',
  '2024 - 2025',
  '2027 - 2028',
];

export default function ClassesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dropdown menu state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isNewTermModalOpen, setIsNewTermModalOpen] = useState(false);

  // Create Class Form State
  const [classNameInput, setClassNameInput] = useState('');
  const [schoolYearInput, setSchoolYearInput] = useState('2026 - 2027');
  const [createLoading, setCreateLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Excel Import State
  const [excelPreview, setExcelPreview] = useState<
    Array<{ name: string; schoolYear: string }>
  >([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelImportLoading, setExcelImportLoading] = useState(false);

  // New Term State
  const [targetYear, setTargetYear] = useState('2027 - 2028');
  const [selectedClassIdsToCopy, setSelectedClassIdsToCopy] = useState<string[]>([]);

  const isTeacher = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const data = await apiFetchClasses(activeToken, isTeacher);
      setClasses(data);
    } catch (err) {
      console.error('Error loading classes:', err);
      setClasses(getLocalClasses());
    } finally {
      setLoading(false);
    }
  }, [token, isTeacher]);

  useEffect(() => {
    loadClasses();

    const handleRefresh = () => {
      loadClasses();
    };
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadClasses]);

  // Click outside listener for action dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-open create class modal if navigated from dashboard or external link
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('create') === 'true' || params.get('new') === 'true') {
          setIsCreateModalOpen(true);
          const currentState = (window.history.state && typeof window.history.state === 'object') ? window.history.state : {};
          window.history.replaceState(currentState, '', '/app/classes');
        }
      }
    } catch (_) {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ==================== CREATE CLASS HANDLERS ====================
  const handleSaveClass = async (closeAfterSave: boolean) => {
    if (!classNameInput.trim()) return;
    setCreateLoading(true);
    try {
      await createClass(token, classNameInput.trim(), user, {
        schoolYear: schoolYearInput,
      });
      loadClasses();
      showToast(`Đã tạo lớp "${classNameInput.trim()}" thành công`);

      if (closeAfterSave) {
        setIsCreateModalOpen(false);
        setClassNameInput('');
      } else {
        setClassNameInput('');
      }
    } catch (err) {
      console.error('Error creating class:', err);
      showToast('Có lỗi xảy ra khi tạo lớp');
    } finally {
      setCreateLoading(false);
    }
  };

  // ==================== EXCEL IMPORT HANDLERS ====================
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Tên lớp': '10A1', 'Năm học': '2026 - 2027' },
      { 'Tên lớp': '10A2', 'Năm học': '2026 - 2027' },
      { 'Tên lớp': '11B1', 'Năm học': '2026 - 2027' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Lop_Hoc');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Lop_Hoc.xlsx');
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const parsed = data
          .map((row) => ({
            name: String(row['Tên lớp'] || row['Ten lop'] || row['name'] || '').trim(),
            schoolYear: String(row['Năm học'] || row['Nam hoc'] || '2026 - 2027').trim(),
          }))
          .filter((item) => item.name.length > 0);

        setExcelPreview(parsed);
      } catch (err) {
        console.error('Error reading excel:', err);
        showToast('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng!');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelImport = () => {
    if (excelPreview.length === 0) return;
    setExcelImportLoading(true);
    try {
      bulkCreateClasses(excelPreview, user);
      loadClasses();
      showToast(`Đã thêm thành công ${excelPreview.length} lớp từ file Excel!`);
      setIsExcelModalOpen(false);
      setExcelPreview([]);
      setExcelFileName(null);
    } catch (err) {
      console.error('Error importing excel classes:', err);
      showToast('Lỗi khi nhập danh sách lớp');
    } finally {
      setExcelImportLoading(false);
    }
  };

  // ==================== NEW TERM HANDLERS ====================
  const handleConfirmNewTerm = () => {
    if (selectedClassIdsToCopy.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 lớp học để nhân bản');
      return;
    }
    const sourceClasses = classes.filter((c) => selectedClassIdsToCopy.includes(c.id));
    const items = sourceClasses.map((c) => ({
      name: c.name,
      schoolYear: targetYear,
    }));
    bulkCreateClasses(items, user);
    loadClasses();
    showToast(`Đã tạo ${items.length} lớp cho khóa học ${targetYear}!`);
    setIsNewTermModalOpen(false);
    setSelectedClassIdsToCopy([]);
  };

  return (
    <AppShell
      title="Lớp học của tôi"
      subtitle={
        isTeacher
          ? 'Quản lý toàn bộ các lớp bạn đang phụ trách và mã tham gia'
          : 'Tất cả các lớp học bạn đã tham gia để nhận bài tập'
      }
      action={
        isTeacher ? (
          <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button
              size="sm"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="gap-1.5"
            >
              <Plus size={16} /> Tạo lớp học
              <ChevronDown size={14} className="opacity-80" />
            </Button>

            {/* Dropdown Menu (Clean, no group) */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1e1f20] rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>Tạo lớp học</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsExcelModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Tạo danh sách lớp bằng excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSelectedClassIdsToCopy(classes.map((c) => c.id));
                    setIsNewTermModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Tạo lớp cho khóa mới</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button size="sm" onClick={() => router.push('/app/classes/join')} className="gap-1.5">
            <Plus size={16} /> Tham gia lớp mới
          </Button>
        )
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-500" />
          {toastMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Classes List (100% Original Minimal Clean UI, no group chips) */}
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center">Đang tải danh sách lớp</p>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <GraduationCap size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chưa có lớp học nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isTeacher
                ? 'Hãy bấm nút Tạo lớp học để bắt đầu quản lý học sinh và giao bài tập.'
                : 'Hãy nhập mã lớp học do giáo viên cung cấp để tham gia vào lớp.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('current_active_class', JSON.stringify(cls));
                    sessionStorage.setItem('current_active_class_id', String(cls.id));
                    sessionStorage.setItem('current_active_class_name', cls.name || '');
                  }
                  router.push(`/app/classes/${cls.id}`);
                }}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg transition-colors select-none group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {cls.name}
                    </h3>
                    {cls.schoolYear && (
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {cls.schoolYear}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {cls._count?.members ?? 0} học sinh
                    </span>
                    {!isTeacher && (
                      <>
                        <span>•</span>
                        <span>Giáo viên: {cls.teacher?.profile?.name || cls.teacher?.email}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>Chi tiết lớp</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== MODAL: THÊM LỚP HỌC (Standard System Modal, No Group) ==================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm lớp học"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <Input
            label="Tên lớp"
            placeholder="Nhập tên lớp"
            value={classNameInput}
            onChange={(e) => setClassNameInput(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Năm học
            </label>
            <CustomSelect
              value={schoolYearInput}
              onChange={(val) => setSchoolYearInput(String(val))}
              options={SCHOOL_YEAR_OPTIONS.map((yr) => ({
                value: yr,
                label: yr,
              }))}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createLoading || !classNameInput.trim()}
              onClick={() => handleSaveClass(true)}
            >
              Lưu
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: EXCEL IMPORT ==================== */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setExcelPreview([]);
          setExcelFileName(null);
        }}
        title="Tạo danh sách lớp bằng Excel"
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Tải file mẫu Excel danh sách lớp học
            </span>
            <Button size="sm" variant="secondary" onClick={handleDownloadTemplate} className="gap-1.5">
              <Download size={13} />
              <span>Tải file mẫu</span>
            </Button>
          </div>

          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {excelFileName ? excelFileName : 'Nhấp hoặc kéo thả file Excel vào đây'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ: .xlsx, .xls, .csv</p>
          </div>

          {excelPreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Xem trước danh sách: {excelPreview.length} lớp
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {excelPreview.map((item, i) => (
                  <div key={i} className="p-2 flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-slate-400">{item.schoolYear}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelPreview([]);
                setExcelFileName(null);
              }}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={excelPreview.length === 0 || excelImportLoading}
              onClick={handleConfirmExcelImport}
              className="gap-1.5"
            >
              <Check size={14} />
              {excelImportLoading ? 'Đang nhập' : `Xác nhận nhập ${excelPreview.length}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: TẠO LỚP CHO KHÓA MỚI ==================== */}
      <Modal
        isOpen={isNewTermModalOpen}
        onClose={() => setIsNewTermModalOpen(false)}
        title="Tạo lớp cho khóa mới"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-500">
            Sao chép danh sách các lớp học sang năm học mới.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Chọn năm học mới mục tiêu
            </label>
            <CustomSelect
              value={targetYear}
              onChange={(val) => setTargetYear(String(val))}
              options={SCHOOL_YEAR_OPTIONS.map((y) => ({
                value: y,
                label: y,
              }))}
              size="sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Chọn các lớp muốn nhân bản {selectedClassIdsToCopy.length}/{classes.length}
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 p-2 space-y-1 text-xs">
              {classes.map((cls) => (
                <label
                  key={cls.id}
                  className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClassIdsToCopy.includes(cls.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClassIdsToCopy((prev) => [...prev, cls.id]);
                      } else {
                        setSelectedClassIdsToCopy((prev) => prev.filter((id) => id !== cls.id));
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>{cls.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsNewTermModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmNewTerm}
              disabled={selectedClassIdsToCopy.length === 0}
            >
              Tạo các lớp đã chọn
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
