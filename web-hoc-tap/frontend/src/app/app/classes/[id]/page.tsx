'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  FileText,
  Users,
  Calendar,
  Plus,
  Trash2,
  Copy,
  Check,
  Award,
  ChevronRight,
  Share2,
  FileSpreadsheet,
  Download,
  Upload,
  MessageSquare,
  BookOpen,
  Send,
  Search,
  Play,
  ExternalLink,
  GraduationCap,
  PlusCircle,
  LogIn,
} from 'lucide-react';
import { safeLocalStorageGet } from '@/lib/safeStorage';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { listDocumentFiles } from '@/lib/documentsApi';
import DateTimePicker from '@/components/DateTimePicker';

import {
  fetchClasses,
  getLocalClasses,
  fetchClassDetail,
  fetchClassAssignments,
  fetchAssignmentSubmissions,
  fetchClassMembers,
  deleteClass,
  removeStudentFromClass,
  createClassAssignment,
  deleteClassAssignment,
  addStudentToClassManual,
  bulkAddStudentsToClass,
  getClassPosts,
  createClassPost,
  ClassPost,
} from '@/lib/classesApi';
import { BreadcrumbChevron, BreadcrumbDropdownItem } from '@/components/BreadcrumbChevron';

type TabKey = 'assignments' | 'students' | 'gradebook';

