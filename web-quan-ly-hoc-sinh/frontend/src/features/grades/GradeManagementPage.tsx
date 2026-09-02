import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { User as UserIcon, Filter, Sparkles, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

interface Grade {
  id: number;
  student_name: string;
  student_code: string;
  subject_name: string;
  student_id: number;
  oral_score: number | null;
  quiz_score: number | null;
  test_score: number | null;
  midterm_score: number | null;
  final_score: number | null;
  average_score: number | null;
  grade_letter: string | null;
  note?: string;
}

interface StudentOption { id: number; full_name: string; student_code: string }
type ScoreField = 'oral_score' | 'quiz_score' | 'test_score' | 'midterm_score' | 'final_score';
const emptyScoreForm: Record<ScoreField, string> & { student_id: string; note: string } = {
  student_id: '', oral_score: '', quiz_score: '', test_score: '', midterm_score: '', final_score: '', note: ''
};

const GradeManagementPage: React.FC = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<{id: number, class_name: string}[]>([]);
  const [subjects, setSubjects] = useState<{id: number, subject_name: string}[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const isParent = user?.role === 'parent';
  const canManage = isAdmin || isTeacher;
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [scoreForm, setScoreForm] = useState(emptyScoreForm);
  const [isSaving, setIsSaving] = useState(false);

  const [filters, setFilters] = useState({
    class_id: '',
    subject_id: '',
    semester: '1',
    academic_year: '2023-2024'
  });

  const fetchGrades = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { ...filters };
      if (isStudent) {
        params.student_id = user?.specificId;
      } else if (isParent) {
        params.parent_id = user?.specificId;
      }
      const response = await api.get('/grades', { params });
      setGrades(response.data.data);
    } catch (error) {
      console.error('Fetch grades error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    if (!classId || !canManage) return;
    try {
      const response = await api.get('/students', { params: { class_id: classId, limit: 100 } });
      setStudents(response.data.data);
    } catch { setStudents([]); }
  };

  const fetchFilters = async () => {
    if (isStudent || isParent) return;
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/classes', { params: { limit: 100 } }),
        api.get('/subjects', { params: { limit: 100 } })
      ]);
      setClasses(classesRes.data.data);
      setSubjects(subjectsRes.data.data);
      if (classesRes.data.data.length > 0 && !filters.class_id) {
        setFilters(prev => ({ ...prev, class_id: classesRes.data.data[0].id.toString() }));
      }
      if (subjectsRes.data.data.length > 0 && !filters.subject_id) {
        setFilters(prev => ({ ...prev, subject_id: subjectsRes.data.data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Fetch filters error:', error);
    }
  };

  useEffect(() => {
    fetchFilters();
    if (isStudent || isParent) fetchGrades();
  }, []);

  useEffect(() => {
    if (!isStudent && !isParent && filters.class_id && filters.subject_id) {
      fetchGrades();
      fetchStudents(filters.class_id);
    }
  }, [filters]);

  const openCreate = () => {
    setEditingGrade(null);
    setScoreForm({ ...emptyScoreForm, student_id: students[0] ? String(students[0].id) : '' });
    setIsEditorOpen(true);
  };

  const openEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setScoreForm({
      student_id: String(grade.student_id),
      oral_score: grade.oral_score?.toString() || '', quiz_score: grade.quiz_score?.toString() || '',
      test_score: grade.test_score?.toString() || '', midterm_score: grade.midterm_score?.toString() || '',
      final_score: grade.final_score?.toString() || '', note: grade.note || ''
    });
    setIsEditorOpen(true);
  };

  const saveGrade = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scoreForm.student_id) return toast.warning('Vui lòng chọn học sinh.');
    const scores = (['oral_score', 'quiz_score', 'test_score', 'midterm_score', 'final_score'] as ScoreField[])
      .reduce<Record<string, number | null>>((payload, field) => {
        payload[field] = scoreForm[field] === '' ? null : Number(scoreForm[field]);
        return payload;
      }, {});
    setIsSaving(true);
    try {
      if (editingGrade) {
        await api.put(`/grades/${editingGrade.id}`, { ...scores, note: scoreForm.note });
      } else {
        await api.post('/grades', {
          student_id: Number(scoreForm.student_id), class_id: Number(filters.class_id), subject_id: Number(filters.subject_id),
          semester: filters.semester, academic_year: filters.academic_year, ...scores, note: scoreForm.note
        });
      }
      toast.success(editingGrade ? 'Đã cập nhật điểm.' : 'Đã lưu điểm mới.');
      setIsEditorOpen(false);
      await fetchGrades();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể lưu điểm.');
    } finally { setIsSaving(false); }
  };

  const columns = [
    {
      header: 'Học sinh',
      accessor: (item: Grade) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-[#6E6E73]" />
          </div>
          <div>
            <p className="font-semibold text-sm">{item.student_name}</p>
            <p className="text-[10px] text-[#6E6E73]">{item.student_code}</p>
          </div>
        </div>
      ),
      className: 'min-w-[180px]',
      hidden: isStudent
    },
    { header: 'Môn học', accessor: 'subject_name' as const },
    { header: 'Miệng', accessor: (item: Grade) => item.oral_score ?? '-' },
    { header: '15 phút', accessor: (item: Grade) => item.quiz_score ?? '-' },
    { header: '1 tiết', accessor: (item: Grade) => item.test_score ?? '-' },
    { header: 'Giữa kỳ', accessor: (item: Grade) => item.midterm_score ?? '-' },
    { header: 'Cuối kỳ', accessor: (item: Grade) => item.final_score ?? '-' },
    {
      header: 'Trung bình',
      accessor: (item: Grade) => (
        <span className="font-bold text-[#0071E3]">{item.average_score}</span>
      )
    },
    {
      header: 'Xếp loại',
      accessor: (item: Grade) => (
        <Badge variant={item.grade_letter === 'A' ? 'success' : item.grade_letter === 'F' ? 'error' : 'active'}>
          {item.grade_letter || '-'}
        </Badge>
      )
    },
    {
      header: 'Thao tác',
      accessor: (item: Grade) => <button type="button" aria-label={`Sửa điểm của ${item.student_name}`} onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-[#F5F5F7] text-[#0071E3]"><Pencil className="w-4 h-4" /></button>,
      hidden: !canManage
    }
  ];

  return (
    <div>
      {(isAdmin || isTeacher) && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-[#F5F5F7] rounded-2xl">
          <Select label="Lớp học" value={filters.class_id} onChange={(e) => setFilters({...filters, class_id: e.target.value})}>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
          </Select>
          <Select label="Môn học" value={filters.subject_id} onChange={(e) => setFilters({...filters, subject_id: e.target.value})}>
            {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subject_name}</option>)}
          </Select>
          <Select label="Học kỳ" value={filters.semester} onChange={(e) => setFilters({...filters, semester: e.target.value})}>
            <option value="1">Học kỳ I</option>
            <option value="2">Học kỳ II</option>
          </Select>
          <Select label="Năm học" value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})}>
            <option value="2023-2024">2023-2024</option>
            <option value="2024-2025">2024-2025</option>
          </Select>
          <div className="flex items-end ml-auto">
            <Button variant="secondary" onClick={fetchGrades}>
              <Filter className="w-4 h-4 mr-2" /> Lọc dữ liệu
            </Button>
            <Button className="ml-2" onClick={openCreate} disabled={!students.length}>
              <Plus className="w-4 h-4 mr-2" /> Nhập điểm
            </Button>
          </div>
        </div>
      )}

      <Table columns={columns.filter(c => !c.hidden)} data={grades} isLoading={isLoading} />

      {(isAdmin || isTeacher) && grades.length > 0 && (
        <ReadOnlyInsights grades={grades} filters={filters} />
      )}

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingGrade ? 'Cập nhật điểm' : 'Nhập điểm học sinh'}>
        <form onSubmit={saveGrade} className="space-y-4">
          <Select label="Học sinh" value={scoreForm.student_id} disabled={Boolean(editingGrade)} onChange={(event) => setScoreForm({ ...scoreForm, student_id: event.target.value })}>
            <option value="">Chọn học sinh</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.full_name} • {student.student_code}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['oral_score', 'Điểm miệng'], ['quiz_score', 'Điểm 15 phút'], ['test_score', 'Điểm 1 tiết'],
              ['midterm_score', 'Điểm giữa kỳ'], ['final_score', 'Điểm cuối kỳ']
            ] as [ScoreField, string][]).map(([field, label]) => (
              <Input key={field} label={label} type="number" min="0" max="10" step="0.1" value={scoreForm[field]} onChange={(event) => setScoreForm({ ...scoreForm, [field]: event.target.value })} />
            ))}
          </div>
          <Input label="Ghi chú" value={scoreForm.note} maxLength={2000} onChange={(event) => setScoreForm({ ...scoreForm, note: event.target.value })} />
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Lưu điểm</Button></div>
        </form>
      </Modal>
    </div>
  );
};

