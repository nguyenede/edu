'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Camera, Check, Upload, Image as ImageIcon, ChevronRight, AlertCircle } from 'lucide-react';
import { AiToolRegistry } from '@/lib/ai/aiToolRegistry';
import { useAuthStore } from '@/store/useAuthStore';
import { syncExamActionToDocument } from '@/lib/examDocumentSync';

function OcrQuizCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');
  const targetQuery = folderId && folderName ? `?folderId=${folderId}&folderName=${encodeURIComponent(folderName)}` : '';
  const token = useAuthStore((state) => state.token);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [docSubject, setDocSubject] = useState('Toán');
  const [docGrade, setDocGrade] = useState('12');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedImage || !imagePreview) {
      alert('Vui lòng chọn hoặc tải ảnh đề thi!');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ocr',
          subject: docSubject,
          grade: docGrade,
          imageBase64: imagePreview,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.exam) {
        throw new Error(data.error || 'AI không thể nhận diện được câu hỏi từ bức ảnh này');
      }

      const generatedExam = data.exam;

      // Save to document library
      let result = AiToolRegistry.createExam({
        title: generatedExam.title || `Đề thi bóc tách từ ảnh (${selectedImage.name})`,
        subject: generatedExam.subject || docSubject,
        grade: generatedExam.grade || docGrade,
        durationMinutes: generatedExam.durationMinutes || 45,
        questions: generatedExam.questions,
        folderId: folderId || undefined,
      });
      result = await syncExamActionToDocument(token, result);

      setToastMessage(`AI Vision đã nhận diện & tạo thành công ${generatedExam.questions.length} câu hỏi!`);

      setTimeout(() => {
        if (result.data?.examUrl) {
          router.push(result.data.examUrl);
        } else {
          router.push(folderId ? `/app/documents?folderId=${folderId}` : '/app/documents');
        }
      }, 1000);
    } catch (err: any) {
      console.error('Error in AI OCR quiz scan:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi nhận diện ảnh đề thi.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-normal tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/documents')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Tài liệu của tôi
          </button>
          {folderName && (
            <>
              <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
              <button
                type="button"
                onClick={() => router.push(`/app/documents?folderId=${folderId || ''}`)}
                className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
              >
                {folderName}
              </button>
            </>
          )}
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <button
            type="button"
            onClick={() => router.push('/app/documents/create' + targetQuery)}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
          >
            Tạo đề thi
          </button>
          <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 shrink-0 stroke-[1.75]" />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Nhận diện từ ảnh (AI OCR)
          </span>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce pointer-events-none">
          <Check size={16} className="text-google-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/60">
            <Camera size={24} className="text-purple-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Nhận diện đề thi từ hình ảnh bằng AI Multimodal Vision
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên ảnh chụp đề thi in giấy hoặc bài tập viết tay, AI sẽ bóc tách câu hỏi, đáp án và lời giải tự động
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Môn học đề thi
              </label>
              <select
                value={docSubject}
                onChange={(e) => setDocSubject(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-purple-500"
              >
                <option value="Toán">Toán</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lý">Địa lý</option>
                <option value="Giáo dục công dân">GDCD / KT&PL</option>
                <option value="Tin học">Tin học</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Khối lớp
              </label>
              <select
                value={docGrade}
                onChange={(e) => setDocGrade(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-1 focus:ring-purple-500"
              >
                <option value="12">Lớp 12</option>
                <option value="11">Lớp 11</option>
                <option value="10">Lớp 10</option>
                <option value="9">Lớp 9</option>
                <option value="8">Lớp 8</option>
                <option value="7">Lớp 7</option>
                <option value="6">Lớp 6</option>
                <option value="5">Lớp 5</option>
                <option value="4">Lớp 4</option>
                <option value="3">Lớp 3</option>
                <option value="2">Lớp 2</option>
                <option value="1">Lớp 1</option>
              </select>
            </div>
          </div>

          <div className="p-8 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-3xl bg-purple-50/30 dark:bg-slate-800/30 text-center space-y-4">
            <ImageIcon size={36} className="mx-auto text-purple-600" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Chọn ảnh chụp đề thi (.png, .jpg, .jpeg)
              </p>
              <p className="text-[11px] text-slate-400">
                Khuyến nghị ảnh chụp rõ nét, đủ ánh sáng và không bị mờ
              </p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full max-w-xs mx-auto text-xs text-slate-500 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />

            {selectedImage && imagePreview && (
              <div className="pt-2 max-w-xs mx-auto space-y-2">
                <img
                  src={imagePreview}
                  alt="Ảnh đề thi đã chọn"
                  className="w-full max-h-48 object-cover rounded-xl border border-purple-300 dark:border-purple-800 shadow-xs"
                />
                <p className="text-xs font-bold text-purple-600">
                  Đã chọn ảnh: {selectedImage.name}
                </p>
              </div>
            )}
          </div>

          {isScanning && (
            <div className="p-6 text-center space-y-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-200/50">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600 mx-auto" />
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                AI Vision đang phân tích hình ảnh và bóc tách từng câu hỏi...
              </p>
              <p className="text-[11px] text-slate-400">
                Đang nhận dạng chữ viết, các phương án A/B/C/D và giải chi tiết
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => router.push('/app/documents/create' + targetQuery)} disabled={isScanning}>
              Hủy
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              onClick={handleStartOcr}
              disabled={!selectedImage || isScanning}
            >
              <Camera size={16} className="mr-1.5" /> {isScanning ? 'AI Đang Quét...' : 'Quét OCR & Tạo Đề Thi'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function OcrQuizCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Đang tải cấu hình OCR...</div>}>
      <OcrQuizCreateContent />
    </Suspense>
  );
}
