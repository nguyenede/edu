'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ArrowLeft, BookOpen, GraduationCap, Sparkles, HelpCircle } from 'lucide-react';

export default function HelpPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <HelpCircle size={22} className="text-google-blue" />
              Hướng dẫn sử dụng KiyoEdu
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nền tảng Giáo dục trực tuyến & Quản lý học tập thông minh
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl">
            <BookOpen size={24} className="text-google-blue shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1. Tự động tạo Đề thi từ Docx
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Vào mục <strong>Tài liệu</strong> &rarr; Chọn <em>Tạo / Upload đề từ file (.docx)</em>. Hệ thống sẽ tự động bóc tách câu hỏi, đáp án A/B/C/D và lời giải chi tiết.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl">
            <Sparkles size={24} className="text-purple-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                2. Trợ lý SI tạo đề kiểm tra thông minh
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Vào mục <strong>Trợ lý SI</strong> hoặc <strong>Tạo đề với SI</strong> trong Kho tài liệu &rarr; Nhập chủ đề, cấp lớp, phân bổ độ khó theo ma trận chuẩn Bộ GD&ĐT để sinh đề trắc nghiệm tức thì.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-green-50/50 dark:bg-green-950/20 rounded-2xl">
            <GraduationCap size={24} className="text-google-green shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                3. Quản lý Lớp học & Giao bài tập
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tạo lớp học theo từng môn hoặc khối lớp. Thêm học sinh bằng mã lớp hoặc địa chỉ email để giao bài tập tự chấm điểm kiểu Azota.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl">
            <Sparkles size={24} className="text-purple-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                4. Báo cáo & Thống kê thông minh
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Xem biểu đồ trực quan về điểm trung bình, tỷ lệ hoàn thành bài tập, danh sách học sinh cần hỗ trợ và xuất file Excel báo cáo cho nhà trường.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
