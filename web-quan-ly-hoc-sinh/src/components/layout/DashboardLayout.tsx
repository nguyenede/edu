import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Wallet,
  Bell,
  Settings,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  ChevronRight,
  ChevronDown,
  History,
  BarChart3,
  Calendar,
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '../../components/ui/Button';
import NotificationDropdown from './NotificationDropdown';
import Breadcrumb from './Breadcrumb';
import { BACKEND_URL } from '../../lib/api';
import { lockPageScroll } from '../../lib/scrollLock';
import Input from '../ui/Input';

interface MenuItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  roles: string[];
  children?: { title: string; path: string; roles: string[] }[];
}

interface SearchResult {
  id: number;
  type: 'student' | 'teacher' | 'class';
  title: string;
  subtitle: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh'
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const toggleSubmenu = (title: string) => {
    setExpandedMenu(prev => prev === title ? null : title);
  };

  const categories = [
    {
      id: 'general',
      title: 'Hệ thống',
      items: [
        { title: 'Tổng quan', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'teacher', 'student', 'parent'] },
        { title: 'SI Advisor', icon: Sparkles, path: '/si-advisor', roles: ['admin', 'teacher', 'student', 'parent'] },
        { title: 'Thông báo', icon: Bell, path: '/notifications', roles: ['admin', 'teacher', 'student', 'parent'] },
        { title: 'Cài đặt', icon: Settings, path: '/settings', roles: ['admin', 'teacher', 'student', 'parent'] },
      ]
    },
    {
      id: 'management',
      title: 'Quản lý đào tạo',
      items: [
        {
          title: 'Học sinh', icon: Users, roles: ['admin', 'teacher'],
          children: [
            { title: 'Danh sách', path: '/students', roles: ['admin', 'teacher'] },
            { title: 'Thêm mới', path: '/students/create', roles: ['admin'] },
          ]
        },
        {
          title: 'Giáo viên', icon: GraduationCap, roles: ['admin'],
          children: [
            { title: 'Danh sách', path: '/teachers', roles: ['admin'] },
            { title: 'Thêm mới', path: '/teachers/create', roles: ['admin'] },
          ]
        },
        { title: 'Lớp học', icon: BookOpen, path: '/classes', roles: ['admin', 'teacher'] },
        { title: 'Môn học', icon: BookOpen, path: '/subjects', roles: ['admin', 'teacher'] },
        { title: 'Phụ huynh', icon: Users, path: '/parents', roles: ['admin'] },
      ]
    },
    {
      id: 'academic',
      title: 'Học vụ & Cá nhân',
      items: [
        { title: 'Thời khóa biểu', icon: Calendar, path: '/schedules', roles: ['admin', 'teacher', 'student', 'parent'] },
        { title: 'Điểm số', icon: ClipboardCheck, path: '/grades', roles: ['admin', 'teacher', 'student', 'parent'] },
        { title: 'Chuyên cần', icon: ClipboardCheck, path: '/attendance', roles: ['admin', 'teacher'] },
        { title: 'Học phí', icon: Wallet, path: '/payments', roles: ['admin', 'student', 'parent'] },
      ]
    },
    {
      id: 'admin_tools',
      title: 'Công cụ quản trị',
      items: [
        { title: 'Báo cáo', icon: BarChart3, path: '/reports', roles: ['admin'] },
        { title: 'Nhật ký', icon: History, path: '/audit', roles: ['admin'] },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 w-[232px] bg-white border-r border-[#EDEDF2] z-50 transition-transform duration-300 lg:translate-x-0",
        !isOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full px-2 py-4">
          <div className="h-11 flex items-center justify-between px-2 mb-7">
            <span className="text-2xl font-semibold text-[#1D1D1F] tracking-tight font-display">StudentOS</span>
            <button type="button" aria-label="Đóng menu" onClick={onClose} className="lg:hidden p-2 rounded-full hover:bg-[#F5F5F7]"><X className="w-5 h-5" /></button>
          </div>

          <nav className="scrollbar-hidden flex-1 space-y-6 overflow-y-auto overscroll-contain">
            {categories.map((cat) => {
              const visibleItems = cat.items.filter((item: MenuItem) => {
                if (!user) return false;
                if (item.children) {
                  return item.children.some(c => c.roles.includes(user.role)) || item.roles.includes(user.role);
                }
                return item.roles.includes(user.role);
              });
              if (visibleItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <h4 className="px-3 text-[11px] font-bold text-[#A1A1A6] uppercase tracking-wider mb-2">
                    {cat.title}
                  </h4>
                  <div className="space-y-0.5">
                    {visibleItems.map((item: MenuItem) => {
                      const hasChildren = item.children && item.children.length > 0;

                      // SUBMENU: render as expandable
                      if (hasChildren) {
                        const isExpanded = expandedMenu === item.title;
                        const isSubActive = item.children!.some(c => location.pathname === c.path || location.pathname.startsWith(c.path + '/'));
                        const visibleChildren = item.children!.filter(c => user && c.roles.includes(user.role));

                        return (
                          <div key={item.title}>
                            <button
                              onClick={() => toggleSubmenu(item.title)}
                              aria-expanded={isExpanded}
                              className={cn(
                                "w-full flex items-center gap-3 h-10 px-3 text-[15px] font-normal transition-all duration-150 rounded-lg",
                                isSubActive
                                  ? "text-[#0071E3] font-normal"
                                  : "text-[#333336] hover:bg-black/5 hover:text-[#0071E3]"
                              )}
                            >
                              <item.icon className="w-[18px] h-[18px] shrink-0" />
                              <span className="flex-1 text-left">{item.title}</span>
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200" />
                                : <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" />
                              }
                            </button>
                            <div className={cn(
                              "ml-7 mt-0.5 space-y-0.5 overflow-hidden transition-all duration-200",
                              isExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                            )}>
                              {visibleChildren.map((child) => {
                                const isChildActive = location.pathname === child.path;
                                return (
                                  <Link
                                    key={child.path}
                                    to={child.path}
                                    onClick={onClose}
                                    className={cn(
                                      "flex items-center h-9 px-3 text-[14px] font-normal transition-all duration-150 rounded-lg",
                                      isChildActive
                                        ? "bg-[#0071E3]/8 text-[#0071E3] font-normal"
                                        : "text-[#333336] hover:bg-black/5 hover:text-[#0071E3]"
                                    )}
                                  >
                                    {child.title}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // SIMPLE ITEM: direct link
                      const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path!));
                      return (
                        <Link
                          key={item.path}
                          to={item.path!}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 h-10 px-3 text-[15px] font-normal transition-all duration-150 rounded-lg",
                            isActive
                              ? "bg-[#0071E3]/8 text-[#0071E3] font-normal"
                              : "text-[#333336] hover:bg-black/5 hover:text-[#0071E3]"
                          )}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-[#EDEDF2]">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-full bg-[#EDEDF2] flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  <img src={`${BACKEND_URL}${user.avatar_url}`} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-[#6E6E73]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1D1D1F] truncate">{user?.full_name}</p>
                <p className="text-[12px] text-[#6E6E73]">{user ? roleLabels[user.role] || user.role : ''}</p>
              </div>
              <button onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất" className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <LogOut className="w-4 h-4 text-[#6E6E73]" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const TopBar: React.FC<{ onOpenSidebar: () => void }> = ({ onOpenSidebar }) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!showDropdown) return;
    return lockPageScroll();
  }, [showDropdown]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await api.get('/reports/search', { params: { q: val } });
      setResults(res.data.data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false);
    setQuery('');
    if (result.type === 'student') navigate(`/students/${result.id}`);
    else if (result.type === 'teacher') navigate(`/teachers`);
    else if (result.type === 'class') navigate(`/classes`);
  };
  
  return (
    <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-[20px] border-b border-black/10 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button aria-label="Mở menu" className="lg:hidden p-2 hover:bg-black/5 rounded-full" onClick={onOpenSidebar}>
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden sm:flex items-center text-sm text-[#6E6E73] gap-2">
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {(user?.role === 'admin' || user?.role === 'teacher') && <div className="relative hidden md:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
          <Input label="Tìm kiếm" withSearchIcon className="pl-10" value={query} onChange={(e) => handleSearch(e.target.value)} onFocus={() => query.length >= 2 && setShowDropdown(true)} />

          {showDropdown && results.length > 0 && (
            <>
              <button
                type="button"
                aria-label="Đóng kết quả tìm kiếm"
                className="fixed inset-0 bg-black/10 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-11 left-0 w-[320px] bg-white border border-[#EDEDF2] rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {results.map((r) => (
                  <button
                    type="button"
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleResultClick(r)}
                    className="w-full text-left px-4 py-3 hover:bg-[#F5F5F7] cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#EDEDF2] flex items-center justify-center shrink-0">
                      {r.type === 'student' ? <UserIcon className="w-4 h-4 text-[#0071E3]" /> : 
                       r.type === 'teacher' ? <GraduationCap className="w-4 h-4 text-green-600" /> : 
                       <BookOpen className="w-4 h-4 text-orange-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{r.title}</p>
                      <p className="text-[11px] text-[#6E6E73] truncate capitalize">{r.type} • {r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>}
        
        <NotificationDropdown />

        <button aria-label="Mở hồ sơ cá nhân" className="w-8 h-8 rounded-full bg-[#EDEDF2] flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => navigate('/profile')}>
           {user?.avatar_url ? (
             <img src={`${BACKEND_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
           ) : (
             <UserIcon className="w-4 h-4 text-[#6E6E73]" />
           )}
        </button>
      </div>
    </header>
  );
};

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    return lockPageScroll();
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="lg:ml-[232px] min-h-screen flex flex-col">
        <TopBar onOpenSidebar={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
