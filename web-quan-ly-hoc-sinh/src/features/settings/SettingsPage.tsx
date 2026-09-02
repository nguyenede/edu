import React, { useEffect, useState } from 'react';
import { Lock, Globe, Database, CheckCircle2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

interface Setting {
  setting_key: string;
  setting_value: string;
  category: string;
  description: string;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data.data.list);
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    if (!isAdmin) return;
    setIsSaving(key);
    try {
      await api.put(`/settings/${key}`, { value });
      setSettings(settings.map(s => s.setting_key === key ? { ...s, setting_value: value } : s));
      toast.success('Đã lưu cài đặt.');
    } catch (error) {
      console.error('Update setting error:', error);
      toast.error('Không thể lưu cài đặt.');
    } finally {
      setIsSaving(null);
    }
  };

  const sections = [
    {
      id: 'general',
      title: 'Hệ thống',
      icon: <Globe className="w-5 h-5" />,
      items: settings.filter(s => s.category === 'general' || s.category === 'academic')
    },
    {
      id: 'security',
      title: 'Bảo mật & Phân quyền',
      icon: <Lock className="w-5 h-5" />,
      items: settings.filter(s => s.category === 'system')
    }
  ];

  if (isLoading) return <div className="p-8 text-center">Đang tải cài đặt...</div>;

  return (
    <div className="w-full">
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.id} className="bg-white border border-[#EDEDF2] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-[#EDEDF2] flex items-center gap-3 bg-[#F5F5F7]/30">
              <span className="text-[#0071E3]">{section.icon}</span>
              <h2 className="text-[17px] font-semibold text-[#1D1D1F]">{section.title}</h2>
            </div>
            <div className="divide-y divide-[#EDEDF2]">
              {section.items.map((item) => (
                <div key={item.setting_key} className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#F5F5F7]/20 transition-colors gap-4">
                  <div className="flex-1">
                    <p className="text-[15px] text-[#1D1D1F] font-semibold">{item.description}</p>
                    <p className="text-[13px] text-[#6E6E73] mt-0.5">{item.setting_key}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {isAdmin ? (
                      <div className="flex items-center gap-3">
                        <Input label={item.description} defaultValue={item.setting_value} onBlur={(e) => {
                            if (e.target.value !== item.setting_value) {
                              handleUpdate(item.setting_key, e.target.value);
                            }
                          }} className="min-w-[200px]" />
                        {isSaving === item.setting_key && <div className="w-4 h-4 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin"></div>}
                        {!isSaving && <CheckCircle2 className="w-4 h-4 text-[#34C759] opacity-0 hover:opacity-100" />}
                      </div>
                    ) : (
                      <span className="text-[15px] text-[#6E6E73] font-medium">{item.setting_value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 border border-[#EDEDF2] bg-blue-50/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-[#0071E3] shadow-sm">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#1D1D1F]">Sao lưu & Bảo trì</p>
            <p className="text-[15px] text-[#6E6E73]">Chức năng sao lưu chưa được cấu hình trên máy chủ. Hãy sao lưu MySQL bằng quy trình vận hành của hệ thống.</p>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold whitespace-nowrap">Chưa cấu hình</span>
      </div>
    </div>
  );
};

export default SettingsPage;
