import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './safeStorage';

export interface AntiCheatConfig {
  forceFullscreen: boolean;
  detectTabSwitch: boolean;
  maxViolations: number;
  preventCopyPaste: boolean;
  autoSubmitOnLimit?: boolean;
}

export interface HomeworkItem {
  id: string;
  pin: string; // 6 chữ số
  title: string;
  description?: string;
  documentId?: string;
  classId?: string | null;
  className?: string | null;
  deadline?: string | null;
  durationMinutes: number; // 0 = Không giới hạn
  minSubmitMinutes?: number; // 0 = Không giới hạn, > 0 = số phút làm bài tối thiểu mới được nộp
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showAnswersAfterSubmit: boolean;

  // TÍNH NĂNG CHỐNG GIAN LẬN (Bật / Tắt)
  antiCheating: boolean;
  antiCheatConfig: AntiCheatConfig;

  quizData: {
    title: string;
    durationMinutes?: number;
    questions: any[];
  };

  createdAt: string;
  createdBy?: {
    id?: string;
    name?: string;
  };
  status: 'active' | 'closed';
  _count?: {
    submissions: number;
  };
}

export interface HomeworkViolationLog {
  type: 'tab_switch' | 'exit_fullscreen' | 'copy_attempt' | 'window_blur';
  timestamp: string;
  message: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  pin: string;
  studentName: string;
  studentId?: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  submittedAt: string;

  // Dữ liệu giám sát gian lận
  violationCount: number;
  violationLogs: HomeworkViolationLog[];

  answers: {
    [qId: string]: {
      selectedAnswer: string;
      isCorrect: boolean;
    };
  };
}

const STORAGE_HOMEWORKS_KEY = 'app_blooket_homeworks';
const STORAGE_SUBMISSIONS_PREFIX = 'app_homework_subs_';

/**
 * Sinh mã PIN 6 số ngẫu nhiên không trùng lặp
 */
export function generatePinCode(): string {
  const existing = getAllHomeworksSync();
  const existingPins = new Set(existing.map((h) => h.pin));

  let pin = '';
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingPins.has(pin));

  return pin;
}

/**
 * Lấy tất cả bài tập đã giao (Sync)
 */
