import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { 
  User, 
  Clock, 
  Search, 
  Info
} from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entity_type: string;
  entity_id: number;
  details: string;
  created_at: string;
}

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audit', {
        params: { action: selectedAction, entity_type: selectedEntity }
      });
      setLogs(response.data.data);
    } catch (error) {
      console.error('Fetch audit logs error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction, selectedEntity]);

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE': return <Badge variant="success">CREATE</Badge>;
      case 'UPDATE': return <Badge variant="warning">UPDATE</Badge>;
      case 'DELETE': return <Badge variant="error">DELETE</Badge>;
      case 'LOGIN': return <Badge variant="success">LOGIN</Badge>;
      default: return <Badge variant="inactive">{action}</Badge>;
    }
  };

  const columns = [
    { 
      header: 'Thời gian', 
      accessor: (item: AuditLog) => (
        <div className="flex items-center gap-2 text-[#6E6E73] text-sm">
           <Clock className="w-4 h-4" />
           {new Date(item.created_at).toLocaleString('vi-VN')}
        </div>
      ) 
    },
    { 
      header: 'Người dùng', 
      accessor: (item: AuditLog) => (
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
              <User className="w-4 h-4 text-[#6E6E73]" />
           </div>
           <span className="font-semibold">{item.user_name || 'Hệ thống'}</span>
        </div>
      ) 
    },
    { 
      header: 'Hành động', 
      accessor: (item: AuditLog) => getActionBadge(item.action) 
    },
    { 
      header: 'Đối tượng', 
      accessor: (item: AuditLog) => (
        <span className="text-sm font-medium px-2 py-1 bg-[#F5F5F7] rounded-md text-[#333336]">
          {item.entity_type} {item.entity_id ? `#${item.entity_id}` : ''}
        </span>
      ) 
    },
    { 
      header: 'Chi tiết', 
      accessor: (item: AuditLog) => (
        <div className="max-w-[300px] truncate text-xs text-[#6E6E73]">
           {item.details || 'Không có chi tiết'}
        </div>
      ) 
    },
    {
      header: '',
      accessor: () => (
        <button className="p-2 hover:bg-black/5 rounded-full text-[#0071E3]">
          <Info className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex items-center gap-3">
           <div className="flex p-1 bg-[#F5F5F7] rounded-full border border-[#EDEDF2]">
              <button className="px-6 py-2 rounded-full text-sm font-semibold bg-white text-[#0071E3] shadow-sm">Tất cả</button>
              <button className="px-6 py-2 rounded-full text-sm font-semibold text-[#6E6E73] hover:text-[#1D1D1F]">Lỗi hệ thống</button>
           </div>
        </div>
      </div>

      <div className="bg-white">
         <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6E6E73]" />
                  <Input label="Tìm kiếm" withSearchIcon className="pl-10" />
               </div>
               <Select label="Hành động" value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
                 <option value="">Tất cả hành động</option>
                 <option value="CREATE">CREATE</option>
                 <option value="UPDATE">UPDATE</option>
                 <option value="DELETE">DELETE</option>
                 <option value="LOGIN">LOGIN</option>
               </Select>
               <Select label="Đối tượng" value={selectedEntity} onChange={(e) => setSelectedEntity(e.target.value)}>
                 <option value="">Tất cả đối tượng</option>
                 <option value="STUDENT">Học sinh</option>
                 <option value="TEACHER">Giáo viên</option>
                 <option value="GRADE">Điểm số</option>
                 <option value="CLASS">Lớp học</option>
                 <option value="PAYMENT">Học phí</option>
               </Select>
            </div>
         </div>
         <Table columns={columns} data={logs} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default AuditLogPage;