interface ClassroomInsightsProps {
  grades: Grade[];
  filters: { class_id: string; subject_id: string; semester: string; academic_year: string };
}

const ReadOnlyInsights: React.FC<ClassroomInsightsProps> = ({ grades }) => {
  let totalScore = 0;
  let validScores = 0;
  const strugglingStudents: Grade[] = [];

  grades.forEach(g => {
    if (g.average_score !== null && g.average_score !== undefined) {
      const score = parseFloat(g.average_score.toString());
      totalScore += score;
      validScores++;
      if (score < 5.0) strugglingStudents.push(g);
    }
  });

  const classAvg = validScores > 0 ? totalScore / validScores : 0;

  let teachingAdvise = '';
  let adviseBadge = '';

  if (classAvg === 0) {
    teachingAdvise = 'Vui lòng hoàn tất nhập điểm học sinh để kích hoạt hệ thống gợi ý phương án sư phạm AI.';
    adviseBadge = 'Chờ dữ liệu';
  } else if (classAvg < 6.0) {
    teachingAdvise = 'Kết quả chung của lớp ở môn học này đang ở mức Trung bình thấp. Đề xuất: 1. Giáo viên chủ động giảm mật độ nội dung lý thuyết, tập trung chữa kỹ bài tập thực hành. 2. Tổ chức nhóm học tập kèm cặp đôi bạn cùng tiến (chia học sinh giỏi kèm học sinh yếu). 3. Tăng cường kiểm tra miệng đầu giờ đối với các phần kiến thức cốt lõi.';
    adviseBadge = 'Tăng cường phụ đạo';
  } else if (classAvg < 8.0) {
    teachingAdvise = 'Lớp có kết quả đồng đều và ổn định. Đề xuất: 1. Duy trì nhịp độ giảng dạy hiện tại. 2. Tăng cường các dạng bài tập giải quyết vấn đề thực tiễn (Case study) để kích thích tư duy ứng dụng. 3. Thường xuyên đôn đốc các em học sinh có điểm dưới trung bình hoàn thành bài tập về nhà.';
    adviseBadge = 'Duy trì nhịp độ';
  } else {
    teachingAdvise = 'Lực học chung của lớp rất xuất sắc. Đề xuất: 1. Lồng ghép các câu hỏi nâng cao, đề thi học sinh giỏi vào cuối tiết học. 2. Giao thêm dự án tự học/nghiên cứu sáng tạo cho các nhóm. 3. Đề cử các gương mặt xuất sắc tham gia kỳ thi cấp quận/thành phố.';
    adviseBadge = 'Bồi dưỡng nâng cao';
  }

  return (
    <div className="mt-8 bg-white border border-[#EDEDF2] rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2.5 pb-4 border-b border-[#F5F5F7]">
        <div className="w-9 h-9 rounded-xl bg-[#0071E3]/5 text-[#0071E3] flex items-center justify-center shrink-0">
          <Sparkles className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-[#1D1D1F]">AI Classroom Insights & Teaching Advisor</h3>
          <p className="text-[11px] text-[#6E6E73] mt-0.5">Phân tích chuyên sâu phổ điểm lớp và giải pháp cải thiện.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-[#A1A1A6] uppercase tracking-wider">Thống kê phổ điểm lớp</h4>
          <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
            <span className="text-xs text-[#333336]">Điểm trung bình lớp</span>
            <span className="font-bold text-sm text-[#0071E3]">{classAvg > 0 ? `${classAvg.toFixed(2)} / 10` : 'N/A'}</span>
          </div>
          <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
            <span className="text-xs text-[#333336]">Học sinh dưới trung bình</span>
            <span className={`font-bold text-sm ${strugglingStudents.length > 0 ? 'text-[#D70015]' : 'text-[#34C759]'}`}>
              {strugglingStudents.length} học sinh
            </span>
          </div>
          <div className="p-4 bg-[#F5F5F7] rounded-2xl flex items-center justify-between">
            <span className="text-xs text-[#333336]">Đề xuất giáo án</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] rounded-full">{adviseBadge}</span>
          </div>
        </div>

        <div className="p-5 bg-[#0071E3]/5 rounded-2xl border border-[#0071E3]/10 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-bold text-[#0071E3] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Gợi ý phương án giảng dạy AI
            </h4>
            <p className="text-xs text-[#333336] leading-relaxed mt-3 whitespace-pre-wrap font-medium">{teachingAdvise}</p>
          </div>
          <div className="text-[10px] text-[#6E6E73] italic pt-3 border-t border-[#0071E3]/10 mt-3">
            *Phương án được tối ưu tự động dựa trên phân bổ điểm số trung bình của lớp.
          </div>
        </div>

        <div className="p-5 bg-white border border-[#EDEDF2] rounded-2xl flex flex-col">
          <h4 className="text-[10px] font-bold text-[#A1A1A6] uppercase tracking-wider mb-3">Học sinh cần lưu ý</h4>
          {strugglingStudents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-xs text-[#6E6E73]">
              <CheckCircle2 className="w-8 h-8 text-[#34C759] mb-2" />
              Không có học sinh nào dưới điểm trung bình (5.0) trong lớp này.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1">
              {strugglingStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-[#F5F5F7] rounded-xl text-xs">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-semibold text-[#1D1D1F] truncate">{s.student_name}</p>
                    <p className="text-[10px] text-[#6E6E73]">Trung bình: <span className="font-bold text-[#D70015]">{s.average_score}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeManagementPage;