export default function ClassDetailPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [clazz, setClazz] = useState<any>(() => {
    if (typeof window !== 'undefined' && classId) {
      try {
        const list = getLocalClasses();
        const found = list.find((c: any) => String(c.id) === String(classId));
        if (found) return found;
      } catch {}
    }
    return null;
  });
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any[]>>({});
  const [posts, setPosts] = useState<ClassPost[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('assignments');
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && classId) {
      try {
        const list = getLocalClasses();
        const found = list.find((c: any) => String(c.id) === String(classId));
        if (found) return false;
      } catch {}
    }
    return true;
  });

  // Search in Students
  const [studentSearch, setStudentSearch] = useState('');

  // Modals & Actions
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isExcelStudentModalOpen, setIsExcelStudentModalOpen] = useState(false);
  const [isCreateAssignOpen, setIsCreateAssignOpen] = useState(false);
  const [isDeleteClassOpen, setIsDeleteClassOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any>(null);

  // Feedback states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    studentCode: '',
    email: '',
    phone: '',
    gender: 'Nam',
    dob: '',
  });

  // Excel Students Upload State
  const [excelStudentsPreview, setExcelStudentsPreview] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelImporting, setExcelImporting] = useState(false);

  // Post form state
  const [newPostContent, setNewPostContent] = useState('');

  // Assignment Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [documentFiles, setDocumentFiles] = useState<any[]>([]);
  const [linkedDocumentFileId, setLinkedDocumentFileId] = useState('');

  const isTeacher = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // Danh sách các lớp học phục vụ cho menu thả xuống của mũi tên Breadcrumb
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

  const classBreadcrumbItems = useMemo<BreadcrumbDropdownItem[]>(() => {
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

  const resolveAssignmentPin = (assign: any): string => {
    if (assign?.pin && String(assign.pin).trim()) {
      return String(assign.pin).trim();
    }
    if (assign?.pinCode && String(assign.pinCode).trim()) {
      return String(assign.pinCode).trim();
    }
    try {
      const rawHw = safeLocalStorageGet('app_blooket_homeworks');
      if (rawHw) {
        const hwList = JSON.parse(rawHw);
        if (Array.isArray(hwList)) {
          const found = hwList.find((h: any) => h.id === assign.id || h.title === assign.title || h.pin === assign.id);
          if (found?.pin) return String(found.pin).trim();
        }
      }
    } catch (_) {}
    if (assign?.description && typeof assign.description === 'string') {
      const match = assign.description.match(/"pin":\s*"(\d+)"/);
      if (match && match[1]) return match[1];
    }
    const numericPart = assign?.id ? String(assign.id).replace(/\D/g, '').slice(-6) : '';
    if (numericPart && numericPart.length === 6) return numericPart;
    return String(assign.id);
  };

  const handleOpenExamInNewTab = (assign: any) => {
    const pin = resolveAssignmentPin(assign);
    window.open(`/play?pin=${pin}`, '_blank');
  };

  // Tự động chuyển hướng xóa bỏ dấu gạch dưới '_' trên URL nếu đường dẫn hiện tại chứa '_'
  useEffect(() => {
    if (classId && typeof classId === 'string' && classId.includes('_')) {
      const cleanId = classId.replace(/_/g, '');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath.includes(classId)) {
        router.replace(currentPath.replace(classId, cleanId));
      } else {
        router.replace(`/app/classes/${cleanId}`);
      }
    }
  }, [classId, router]);

  useEffect(() => {
    if (!isTeacher && activeTab === 'students') {
      setActiveTab('assignments');
    }
  }, [isTeacher, activeTab]);

  useEffect(() => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!activeToken) {
      router.push('/login');
      return;
    }
    fetchClassData();
  }, [token, classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const cId = String(classId);

      // 1. Class Detail
      const detail = await fetchClassDetail(activeToken, cId);
      setClazz(detail);

      // 2. Assignments
      const asgs = await fetchClassAssignments(activeToken, cId);
      setAssignments(asgs);

      // Fetch submissions for all assignments for the gradebook
      try {
        const subsPromises = asgs.map(async (a: any) => {
          const subs = await fetchAssignmentSubmissions(activeToken, a.id);
          return { id: a.id, subs };
        });
        const subsResults = await Promise.all(subsPromises);
        const sMap: Record<string, any[]> = {};
        subsResults.forEach((r) => {
          sMap[r.id] = r.subs;
        });
        setSubmissionsMap(sMap);
      } catch (subErr) {
        console.error('Error fetching submissions for gradebook:', subErr);
      }

      // 3. Members
      const mems = await fetchClassMembers(activeToken, cId);
      setMembers(mems);

      // 4. Posts
      const pList = getClassPosts(cId);
      setPosts(pList);

      // 5. Document Files for Assignment Quiz Linking
      try {
        const docs = await listDocumentFiles(activeToken || '');
        setDocumentFiles(
          Array.isArray(docs)
            ? docs.filter((doc) => Array.isArray(doc?.parsedQuiz?.questions) && doc.parsedQuiz.questions.length > 0)
            : []
        );
      } catch (docErr) {
        console.error('Error fetching docs for assignments:', docErr);
      }

      if (detail?.code) {
        const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/app/classes/join?code=${detail.code}` : detail.code;
        QRCode.toDataURL(joinUrl, { width: 320, margin: 2 }).then((url) => setQrDataUrl(url)).catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching class data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!clazz) return;
    navigator.clipboard.writeText(clazz.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!clazz?.code) return;
    const url = `${window.location.origin}/app/classes/join?code=${clazz.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Lop_${clazz?.code || 'Class'}_${(clazz?.name || '').slice(0, 20)}.png`;
    a.click();
  };

  // ==================== ASSIGNMENT HANDLERS ====================
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    try {
      const created = await createClassAssignment(activeToken, {
        title: newTitle.trim(),
        description: newDesc || undefined,
        classId: String(classId),
        documentFileId: linkedDocumentFileId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore),
      });

      setAssignments((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setNewTitle('');
      setNewDesc('');
      setDeadline('');
      setLinkedDocumentFileId('');
      setIsCreateAssignOpen(false);
    } catch (err: any) {
      console.error('Error creating assignment:', err);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClassAssignment(activeToken, String(classId), assignmentToDelete.id);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentToDelete.id));
    setAssignmentToDelete(null);
  };

  // ==================== STUDENT HANDLERS ====================
  const handleAddStudentManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) return;

    addStudentToClassManual(String(classId), studentForm);
    fetchClassData();
    setIsAddStudentModalOpen(false);
    setStudentForm({
      name: '',
      studentCode: '',
      email: '',
      phone: '',
      gender: 'Nam',
      dob: '',
    });
  };

  const handleDownloadStudentTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Mã học sinh': 'HS001',
        'Họ và tên': 'Nguyễn Văn An',
        'Email': 'an.nguyen@example.com',
        'Số điện thoại': '0912345678',
        'Giới tính': 'Nam',
      },
      {
        'Mã học sinh': 'HS002',
        'Họ và tên': 'Trần Thị Bình',
        'Email': 'binh.tran@example.com',
        'Số điện thoại': '0987654321',
        'Giới tính': 'Nữ',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Hoc_Sinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh.xlsx');
  };

  const handleExcelStudentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            studentCode: String(row['Mã học sinh'] || row['Ma hoc sinh'] || '').trim(),
            name: String(row['Họ và tên'] || row['Ho va ten'] || row['name'] || '').trim(),
            email: String(row['Email'] || row['email'] || '').trim(),
            phone: String(row['Số điện thoại'] || row['So dien thoai'] || '').trim(),
            gender: String(row['Giới tính'] || row['Gioi tinh'] || 'Nam').trim(),
          }))
          .filter((s) => s.name.length > 0);

        setExcelStudentsPreview(parsed);
      } catch (err) {
        console.error('Error parsing excel:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelStudents = () => {
    if (excelStudentsPreview.length === 0) return;
    setExcelImporting(true);
    try {
      bulkAddStudentsToClass(String(classId), excelStudentsPreview);
      fetchClassData();
      setIsExcelStudentModalOpen(false);
      setExcelStudentsPreview([]);
      setExcelFileName(null);
    } finally {
      setExcelImporting(false);
    }
  };

  const handleExportStudentsExcel = () => {
    if (members.length === 0) return;
    const exportData = members.map((m, index) => ({
      STT: index + 1,
      'Mã học sinh': m.studentCode || `HS${1000 + index}`,
      'Họ và tên': m.student?.profile?.name || m.name || 'Học sinh',
      'Email': m.student?.email || m.email || '',
      'Số điện thoại': m.phone || m.student?.phone || '',
      'Giới tính': m.gender || 'Nam',
      'Ngày tham gia': m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('vi-VN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Hoc_Sinh');
    XLSX.writeFile(wb, `Danh_Sach_Lop_${clazz?.name || 'HocSinh'}.xlsx`);
  };

  const handleRemoveStudent = async () => {
    if (!studentToDelete) return;
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await removeStudentFromClass(activeToken, String(classId), studentToDelete);
    setMembers((prev) => prev.filter((m) => m.student?.id !== studentToDelete && m.studentId !== studentToDelete && m.id !== studentToDelete));
    setStudentToDelete(null);
  };

  // ==================== POSTS ====================
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    const authorName = user?.name || user?.email || 'Giáo viên';
    const newPost = createClassPost(String(classId), authorName, newPostContent.trim());
    setPosts((prev) => [newPost, ...prev]);
    setNewPostContent('');
  };

  const handleDeleteClass = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    await deleteClass(activeToken, String(classId));
    router.push('/app/classes');
  };

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    if (!studentSearch.trim()) return members;
    const q = studentSearch.toLowerCase();
    return members.filter((m) => {
      const name = (m.student?.profile?.name || m.name || '').toLowerCase();
      const email = (m.student?.email || m.email || '').toLowerCase();
      const code = (m.studentCode || '').toLowerCase();
      return name.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [members, studentSearch]);

  if (loading && !clazz) {
    return (
      <AppShell
        title={
          <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
            <button
              type="button"
              onClick={() => router.push('/app/classes')}
              className="cursor-pointer text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap"
            >
              Lớp học của tôi
            </button>
            <BreadcrumbChevron isStatic={true} />
            <span className="text-slate-900 dark:text-white font-semibold truncate min-w-0">
              Chi tiết lớp học
            </span>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-google-blue"></div>
          <p className="text-xs text-slate-400">Đang tải thông tin lớp học...</p>
        </div>
      </AppShell>
    );
  }

  if (!clazz) {
    return (
      <AppShell title="Không tìm thấy lớp học">
        <div className="p-12 text-center space-y-4">
          <p className="text-sm text-slate-500">Lớp học không tồn tại hoặc đã bị xóa.</p>
          <Button onClick={() => router.push('/app/classes')}>Quay lại danh sách lớp học</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="cursor-pointer text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={classBreadcrumbItems}
          />
          <span className="text-slate-900 dark:text-white font-semibold truncate min-w-0 flex-1">
            {clazz.name}
          </span>
        </div>
      }
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyCode} className="gap-1.5 font-mono">
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            {copiedCode ? 'Đã sao chép' : clazz.code}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            className="gap-1.5"
            title="Chia sẻ lớp học"
          >
            <Share2 size={14} /> Chia sẻ
          </Button>

          {isTeacher && (
            <>
              <Button
                size="sm"
                onClick={() => router.push(`/app/documents?assignClassId=${classId}&className=${encodeURIComponent(clazz?.name || '')}`)}
                className="gap-1.5"
              >
                <Plus size={16} /> Giao bài tập
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteClassOpen(true)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                title="Xóa lớp"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs (Thiết kế thanh tab hiện đại dạng thẻ mềm, không gạch chân hay đường kẻ) */}
        <div className="flex gap-2 sm:gap-2.5 items-center overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm tracking-tight whitespace-nowrap cursor-pointer transition-all rounded-xl ${
              activeTab === 'assignments'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            Bài tập và Đề thi
          </button>

          {isTeacher && (
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm tracking-tight whitespace-nowrap cursor-pointer transition-all rounded-xl ${
                activeTab === 'students'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
              }`}
            >
              Danh sách Học sinh
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm tracking-tight whitespace-nowrap cursor-pointer transition-all rounded-xl ${
              activeTab === 'gradebook'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
            }`}
          >
            Bảng điểm
          </button>
        </div>

        {/* Tab 1: Assignments (Original UI) */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Chưa có bài tập nào được giao cho lớp này
                </h3>
              </div>
            ) : (
              <div className="space-y-1.5">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    onClick={() => {
                      if (isTeacher) {
                        router.push(`/app/assignments/${assign.id}`);
                      } else {
                        handleOpenExamInNewTab(assign);
                      }
                    }}
                    className="py-3.5 px-3 flex justify-between items-center cursor-pointer select-none hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-xl transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {assign.title}
                        </h4>
                        {assign.quiz && <Badge variant="info">Trắc nghiệm</Badge>}
                        {assign.antiCheat && (
                          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/60">
                            Chống gian lận
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} />
                        Hạn nộp:{' '}
                        {assign.deadline
                          ? new Date(assign.deadline).toLocaleString('vi-VN')
                          : 'Không giới hạn'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isTeacher ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenExamInNewTab(assign);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-google-blue hover:bg-[#1557b0] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                          title="Mở phòng thi làm bài trong tab mới"
                        >
                          <Play size={13} className="fill-current" />
                          <span>Vào làm bài</span>
                          <ExternalLink size={12} className="opacity-80" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignmentToDelete(assign);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Xóa bài tập"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}

                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Students List (Teacher only) */}
        {isTeacher && activeTab === 'students' && (
          <div className="space-y-4">
            {/* Action Bar for Students */}
            {isTeacher && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã HS..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {members.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={handleExportStudentsExcel} className="gap-1.5">
                      <Download size={13} />
                      <span>Xuất Excel</span>
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setIsExcelStudentModalOpen(true)} className="gap-1.5">
                    <FileSpreadsheet size={13} />
                    <span>Thêm bằng Excel</span>
                  </Button>
                  <Button size="sm" onClick={() => setIsAddStudentModalOpen(true)} className="gap-1.5">
                    <Plus size={14} />
                    <span>Thêm học sinh</span>
                  </Button>
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Chưa có học sinh nào tham gia lớp này.
              </p>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((m) => {
                  const studentName = m.student?.profile?.name || m.student?.name || m.name || m.student?.email || m.email || 'Học sinh';
                  const studentEmail = m.student?.email || m.email || '';
                  const studentId = m.student?.id || m.studentId || m.id;
                  const initialChar = (studentName ? studentName[0] : 'S').toUpperCase();

                  return (
                    <div
                      key={m.id || studentId}
                      className="py-3 px-2 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200">
                          {initialChar}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {studentName}
                          </span>
                          {studentEmail && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {studentEmail}
                            </span>
                          )}
                        </div>
                      </div>

                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStudentToDelete(studentId)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                        >
                          Xóa khỏi lớp
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}



        {/* Tab 4: Gradebook / Bảng điểm */}
        {activeTab === 'gradebook' && (() => {
          const displayedMembers = members.filter((m) => {
            if (isTeacher) return true;
            const studentId = m.student?.id || m.studentId || m.id;
            const studentEmail = (m.student?.email || m.email || '').toLowerCase().trim();
            const myId = user?.id;
            const myEmail = (user?.email || '').toLowerCase().trim();
            return (myId && studentId === myId) || (myEmail && studentEmail === myEmail);
          });

          return (
            <div className="space-y-4">
              {displayedMembers.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  {isTeacher ? 'Chưa có học sinh trong lớp để thống kê điểm.' : 'Chưa có dữ liệu điểm của bạn trong lớp học này.'}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3 min-w-[140px]">{isTeacher ? 'Học sinh' : 'Tên bạn'}</th>
                        {assignments.map((asg) => (
                          <th key={asg.id} className="py-2.5 px-3 text-center min-w-[100px]">
                            <div className="truncate-tight max-w-[120px] mx-auto" title={asg.title}>{asg.title}</div>
                            <span className="text-[10px] text-slate-400 font-normal">({asg.maxScore}đ)</span>
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-center font-bold text-blue-600">ĐTB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMembers.map((m, idx) => {
                        const name = m.student?.profile?.name || m.name || 'Học sinh';
                        const studentId = m.student?.id || m.studentId || m.id;
                        const studentEmail = (m.student?.email || m.email || '').toLowerCase().trim();
                        const cleanName = name.toLowerCase().trim();

                        // Collect graded scores for this student across all class assignments
                        const scores: number[] = [];
                        const assignmentCells = assignments.map((asg) => {
                          const subs = submissionsMap[asg.id] || [];
                          const sub = subs.find((s: any) => {
                            if (studentId && (s.studentId === studentId || s.student?.id === studentId)) return true;
                            if (studentEmail && ((s.student?.email || '').toLowerCase().trim() === studentEmail)) return true;
                            if (cleanName && ((s.student?.profile?.name || s.studentName || s.student?.name || '').toLowerCase().trim() === cleanName)) return true;
                            return false;
                          });

                          if (sub && sub.score !== null && sub.score !== undefined) {
                            scores.push(Number(sub.score));
                            return (
                              <td key={asg.id} className="py-2.5 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                {sub.score}
                              </td>
                            );
                          }

                          return (
                            <td key={asg.id} className="py-2.5 px-3 text-center text-slate-400">
                              -
                            </td>
                          );
                        });

                        const avgScore = scores.length > 0
                          ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
                          : '-';

                        return (
                          <tr key={m.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{name}</td>
                            {assignmentCells}
                            <td className="py-2.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                              {avgScore}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ==================== MODALS ==================== */}
      {/* Modal Chia sẻ lớp */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Chia sẻ lớp học"
        maxWidth="md"
      >
        <div className="space-y-4 pt-1 text-center">
          {/* Mã tham gia lớp học box - Đã chuyển lên đầu & bấm để sao chép như giao bài tập */}
          <div
            onClick={handleCopyCode}
            className="p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-center cursor-pointer hover:bg-blue-100/70 dark:hover:bg-blue-900/40 transition-colors select-none"
            title="Bấm để sao chép mã lớp"
          >
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
              Mã tham gia lớp học
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-black text-blue-700 dark:text-blue-300 tracking-widest mt-0.5">
              {clazz?.code}
            </div>
            {copiedCode && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 inline-block animate-pulse">
                ✓ Đã sao chép mã lớp
              </span>
            )}
          </div>

          {qrDataUrl ? (
            <div className="p-4 bg-white rounded-3xl inline-block mx-auto shadow-md border border-slate-200/80">
              <img src={qrDataUrl} alt="Mã QR tham gia lớp" className="w-56 h-56 mx-auto object-contain" />
            </div>
          ) : (
            <div className="w-56 h-56 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-xs text-slate-400">
              Đang tạo mã QR...
            </div>
          )}

          {/* Link box */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10">
            <div className="text-left truncate mr-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Đường dẫn tham gia
              </span>
              <div className="text-xs text-slate-600 dark:text-zinc-300 font-medium truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/app/classes/join?code=${clazz?.code}` : ''}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0 rounded-xl">
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {qrDataUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadQr}
                className="rounded-xl text-xs gap-1.5"
                title="Tải ảnh QR về máy để in hoặc chia sẻ"
              >
                <Download size={14} />
                <span>Tải ảnh QR về máy</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const url = `/app/classes/join?code=${clazz?.code}`;
                window.open(url, '_blank');
              }}
              className="rounded-xl text-xs gap-1.5 bg-google-blue hover:bg-[#1557b0] text-white"
            >
              <ExternalLink size={14} />
              <span>Mở thử liên kết</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Thêm học sinh thủ công */}
      <Modal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        title="Thêm học sinh vào lớp"
        maxWidth="md"
      >
        <form onSubmit={handleAddStudentManual} className="space-y-4 pt-1">
          <Input
            label="Họ và tên học sinh"
            placeholder="Ví dụ: Nguyễn Văn An"
            value={studentForm.name}
            onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mã học sinh"
              placeholder="HS001 (tùy chọn)"
              value={studentForm.studentCode}
              onChange={(e) => setStudentForm({ ...studentForm, studentCode: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Giới tính</label>
              <select
                value={studentForm.gender}
                onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d]"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              placeholder="an@example.com"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
            />
            <Input
              label="Số điện thoại"
              placeholder="0912345678"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddStudentModalOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" type="submit" disabled={!studentForm.name.trim()}>
              Lưu học sinh
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Thêm học sinh bằng Excel */}
      <Modal
        isOpen={isExcelStudentModalOpen}
        onClose={() => {
          setIsExcelStudentModalOpen(false);
          setExcelStudentsPreview([]);
          setExcelFileName(null);
        }}
        title="Thêm học sinh bằng Excel"
        maxWidth="lg"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Tải file mẫu Excel danh sách học sinh
            </span>
            <Button size="sm" variant="secondary" onClick={handleDownloadStudentTemplate} className="gap-1.5">
              <Download size={13} />
              <span>Tải file mẫu</span>
            </Button>
          </div>

          <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelStudentUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {excelFileName ? excelFileName : 'Nhấp hoặc kéo thả file Excel học sinh vào đây'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ: .xlsx, .xls, .csv</p>
          </div>

          {excelStudentsPreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Xem trước danh sách: {excelStudentsPreview.length} học sinh
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg space-y-1 text-xs">
                {excelStudentsPreview.map((item, i) => (
                  <div key={i} className="p-2 flex items-center justify-between">
                    <span className="font-medium">{item.name} {item.studentCode && ` - ${item.studentCode}`}</span>
                    <span className="text-slate-400">{item.gender}, {item.email || item.phone || 'Trống'}</span>
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
                setIsExcelStudentModalOpen(false);
                setExcelStudentsPreview([]);
                setExcelFileName(null);
              }}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={excelStudentsPreview.length === 0 || excelImporting}
              onClick={handleConfirmExcelStudents}
              className="gap-1.5"
            >
              <Check size={14} />
              {excelImporting ? 'Đang thêm...' : `Xác nhận thêm ${excelStudentsPreview.length}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Giao bài tập */}
      <Modal
        isOpen={isCreateAssignOpen}
        onClose={() => setIsCreateAssignOpen(false)}
        title="Giao bài tập mới"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 pt-1">
          <Input
            label="Tiêu đề bài tập"
            placeholder="Ví dụ: Ôn tập chương 1..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Mô tả bài tập
            </label>
            <textarea
              rows={3}
              placeholder="Hướng dẫn cho học sinh..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Đính kèm đề thi từ Kho tài liệu (Tùy chọn)
            </label>
            <select
              value={linkedDocumentFileId}
              onChange={(e) => {
                const docId = e.target.value;
                setLinkedDocumentFileId(docId);
                if (docId && !newTitle.trim()) {
                  const matched = documentFiles.find((d) => d.id === docId);
                  if (matched) {
                    setNewTitle(matched.parsedQuiz?.title || matched.name);
                  }
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Tự nhập / Không đính kèm đề trắc nghiệm --</option>
              {documentFiles.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.parsedQuiz?.title || doc.name} ({doc.parsedQuiz?.questions?.length || 0} câu)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Hệ thống sẽ tự động chấm điểm bài làm của học sinh khi đính kèm đề trắc nghiệm.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Hạn nộp</label>
              <DateTimePicker
                value={deadline}
                onChange={setDeadline}
                placeholder="Chọn ngày và giờ hạn nộp"
              />
            </div>
            <Input
              label="Thang điểm"
              type="number"
              min={1}
              max={100}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreateAssignOpen(false);
                router.push(`/classes/${classId}/assignments/create`);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Mở trang soạn đề đầy đủ &rarr;
            </button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateAssignOpen(false)}>
                Hủy
              </Button>
              <Button size="sm" type="submit" disabled={!newTitle.trim()}>
                Giao bài tập
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Assignment Confirmation */}
      <ConfirmDialog
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={handleDeleteAssignment}
        title="Xóa bài tập này?"
        message={`Bạn có chắc chắn muốn xóa bài tập "${assignmentToDelete?.title}"?`}
        isDestructive
        confirmText="Xóa bài tập"
      />

      {/* Delete Class Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteClassOpen}
        onClose={() => setIsDeleteClassOpen(false)}
        onConfirm={handleDeleteClass}
        title="Xóa lớp học này?"
        message="Hành động này sẽ xóa toàn bộ bài tập và dữ liệu học sinh của lớp."
        isDestructive
        confirmText="Xóa lớp vĩnh viễn"
      />

      {/* Remove Student Confirmation */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleRemoveStudent}
        title="Xóa học sinh khỏi lớp?"
        message="Học sinh này sẽ không còn quyền truy cập vào các bài tập của lớp."
        isDestructive
        confirmText="Xóa học sinh"
      />
    </AppShell>
  );
}
