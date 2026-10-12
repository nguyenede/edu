import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { useAuthStore } from '../../store/authStore';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Heart,
  Award,
  Sparkles,
  Plus
} from 'lucide-react';
import { BACKEND_URL } from '../../lib/api';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';


interface Student {
  id: number;
  student_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  place_of_birth: string;
  nationality: string;
  ethnicity: string;
  identity_number: string;
  identity_issue_date: string;
  identity_issue_place: string;
  address: string;
  permanent_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  class_name: string;
  admission_date: string;
  previous_school: string;
  academic_year: string;
  status: string;
  note: string;
  avatar_url: string;
}

interface File {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  active: 'Đang học', inactive: 'Tạm nghỉ', graduated: 'Đã tốt nghiệp', suspended: 'Đình chỉ'
};
const genderLabels: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const formatDate = (value?: string) => {
  if (!value) return 'Chưa cập nhật';
  const normalized = value.slice(0, 10);
  const [year, month, day] = normalized.split('-');
  return year && month && day ? `${day}/${month}/${year}` : 'Chưa cập nhật';
};
const InfoRow: React.FC<{ label: string; value?: React.ReactNode; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] gap-4 py-3 border-b border-[#F5F5F7]">
    <span className="text-[#6E6E73]">{label}</span>
    <span className={`font-medium text-right break-words ${accent ? 'text-[#0071E3] font-semibold' : ''}`}>{value || 'Chưa cập nhật'}</span>
  </div>
);

