import React from 'react';
import { Settings as SettingsIcon, Globe, Bell, Shield, Moon, Monitor, Sun } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const SettingsPage: React.FC = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[40px] font-semibold leading-[44px] text-[#1D1D1F] font-display">Cài đặt hệ thống</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {[
              { label: 'Chung', icon: SettingsIcon, active: true },
              { label: 'Giao diện', icon: Moon },
              { label: 'Thông báo', icon: Bell },
              { label: 'Bảo mật', icon: Shield },
              { label: 'Ngôn ngữ', icon: Globe },
            ].map((item, i) => (
              <button 
                key={i} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  item.active 
                  ? 'bg-[#0071E3] text-white' 
                  : 'text-[#333336] hover:bg-[#F5F5F7]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
            <h3 className="text-[20px] font-semibold mb-6">Giao diện</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Sáng', icon: Sun, active: true },
                { label: 'Tối', icon: Moon },
                { label: 'Hệ thống', icon: Monitor },
              ].map((theme, i) => (
                <button 
                  key={i} 
                  className={`flex flex-col items-center gap-3 p-4 border-2 rounded-2xl transition-all ${
                    theme.active 
                    ? 'border-[#0071E3] bg-[#0071E3]/5' 
                    : 'border-[#EDEDF2] hover:border-[#D5D5D7]'
                  }`}
                >
                  <theme.icon className={`w-6 h-6 ${theme.active ? 'text-[#0071E3]' : 'text-[#6E6E73]'}`} />
                  <span className={`text-sm font-semibold ${theme.active ? 'text-[#0071E3]' : 'text-[#333336]'}`}>{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
            <h3 className="text-[20px] font-semibold mb-6">Thông tin trường học</h3>
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <Input label="Tên trường" defaultValue="Trường THPT StudentOS" className="bg-[#F5F5F7]" />
                 <Input label="Mã trường" defaultValue="SOS-001" className="bg-[#F5F5F7]" />
               </div>
               <Input label="Địa chỉ" defaultValue="123 Apple Way, Cupertino, CA" className="bg-[#F5F5F7]" />
            </div>
            <div className="mt-8 flex justify-end">
              <Button>Lưu cấu hình</Button>
            </div>
          </div>

          <div className="bg-white border border-[#EDEDF2] p-8 rounded-2xl">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-[17px] font-semibold">Tự động gửi báo cáo tháng</h3>
                   <p className="text-sm text-[#6E6E73]">Hệ thống sẽ tự động gửi báo cáo học tập cho phụ huynh vào ngày 30 hàng tháng.</p>
                </div>
                <div className="w-12 h-6 bg-[#0071E3] rounded-full relative p-1 cursor-pointer">
                   <div className="absolute right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
