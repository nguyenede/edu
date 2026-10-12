import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  'ai-advisor': 'SI Advisor',
};

const navigationRoutes = [
  { path: '/dashboard', label: 'Tổng quan' },
  { path: '/students', label: 'Học sinh' },
  { path: '/teachers', label: 'Giáo viên' },
  { path: '/classes', label: 'Lớp học' },
  { path: '/subjects', label: 'Môn học' },
  { path: '/schedules', label: 'Thời khóa biểu' },
  { path: '/grades', label: 'Điểm số' },
  { path: '/attendance', label: 'Chuyên cần' },
  { path: '/payments', label: 'Học phí' },
  { path: '/reports', label: 'Báo cáo' },
  { path: '/ai-advisor', label: 'SI Advisor' },
  { path: '/settings', label: 'Cài đặt' },
];

function BreadcrumbChevronButton({
  items,
  activePath,
}: {
  items: { path: string; label: string }[];
  activePath: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Danh mục chuyển nhanh (kiểu Windows)"
        className={`p-0.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
          isOpen
            ? 'bg-slate-200 text-[#0071E3]'
            : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-slate-100'
        }`}
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-90 text-[#0071E3]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[190px] max-h-64 overflow-y-auto bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider">
            Điều hướng nhanh
          </div>
          <div className="space-y-0.5 px-1">
            {items.map((it) => {
              const isActive = activePath.startsWith(it.path);
              return (
                <button
                  key={it.path}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(it.path);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-[#0071E3]'
                      : 'text-[#1D1D1F] hover:bg-slate-100'
                  }`}
                >
                  <span>{it.label}</span>
                  {isActive && <span className="text-[10px] text-[#0071E3]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
          {i > 0 && (
            <BreadcrumbChevronButton
              items={navigationRoutes}
              activePath={location.pathname}
            />
          )}
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
