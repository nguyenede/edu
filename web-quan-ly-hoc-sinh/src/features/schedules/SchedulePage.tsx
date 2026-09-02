import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import { Clock, MapPin, User as UserIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../components/ui/Button';
import TimetableGrid from './TimetableGrid';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import useConfirmDialog from '../../components/ui/useConfirmDialog';

interface Schedule {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  semester: string;
  academic_year: string;
}

interface Option { id: number; class_name?: string; subject_name?: string; full_name?: string }
const emptySchedule = { class_id: '', subject_id: '', teacher_id: '', day_of_week: 'monday', start_time: '07:00', end_time: '07:45', room: '', semester: '1', academic_year: '2025-2026' };

const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [viewType, setViewType] = useState<'list' | 'grid'>('grid');
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { confirm, confirmDialog } = useConfirmDialog();
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [draft, setDraft] = useState(emptySchedule);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!isAdmin) return;
    try {
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.get('/classes', { params: { limit: 100 } }), api.get('/subjects', { params: { limit: 100 } }), api.get('/teachers', { params: { limit: 100 } })
      ]);
      setClasses(classesRes.data.data);
      setSubjects(subjectsRes.data.data);
      setTeachers(teachersRes.data.data);
      if (classesRes.data.data.length > 0 && !selectedClassId) {
        setSelectedClassId(classesRes.data.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {};
      if (isAdmin) {
        if (!selectedClassId) return;
        params.class_id = selectedClassId;
      } else if (isStudent) {
        params.student_id = user?.id;
      } else if (isTeacher) {
        params.teacher_id = user?.id;
      }
      const response = await api.get('/schedules', { params });
      setSchedules(response.data.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!isAdmin) fetchSchedules();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchSchedules();
  }, [selectedClassId]);

  const dayMap: Record<string, string> = {
    monday: 'Thứ Hai', tuesday: 'Thứ Ba', wednesday: 'Thứ Tư',
    thursday: 'Thứ Năm', friday: 'Thứ Sáu', saturday: 'Thứ Bảy', sunday: 'Chủ Nhật'
  };

  const openCreate = () => {
    setEditingSchedule(null);
    setDraft({ ...emptySchedule, class_id: selectedClassId, subject_id: subjects[0] ? String(subjects[0].id) : '', teacher_id: teachers[0] ? String(teachers[0].id) : '' });
    setIsEditorOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setDraft({
      class_id: String(schedule.class_id), subject_id: String(schedule.subject_id), teacher_id: String(schedule.teacher_id),
      day_of_week: schedule.day_of_week, start_time: schedule.start_time.slice(0, 5), end_time: schedule.end_time.slice(0, 5),
      room: schedule.room || '', semester: schedule.semester || '1', academic_year: schedule.academic_year || '2025-2026'
    });
    setIsEditorOpen(true);
  };

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...draft, class_id: Number(draft.class_id), subject_id: Number(draft.subject_id), teacher_id: Number(draft.teacher_id) };
      if (editingSchedule) await api.put(`/schedules/${editingSchedule.id}`, payload);
      else await api.post('/schedules', payload);
      toast.success(editingSchedule ? 'Đã cập nhật tiết học.' : 'Đã thêm tiết học.');
      setIsEditorOpen(false);
      if (String(payload.class_id) !== selectedClassId) setSelectedClassId(String(payload.class_id));
      else await fetchSchedules();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể lưu thời khóa biểu.');
    } finally { setIsSaving(false); }
  };

  const deleteSchedule = async (schedule: Schedule) => {
    const confirmed = await confirm({
      title: 'Xóa tiết học?',
      description: `Xóa tiết ${schedule.subject_name} vào ${dayMap[schedule.day_of_week]} khỏi thời khóa biểu.`,
      confirmText: 'Xóa tiết học',
      variant: 'danger',
    });
    if (!confirmed) return;
    try { await api.delete(`/schedules/${schedule.id}`); toast.success('Đã xóa tiết học.'); await fetchSchedules(); }
    catch { toast.error('Không thể xóa tiết học.'); }
  };

  const columns = [
    {
      header: 'Thứ',
      accessor: (item: Schedule) => <span className="font-semibold">{dayMap[item.day_of_week]}</span>,
      className: 'w-[120px]'
    },
    {
      header: 'Thời gian',
      accessor: (item: Schedule) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6E6E73]" />
          <span>{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</span>
        </div>
      )
    },
    {
      header: 'Môn học',
      accessor: (item: Schedule) => <span className="font-medium text-[#0071E3]">{item.subject_name}</span>
    },
    {
      header: 'Lớp', accessor: 'class_name' as const, hidden: isStudent
    },
    {
      header: 'Giáo viên',
      accessor: (item: Schedule) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[#6E6E73]" />
          <span>{item.teacher_name}</span>
        </div>
      ),
      hidden: isTeacher
    },
    {
      header: 'Phòng',
      accessor: (item: Schedule) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#6E6E73]" />
          <span>{item.room || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Thao tác',
      accessor: (item: Schedule) => <div className="flex gap-1"><button type="button" aria-label="Sửa tiết học" className="p-2 text-[#0071E3] hover:bg-blue-50 rounded-lg" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></button><button type="button" aria-label="Xóa tiết học" className="p-2 text-red-600 hover:bg-red-50 rounded-lg" onClick={() => deleteSchedule(item)}><Trash2 className="w-4 h-4" /></button></div>,
      hidden: !isAdmin
    }
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#F5F5F7] p-1 rounded-xl flex">
            <button
              onClick={() => setViewType('grid')}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                viewType === 'grid' ? "bg-white text-[#0071E3] shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              )}
            >Lưới</button>
            <button
              onClick={() => setViewType('list')}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                viewType === 'list' ? "bg-white text-[#0071E3] shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
              )}
            >Danh sách</button>
          </div>
        </div>
        {isAdmin && <Button onClick={openCreate} disabled={!classes.length || !subjects.length || !teachers.length}><Plus className="w-4 h-4 mr-2" />Thêm tiết học</Button>}
      </div>

      {isAdmin && (
        <div className="flex gap-4 mb-6">
          <Select label="Lớp học" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
          </Select>
        </div>
      )}

      {viewType === 'list' ? (
        <Table columns={columns.filter(c => !c.hidden)} data={schedules} isLoading={isLoading} />
      ) : (
        <TimetableGrid schedules={schedules} isLoading={isLoading} />
      )}

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingSchedule ? 'Cập nhật tiết học' : 'Thêm tiết học'}>
        <form onSubmit={saveSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Lớp học" required value={draft.class_id} onChange={(event) => setDraft({ ...draft, class_id: event.target.value })}><option value="">Chọn lớp</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</Select>
            <Select label="Môn học" required value={draft.subject_id} onChange={(event) => setDraft({ ...draft, subject_id: event.target.value })}><option value="">Chọn môn</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subject_name}</option>)}</Select>
            <Select label="Giáo viên" required value={draft.teacher_id} onChange={(event) => setDraft({ ...draft, teacher_id: event.target.value })}><option value="">Chọn giáo viên</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select>
            <Select label="Thứ" value={draft.day_of_week} onChange={(event) => setDraft({ ...draft, day_of_week: event.target.value })}>{Object.entries(dayMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            <Input label="Bắt đầu" type="time" required value={draft.start_time} onChange={(event) => setDraft({ ...draft, start_time: event.target.value })} />
            <Input label="Kết thúc" type="time" required value={draft.end_time} onChange={(event) => setDraft({ ...draft, end_time: event.target.value })} />
            <Input label="Phòng học" maxLength={50} value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} />
            <Select label="Học kỳ" value={draft.semester} onChange={(event) => setDraft({ ...draft, semester: event.target.value })}><option value="1">Học kỳ I</option><option value="2">Học kỳ II</option></Select>
          </div>
          <Input label="Năm học" required pattern="\d{4}-\d{4}" value={draft.academic_year} onChange={(event) => setDraft({ ...draft, academic_year: event.target.value })} />
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSaving}>Lưu tiết học</Button></div>
        </form>
      </Modal>
      {confirmDialog}
    </div>
  );
};

export default SchedulePage;
