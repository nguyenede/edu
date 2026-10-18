'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  X,
  FileText,
  Hash,
  Upload,
  Check,
  RotateCcw,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  Plus,
  Minus,
  Shuffle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEFAULT_STUDENTS } from './RandomPickerGame';

export interface RosterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: string[];
  onSave: (newStudents: string[]) => void;
  title?: string;
}

export const RosterConfigModal: React.FC<RosterConfigModalProps> = ({
  isOpen,
  onClose,
  students,
  onSave,
  title = 'Danh sách học sinh',
}) => {
  // Mode tabs: 1. 'numbers' (Theo số thứ tự) vs 2. 'list' (Danh sách tên & Nhập file)
  const [activeTab, setActiveTab] = useState<'numbers' | 'list'>('list');

  // Tab 1 state (Numbers): Number range generator
  const [startNum, setStartNum] = useState<number>(1);
  const [endNum, setEndNum] = useState<number>(40);
  const [numberPrefix, setNumberPrefix] = useState<'none' | 'so' | 'vit' | 'custom'>('none');
  const [customPrefixText, setCustomPrefixText] = useState('Số ');

  // Tab 2 state (List & File): Text input & upload
  const [textInput, setTextInput] = useState('');
  const [fileStatus, setFileStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTextInput(students.join('\n'));
      setFileStatus(null);

      // Detect if current roster is numbers only
      const allNumbers = students.length > 0 && students.every((s) => !isNaN(Number(s.trim())));
      if (allNumbers) {
        const nums = students.map((s) => Number(s.trim()));
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        setStartNum(min);
        setEndNum(max);
        setActiveTab('numbers');
      }
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  // Extract current parsed list from textInput
  const parsedList = textInput
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Parse Excel / CSV / TXT files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileStatus(null);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = (event.target?.result as string) || '';
          const lines = content
            .split(/[\r\n,]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          if (lines.length === 0) {
            setFileStatus({ message: 'File TXT không có nội dung hợp lệ', isError: true });
            return;
          }
          setTextInput(lines.join('\n'));
          setFileStatus({
            message: `Đã nhập thành công ${lines.length} học sinh từ "${file.name}"`,
          });
        };
        reader.readAsText(file);
      } else {
        // Excel (.xlsx, .xls, .csv)
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

            if (!rows || rows.length === 0) {
              setFileStatus({ message: 'Bảng tính rỗng hoặc không đọc được dữ liệu', isError: true });
              return;
            }

            // Detect header row
            let headerRowIdx = -1;
            let fullNameCol = -1;
            let hoCol = -1;
            let tenCol = -1;

            for (let r = 0; r < Math.min(rows.length, 15); r++) {
              const row = rows[r];
              if (!Array.isArray(row)) continue;

              for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] || '').trim().toLowerCase();
                if (
                  cell.includes('họ và tên') ||
                  cell.includes('họ tên') ||
                  cell === 'tên học sinh' ||
                  cell === 'học sinh' ||
                  cell === 'họ và tên học sinh' ||
                  cell === 'fullname' ||
                  cell === 'full name'
                ) {
                  headerRowIdx = r;
                  fullNameCol = c;
                  break;
                }
                if (cell === 'họ đệm' || cell === 'họ' || cell === 'họ lót') {
                  hoCol = c;
                  headerRowIdx = r;
                }
                if (cell === 'tên' || cell === 'first name' || cell === 'name') {
                  tenCol = c;
                  headerRowIdx = r;
                }
              }
              if (fullNameCol !== -1 || (hoCol !== -1 && tenCol !== -1)) break;
            }

            const extracted: string[] = [];

            if (fullNameCol !== -1 && headerRowIdx !== -1) {
              for (let r = headerRowIdx + 1; r < rows.length; r++) {
                const val = String(rows[r]?.[fullNameCol] || '').trim();
                if (val && !val.match(/^\d+$/) && val.length > 1) {
                  extracted.push(val);
                }
              }
            } else if (hoCol !== -1 && tenCol !== -1 && headerRowIdx !== -1) {
              for (let r = headerRowIdx + 1; r < rows.length; r++) {
                const ho = String(rows[r]?.[hoCol] || '').trim();
                const ten = String(rows[r]?.[tenCol] || '').trim();
                const full = `${ho} ${ten}`.trim();
                if (full && full.length > 1) {
                  extracted.push(full);
                }
              }
            } else {
              // Fallback: column with most valid string names
              let bestCol = 0;
              let maxStrings = 0;
              const colCount = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));

              for (let c = 0; c < colCount; c++) {
                let validCount = 0;
                for (let r = 0; r < rows.length; r++) {
                  const val = String(rows[r]?.[c] || '').trim();
                  if (val.length > 2 && !val.match(/^[\d\s\.\,\-\/\:]+$/) && isNaN(Number(val))) {
                    validCount++;
                  }
                }
                if (validCount > maxStrings) {
                  maxStrings = validCount;
                  bestCol = c;
                }
              }

              for (let r = 0; r < rows.length; r++) {
                const val = String(rows[r]?.[bestCol] || '').trim();
                const lower = val.toLowerCase();
                if (
                  val &&
                  val.length > 1 &&
                  !val.match(/^[\d\s\.\,\-\/\:]+$/) &&
                  !lower.includes('stt') &&
                  !lower.includes('họ và tên') &&
                  !lower.includes('danh sách')
                ) {
                  extracted.push(val);
                }
              }
            }

            if (extracted.length === 0) {
              setFileStatus({
                message: 'Không tìm thấy cột họ tên trong file. Hãy kiểm tra lại định dạng file Excel.',
                isError: true,
              });
              return;
            }

            setTextInput(extracted.join('\n'));
            setFileStatus({
              message: `Đã nhập thành công ${extracted.length} học sinh từ "${file.name}"`,
            });
          } catch (err) {
            console.error('Error reading excel file:', err);
            setFileStatus({ message: 'Lỗi khi đọc file Excel. Vui lòng thử lại.', isError: true });
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      console.error(err);
      setFileStatus({ message: 'Không thể xử lý file này', isError: true });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Generate numbers list
  const generateNumbersList = () => {
    const s = Math.min(startNum, endNum);
    const e = Math.max(startNum, endNum);
    const count = Math.min(e - s + 1, 500); // safety cap
    const items: string[] = [];

    for (let i = s; i <= s + count - 1; i++) {
      if (numberPrefix === 'so') {
        items.push(`Số ${i}`);
      } else if (numberPrefix === 'vit') {
        items.push(`Vịt ${i}`);
      } else if (numberPrefix === 'custom') {
        items.push(`${customPrefixText}${i}`);
      } else {
        items.push(`${i}`);
      }
    }
    return items;
  };

  const handleApplyNumbers = () => {
    const generated = generateNumbersList();
    setTextInput(generated.join('\n'));
    setActiveTab('list');
    setFileStatus({
      message: `Đã tạo dãy ${generated.length} số (từ ${startNum} đến ${endNum})`,
    });
  };

  const handleShuffleList = () => {
    if (parsedList.length > 0) {
      const shuffled = [...parsedList].sort(() => Math.random() - 0.5);
      setTextInput(shuffled.join('\n'));
    }
  };

  const incrementStart = () => {
    setStartNum((prev) => Math.min(prev + 1, endNum));
  };
  const decrementStart = () => {
    setStartNum((prev) => Math.max(1, prev - 1));
  };
  const incrementEnd = () => {
    setEndNum((prev) => Math.min(prev + 1, 500));
  };
  const decrementEnd = () => {
    setEndNum((prev) => Math.max(startNum, prev - 1));
  };

  // Final Save
  const handleSave = () => {
    let finalItems: string[] = [];
    if (activeTab === 'numbers') {
      finalItems = generateNumbersList();
    } else {
      finalItems = parsedList;
    }

    if (finalItems.length === 0) {
      finalItems = DEFAULT_STUDENTS;
    }

    onSave(finalItems);
    onClose();
  };

  const generatedPreview = generateNumbersList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs select-none transition-opacity duration-200 animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] rounded-[28px] border border-slate-200/60 dark:border-white/10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all transform animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100 font-sans">
        {/* ======================================================== */}
        {/* MODAL HEADER */}
        {/* ======================================================== */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-google-hover dark:bg-google-hover-dark text-google-blue flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* SEGMENTED PILL SWITCHER TABS (GOOGLE MATERIAL 3) */}
        {/* ======================================================== */}
        <div className="px-6 pt-3 pb-1">
          <div className="p-1 bg-slate-100 dark:bg-white/5 rounded-full flex gap-1 border border-slate-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('numbers')}
              className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'numbers'
                  ? 'bg-white dark:bg-[#2b2d30] text-google-blue dark:text-google-pill shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Hash size={15} />
              <span>Số thứ tự (1 → N)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-[#2b2d30] text-google-blue dark:text-google-pill shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>Danh sách họ tên</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MODAL BODY */}
        {/* ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: SỐ THỨ TỰ (1 -> N) */}
          {activeTab === 'numbers' ? (
            <div className="space-y-4">
              {/* Sĩ số chọn nhanh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Chọn nhanh sĩ số lớp học:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => {
                    const isSelected = endNum === num && startNum === 1;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setStartNum(1);
                          setEndNum(num);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-google-blue text-white border-google-blue shadow-xs scale-105'
                            : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-white/5'
                        }`}
                      >
                        {num} bạn
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stepper Inputs for Start and End */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Bắt đầu từ số:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={decrementStart}
                      disabled={startNum <= 1}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition active:scale-95 cursor-pointer border border-slate-200/60 dark:border-white/5"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={endNum}
                      value={startNum}
                      onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center font-bold text-base bg-transparent text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={incrementStart}
                      disabled={startNum >= endNum}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition active:scale-95 cursor-pointer border border-slate-200/60 dark:border-white/5"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Đến số (Sĩ số):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={decrementEnd}
                      disabled={endNum <= startNum}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition active:scale-95 cursor-pointer border border-slate-200/60 dark:border-white/5"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={startNum}
                      max={500}
                      value={endNum}
                      onChange={(e) => setEndNum(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center font-bold text-base bg-transparent text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={incrementEnd}
                      disabled={endNum >= 500}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xs font-bold transition active:scale-95 cursor-pointer border border-slate-200/60 dark:border-white/5"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Định dạng tên hiển thị */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Định dạng tên hiển thị:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNumberPrefix('none')}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition text-center cursor-pointer ${
                      numberPrefix === 'none'
                        ? 'bg-google-pill dark:bg-blue-950/60 text-google-pill-text dark:text-blue-200 border-google-blue font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    1, 2, 3...
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumberPrefix('so')}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition text-center cursor-pointer ${
                      numberPrefix === 'so'
                        ? 'bg-google-pill dark:bg-blue-950/60 text-google-pill-text dark:text-blue-200 border-google-blue font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    Số 1, Số 2...
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumberPrefix('vit')}
                    className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition text-center cursor-pointer ${
                      numberPrefix === 'vit'
                        ? 'bg-google-pill dark:bg-blue-950/60 text-google-pill-text dark:text-blue-200 border-google-blue font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    Vịt 1, Vịt 2...
                  </button>
                </div>
              </div>

              {/* Live Preview Chips */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Xem trước kết quả:
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-google-blue">
                    {generatedPreview.length} số
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                  {generatedPreview.slice(0, 14).map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      {item}
                    </span>
                  ))}
                  {generatedPreview.length > 14 && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      + và {generatedPreview.length - 14} số tiếp theo
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: DANH SÁCH TÊN & NHẬP TỪ FILE */
            <div className="space-y-4">
              {/* File Upload Dropzone Banner */}
              <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-google-blue dark:hover:border-google-blue/80 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={18} />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Nhập từ file Excel / CSV / TXT
                  </h4>
                </div>

                <div className="shrink-0 flex items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="roster-file-upload"
                  />
                  <label
                    htmlFor="roster-file-upload"
                    className="px-3.5 py-1.5 rounded-full bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition active:scale-95"
                  >
                    <Upload size={13} className="text-google-blue" />
                    <span>Chọn file</span>
                  </label>
                </div>
              </div>

              {/* Status Message */}
              {fileStatus && (
                <div
                  className={`p-2.5 rounded-2xl text-xs flex items-center gap-2 font-medium ${
                    fileStatus.isError
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                  }`}
                >
                  {fileStatus.isError ? <AlertCircle size={15} /> : <Check size={15} />}
                  <span>{fileStatus.message}</span>
                </div>
              )}

              {/* Textarea Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Danh sách họ tên:
                </label>
                <textarea
                  rows={6}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Nhập mỗi học sinh một dòng (ví dụ: Nguyễn Văn A)..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white text-xs sm:text-sm focus:border-google-blue focus:ring-2 focus:ring-google-blue/20 outline-none resize-none font-sans"
                />
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTextInput(DEFAULT_STUDENTS.join('\n'));
                      setFileStatus(null);
                    }}
                    className="font-semibold text-google-blue hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    <span>Danh sách mẫu</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShuffleList}
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Shuffle size={13} />
                    <span>Xáo trộn</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTextInput('');
                    setFileStatus(null);
                  }}
                  className="font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Xóa hết</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL FOOTER */}
        {/* ======================================================== */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="bg-google-hover dark:bg-google-hover-dark text-slate-700 dark:text-slate-200 font-medium px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-slate-200/40 dark:border-white/5">
            <span>
              Tổng cộng:{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                {activeTab === 'list' ? parsedList.length : generatedPreview.length}
              </strong>{' '}
              {activeTab === 'numbers' ? 'số' : 'học sinh'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 cursor-pointer transition"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-google-blue hover:bg-blue-600 active:bg-blue-700 text-white shadow-xs hover:shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Lưu danh sách</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
