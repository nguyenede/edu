import React, { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { toast } from '../../store/toastStore';
import { Save } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
interface SchoolClass { id: number; class_name: string }
interface Student { id: number; student_code: string; full_name: string; class_name: string }
interface AttendanceRecord { id: number; student_id: number; status: AttendanceStatus; note?: string }
interface AttendanceRow extends Student { status: AttendanceStatus; note: string }

const AttendancePage: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/classes', { params: { limit: 100 } })
      .then((response) => {
        const nextClasses = response.data.data as SchoolClass[];
        setClasses(nextClasses);
        if (nextClasses.length) setSelectedClassId(String(nextClasses[0].id));
        else setIsLoading(false);
      })
      .catch(() => { setError('Không thể tải danh sách lớp.'); setIsLoading(false); });
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    setError('');
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get('/students', { params: { class_id: selectedClassId, limit: 100 } }),
        api.get('/attendance', { params: { class_id: selectedClassId, date: selectedDate, limit: 100 } })
      ]);
      const existing = new Map<number, AttendanceRecord>(
        (attendanceRes.data.data as AttendanceRecord[]).map((record) => [record.student_id, record])
      );
      setRows((studentsRes.data.data as Student[]).map((student) => ({
        ...student,
        status: existing.get(student.id)?.status || 'present',
        note: existing.get(student.id)?.note || ''
      })));
    } catch {
      setRows([]);
      setError('Không thể tải dữ liệu chuyên cần.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const updateRow = (studentId: number, patch: Partial<Pick<AttendanceRow, 'status' | 'note'>>) => {
    setRows((current) => current.map((row) => row.id === studentId ? { ...row, ...patch } : row));
  };

  const saveAttendance = async () => {
    if (!selectedClassId || !rows.length) return;
    setIsSaving(true);
    try {
      await api.post('/attendance/bulk', {
        class_id: Number(selectedClassId),
        date: selectedDate,
        records: rows.map((row) => ({ student_id: row.id, status: row.status, note: row.note }))
      });
      toast.success('Đã lưu chuyên cần của lớp.');
      await loadAttendance();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || 'Không thể lưu chuyên cần.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Học sinh',
      accessor: (item: AttendanceRow) => <div><p className="font-semibold">{item.full_name}</p><p className="text-[11px] text-[#6E6E73]">{item.student_code}</p></div>
    },
    { header: 'Lớp', accessor: 'class_name' as const },
    {
      header: 'Trạng thái',
      accessor: (item: AttendanceRow) => (
        <Select
          aria-label={`Trạng thái chuyên cần của ${item.full_name}`}
          value={item.status}
          onChange={(event) => updateRow(item.id, { status: event.target.value as AttendanceStatus })}
          containerClassName="min-w-36"
        >
          <option value="present">Có mặt</option><option value="absent">Vắng mặt</option><option value="late">Đi muộn</option><option value="excused">Có phép</option>
        </Select>
      )
    },
    {
      header: 'Ghi chú',
      accessor: (item: AttendanceRow) => <input aria-label={`Ghi chú chuyên cần của ${item.full_name}`} value={item.note} onChange={(event) => updateRow(item.id, { note: event.target.value })} maxLength={1000} className="h-10 w-full min-w-44 rounded-lg border border-[#D5D5D7] px-3 text-sm" placeholder="Ghi chú (nếu có)" />
    }
  ];

  return (
    <div className="min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6 p-4 bg-[#F5F5F7] rounded-2xl">
        <Select label="Lớp học" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} containerClassName="lg:max-w-xs">
          {classes.length ? classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.class_name}</option>) : <option value="">Chưa có lớp</option>}
        </Select>
        <Input label="Ngày điểm danh" type="date" value={selectedDate} max={new Date().toISOString().split('T')[0]} onChange={(event) => setSelectedDate(event.target.value)} className="lg:max-w-[200px]" />
        <Button className="lg:ml-auto" onClick={saveAttendance} isLoading={isSaving} disabled={!rows.length}><Save className="w-4 h-4 mr-2" />Lưu chuyên cần</Button>
      </div>
      {error && <div role="alert" className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      <Table columns={columns} data={rows} isLoading={isLoading} emptyMessage="Lớp chưa có học sinh để điểm danh." />
    </div>
  );
};

export default AttendancePage;
