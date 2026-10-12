import { safeLocalStorageSet } from '@/lib/safeStorage';
import { idbSaveDocument } from '@/lib/indexedDbStorage';
import { validateAndSanitizeQuestions, cleanVietnameseEncoding } from '@/lib/questionValidator';

export interface ToolExecutionResult {
  toolName: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
  actionType: 'game' | 'exam' | 'folder' | 'class' | 'navigation';
}

export interface QuestionItem {
  id?: string;
  rawLabel?: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  points?: number;
  explanation?: string;
  type?: 'multiple_choice' | 'essay' | 'fill_blank' | 'true_false';
  answer?: string;
}

export class AiToolRegistry {
  /**
   * Tạo đề thi / bài tập trắc nghiệm mới và lưu vào kho tài liệu
   */
  static createExam(params: {
    title: string;
    subject?: string;
    grade?: string;
    durationMinutes?: number;
    questions: QuestionItem[];
    folderId?: string;
    persist?: boolean;
    existingExamId?: string;
  }): ToolExecutionResult {
    try {
      const persist = params.persist !== false;

      const sanitizedQuestions = validateAndSanitizeQuestions(params.questions);

      if (sanitizedQuestions.length === 0) {
        return {
          toolName: 'create_exam',
          status: 'error',
          message: 'Không có câu hỏi hợp lệ từ AI đạt quy chuẩn để tạo đề thi. Tuyệt đối không tạo dữ liệu giả.',
          actionType: 'exam',
        };
      }
      // Clean readable document ID format (e.g. delm3x9k2a1)
      const examId = params.existingExamId || `de${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;

      const title = cleanVietnameseEncoding(params.title || 'Đề thi trắc nghiệm mới');
      const pointPerQuestion = Math.round((10 / sanitizedQuestions.length) * 100) / 100;

      const examFileItem = {
        id: examId,
        name: `${title}.docx`,
        parentId: null,
        fileType: 'docx' as const,
        createdAt: new Date().toISOString(),
        parsedQuiz: {
          title,
          description: cleanVietnameseEncoding(params.grade && params.grade !== 'Tự do'
            ? `Đề thi môn ${params.subject || 'Kiến thức tổng hợp'} - Khối ${params.grade}`
            : `Đề thi ${params.subject && params.subject !== 'Kiến thức tổng hợp' ? `chủ đề ${params.subject}` : 'kiến thức'}`),
          durationMinutes: params.durationMinutes || 45,
          questions: sanitizedQuestions.map((q, idx) => ({
            id: q.id || `q_${idx + 1}`,
            rawLabel: q.rawLabel || `Câu ${idx + 1}`,
            content: q.content,
            points: q.points || pointPerQuestion,
            options: (q.options || []).map((opt) => ({
              content: opt.content,
              isCorrect: Boolean(opt.isCorrect),
            })),
            explanation: q.explanation,
            type: q.type || ((q.options || []).length >= 2 ? 'multiple_choice' : 'essay'),
            answer: q.answer,
          })),
        },
      };

      const shouldPersist = persist !== false;
      if (shouldPersist && typeof window !== 'undefined') {
        try {
          idbSaveDocument(examFileItem);

          const existingDocs = JSON.parse(localStorage.getItem('app_documents_files') || '[]');
          const filteredDocs = Array.isArray(existingDocs)
            ? existingDocs.filter((d: any) => d && d.id !== examId)
            : [];
          safeLocalStorageSet('app_documents_files', JSON.stringify([examFileItem, ...filteredDocs]));

          const existingFiles = JSON.parse(localStorage.getItem('custom_uploaded_files') || '[]');
          const filteredFiles = Array.isArray(existingFiles)
            ? existingFiles.filter((d: any) => d && d.id !== examId)
            : [];
          safeLocalStorageSet('custom_uploaded_files', JSON.stringify([examFileItem, ...filteredFiles]));
        } catch (e) {
          console.error('Error saving exam to documents localStorage:', e);
        }
      }

      return {
        toolName: 'create_exam',
        status: 'success',
        message: `Đã tạo đề thi "${title}" gồm ${params.questions.length} câu hỏi thành công!`,
        actionType: 'exam',
        data: {
          examId,
          title,
          subject: params.subject || 'Kiến thức tổng hợp',
          grade: params.grade || 'Tự do',
          durationMinutes: params.durationMinutes || 45,
          questionsCount: params.questions.length,
          questions: params.questions,
          folderId: null,
          examUrl: `/documents/${examId}`,
        },
      };
    } catch (err: any) {
      return {
        toolName: 'create_exam',
        status: 'error',
        message: `Lỗi tạo đề thi: ${err.message}`,
        actionType: 'exam',
      };
    }
  }

  /**
   * Tạo thư mục tài liệu mới trong kho tài liệu
   */
  static createFolder(params: { name: string; parentId?: string | null }): ToolExecutionResult {
    try {
      const folderId = `folder${Date.now()}`;
      const name = params.name || 'Thư mục mới';
      const parentId = params.parentId || null;

      const newFolder = {
        id: folderId,
        name,
        parentId,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        const existingFolders = JSON.parse(localStorage.getItem('app_documents_folders') || '[]');
        localStorage.setItem('app_documents_folders', JSON.stringify([...existingFolders, newFolder]));
        const existingCustFolders = JSON.parse(localStorage.getItem('user_custom_folders') || '[]');
        localStorage.setItem('user_custom_folders', JSON.stringify([...existingCustFolders, newFolder]));
      }

      return {
        toolName: 'create_folder',
        status: 'success',
        message: `Đã tạo thành công thư mục "${name}"!`,
        actionType: 'folder',
        data: {
          folderId,
          name,
          parentId,
          folderUrl: '/documents',
        },
      };
    } catch (err: any) {
      return {
        toolName: 'create_folder',
        status: 'error',
        message: `Lỗi tạo thư mục: ${err.message}`,
        actionType: 'folder',
      };
    }
  }

  /**
   * Tạo lớp học mới kèm sinh mã tham gia và danh sách học sinh
   */
  static createClass(params: {
    name: string;
    grade?: string;
    subject?: string;
    students?: string[];
  }): ToolExecutionResult {
    try {
      const classId = `cls${Date.now()}`;
      const name = params.name || 'Lớp học mới';
      const grade = params.grade || '12';
      const subject = params.subject || 'Tổng hợp';
      const code = `${(params.subject || 'CLASS').toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const studentList = (params.students || []).map((stName, idx) => ({
        id: `std${Date.now()}${idx}`,
        name: stName,
        joinedAt: new Date().toISOString(),
      }));

      const newClass = {
        id: classId,
        name,
        grade,
        subject,
        code,
        studentsCount: studentList.length,
        students: studentList,
        createdAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        const existingClasses = JSON.parse(localStorage.getItem('app_mock_classes') || '[]');
        localStorage.setItem('app_mock_classes', JSON.stringify([newClass, ...existingClasses]));
      }

      return {
        toolName: 'create_class',
        status: 'success',
        message: `Đã tạo thành công lớp học "${name}" (Mã tham gia: ${code}) với ${studentList.length} học sinh!`,
        actionType: 'class',
        data: {
          classId,
          name,
          grade,
          subject,
          code,
          studentsCount: studentList.length,
          students: studentList,
          classUrl: `/classes/${classId}`,
        },
      };
    } catch (err: any) {
      return {
        toolName: 'create_class',
        status: 'error',
        message: `Lỗi tạo lớp học: ${err.message}`,
        actionType: 'class',
      };
    }
  }

  /**
   * Điều hướng nhanh tới bất kỳ trang nào trong ứng dụng
   */
  static navigateWeb(params: { path: string; label?: string }): ToolExecutionResult {
    const path = params.path || '/dashboard';
    const label = params.label || 'Mở trang';

    return {
      toolName: 'navigate_web',
      status: 'success',
      message: `Sẵn sàng chuyển hướng tới ${label} (${path})`,
      actionType: 'navigation',
      data: {
        path,
        label,
      },
    };
  }

  /**
   * Thực thi công cụ theo tên gọi và tham số
   */
  static execute(toolName: string, params: any): ToolExecutionResult {
    switch (toolName) {
      case 'create_exam':
      case 'create_test':
      case 'create_quiz':
        return this.createExam(params);
      case 'create_folder':
        return this.createFolder(params);
      case 'create_class':
      case 'create_classroom':
        return this.createClass(params);
      case 'navigate_web':
      case 'go_to_page':
        return this.navigateWeb(params);
      default:
        return {
          toolName,
          status: 'error',
          message: `Không tìm thấy công cụ: ${toolName}`,
          actionType: 'navigation',
        };
    }
  }
}
