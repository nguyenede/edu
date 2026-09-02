import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <h1 className="text-[80px] font-semibold text-[#1D1D1F] font-display leading-none">404</h1>
      <h2 className="text-[24px] font-semibold text-[#1D1D1F] mt-4">Không tìm thấy trang</h2>
      <p className="text-[17px] text-[#6E6E73] mt-2 text-center max-w-md">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button>
          <Home className="w-4 h-4 mr-2" /> Về Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