export function getAllHomeworksSync(): HomeworkItem[] {
  const raw = safeLocalStorageGet(STORAGE_HOMEWORKS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách bài tập đã giao
 */
function saveHomeworksSync(list: HomeworkItem[]): void {
  safeLocalStorageSet(STORAGE_HOMEWORKS_KEY, JSON.stringify(list));
}

/**
 * Tạo bài tập mới phong cách Blooket
 */
export async function createHomework(
  data: Omit<HomeworkItem, 'id' | 'pin' | 'createdAt' | 'status'>
): Promise<HomeworkItem> {
  const pin = generatePinCode();
  const id = `hw${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

  const item: HomeworkItem = {
    ...data,
    id,
    pin,
    createdAt: new Date().toISOString(),
    status: 'active',
    antiCheatConfig: data.antiCheatConfig || {
      forceFullscreen: true,
      detectTabSwitch: true,
      maxViolations: 3,
      preventCopyPaste: true,
    },
    _count: {
      submissions: 0,
    },
  };

  const list = getAllHomeworksSync();
  list.unshift(item);
  saveHomeworksSync(list);

  // Đồng bộ với danh mục assignments cũ để tương thích hoàn toàn
  const customAssignmentsKey = 'app_custom_assignments';
  const rawCustom = safeLocalStorageGet(customAssignmentsKey);
  let customList: any[] = [];
  if (rawCustom) {
    try {
      customList = JSON.parse(rawCustom);
      if (!Array.isArray(customList)) customList = [];
    } catch {}
  }

  const legacyFormat = {
    id: item.id,
    title: item.title,
    description: `${item.description || ''}\n<!--CONFIG:${JSON.stringify({
      durationMinutes: item.durationMinutes,
      minSubmitMinutes: item.minSubmitMinutes || 0,
      antiCheat: item.antiCheating,
      antiCheatConfig: item.antiCheatConfig,
      pin: item.pin,
    })}-->`,
    classId: item.classId || 'public',
    class: { name: item.className || 'Toàn trường / Công khai' },
    deadline: item.deadline,
    maxScore: 10,
    quiz: {
      id: `quiz_${item.id}`,
      title: item.quizData.title,
      questions: item.quizData.questions.map((q, idx) => ({
        id: `qq_${idx + 1}`,
        question: {
          id: q.id || `q_${idx + 1}`,
          content: q.content,
          options: (q.options || []).map((opt: any, oIdx: number) => ({
            id: `opt_${idx + 1}_${oIdx + 1}`,
            content: typeof opt === 'string' ? opt : opt.content,
            isCorrect: Boolean(opt.isCorrect),
          })),
          type: q.type || 'multiple_choice',
          points: q.points || 1,
          explanation: q.explanation,
        },
      })),
    },
    _count: { submissions: 0 },
    createdAt: item.createdAt,
  };

  customList.unshift(legacyFormat);
  safeLocalStorageSet(customAssignmentsKey, JSON.stringify(customList));

  // Nếu giao cho lớp học cụ thể, lưu vào bảng bài tập của lớp
  if (item.classId) {
    const classAssignKey = `app_class_assignments_${item.classId}`;
    const rawClassAssign = safeLocalStorageGet(classAssignKey);
    let classAssignList: any[] = [];
    if (rawClassAssign) {
      try {
        classAssignList = JSON.parse(rawClassAssign);
        if (!Array.isArray(classAssignList)) classAssignList = [];
      } catch {}
    }
    classAssignList.unshift(legacyFormat);
    safeLocalStorageSet(classAssignKey, JSON.stringify(classAssignList));
  }

  return item;
}

/**
 * Tìm bài tập theo mã PIN 6 số
 */
export async function getHomeworkByPin(pin: string): Promise<HomeworkItem | null> {
  const cleanPin = pin.trim().replace(/\s+/g, '');
  if (!cleanPin) return null;

  const list = getAllHomeworksSync();
  let found = list.find(
    (h) => h.pin === cleanPin || h.id === cleanPin || String(h.id).replace(/\D/g, '').slice(-6) === cleanPin
  );

  // Fallback: Tìm trong app_custom_assignments và app_class_assignments_*
  if (!found && typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('app_class_assignments_') || k === 'app_custom_assignments')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              const match = arr.find((item: any) => {
                if (item.pin === cleanPin || item.id === cleanPin) return true;
                if (String(item.id).replace(/\D/g, '').slice(-6) === cleanPin) return true;
                if (item.description && typeof item.description === 'string') {
                  const m = item.description.match(/"pin":\s*"(\d+)"/);
                  if (m && m[1] === cleanPin) return true;
                }
                return false;
              });
              if (match) {
                let parsedAntiCheat: boolean = Boolean(match.antiCheat ?? match.antiCheating ?? false);
                let parsedAntiCheatConfig = match.antiCheatConfig || null;
                let parsedDuration = match.durationMinutes || 45;
                let parsedMinSubmitMinutes = Number(match.minSubmitMinutes) || 0;

                if (match.description && typeof match.description === 'string') {
                  const cfgMatch = match.description.match(/<!--CONFIG:([\s\S]*?)-->/);
                  if (cfgMatch) {
                    try {
                      const cfg = JSON.parse(cfgMatch[1]);
                      if (cfg.antiCheat !== undefined && cfg.antiCheat !== null) {
                        parsedAntiCheat = Boolean(cfg.antiCheat);
                      }
                      if (cfg.antiCheatConfig) {
                        parsedAntiCheatConfig = cfg.antiCheatConfig;
                      }
                      if (cfg.durationMinutes) {
                        parsedDuration = cfg.durationMinutes;
                      }
                      if (cfg.minSubmitMinutes !== undefined && cfg.minSubmitMinutes !== null) {
                        parsedMinSubmitMinutes = Number(cfg.minSubmitMinutes) || 0;
                      }
                    } catch {}
                  }
                }

                const questions =
                  match.quiz?.questions?.map((qq: any) => qq.question || qq) ||
                  match.documentFile?.parsedQuiz?.questions ||
                  [];
                found = {
                  id: match.id,
                  pin: match.pin || cleanPin,
                  title: match.title,
                  description: (match.description || '').replace(/<!--CONFIG:[\s\S]*?-->/, '').trim(),
                  classId: match.classId,
                  className: match.className || match.class?.name || 'Lớp học',
                  deadline: match.deadline,
                  durationMinutes: parsedDuration,
                  minSubmitMinutes: parsedMinSubmitMinutes,
                  shuffleQuestions: true,
                  shuffleOptions: false,
                  showAnswersAfterSubmit: true,
                  antiCheating: parsedAntiCheat,
                  antiCheatConfig: parsedAntiCheatConfig || {
                    forceFullscreen: true,
                    detectTabSwitch: true,
                    maxViolations: 3,
                    preventCopyPaste: true,
                  },
                  quizData: {
                    title: match.title,
                    durationMinutes: parsedDuration,
                    questions,
                  },
                  status: 'active',
                  createdAt: match.createdAt || new Date().toISOString(),
                };
                break;
              }
            }
          }
        }
      }
    } catch (_) {}

    // Fallback: Tìm trên máy chủ backend nếu người dùng đã đăng nhập
    if (!found) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 1. Thử gọi trực tiếp /api/assignments/:pin nếu cleanPin là ID
          try {
            const directRes = await fetch(`/api/assignments/${cleanPin}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (directRes.ok) {
              const data = await directRes.json();
              if (data && data.id) {
                found = formatServerAssignmentToHomework(data, cleanPin);
              }
            }
          } catch (_) {}

          // 2. Tìm trong các lớp học của học sinh hoặc giáo viên
          if (!found) {
            let classesList: any[] = [];
            try {
              const classRes = await fetch('/api/classes/student', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (classRes.ok) {
                const cData = await classRes.json();
                if (Array.isArray(cData)) {
                  classesList = cData.map((m: any) => m.class || m);
                }
              }
            } catch (_) {}

            if (classesList.length === 0) {
              try {
                const teacherRes = await fetch('/api/classes/teacher', {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (teacherRes.ok) {
                  const tData = await teacherRes.json();
                  if (Array.isArray(tData)) classesList = tData;
                }
              } catch (_) {}
            }

            for (const cls of classesList) {
              if (found) break;
              if (!cls?.id) continue;
              try {
                const asgRes = await fetch(`/api/assignments/class/${cls.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (asgRes.ok) {
                  const asgList = await asgRes.json();
                  if (Array.isArray(asgList)) {
                    const matchedAsg = asgList.find((item: any) => {
                      if (item.pin === cleanPin || item.id === cleanPin) return true;
                      if (String(item.id).replace(/\D/g, '').slice(-6) === cleanPin) return true;
                      if (item.description && typeof item.description === 'string') {
                        const m = item.description.match(/"pin":\s*"(\d+)"/);
                        if (m && m[1] === cleanPin) return true;
                      }
                      return false;
                    });
                    if (matchedAsg) {
                      const detailRes = await fetch(`/api/assignments/${matchedAsg.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const fullData = detailRes.ok ? await detailRes.json() : matchedAsg;
                      found = formatServerAssignmentToHomework(fullData, cleanPin);
                      break;
                    }
                  }
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      }
    }
  }

  if (found) {
    // Cập nhật số lượng bài nộp thực tế
    const subs = getHomeworkSubmissionsSync(found.id);
    return {
      ...found,
      _count: { submissions: subs.length },
    };
  }

  return null;
}

/**
 * Chuyển đổi dữ liệu bài tập từ máy chủ thành HomeworkItem
 */
function formatServerAssignmentToHomework(asg: any, pin: string): HomeworkItem {
  let parsedAntiCheat: boolean = false;
  let parsedAntiCheatConfig: any = null;
  let parsedDuration = asg.durationMinutes || 45;
  let parsedMinSubmitMinutes = Number(asg.minSubmitMinutes) || 0;

  if (asg.description && typeof asg.description === 'string') {
    const cfgMatch = asg.description.match(/<!--CONFIG:([\s\S]*?)-->/);
    if (cfgMatch) {
      try {
        const cfg = JSON.parse(cfgMatch[1]);
        if (cfg.antiCheat !== undefined && cfg.antiCheat !== null) {
          parsedAntiCheat = Boolean(cfg.antiCheat);
        }
        if (cfg.antiCheatConfig) {
          parsedAntiCheatConfig = cfg.antiCheatConfig;
        }
        if (cfg.durationMinutes) {
          parsedDuration = cfg.durationMinutes;
        }
        if (cfg.minSubmitMinutes !== undefined && cfg.minSubmitMinutes !== null) {
          parsedMinSubmitMinutes = Number(cfg.minSubmitMinutes) || 0;
        }
      } catch (_) {}
    }
  }

  const questions =
    asg.quiz?.questions?.map((qq: any) => qq.question || qq) ||
    asg.documentFile?.parsedQuiz?.questions ||
    [];

  const hw: HomeworkItem = {
    id: asg.id,
    pin: pin || asg.pin || '000000',
    title: asg.title,
    description: (asg.description || '').replace(/<!--CONFIG:[\s\S]*?-->/, '').trim(),
    classId: asg.classId || asg.class?.id || 'public',
    className: asg.className || asg.class?.name || 'Lớp học',
    deadline: asg.deadline,
    durationMinutes: parsedDuration,
    minSubmitMinutes: parsedMinSubmitMinutes,
    shuffleQuestions: true,
    shuffleOptions: false,
    showAnswersAfterSubmit: true,
    antiCheating: parsedAntiCheat,
    antiCheatConfig: parsedAntiCheatConfig || {
      forceFullscreen: true,
      detectTabSwitch: true,
      maxViolations: 3,
      preventCopyPaste: true,
      autoSubmitOnLimit: true,
    },
    quizData: {
      title: asg.title,
      durationMinutes: parsedDuration,
      questions,
    },
    status: 'active',
    createdAt: asg.createdAt || new Date().toISOString(),
    _count: { submissions: asg._count?.submissions || 0 },
  };

  try {
    const all = getAllHomeworksSync();
    if (!all.some((h) => h.id === hw.id || h.pin === hw.pin)) {
      all.unshift(hw);
      saveHomeworksSync(all);
    }
  } catch (_) {}

  return hw;
}

/**
 * Tìm bài tập theo ID
 */
export async function getHomeworkById(id: string): Promise<HomeworkItem | null> {
  if (!id) return null;
  const list = getAllHomeworksSync();
  const found = list.find((h) => h.id === id);
  if (found) {
    const subs = getHomeworkSubmissionsSync(found.id);
    return {
      ...found,
      _count: { submissions: subs.length },
    };
  }
  return null;
}

/**
 * Xóa bài tập và các bài nộp liên quan
 */
export function deleteHomework(id: string): void {
  const list = getAllHomeworksSync();
  const filtered = list.filter((h) => h.id !== id);
  saveHomeworksSync(filtered);
  safeLocalStorageRemove(`${STORAGE_SUBMISSIONS_PREFIX}${id}`);
  safeLocalStorageRemove(`app_assignment_subs_${id}`);
}

/**
 * Lấy danh sách bài nộp của một bài tập (Sync)
 */
export function getHomeworkSubmissionsSync(homeworkId: string): HomeworkSubmission[] {
  const key = `${STORAGE_SUBMISSIONS_PREFIX}${homeworkId}`;
  const raw = safeLocalStorageGet(key);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Nộp bài tập
 */
export async function submitHomework(
  data: Omit<HomeworkSubmission, 'id' | 'submittedAt'>
): Promise<HomeworkSubmission> {
  const id = `sub${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const submission: HomeworkSubmission = {
    ...data,
    id,
    submittedAt: new Date().toISOString(),
  };

  const key = `${STORAGE_SUBMISSIONS_PREFIX}${data.homeworkId}`;
  let existing = getHomeworkSubmissionsSync(data.homeworkId);
  const normalizedStuName = data.studentName.trim().toLowerCase();

  // Replace previous submission from this student if present, otherwise unshift
  const existingIdx = existing.findIndex((s) =>
    (data.studentId && s.studentId && s.studentId === data.studentId) ||
    (s.studentName && s.studentName.trim().toLowerCase() === normalizedStuName)
  );
  if (existingIdx >= 0) {
    existing[existingIdx] = submission;
  } else {
    existing.unshift(submission);
  }
  safeLocalStorageSet(key, JSON.stringify(existing));

  // Cập nhật số lượt nộp trong danh sách bài tập
  const homeworks = getAllHomeworksSync();
  const hw = homeworks.find((h) => h.id === data.homeworkId);
  if (hw) {
    hw._count = { submissions: existing.length };
    saveHomeworksSync(homeworks);
  }

  // Đồng bộ sang legacy submissions key để trang /app/assignments/[id] xem được
  const legacyKey = `app_assignment_subs_${data.homeworkId}`;
  const rawLegacy = safeLocalStorageGet(legacyKey);
  let legacySubs: any[] = [];
  if (rawLegacy) {
    try {
      legacySubs = JSON.parse(rawLegacy);
      if (!Array.isArray(legacySubs)) legacySubs = [];
    } catch {}
  }

  const legacyItem = {
    id: submission.id,
    status: 'SUBMITTED',
    score: submission.score,
    feedback: null,
    submittedAt: submission.submittedAt,
    violationCount: submission.violationCount,
    violationLogs: submission.violationLogs,
    timeSpentSeconds: submission.timeSpentSeconds,
    student: {
      id: submission.studentId || `stu${Date.now()}`,
      profile: { name: submission.studentName },
      email: `${submission.studentName.toLowerCase().replace(/\s+/g, '')}@student.edu`,
    },
    answers: Object.entries(submission.answers).map(([qId, ans]) => ({
      id: `ans${qId.replace(/_/g, '')}`,
      questionId: qId,
      answerContent: ans.selectedAnswer,
      isCorrect: ans.isCorrect,
    })),
  };

  const existingLegacyIdx = legacySubs.findIndex((s) => {
    const sName = (s.student?.profile?.name || s.student?.name || s.studentName || '').trim().toLowerCase();
    const sId = s.student?.id || s.studentId;
    return (
      (data.studentId && sId && sId === data.studentId) ||
      (sName && sName === normalizedStuName)
    );
  });
  if (existingLegacyIdx >= 0) {
    legacySubs[existingLegacyIdx] = legacyItem;
  } else {
    legacySubs.unshift(legacyItem);
  }
  safeLocalStorageSet(legacyKey, JSON.stringify(legacySubs));

  // Lưu ngay cho phía học sinh (mySubmission)
  safeLocalStorageSet(`app_my_assignment_sub_${data.homeworkId}`, JSON.stringify(legacyItem));
  if (hw && hw.id && hw.id !== data.homeworkId) {
    safeLocalStorageSet(`app_my_assignment_sub_${hw.id}`, JSON.stringify(legacyItem));
  }

  return submission;
}
