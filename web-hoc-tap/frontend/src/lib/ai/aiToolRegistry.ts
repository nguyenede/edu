import { safeLocalStorageSet } from '@/lib/safeStorage';

export interface ToolExecutionResult {
  toolName: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
  actionType: 'game' | 'exam' | 'folder' | 'class' | 'navigation';
}

export interface QuestionItem {
  id?: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  points?: number;
}

export class AiToolRegistry {
  /**
   * Tạo phòng game Live Quiz mới và sinh mã PIN tham gia ngay lập tức
   */
  static launchGame(params: {
    quizTitle?: string;
    mode?: 'CHAOS' | 'CLASSIC' | 'ARENA';
    questions?: QuestionItem[];
    timePerQuestion?: number;
  }): ToolExecutionResult {
    try {
      const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const roomId = `room_${Date.now()}`;
      const title = params.quizTitle || 'Trò chơi Trắc nghiệm Trực tiếp';
      const mode = params.mode || 'CHAOS';

      const gameRoom = {
        id: roomId,
        pinCode,
        title,
        mode,
        questionsCount: params.questions?.length || 5,
        questions: params.questions || [
          {
            id: 'q1',
            content: '1 + 1 bằng mấy?',
            options: [
              { content: '1', isCorrect: false },
              { content: '2', isCorrect: true },
              { content: '3', isCorrect: false },
              { content: '4', isCorrect: false },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        status: 'LOBBY',
      };

      if (typeof window !== 'undefined') {
        const existingRooms = JSON.parse(localStorage.getItem('app_active_game_rooms') || '[]');
        localStorage.setItem('app_active_game_rooms', JSON.stringify([gameRoom, ...existingRooms]));
        localStorage.setItem(`game_room_${pinCode}`, JSON.stringify(gameRoom));
      }

      return {
        toolName: 'launch_game',
        status: 'success',
        message: `Đã khởi tạo thành công phòng game "${title}" với mã PIN ${pinCode}!`,
        actionType: 'game',
        data: {
          pinCode,
          roomId,
          title,
          mode,
          questionsCount: gameRoom.questionsCount,
          playUrl: `/play/${pinCode}`,
          hostUrl: `/app/host?quizId=${roomId}&mode=${mode}`,
        },
      };
    } catch (err: any) {
      return {
        toolName: 'launch_game',
        status: 'error',
        message: `Lỗi khởi tạo phòng game: ${err.message}`,
        actionType: 'game',
      };
    }
  }

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
      // Standard 32-character hexadecimal document UUID format (e.g. 6a8980105b9083ecaeffdfaa52bd5c46)
      const examId = params.existingExamId || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          })
      ).toLowerCase();

      const title = params.title || 'Đề thi trắc nghiệm mới';
      const totalQCount = params.questions.length || 60;
      const pointPerQuestion = Math.round((10 / totalQCount) * 100) / 100;

      const examFileItem = {
        id: examId,
        name: `${title}.docx`,
        parentId: null,
        fileType: 'docx' as const,
        createdAt: new Date().toISOString(),
        parsedQuiz: {
          title,
          description: `Đề thi môn ${params.subject || 'Kiến thức tổng hợp'} - Khối ${params.grade || 'Tự do'} do AI ChatCoi tạo tự động.`,
          durationMinutes: params.durationMinutes || 45,
          questions: params.questions.map((q, idx) => ({
            id: q.id || `q_${idx + 1}`,
            content: (q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim(),
            points: q.points || pointPerQuestion,
            options: (q.options || []).map((opt) => ({
              content: opt.content,
              isCorrect: Boolean(opt.isCorrect),
            })),
          })),
        },
      };

      if (persist && typeof window !== 'undefined') {
        try {
          const existingDocs = JSON.parse(localStorage.getItem('app_documents_files') || '[]');
          const filteredDocs = Array.isArray(existingDocs)
            ? existingDocs.filter((d: any) => d && d.id !== examId).slice(0, 30)
            : [];
          safeLocalStorageSet('app_documents_files', JSON.stringify([examFileItem, ...filteredDocs]));

          const existingFiles = JSON.parse(localStorage.getItem('custom_uploaded_files') || '[]');
          const filteredFiles = Array.isArray(existingFiles)
            ? existingFiles.filter((d: any) => d && d.id !== examId).slice(0, 30)
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
          examUrl: `/app/documents/${examId}/view`,
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
      const folderId = `folder_${Date.now()}`;
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
          folderUrl: `/app/documents?folderId=${folderId}`,
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
      const classId = `class_${Date.now()}`;
      const name = params.name || 'Lớp học mới';
      const grade = params.grade || '12';
      const subject = params.subject || 'Tổng hợp';
      const code = `${(params.subject || 'CLASS').toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const studentList = (params.students || []).map((stName, idx) => ({
        id: `std_${Date.now()}_${idx}`,
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
    const path = params.path || '/app/dashboard';
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
      case 'launch_game':
      case 'create_game':
      case 'start_game':
        return this.launchGame(params);
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
