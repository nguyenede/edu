import React, { useEffect, useState } from 'react';
import { Bell, Clock, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { cn } from '../ui/Button';
import { lockPageScroll } from '../../lib/scrollLock';

interface Notification {
  id: number;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  created_at: string;
  read_at: string | null;
}

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications', { params: { limit: 5 } });
      setNotifications(response.data.data);
      const unread = (response.data.data as Notification[]).filter((notification) => !notification.read_at).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll();
  }, [isOpen]);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'important': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-[#0071E3]" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Thông báo, ${unreadCount} tin chưa đọc`}
        aria-expanded={isOpen}
        className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
      >
        <Bell className="w-5 h-5 text-[#333336]" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#0071E3] rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Đóng danh sách thông báo"
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-[#EDEDF2] rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-[#EDEDF2] flex justify-between items-center bg-[#F5F5F7]/50">
              <h3 className="font-semibold text-[#1D1D1F]">Thông báo</h3>
              <span className="text-[11px] font-bold text-[#0071E3] uppercase">{unreadCount} tin mới</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={n.id} 
                    className={cn(
                      "w-full text-left p-4 border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7]/30 transition-colors cursor-pointer flex gap-3",
                      !n.read_at && "bg-[#0071E3]/[0.02]"
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="shrink-0 mt-1">
                      {getPriorityIcon(n.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm text-left text-[#1D1D1F]", !n.read_at && "font-semibold")}>{n.title}</p>
                      <p className="text-xs text-[#6E6E73] mt-1 line-clamp-2">{n.content}</p>
                      <p className="text-[10px] text-[#A1A1A6] mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    {!n.read_at && (
                       <div className="w-2 h-2 bg-[#0071E3] rounded-full shrink-0 mt-2" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#6E6E73]">Không có thông báo nào.</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-[#F5F5F7]/50 text-center border-t border-[#EDEDF2]">
              <button className="text-xs font-semibold text-[#0071E3] hover:underline" onClick={() => { navigate('/notifications'); setIsOpen(false); }}>Xem tất cả thông báo</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
