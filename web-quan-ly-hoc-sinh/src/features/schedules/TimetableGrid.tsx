import React from 'react';

interface ScheduleItem {
  id: number;
  subject_name: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  room: string;
  color?: string;
}

interface TimetableGridProps {
  schedules: ScheduleItem[];
  isLoading: boolean;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ schedules, isLoading }) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  
  // Define time slots (e.g., from 7:00 to 18:00)
  const timeSlots = Array.from({ length: 11 }, (_, i) => i + 7);

  if (isLoading) return <div className="h-96 flex items-center justify-center bg-[#F5F5F7] rounded-3xl animate-pulse text-[#6E6E73]">Đang tải thời khóa biểu...</div>;
  if (schedules.length === 0) return <div className="h-64 flex items-center justify-center bg-[#F5F5F7] border border-dashed border-[#D5D5D7] rounded-3xl text-sm text-[#6E6E73]">Chưa có tiết học trong thời khóa biểu này.</div>;

  return (
    <div className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-[#EDEDF2] bg-[#F5F5F7]/50">
          <div className="p-4 text-[12px] font-bold text-[#6E6E73] uppercase text-center border-r border-[#EDEDF2]">Thời gian</div>
          {dayNames.map((day, i) => (
            <div key={i} className="p-4 text-[12px] font-bold text-[#1D1D1F] uppercase text-center border-r border-[#EDEDF2] last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="relative">
          {timeSlots.map((hour) => (
            <div key={hour} className="grid grid-cols-7 border-b border-[#F5F5F7] h-20 group last:border-b-0">
              <div className="p-2 flex flex-col items-center justify-center border-r border-[#EDEDF2] bg-[#F5F5F7]/20">
                <span className="text-[13px] font-semibold text-[#1D1D1F]">{hour}:00</span>
                <span className="text-[10px] text-[#6E6E73]">{hour+1}:00</span>
              </div>
              {days.map((day) => {
                // Find schedules for this day and hour
                const daySchedules = schedules.filter(s => {
                  const startHour = parseInt(s.start_time.split(':')[0]);
                  return s.day_of_week === day && startHour === hour;
                });

                return (
                  <div key={day} className="p-1 border-r border-[#EDEDF2] last:border-r-0 relative group/cell hover:bg-[#0071E3]/[0.02] transition-colors">
                    {daySchedules.map((s) => (
                      <div 
                        key={s.id}
                        className="h-full w-full p-2 bg-[#0071E3]/5 border-l-4 border-[#0071E3] rounded-lg flex flex-col justify-center overflow-hidden"
                      >
                        <p className="text-[12px] font-bold text-[#0071E3] truncate">{s.subject_name}</p>
                        <p className="text-[10px] text-[#333336] truncate mt-0.5">{s.teacher_name}</p>
                        <p className="text-[9px] text-[#6E6E73] mt-1">{s.room}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;
