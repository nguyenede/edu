'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Play,
  Copy,
  Check,
  FileText,
  Folder,
  GraduationCap,
  ExternalLink,
  Users,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ToolExecutionResult } from '@/lib/ai/aiToolRegistry';
import { safeLocalStorageSet } from '@/lib/safeStorage';
import { idbSaveDocument } from '@/lib/indexedDbStorage';

export function ActionWidgetRenderer({ action }: { action: ToolExecutionResult }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 1. GAME ROOM LAUNCH WIDGET
  if (action.actionType === 'game' && action.data) {
    const { pinCode, title, mode, questionsCount, hostUrl, joinUrl } = action.data;

    return (
      <div className="my-3 overflow-hidden rounded-[14px] border border-violet-200 dark:border-violet-800/60 bg-gradient-to-br from-violet-50/70 via-white to-purple-50/50 dark:from-[#1e1b2e] dark:via-[#1a1728] dark:to-[#141220] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-violet-100 dark:border-violet-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Gamepad2 size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h4>
              <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                Chế độ: {mode} • {questionsCount || 5} câu hỏi
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
            Trực tiếp
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#141220] border border-violet-100 dark:border-violet-900/40">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Mã PIN Tham gia</div>
            <div className="text-xl md:text-2xl font-black text-violet-600 dark:text-violet-400 tracking-wider font-mono">
              {pinCode}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(pinCode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950 hover:bg-violet-100 dark:hover:bg-violet-900/60 text-xs font-semibold text-violet-700 dark:text-violet-300 transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Đã chép' : 'Sao chép PIN'}</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push(joinUrl)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Play size={14} className="fill-white" />
            <span>Vào chơi ngay</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(hostUrl)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1728] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>Phòng Host</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. EXAM CARD WIDGET
  if (action.actionType === 'exam' && action.data) {
    const { examId, title, subject, grade, durationMinutes, questionsCount, examUrl } = action.data;

    const handleOpenExam = async () => {
      if (typeof window !== 'undefined' && action.data?.questions && action.data.questions.length > 0) {
        try {
          const totalQ = action.data.questions.length;
          const pt = Math.round((10 / totalQ) * 100) / 100;
          const newDoc = {
            id: examId,
            name: `${title}.docx`,
            parentId: null,
            fileType: 'docx' as const,
            createdAt: new Date().toISOString(),
            parsedQuiz: {
              title,
              description: `Đề thi môn ${subject || 'Kiến thức tổng hợp'} - Khối ${grade || 'Tự do'} do ChatCoi tạo tự động.`,
              durationMinutes: durationMinutes || 45,
              questions: action.data.questions.map((q: any, idx: number) => ({
                id: q.id || `q_${idx + 1}`,
                content: (q.content || q.question || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim(),
                points: q.points || pt,
                options: (q.options || []).map((opt: any) => ({
                  content: typeof opt === 'string' ? opt : opt?.content || '',
                  isCorrect: Boolean(opt?.isCorrect),
                })),
              })),
            },
          };

          await idbSaveDocument(newDoc);
          const existingDocs = JSON.parse(localStorage.getItem('app_documents_files') || '[]');
          const filtered = Array.isArray(existingDocs) ? existingDocs.filter((d: any) => d && d.id !== examId) : [];
          safeLocalStorageSet('app_documents_files', JSON.stringify([newDoc, ...filtered]));
        } catch (e) {
          console.error('Error ensuring exam in localStorage / IndexedDB:', e);
        }
      }
      router.push(examUrl || `/documents/${examId}`);
    };

    return (
      <div className="my-3 overflow-hidden rounded-[14px] border border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/50 dark:from-[#172338] dark:via-[#151c2c] dark:to-[#101724] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h4>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                Môn: {subject} • Khối: {grade}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-semibold shrink-0">
            {questionsCount} câu hỏi
          </span>
        </div>

        <div className="flex items-center gap-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>Thời gian: {durationMinutes} phút</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-slate-400" />
            <span>Đã lưu vào Kho tài liệu</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleOpenExam}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs md:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Play size={14} className="fill-white" />
            <span>Mở & Làm bài thi</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. FOLDER CARD WIDGET
  if (action.actionType === 'folder' && action.data) {
    const { name, folderUrl } = action.data;

    return (
      <div className="my-3 overflow-hidden rounded-[14px] border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/60 via-white to-yellow-50/40 dark:from-[#2a2216] dark:via-[#1e1913] dark:to-[#171410] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Folder size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {name}
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Thư mục tài liệu mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(folderUrl)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Mở thư mục</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 4. CLASS CARD WIDGET
  if (action.actionType === 'class' && action.data) {
    const { name, grade, subject, code, studentsCount, classUrl } = action.data;

    return (
      <div className="my-3 overflow-hidden rounded-[14px] border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 dark:from-[#172922] dark:via-[#13211c] dark:to-[#0f1a16] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {name}
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Môn: {subject} • Khối: {grade}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold shrink-0">
            {studentsCount} học sinh
          </span>
        </div>

        <div className="my-3 py-2 px-3 rounded-xl bg-white dark:bg-[#0f1c16] border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
              Mã tham gia lớp:
            </span>
            <span className="ml-2 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              {code}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(code)}
            className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-medium cursor-pointer"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Đã chép' : 'Chép mã'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => router.push(classUrl)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Users size={14} />
            <span>Xem & Quản lý Lớp học</span>
          </button>
        </div>
      </div>
    );
  }

  // 5. NAVIGATION WIDGET
  if (action.actionType === 'navigation' && action.data) {
    const { path, label } = action.data;
    return (
      <div className="my-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-500" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {action.message}
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push(path)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <span>{label}</span>
          <ExternalLink size={13} />
        </button>
      </div>
    );
  }

  return null;
}
