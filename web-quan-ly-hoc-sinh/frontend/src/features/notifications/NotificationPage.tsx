import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Badge from '../../components/ui/Badge';
import { Bell, User as UserIcon, Clock, AlertCircle, Info } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import { toast } from '../../store/toastStore';
import { Plus } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  content: string;
  sender_name: string;
  audience_type: string;
  priority: string;
  read_at: string | null;
  created_at: string;
}

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuthStore(state => state.user);
  const canSend = user?.role === 'admin' || user?.role === 'teacher';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [classes, setClasses] = useState<{ id: number; class_name: string }[]>([]);
  const [draft, setDraft] = useState({ title: '', content: '', audience_type: user?.role === 'teacher' ? 'class' : 'all', audience_value: '', priority: 'normal' });

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (canSend) {
      api.get('/classes', { params: { limit: 100 } }).then((response) => setClasses(response.data.data)).catch(() => setClasses([]));
    }
  }, []);

  const sendNotification = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    try {
      await api.post('/notifications', draft);
      toast.success('Đã gửi thông báo.');
      setDraft({ title: '', content: '', audience_type: user?.role === 'teacher' ? 'class' : 'all', audience_value: '', priority: 'normal' });
      setIsComposerOpen(false);
      await fetchNotifications();
    } catch (requestError: unknown) {
      const message = requestError && typeof requestError === 'object' && 'response' in requestError
        ? (requestError as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      toast.error(message || 'Không thể gửi thông báo.');
    } finally { setIsSending(false); }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'important': return <Info className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-[#0071E3]" />;
    }
  };

  return (
    <div>
      {canSend && <div className="flex justify-end mb-5"><Button onClick={() => setIsComposerOpen(true)}><Plus className="w-4 h-4 mr-2" />Soạn thông báo</Button></div>}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-12 text-center text-[#6E6E73]">Đang tải thông báo...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-[#6E6E73] bg-[#F5F5F7] rounded-2xl border border-dashed border-[#D5D5D7]">
            Không có thông báo nào.
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-6 bg-white border rounded-2xl transition-all cursor-pointer group ${notif.read_at ? 'border-[#EDEDF2] opacity-75' : 'border-[#0071E3]/20 shadow-sm'}`}
              onClick={() => !notif.read_at && markAsRead(notif.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${notif.read_at ? 'bg-[#F5F5F7]' : 'bg-[#0071E3]/10'}`}>
                    {getPriorityIcon(notif.priority)}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${notif.read_at ? 'text-[#333336]' : 'text-[#1D1D1F]'}`}>
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-[#6E6E73]">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" /> {notif.sender_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
                {!notif.read_at && <Badge variant="active">Mới</Badge>}
              </div>
              <p className="text-[15px] text-[#333336] leading-relaxed whitespace-pre-wrap">
                {notif.content}
              </p>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} title="Soạn thông báo">
        <form onSubmit={sendNotification} className="space-y-4">
          <Input label="Tiêu đề" required minLength={2} maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <Textarea label="Nội dung" required minLength={2} maxLength={10000} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Đối tượng" value={draft.audience_type} onChange={(event) => setDraft({ ...draft, audience_type: event.target.value, audience_value: '' })}>
              {user?.role === 'admin' && <><option value="all">Tất cả người dùng</option><option value="role">Theo vai trò</option></>}
              <option value="class">Theo lớp học</option>
            </Select>
            {draft.audience_type === 'role' ? (
              <Select label="Vai trò nhận" value={draft.audience_value} onChange={(event) => setDraft({ ...draft, audience_value: event.target.value })}><option value="">Chọn vai trò</option><option value="teacher">Giáo viên</option><option value="student">Học sinh</option><option value="parent">Phụ huynh</option></Select>
            ) : draft.audience_type === 'class' ? (
              <Select label="Lớp nhận" value={draft.audience_value} onChange={(event) => setDraft({ ...draft, audience_value: event.target.value })}><option value="">Chọn lớp</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.class_name}</option>)}</Select>
            ) : <div />}
          </div>
          <Select label="Mức ưu tiên" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="normal">Bình thường</option><option value="important">Quan trọng</option><option value="urgent">Khẩn cấp</option></Select>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setIsComposerOpen(false)}>Hủy</Button><Button type="submit" isLoading={isSending}>Gửi thông báo</Button></div>
        </form>
      </Modal>
    </div>
  );
};

export default NotificationPage;
