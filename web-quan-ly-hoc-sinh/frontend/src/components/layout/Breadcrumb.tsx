import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const routeLabels: Record<string, string> = {
  dashboard: 'Tổng quan',
  students: 'Học sinh',
  teachers: 'Giáo viên',
  classes: 'Lớp học',
  subjects: 'Môn học',
  schedules: 'Thời khóa biểu',
  grades: 'Điểm số',
  attendance: 'Chuyên cần',
  payments: 'Học phí',
  notifications: 'Thông báo',
  reports: 'Báo cáo',
  audit: 'Nhật ký',
  profile: 'Hồ sơ',
  settings: 'Cài đặt',
  'ai-advisor': 'AI Advisor',
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items = segments.map((seg, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    const label = routeLabels[seg] || seg.replace(/-/g, ' ');

    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-[#6E6E73]">
      {items.map((item, i) => (
        <React.Fragment key={item.path}>
          {i > 0 && <ChevronRight className="w-4 h-4" />}
          {item.isLast ? (
            <span className="text-[#1D1D1F] font-medium capitalize">{item.label}</span>
          ) : (
            <Link to={item.path} className="hover:text-[#0071E3] transition-colors capitalize">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
