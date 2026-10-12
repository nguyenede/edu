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
} from 'lucide-react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

import {
  fetchClassDetail,
  fetchClassAssignments,
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

type TabKey = 'assignments' | 'students' | 'feed' | 'gradebook';

export default function ClassDetailPage() {
  const { id: classId } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [clazz, setClazz] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [posts, setPosts] = useState<ClassPost[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('assignments');
  const [loading, setLoading] = useState(true);

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

  const isTeacher = user?.role === 'TEACHER';

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

      // 3. Members
      const mems = await fetchClassMembers(activeToken, cId);
      setMembers(mems);

      // 4. Posts
      const pList = getClassPosts(cId);
      setPosts(pList);

      if (detail?.code) {
        const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/app/classes/join?code=${detail.code}` : detail.code;
        QRCode.toDataURL(joinUrl, { width: 220, margin: 1 }).then((url) => setQrDataUrl(url)).catch(() => {});
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
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        maxScore: Number(maxScore),
      });

      setAssignments((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
      setNewTitle('');
      setNewDesc('');
      setDeadline('');
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
      <AppShell>
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
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
          >
            Lớp học của tôi
          </button>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[2]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
            {clazz.name}
          </span>
        </div>
      }
      subtitle={`Mã tham gia lớp: ${clazz.code}`}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleCopyCode} className="gap-1.5">
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            {copiedCode ? 'Đã sao chép' : `Mã lớp: ${clazz.code}`}
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
                onClick={() => setIsCreateAssignOpen(true)}
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
        {/* Navigation Tabs (Original horizontal minimal design) */}
        <div className="flex gap-4 items-center border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`text-sm transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'assignments'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Bài tập & Đề thi ({assignments.length})
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`text-sm transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Danh sách Học sinh ({members.length})
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`text-sm transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'feed'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Bảng tin ({posts.length})
          </button>

          <button
            onClick={() => setActiveTab('gradebook')}
            className={`text-sm transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'gradebook'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Bảng điểm
          </button>
        </div>

        {/* Tab 1: Assignments (Original UI) */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Chưa có bài tập nào được giao
                </h3>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((assign) => (
                  <div
                    key={assign.id}
                    onClick={() => router.push(`/app/assignments/${assign.id}`)}
                    className="py-3.5 px-2 flex justify-between items-center cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg transition-colors group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {assign.title}
                        </h4>
                        {assign.quiz && <Badge variant="info">Trắc nghiệm</Badge>}
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
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                          Thang điểm: {assign.maxScore}
                        </span>
                      </div>

                      {isTeacher && (
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
                      )}

                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Students List (Original Minimal UI with requested features) */}
        {activeTab === 'students' && (
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
                Chưa có học sinh nào tham gia bằng mã lớp: <strong className="font-mono">{clazz.code}</strong>
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
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

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStudentToDelete(studentId)}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs"
                      >
                        Xóa khỏi lớp
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Feed / Bảng tin */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {isTeacher && (
              <form onSubmit={handleCreatePost} className="space-y-2">
                <textarea
                  rows={3}
                  placeholder="Chia sẻ thông báo hoặc hướng dẫn với lớp học..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" type="submit" disabled={!newPostContent.trim()} className="gap-1.5">
                    <Send size={13} />
                    <span>Đăng thông báo</span>
                  </Button>
                </div>
              </form>
            )}

            {posts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Chưa có thông báo nào trên bảng tin.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {posts.map((post) => (
                  <div key={post.id} className="py-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {post.authorName} ({post.authorRole})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Gradebook / Bảng điểm */}
        {activeTab === 'gradebook' && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Chưa có học sinh trong lớp để thống kê điểm.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Học sinh</th>
                      {assignments.map((asg) => (
                        <th key={asg.id} className="py-2.5 px-3 text-center min-w-[100px]">
                          <div className="truncate max-w-[120px]" title={asg.title}>{asg.title}</div>
                          <span className="text-[10px] text-slate-400 font-normal">({asg.maxScore}đ)</span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center font-bold text-blue-600">ĐTB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {members.map((m, idx) => {
                      const name = m.student?.profile?.name || m.name || 'Học sinh';
                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium">{name}</td>
                          {assignments.map((asg) => (
                            <td key={asg.id} className="py-2.5 px-3 text-center text-slate-400">-</td>
                          ))}
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">-</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
          <p className="text-xs text-slate-500">
            Học sinh có thể quét mã QR hoặc dùng mã lớp để tham gia.
          </p>

          {qrDataUrl && (
            <div className="p-3 bg-white rounded-xl inline-block border border-slate-100 mx-auto">
              <img src={qrDataUrl} alt="Mã QR" className="w-44 h-44 mx-auto" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Mã lớp</span>
              <div className="text-sm font-mono font-bold text-blue-600">{clazz.code}</div>
            </div>
            <Button size="sm" onClick={handleCopyCode} className="gap-1.5">
              {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedCode ? 'Đã chép' : 'Sao chép mã'}</span>
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="text-left truncate mr-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Link tham gia</span>
              <div className="text-xs text-slate-500 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/app/classes/join?code=${clazz.code}` : ''}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0">
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                Xem trước danh sách ({excelStudentsPreview.length} học sinh):
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {excelStudentsPreview.map((item, i) => (
                  <div key={i} className="p-2 flex items-center justify-between">
                    <span className="font-medium">{item.name} {item.studentCode && `(${item.studentCode})`}</span>
                    <span className="text-slate-400">{item.gender} • {item.email || item.phone || 'Trống'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
              {excelImporting ? 'Đang thêm...' : `Xác nhận thêm (${excelStudentsPreview.length})`}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Hạn nộp</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d]"
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateAssignOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" type="submit" disabled={!newTitle.trim()}>
              Giao bài tập
            </Button>
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
