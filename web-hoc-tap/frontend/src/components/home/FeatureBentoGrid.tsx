'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Bot,
  FileScan,
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  Users,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';

export const FeatureBentoGrid: React.FC = () => {
  const router = useRouter();
  const [activePersona, setActivePersona] = useState<'teacher' | 'student'>('teacher');

  return (
    <section className="w-full space-y-12">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-google-blue rounded-full text-xs font-bold select-none border border-blue-100 dark:border-blue-900/60">
          <Sparkles size={13} />
          Hệ sinh thái tính năng toàn diện
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Mọi công cụ bạn cần để dạy & học bứt phá
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Kết hợp sức mạnh trí tuệ nhân tạo, đấu trường tương tác thời gian thực và quản lý lớp học chuyên sâu.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
        
        {/* Bento 1: AI Documents & Tests Spotlight (Span 7 cols) */}
        <div className="md:col-span-7 bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-7 sm:p-9 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between border border-slate-800 group">
          {/* Subtle glow background */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/30 transition-all duration-500 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-bold">
                <Sparkles size={14} className="text-blue-300" />
                Chuẩn Bộ GD&ĐT
              </span>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ma trận 4 mức độ
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Kho Tài Liệu & Đề Thi Thông Minh
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Khởi tạo đề kiểm tra phân hóa theo 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao). Hỗ trợ công thức toán học KaTeX, bóc tách đề từ Word và xuất bản trực tiếp cho học sinh.
              </p>
            </div>
          </div>

          {/* Interactive Simulation Preview of Exam Matrix */}
          <div className="relative z-10 my-6 bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 text-xs font-mono">
              <span className="text-blue-400 font-bold flex items-center gap-1">
                📄 Đề kiểm tra 15 phút - Đại số 9
              </span>
              <span className="text-emerald-400 font-bold">
                100% Khớp SGK
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-700/50 border border-slate-600/40 flex items-center justify-between">
                <span className="text-slate-200 truncate font-medium">Câu 1: Giải phương trình bậc hai $ax^2 + bx + c = 0$</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 shrink-0 ml-2">Nhận biết</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-700/50 border border-slate-600/40 flex items-center justify-between">
                <span className="text-slate-200 truncate font-medium">Câu 2: Tìm điều kiện để phương trình có hai nghiệm phân biệt</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 shrink-0 ml-2">Thông hiểu</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/documents')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-google-pill dark:text-blue-300 hover:text-white transition-colors cursor-pointer"
            >
              Khám phá Kho tài liệu & Đề thi <ArrowUpRight size={14} />
            </button>
            <span className="text-[11px] text-slate-400">
              Xuất Word & PDF chuẩn Quốc gia
            </span>
          </div>
        </div>

        {/* Bento 2: AI Soạn đề & OCR Bóc tách (Span 5 cols) */}
        <div className="md:col-span-5 bg-white dark:bg-google-card-dark p-7 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-500 border border-amber-100 dark:border-amber-900/40">
              <FileScan size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Soạn Đề SI & Quét OCR Tự Động
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Tải lên tệp PDF đề thi hoặc ảnh chụp bài kiểm tra. Trí tuệ nhân tạo tự động nhận diện câu hỏi, đáp án A/B/C/D và lời giải chi tiết chỉ sau vài giây.
              </p>
            </div>

            {/* Visual Pill Flow */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <FileText size={16} className="text-google-blue shrink-0" />
                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                  Đề_Toán_Giữa_Kỳ_2_12.pdf
                </span>
                <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  Đã bóc tách 50 câu
                </span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <BrainCircuit size={16} className="text-purple-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  SI sinh ma trận đề & độ khó 4 cấp độ
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => router.push('/documents/create')}
              className="inline-flex items-center gap-1 text-xs font-bold text-google-blue hover:underline cursor-pointer"
            >
              Thử tạo đề thi ngay <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Bento 3: Quản lý Lớp học & Chấm bài Azota Style (Span 5 cols) */}
        <div className="md:col-span-5 bg-white dark:bg-google-card-dark p-7 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-google-green border border-emerald-100 dark:border-emerald-900/40">
              <GraduationCap size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Giao Bài & Chấm Điểm Thông Minh
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Tạo lớp học theo khối, chia sẻ liên kết vào lớp 1 chạm. Học sinh nộp bài tự luận qua ảnh hoặc làm trắc nghiệm trực tiếp. Thống kê phổ điểm và nhận xét chi tiết.
              </p>
            </div>

            {/* Stats Snippet */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">100%</span>
                <p className="text-[11px] text-slate-500">Chấm điểm tự động</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">Realtime</span>
                <p className="text-[11px] text-slate-500">Báo cáo nộp bài</p>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => router.push('/classes')}
              className="inline-flex items-center gap-1 text-xs font-bold text-google-green hover:underline cursor-pointer"
            >
              Xem danh sách lớp học <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Bento 4: Trợ lý Gia sư AI Kiyo 24/7 (Span 7 cols) */}
        <div className="md:col-span-7 bg-white dark:bg-google-card-dark p-7 sm:p-9 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 border border-purple-100 dark:border-purple-900/40">
                <Bot size={24} />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                Gia sư 24/7
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Trợ Lý Gia Sư SI Kiyo Đồng Hành
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Không chỉ giải đáp thắc mắc, SI Kiyo còn hướng dẫn phương pháp giải từng bước, gợi mở tư duy logic và tự động tổng hợp tóm tắt kiến thức sau mỗi buổi học.
              </p>
            </div>

            {/* Chat preview snippet */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-2.5 max-w-md">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                  Em
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs px-3.5 py-2 rounded-2xl rounded-tl-none">
                  Thầy ơi, giải thích giúp em tại sao đáp án câu 12 lại là B với ạ?
                </div>
              </div>
              <div className="flex items-start gap-2.5 max-w-md ml-auto flex-row-reverse">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  SI
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-900/40 text-purple-900 dark:text-purple-200 text-xs px-3.5 py-2 rounded-2xl rounded-tr-none">
                  Chào em! Ở câu 12, theo định lý Pytago trong tam giác vuông: \( a^2 + b^2 = c^2 \). Thay số vào ta có...
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="button"
              onClick={() => router.push('/si')}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Trò chuyện cùng SI Kiyo <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Target Audience Tabs (Giáo viên vs Học sinh) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Giải pháp đo ni đóng giày cho mọi đối tượng
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tối ưu hóa thời gian cho thầy cô, nhân đôi hứng thú cho học sinh
            </p>
          </div>

          <div className="inline-flex p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActivePersona('teacher')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activePersona === 'teacher'
                  ? 'bg-google-blue text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dành cho Giáo viên
            </button>
            <button
              type="button"
              onClick={() => setActivePersona('student')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activePersona === 'student'
                  ? 'bg-google-green text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dành cho Học sinh
            </button>
          </div>
        </div>

        <div className="pt-8">
          {activePersona === 'teacher' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-blue font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Tiết kiệm 80% thời gian</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Soạn đề tự động từ sách giáo khoa, bài tập có sẵn qua OCR và SI. Chấm bài trắc nghiệm và thống kê biểu đồ chỉ bằng 1 click.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-blue font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Ma trận đề chuẩn Quốc gia</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tự động sinh đề kiểm tra phân hóa theo 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) chuẩn Bộ GD&ĐT.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-blue font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Quản lý học sinh tập trung</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Lưu trữ điểm số, lịch sử nộp bài và nhận xét cá nhân hóa theo từng kỳ học một cách an toàn và ngăn nắp.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-green font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Ôn luyện trực quan & Hiệu quả</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Theo dõi kết quả làm bài tập, chuỗi câu trả lời đúng (Streak) và tích lũy điểm số giúp việc ôn thi dễ dàng và tiến bộ.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-green font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Phản hồi kết quả tức thì</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Biết ngay đáp án đúng/sai sau mỗi câu làm, kèm theo lời giải cặn kẽ từng bước để kịp thời lấp lỗ hổng kiến thức.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-google-green font-bold text-sm">
                  <CheckCircle2 size={18} />
                  <span>Kho tài liệu phong phú</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Truy cập miễn phí hàng nghìn bộ đề thi thử THPT Quốc Gia, đề thi học kỳ của các trường chuyên trên cả nước.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