const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [studentParents, setStudentParents] = useState<any[]>([]);
  const [allParents, setAllParents] = useState<any[]>([]);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'grades' | 'attendance' | 'health' | 'behavior' | 'ai_analytics'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const tabStripRef = useRef<HTMLDivElement>(null);
  const tabDragStartXRef = useRef(0);
  const tabDragStartScrollLeftRef = useRef(0);
  const suppressTabClickRef = useRef(false);
  
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canEditExtended = isAdmin || isTeacher;
  const canUploadDocument = canEditExtended || (user?.role === 'student' && Number(user.specificId) === Number(id));

  // Student OS Extended Modules State
  const [health, setHealth] = useState<any | null>(null);
  const [behavior, setBehavior] = useState<any[]>([]);
  const [aiPrediction, setAiPrediction] = useState<any | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingBehavior, setIsLoadingBehavior] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const [healthForm, setHealthForm] = useState({
    height_cm: '',
    weight_kg: '',
    blood_type: '',
    allergies: '',
    medical_history: '',
    physical_status: ''
  });

  const [behaviorForm, setBehaviorForm] = useState({
    type: 'reward',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    decision_number: ''
  });
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentRes, filesRes, gradesRes, attendanceRes, parentsRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/upload/files`, { params: { owner_type: 'student', owner_id: id } }),
        api.get(`/grades`, { params: { student_id: id } }),
        api.get(`/attendance`, { params: { student_id: id } }),
        api.get(`/parents/student/${id}`)
      ]);
      setStudent(studentRes.data.data);
      setFiles(filesRes.data.data);
      setGrades(gradesRes.data.data);
      setAttendance(attendanceRes.data.data);
      setStudentParents(parentsRes.data.data);
    } catch (error) {
      console.error('Error fetching student detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await api.get(`/students/${id}/health`);
      setHealth(res.data.data);
      setHealthForm({
        height_cm: res.data.data.height_cm?.toString() || '',
        weight_kg: res.data.data.weight_kg?.toString() || '',
        blood_type: res.data.data.blood_type || '',
        allergies: res.data.data.allergies || '',
        medical_history: res.data.data.medical_history || '',
        physical_status: res.data.data.physical_status || ''
      });
    } catch (e) {
      console.error('Error fetching health:', e);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const saveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/students/${id}/health`, {
        height_cm: healthForm.height_cm ? parseFloat(healthForm.height_cm) : null,
        weight_kg: healthForm.weight_kg ? parseFloat(healthForm.weight_kg) : null,
        blood_type: healthForm.blood_type,
        allergies: healthForm.allergies,
        medical_history: healthForm.medical_history,
        physical_status: healthForm.physical_status
      });
      toast.success('Đã cập nhật thông tin y tế.');
      fetchHealth();
    } catch (e) {
      console.error(e);
      toast.error('Có lỗi xảy ra khi cập nhật thông tin y tế.');
    }
  };

  const fetchBehavior = async () => {
    setIsLoadingBehavior(true);
    try {
      const res = await api.get(`/students/${id}/behavior`);
      setBehavior(res.data.data);
    } catch (e) {
      console.error('Error fetching behavior:', e);
    } finally {
      setIsLoadingBehavior(false);
    }
  };

  const addBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/students/${id}/behavior`, behaviorForm);
      toast.success('Đã thêm quyết định.');
      setIsBehaviorModalOpen(false);
      setBehaviorForm({
        type: 'reward',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        decision_number: ''
      });
      fetchBehavior();
    } catch (e) {
      console.error(e);
      toast.error('Có lỗi xảy ra khi thêm khen thưởng/kỷ luật.');
    }
  };

  const deleteBehavior = async (behaviorId: number) => {
    const confirmed = await confirm({
      title: 'Xóa quyết định?',
      description: 'Bản ghi khen thưởng hoặc kỷ luật này sẽ bị xóa vĩnh viễn.',
      confirmText: 'Xóa quyết định',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/students/${id}/behavior/${behaviorId}`);
      toast.success('Đã xóa quyết định.');
      fetchBehavior();
    } catch (e) {
      console.error('Error deleting behavior:', e);
      toast.error('Không thể xóa quyết định.');
    }
  };

  const fetchAiPrediction = async () => {
    setIsLoadingAi(true);
    try {
      const res = await api.get(`/students/${id}/ai-prediction`);
      setAiPrediction(res.data.data);
    } catch (e) {
      console.error('Error fetching AI prediction:', e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'health') fetchHealth();
    if (activeTab === 'behavior') fetchBehavior();
    if (activeTab === 'ai_analytics') fetchAiPrediction();
  }, [activeTab, id]);


  const searchParents = async () => {
    if (!parentSearch) return;
    try {
      const res = await api.get('/parents', { params: { search: parentSearch } });
      setAllParents(res.data.data);
    } catch (error) {
      console.error('Search parents error:', error);
    }
  };

  const linkParent = async (parentId: number) => {
    try {
      await api.post('/parents/link', { student_id: id, parent_id: parentId });
      toast.success('Đã liên kết phụ huynh.');
      setIsParentModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi liên kết');
    }
  };

  const unlinkParent = async (parentId: number) => {
    const confirmed = await confirm({
      title: 'Hủy liên kết phụ huynh?',
      description: 'Phụ huynh sẽ không còn được liên kết với hồ sơ học sinh này.',
      confirmText: 'Hủy liên kết',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/parents/unlink/${id}/${parentId}`);
      toast.success('Đã hủy liên kết phụ huynh.');
      fetchData();
    } catch (error) {
      console.error('Unlink error:', error);
      toast.error('Không thể hủy liên kết phụ huynh.');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (parentSearch.length > 1) searchParents();
    }, 300);
    return () => clearTimeout(timer);
  }, [parentSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('owner_type', 'student');
    formData.append('owner_id', id || '');

    try {
      await api.post('/upload/document', formData);
      toast.success('Đã tải lên tài liệu.');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải file');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFile = async (file: File) => {
    try {
      const response = await api.get(`/upload/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Không thể tải tài liệu.'); }
  };

  const deleteFile = async (file: File) => {
    const confirmed = await confirm({
      title: 'Xóa tài liệu?',
      description: `Tài liệu ${file.file_name} sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa tài liệu',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/upload/files/${file.id}`);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      toast.success('Đã xóa tài liệu.');
    } catch { toast.error('Bạn không có quyền xóa tài liệu này.'); }
  };

  const handleTabPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    suppressTabClickRef.current = false;
    tabDragStartXRef.current = event.clientX;
    tabDragStartScrollLeftRef.current = event.currentTarget.scrollLeft;
  };

  const handleTabPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;

    const deltaX = event.clientX - tabDragStartXRef.current;
    if (Math.abs(deltaX) > 12) {
      suppressTabClickRef.current = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (!suppressTabClickRef.current) return;

    event.currentTarget.scrollLeft = tabDragStartScrollLeftRef.current - deltaX;
  };

  const handleTabPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Đang tải thông tin...</div>;
  if (!student) return <div className="p-8 text-center">Không tìm thấy học sinh.</div>;

  const attendanceColumns = [
    { header: 'Ngày', accessor: (item: any) => new Date(item.date).toLocaleDateString('vi-VN') },
    { 
      header: 'Trạng thái', 
      accessor: (item: any) => (
        <Badge variant={item.status === 'present' ? 'success' : item.status === 'absent' ? 'error' : 'warning'}>
          {item.status === 'present' ? 'Có mặt' : item.status === 'absent' ? 'Vắng mặt' : item.status === 'late' ? 'Đi muộn' : 'Có phép'}
        </Badge>
      ) 
    },
    { header: 'Ghi chú', accessor: 'note' as const },
  ];

  const gradeColumns = [
    { header: 'Môn học', accessor: 'subject_name' as const },
    { header: 'Miệng', accessor: 'oral_score' as const },
    { header: '15p', accessor: 'quiz_score' as const },
    { header: '1 tiết', accessor: 'test_score' as const },
    { header: 'Giữa kỳ', accessor: 'midterm_score' as const },
    { header: 'Cuối kỳ', accessor: 'final_score' as const },
    { 
      header: 'Trung bình', 
      accessor: (item: any) => <span className="font-bold text-[#0071E3]">{item.average_score}</span> 
    },
  ];

  return (
    <div>

      <div className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 md:p-12 bg-[#F5F5F7]/50 border-b border-[#EDEDF2]">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            <div className="w-32 h-32 rounded-full bg-[#EDEDF2] overflow-hidden border-4 border-white shadow-lg shrink-0">
              {student.avatar_url ? (
                <img src={`${BACKEND_URL}${student.avatar_url}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-6 text-[#6E6E73]" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h1 className="text-[34px] font-semibold text-[#1D1D1F] font-display">{student.full_name}</h1>
                <Badge variant={student.status === 'suspended' ? 'error' : student.status === 'inactive' ? 'inactive' : 'success'}>
                  {statusLabels[student.status] || student.status}
                </Badge>
              </div>
              <p className="text-[17px] text-[#6E6E73] mb-6 font-medium">{student.student_code} • {student.class_name ? `Lớp ${student.class_name}` : 'Chưa xếp lớp'}</p>
              
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-[#333336]">
                  <Mail className="w-4 h-4 text-[#0071E3]" />
                  <span>{student.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#333336]">
                  <Phone className="w-4 h-4 text-[#0071E3]" />
                  <span>{student.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
            {(isAdmin || isTeacher) && <div className="flex flex-wrap justify-center gap-3">
              {isAdmin && <Button variant="secondary" onClick={() => navigate(`/students/${id}/edit`)}>Chỉnh sửa</Button>}
              <Button onClick={() => navigate('/notifications')}>Gửi thông báo</Button>
            </div>}
          </div>
        </div>

        <div
          ref={tabStripRef}
          className="scrollbar-hidden flex cursor-grab border-b border-[#EDEDF2] px-4 sm:px-8 overflow-x-auto active:cursor-grabbing"
          onPointerDown={handleTabPointerDown}
          onPointerMove={handleTabPointerMove}
          onPointerUp={handleTabPointerEnd}
          onPointerCancel={handleTabPointerEnd}
        >
          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: UserIcon },
            { id: 'grades', label: 'Kết quả học tập', icon: FileText },
            { id: 'attendance', label: 'Chuyên cần', icon: Calendar },
            { id: 'docs', label: 'Tài liệu & Hồ sơ', icon: Upload },
            { id: 'health', label: 'Y tế & Sức khỏe', icon: Heart },
            { id: 'behavior', label: 'Khen thưởng & Kỷ luật', icon: Award },
            { id: 'ai_analytics', label: 'SI Phân tích học tập', icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={(event) => {
                if (suppressTabClickRef.current) {
                  suppressTabClickRef.current = false;
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? 'border-[#0071E3] text-[#0071E3]' 
                : 'border-transparent text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-8">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Thông tin cá nhân</h3>
                  <div className="space-y-4">
                    <InfoRow label="Ngày sinh" value={formatDate(student.date_of_birth)} />
                    <InfoRow label="Nơi sinh" value={student.place_of_birth} />
                    <InfoRow label="Giới tính" value={genderLabels[student.gender] || 'Chưa cập nhật'} />
                    <InfoRow label="Quốc tịch" value={student.nationality} />
                    <InfoRow label="Dân tộc" value={student.ethnicity} />
                    <InfoRow label="Số CCCD/Hộ chiếu" value={student.identity_number} />
                    <InfoRow label="Ngày cấp" value={formatDate(student.identity_issue_date)} />
                    <InfoRow label="Nơi cấp" value={student.identity_issue_place} />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F5F5F7]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest">Phụ huynh liên kết</h3>
                    {isAdmin && (
                      <button
                        onClick={() => setIsParentModalOpen(true)}
                        className="text-[12px] font-bold text-[#0071E3] hover:underline"
                      >
                        + Liên kết mới
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {studentParents.length > 0 ? studentParents.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-2xl group">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                               <UserIcon className="w-5 h-5 text-[#6E6E73]" />
                            </div>
                            <div>
                               <p className="text-sm font-semibold">{p.full_name}</p>
                               <p className="text-[11px] text-[#6E6E73]">{p.phone} • {p.email}</p>
                            </div>
                         </div>
                         {isAdmin && (
                           <button 
                            type="button"
                            aria-label={`Hủy liên kết ${p.full_name}`}
                            onClick={() => unlinkParent(p.id)}
                            className="p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded-full transition-all"
                           >
                            <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                    )) : (
                      <p className="text-sm text-[#6E6E73] italic">Chưa có phụ huynh liên kết.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Thông tin học tập</h3>
                  <div className="space-y-4">
                    <InfoRow label="Lớp hiện tại" value={student.class_name || 'Chưa xếp lớp'} accent />
                    <InfoRow label="Năm học" value={student.academic_year} />
                    <InfoRow label="Ngày nhập học" value={formatDate(student.admission_date)} />
                    <InfoRow label="Trường trước đây" value={student.previous_school} />
                  </div>
                </div>

                <div>
                  <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Địa chỉ & liên hệ khẩn cấp</h3>
                  <div className="space-y-4">
                    <InfoRow label="Địa chỉ hiện tại" value={student.address} />
                    <InfoRow label="Thường trú" value={student.permanent_address} />
                    <InfoRow label="Người liên hệ" value={student.emergency_contact_name} />
                    <InfoRow label="SĐT khẩn cấp" value={student.emergency_contact_phone} />
                  </div>
                </div>

                {student.note && <div>
                  <h3 className="text-[12px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-4">Ghi chú hồ sơ</h3>
                  <p className="p-4 rounded-2xl bg-[#F5F5F7] text-sm text-[#333336] whitespace-pre-wrap break-words">{student.note}</p>
                </div>}
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Bảng điểm học tập</h3>
              <Table columns={gradeColumns} data={grades} />
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Lịch sử chuyên cần</h3>
              <Table columns={attendanceColumns} data={attendance} />
            </div>
          )}

          {activeTab === 'docs' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Tài liệu & Hồ sơ</h3>
                {canUploadDocument && <label className="cursor-pointer">
                  <Input type="file" className="hidden" onChange={handleFileUpload} />
                  <div className="flex items-center gap-2 px-4 py-2 bg-[#0071E3] text-white rounded-full text-sm font-semibold hover:bg-[#0071E3]/90 transition-all">
                    <Upload className="w-4 h-4" /> {isUploading ? 'Đang tải...' : 'Tải lên tài liệu'}
                  </div>
                </label>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map(file => (
                  <div key={file.id} className="p-4 border border-[#EDEDF2] rounded-2xl flex items-center justify-between group hover:border-[#0071E3] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#0071E3]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{file.file_name}</p>
                        <p className="text-[11px] text-[#6E6E73]">{(file.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Tải ${file.file_name}`} onClick={() => downloadFile(file)} className="p-2 text-[#6E6E73] hover:text-[#0071E3] rounded-full">
                        <Download className="w-4 h-4" />
                      </button>
                      {canUploadDocument && (
                         <button aria-label={`Xóa ${file.file_name}`} className="p-2 text-[#6E6E73] hover:text-[#D70015] rounded-full" onClick={() => deleteFile(file)}>
                           <Trash2 className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                  </div>
                ))}
                {files.length === 0 && <div className="md:col-span-2 lg:col-span-3 py-12 border-2 border-dashed border-[#EDEDF2] rounded-3xl text-center text-sm text-[#6E6E73]">Chưa có tài liệu nào trong hồ sơ.</div>}
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-[#1D1D1F]">Thông tin Y tế & Sức khỏe</h3>
                <span className="text-xs text-[#6E6E73]">Cập nhật lần cuối: {health?.updated_at ? new Date(health.updated_at).toLocaleString('vi-VN') : 'Chưa cập nhật'}</span>
              </div>
              
              {isLoadingHealth ? (
                <div className="py-12 text-center text-sm text-[#6E6E73]">Đang tải thông tin y tế...</div>
              ) : (
                <form onSubmit={saveHealth} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Chiều cao (cm)"
                      type="number"
                      min="30"
                      max="300"
                      step="0.1"
                      value={healthForm.height_cm}
                      onChange={(e) => setHealthForm({...healthForm, height_cm: e.target.value})}
                      disabled={!canEditExtended}
                    />
                    <Input
                      label="Cân nặng (kg)"
                      type="number"
                      min="1"
                      max="500"
                      step="0.1"
                      value={healthForm.weight_kg}
                      onChange={(e) => setHealthForm({...healthForm, weight_kg: e.target.value})}
                      disabled={!canEditExtended}
                    />
                    <Select label="Nhóm máu" value={healthForm.blood_type} onChange={(e) => setHealthForm({...healthForm, blood_type: e.target.value})} disabled={!canEditExtended}>
                      <option value="">Không xác định</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </Select>
                  </div>

                  <div className="space-y-6">
                    <Textarea
                      label="Dị ứng (Thức ăn, thuốc, thời tiết...)"
                      value={healthForm.allergies}
                      onChange={(e) => setHealthForm({...healthForm, allergies: e.target.value})}
                      disabled={!canEditExtended}
                    />

                    <Textarea
                      label="Tiền sử bệnh lý (Nếu có)"
                      value={healthForm.medical_history}
                      onChange={(e) => setHealthForm({...healthForm, medical_history: e.target.value})}
                      disabled={!canEditExtended}
                    />
                  </div>

                  <Input
                    label="Tình trạng thể chất / Ghi chú sức khỏe hiện tại"
                    value={healthForm.physical_status}
                    onChange={(e) => setHealthForm({...healthForm, physical_status: e.target.value})}
                    disabled={!canEditExtended}
                  />

                  {canEditExtended && (
                    <div className="flex justify-end">
                      <Button type="submit">Lưu thông tin y tế</Button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {activeTab === 'behavior' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-[#1D1D1F]">Lịch sử Khen thưởng & Kỷ luật</h3>
                {canEditExtended && (
                  <Button onClick={() => setIsBehaviorModalOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Thêm quyết định
                  </Button>
                )}
              </div>

              {isLoadingBehavior ? (
                <div className="py-12 text-center text-sm text-[#6E6E73]">Đang tải dữ liệu khen thưởng/kỷ luật...</div>
              ) : behavior.length > 0 ? (
                <div className="space-y-4">
                  {behavior.map((rec) => (
                    <div key={rec.id} className="p-6 bg-white border border-[#EDEDF2] rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-sm transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={rec.type === 'reward' ? 'success' : 'error'}>
                            {rec.type === 'reward' ? 'Khen thưởng' : 'Kỷ luật'}
                          </Badge>
                          <span className="font-semibold text-lg text-[#1D1D1F]">{rec.title}</span>
                        </div>
                        <p className="text-sm text-[#333336] leading-relaxed">{rec.description}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-[#6E6E73]">
                          <span>Quyết định số: <strong className="text-[#333336]">{rec.decision_number || 'N/A'}</strong></span>
                          <span>Ngày áp dụng: <strong className="text-[#333336]">{new Date(rec.date).toLocaleDateString('vi-VN')}</strong></span>
                        </div>
                      </div>
                      {canEditExtended && (
                        <button 
                          type="button"
                          aria-label={`Xóa quyết định ${rec.title}`}
                          onClick={() => deleteBehavior(rec.id)} 
                          className="p-2 hover:bg-red-50 text-[#6E6E73] hover:text-[#D70015] rounded-full self-start md:self-auto shrink-0 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-[#EDEDF2] rounded-3xl text-center">
                  <Award className="w-12 h-12 text-[#6E6E73] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#6E6E73] font-medium">Chưa có quyết định khen thưởng hoặc kỷ luật nào được ghi nhận.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai_analytics' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-[#1D1D1F]">SI Học tập Advisor</h3>
                  <p className="text-sm text-[#6E6E73] mt-1">Dự đoán kết quả học tập, phân tích rủi ro và đề xuất giải pháp sư phạm tự động bằng SI.</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0071E3]/5 text-[#0071E3] rounded-full text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> SI Engine Active
                </div>
              </div>

              {isLoadingAi ? (
                <div className="py-12 text-center text-sm text-[#6E6E73]">SI đang phân tích dữ liệu học tập...</div>
              ) : aiPrediction ? (
                <div className="space-y-8">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#F5F5F7]/60 border border-[#EDEDF2] p-6 rounded-2xl">
                      <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-2">Điểm trung bình (GPA)</p>
                      <p className="text-3xl font-bold text-[#1D1D1F]">{aiPrediction.gpa !== null ? `${aiPrediction.gpa} / 10` : 'N/A'}</p>
                      <p className="text-xs text-[#6E6E73] mt-2">Dựa trên điểm tất cả các môn đã nhập</p>
                    </div>
                    
                    <div className="bg-[#F5F5F7]/60 border border-[#EDEDF2] p-6 rounded-2xl">
                      <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-2">Tỷ lệ Chuyên cần</p>
                      <p className="text-3xl font-bold text-[#1D1D1F]">{aiPrediction.attendance_rate}%</p>
                      <p className="text-xs text-[#6E6E73] mt-2">Vắng học: {aiPrediction.absent_days} buổi / Tổng {aiPrediction.total_attendance_days} ngày điểm danh</p>
                    </div>

                    <div className="bg-[#F5F5F7]/60 border border-[#EDEDF2] p-6 rounded-2xl">
                      <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-2">Mức độ Rủi ro học tập</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-3.5 h-3.5 rounded-full ${
                          aiPrediction.risk_level === 'High' ? 'bg-[#D70015]' : aiPrediction.risk_level === 'Medium' ? 'bg-orange-500' : 'bg-[#34C759]'
                        }`} />
                        <span className={`text-xl font-bold ${
                          aiPrediction.risk_level === 'High' ? 'text-[#D70015]' : aiPrediction.risk_level === 'Medium' ? 'text-orange-500' : 'text-[#34C759]'
                        }`}>{aiPrediction.risk_level_vi}</span>
                      </div>
                      <p className="text-xs text-[#6E6E73] mt-3">Độ tin cậy của SI: {aiPrediction.confidence_score}%</p>
                    </div>
                  </div>

                  {/* AI Prediction Narrative Card */}
                  <div className="p-8 border border-[#EDEDF2] bg-[#0071E3]/5 rounded-3xl space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0071E3] text-white flex items-center justify-center rounded-xl">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-[#1D1D1F]">Đánh giá học thuật từ SI Advisor</h4>
                        <p className="text-[11px] text-[#6E6E73]">Phân tích dữ liệu lúc: {new Date(aiPrediction.analyzed_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-1.5">Nhận định chi tiết</h5>
                        <p className="text-sm text-[#333336] leading-relaxed font-medium">{aiPrediction.prediction_message}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-[#0071E3]/10">
                        <h5 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-1.5">Khuyến nghị phương pháp sư phạm</h5>
                        <p className="text-sm text-[#333336] leading-relaxed">{aiPrediction.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-[#6E6E73]">Chưa có dữ liệu phân tích học tập.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isParentModalOpen} onClose={() => setIsParentModalOpen(false)} title="Liên kết phụ huynh">
         <div className="space-y-4">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
               <Input
                label="Tìm phụ huynh" withSearchIcon
                className="pl-10"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
               />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
               {allParents.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-3 border border-[#EDEDF2] rounded-xl hover:border-[#0071E3] transition-colors">
                    <div>
                       <p className="text-sm font-semibold">{p.full_name}</p>
                       <p className="text-xs text-[#6E6E73]">{p.phone}</p>
                    </div>
                    <Button size="sm" onClick={() => linkParent(p.id)}>Liên kết</Button>
                 </div>
               ))}
               {parentSearch.length > 0 && allParents.length === 0 && (
                 <p className="text-center py-4 text-sm text-[#6E6E73]">Không tìm thấy phụ huynh nào.</p>
               )}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => setIsParentModalOpen(false)}>Đóng</Button>
         </div>
      </Modal>

      <Modal isOpen={isBehaviorModalOpen} onClose={() => setIsBehaviorModalOpen(false)} title="Thêm quyết định Khen thưởng / Kỷ luật">
        <form onSubmit={addBehavior} className="space-y-4">
          <Select label="Loại quyết định" value={behaviorForm.type} onChange={(e) => setBehaviorForm({...behaviorForm, type: e.target.value})}>
            <option value="reward">Khen thưởng</option>
            <option value="discipline">Kỷ luật</option>
          </Select>

          <Input
            label="Tiêu đề"
            value={behaviorForm.title}
            onChange={(e) => setBehaviorForm({...behaviorForm, title: e.target.value})}
            required
          />

          <Input
            label="Số quyết định (Nếu có)"
            value={behaviorForm.decision_number}
            onChange={(e) => setBehaviorForm({...behaviorForm, decision_number: e.target.value})}
          />

          <Input
            label="Ngày ban hành"
            type="date"
            max={new Date().toLocaleDateString('en-CA')}
            value={behaviorForm.date}
            onChange={(e) => setBehaviorForm({...behaviorForm, date: e.target.value})}
            required
          />

          <Textarea
            label="Nội dung chi tiết"
            value={behaviorForm.description}
            onChange={(e) => setBehaviorForm({...behaviorForm, description: e.target.value})}
            required
          />

          <div className="pt-4 flex gap-3">
            <Button variant="secondary" type="button" onClick={() => setIsBehaviorModalOpen(false)} className="flex-1">Hủy</Button>
            <Button type="submit" className="flex-1">Thêm quyết định</Button>
          </div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default StudentDetailPage;
