import { safeLocalStorageGet, safeLocalStorageSet } from './safeStorage';
import { idbGetDocument } from './indexedDbStorage';
import { getStoredUser } from '@/store/useAuthStore';

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  teacherId?: string;
  teacher?: {
    email?: string;
    profile?: {
      name?: string;
    };
  };
  _count?: {
    members: number;
  };
  createdAt?: string;
}

const STORAGE_KEY = 'app_classes_data';

const DEFAULT_CLASSES: ClassItem[] = [];

export function getLocalClasses(): ClassItem[] {
  const raw = safeLocalStorageGet(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out dummy/fake initial classes
    const list = parsed.filter((c) => c && c.id !== 'cls_init_1' && c.id !== 'cls_init_2');
    return list.map((c) => {
      const memKey = `app_class_members_${c.id}`;
      const rawMems = safeLocalStorageGet(memKey);
      let count = c._count?.members ?? 0;
      if (rawMems) {
        try {
          const mList = JSON.parse(rawMems);
          if (Array.isArray(mList)) {
            count = Math.max(count, mList.length);
          }
        } catch (_) {}
      }
      return {
        ...c,
        _count: {
          members: count,
        },
      };
    });
  } catch {
    return [];
  }
}

export async function fetchClasses(token: string | null, isTeacher: boolean): Promise<ClassItem[]> {
  try {
    const endpoint = isTeacher ? '/api/classes/teacher' : '/api/classes/student';
    const res = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const serverClasses = isTeacher ? data : data.map((m: any) => m.class || m);
        const local = getLocalClasses();
        const mergedMap = new Map<string, ClassItem>();
        serverClasses.forEach((c: ClassItem) => {
          const memKey = `app_class_members_${c.id}`;
          const rawMems = safeLocalStorageGet(memKey);
          let count = c._count?.members ?? 0;
          if (rawMems) {
            try {
              const mList = JSON.parse(rawMems);
              if (Array.isArray(mList)) count = Math.max(count, mList.length);
            } catch (_) {}
          }
          mergedMap.set(c.id, { ...c, _count: { members: count } });
        });
        local.forEach((c: ClassItem) => {
          if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
        });
        const combined = Array.from(mergedMap.values());
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(combined));
        return combined;
      }
    }
  } catch (_) {
    // Network error / server offline
  }
  return getLocalClasses();
}

export async function createClass(token: string | null, name: string, user: any): Promise<ClassItem> {
  const trimmedName = name.trim();
  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: trimmedName }),
    });
    if (res.ok) {
      const created = await res.json();
      const local = getLocalClasses();
      const updated = [created, ...local.filter((c) => c.id !== created.id)];
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
      return created;
    }
  } catch (_) {
    // Server offline fallback
  }

  // Resilient Local Creation (Offline mode)
  const newClass: ClassItem = {
    id: 'cls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: trimmedName,
    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    teacherId: user?.id || 'teacher_local',
    teacher: {
      profile: {
        name: user?.name || 'Giáo viên',
      },
    },
    _count: {
      members: 0,
    },
    createdAt: new Date().toISOString(),
  };

  const current = getLocalClasses();
  const updated = [newClass, ...current];
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
  return newClass;
}

export async function joinClass(token: string | null, code: string): Promise<ClassItem> {
  const cleanCode = code.trim().toUpperCase();
  const currentUser = getStoredUser();
  let serverJoined: ClassItem | null = null;

  try {
    const res = await fetch('/api/classes/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code: cleanCode }),
    });
    if (res.ok) {
      const data = await res.json();
      serverJoined = data.class || data;
    }
  } catch (_) {
    // Server offline
  }

  // Ensure local storage sync for both server and local scenarios
  const local = getLocalClasses();
  const matched = local.find((c) => c.code.toUpperCase() === cleanCode || (serverJoined && c.id === serverJoined.id)) || serverJoined;

  if (matched) {
    const classId = matched.id;
    // Add student to the member list of this class
    const studentInfo = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      joinedAt: new Date().toISOString(),
      studentId: currentUser?.id || 'student_' + Date.now(),
      student: {
        id: currentUser?.id || 'student_' + Date.now(),
        email: currentUser?.email || 'hocsinh@kiyoedu.com',
        profile: {
          name: currentUser?.name || currentUser?.email || 'Học sinh',
          avatar: currentUser?.avatar || null,
        },
      },
    };

    const memKey = `app_class_members_${classId}`;
    const rawMems = safeLocalStorageGet(memKey);
    let memList = rawMems ? JSON.parse(rawMems) : [];
    if (!Array.isArray(memList)) memList = [];

    // Check if not already added
    const exists = memList.some((m: any) =>
      (currentUser?.id && (m.studentId === currentUser.id || m.student?.id === currentUser.id)) ||
      (currentUser?.email && (m.student?.email === currentUser.email || m.email === currentUser.email))
    );

    if (!exists) {
      memList.unshift(studentInfo);
      safeLocalStorageSet(memKey, JSON.stringify(memList));
    }

    // Update class member count
    const updatedCount = Math.max(memList.length, (matched._count?.members || 0) + (exists ? 0 : 1));
    matched._count = { members: updatedCount };

    const updatedClasses = local.some((c) => c.id === matched.id)
      ? local.map((c) => (c.id === matched.id ? { ...c, _count: { members: updatedCount } } : c))
      : [matched, ...local];

    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updatedClasses));

    // Also add to student's joined classes list in local storage
    const studentClassesKey = `app_student_classes_${currentUser?.id || 'guest'}`;
    const rawStudentClasses = safeLocalStorageGet(studentClassesKey);
    let studentClasses = rawStudentClasses ? JSON.parse(rawStudentClasses) : [];
    if (!studentClasses.some((c: any) => c.id === matched.id)) {
      studentClasses.unshift(matched);
      safeLocalStorageSet(studentClassesKey, JSON.stringify(studentClasses));
    }

    return matched;
  }

  throw new Error('Mã lớp học không tồn tại hoặc đã hết hạn');
}

const DEFAULT_MEMBERS: any[] = [];
const DEFAULT_ASSIGNMENTS: any[] = [];

export function isDummyMember(m: any): boolean {
  if (!m) return true;
  const id = String(m.id || '');
  if (/^mem_[1-5]$/.test(id) && !m.student?.email && !m.email) return true;
  return false;
}

export function isDummyAssignment(a: any): boolean {
  if (!a) return true;
  const id = String(a.id || '');
  const title = String(a.title || '');
  if (/^asg_[1-2]$/.test(id)) return true;
  if (/Khảo sát hàm số & Tìm cực trị|Đạo hàm chương 1/i.test(title)) return true;
  return false;
}

export function isDummySubmission(s: any): boolean {
  if (!s) return true;
  const id = String(s.id || '');
  const email = String(s.student?.email || s.email || '');
  const name = String(s.student?.profile?.name || s.name || '');
  if (/^sub_.*_[1-3]$/.test(id)) return true;
  if (email.endsWith('@school.edu.vn')) return true;
  if (/Nguyễn Văn An|Trần Thị Mai|Lê Quốc Bảo/i.test(name)) return true;
  return false;
}

export async function fetchClassDetail(token: string | null, classId: string): Promise<ClassItem> {
  let detail: ClassItem | null = null;
  try {
    const res = await fetch(`/api/classes/${classId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      detail = await res.json();
    }
  } catch (_) {}

  if (!detail) {
    const local = getLocalClasses();
    detail = local.find((c) => c.id === classId || c.code === classId) || {
      id: classId,
      name: 'Lớp học ' + classId,
      code: classId.toUpperCase(),
      teacher: { profile: { name: 'Giáo viên phụ trách' } },
      _count: { members: 0 },
      createdAt: new Date().toISOString(),
    };
  }

  // Sync member count from members storage
  const memKey = `app_class_members_${classId}`;
  const rawMems = safeLocalStorageGet(memKey);
  if (rawMems) {
    try {
      const memList = JSON.parse(rawMems);
      if (Array.isArray(memList) && memList.length > (detail._count?.members || 0)) {
        detail = { ...detail, _count: { members: memList.length } };
      }
    } catch (_) {}
  }

  return detail;
}

export async function fetchClassAssignments(token: string | null, classId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/assignments/class/${classId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((a: any) => !isDummyAssignment(a));
      }
    }
  } catch (_) {}

  const storageKey = `app_class_assignments_${classId}`;
  const raw = safeLocalStorageGet(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a: any) => !isDummyAssignment(a));
      }
    } catch (_) {}
  }
  return [];
}

export async function fetchClassMembers(token: string | null, classId: string): Promise<any[]> {
  let serverMems: any[] = [];
  try {
    const res = await fetch(`/api/classes/${classId}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        serverMems = data;
      }
    }
  } catch (_) {}

  const storageKey = `app_class_members_${classId}`;
  const raw = safeLocalStorageGet(storageKey);
  let localMems: any[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localMems = parsed;
      }
    } catch (_) {}
  }

  // Merge server and local members by ID/Email
  const mergedMap = new Map<string, any>();
  const getMemberKey = (m: any) => {
    return m.student?.id || m.studentId || m.id || m.student?.email || m.email;
  };

  serverMems.forEach((m) => {
    const key = getMemberKey(m);
    if (key) mergedMap.set(key, m);
  });

  localMems.forEach((m) => {
    const key = getMemberKey(m);
    if (key && !mergedMap.has(key)) {
      mergedMap.set(key, m);
    }
  });

  const allMembers = Array.from(mergedMap.values());
  safeLocalStorageSet(storageKey, JSON.stringify(allMembers));

  // Sync member count directly into main classes storage
  const rawClasses = safeLocalStorageGet(STORAGE_KEY);
  if (rawClasses) {
    try {
      const clsList: ClassItem[] = JSON.parse(rawClasses);
      if (Array.isArray(clsList)) {
        const updatedCls = clsList.map((c) =>
          c.id === classId ? { ...c, _count: { members: allMembers.length } } : c
        );
        safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updatedCls));
      }
    } catch (_) {}
  }

  return allMembers;
}

export const DEFAULT_ASSIGNMENT_DETAILS: Record<string, any> = {};

export async function fetchAssignmentDetail(token: string | null, assignmentId: string): Promise<any> {
  let found: any = null;

  try {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !isDummyAssignment(data)) found = data;
    }
  } catch (_) {}

  if (!found) {
    const localAssignmentsKey = 'app_custom_assignments';
    const rawLocal = safeLocalStorageGet(localAssignmentsKey);
    if (rawLocal) {
      try {
        const parsed: any[] = JSON.parse(rawLocal);
        found = parsed.find((a) => a.id === assignmentId && !isDummyAssignment(a));
      } catch (_) {}
    }
  }

  // Also check inside all class assignments lists
  if (!found && typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('app_class_assignments_')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const matched = list.find((a: any) => a.id === assignmentId && !isDummyAssignment(a));
              if (matched) {
                found = matched;
                break;
              }
            }
          }
        } catch (_) {}
      }
    }
  }

  if (found) {
    if (found.description && typeof found.description === 'string') {
      const match = found.description.match(/<!--CONFIG:([\s\S]*?)-->/);
      if (match) {
        try {
          const cfg = JSON.parse(match[1]);
          if (cfg.durationMinutes !== undefined && cfg.durationMinutes !== null) {
            found.durationMinutes = cfg.durationMinutes;
          }
          if (cfg.antiCheat !== undefined && cfg.antiCheat !== null) {
            found.antiCheat = cfg.antiCheat;
          }
          if (cfg.antiCheatConfig) {
            found.antiCheatConfig = cfg.antiCheatConfig;
          }
          found.description = found.description.replace(/<!--CONFIG:[\s\S]*?-->/, '').trim();
        } catch (_) {}
      }
    }
  }

  return found;
}

export async function fetchAssignmentSubmissions(token: string | null, assignmentId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((s: any) => !isDummySubmission(s));
      }
    }
  } catch (_) {}

  const storageKey = `app_assignment_subs_${assignmentId}`;
  const raw = safeLocalStorageGet(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => !isDummySubmission(s));
      }
    } catch (_) {}
  }
  return [];
}

export async function fetchMyAssignmentSubmission(token: string | null, assignmentId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submission/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  const storageKey = `app_my_assignment_sub_${assignmentId}`;
  const raw = safeLocalStorageGet(storageKey);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }
  return null;
}

export async function submitAssignment(token: string | null, assignmentId: string, answersList: any[]): Promise<any> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ answers: answersList }),
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  const newSub = {
    id: `sub_my_${Date.now()}`,
    status: 'SUBMITTED',
    score: null,
    feedback: null,
    submittedAt: new Date().toISOString(),
    answers: answersList.map((a, idx) => ({
      id: `ans_my_${idx + 1}`,
      questionId: a.questionId,
      answerContent: a.answerContent,
    })),
  };

  const storageKey = `app_my_assignment_sub_${assignmentId}`;
  safeLocalStorageSet(storageKey, JSON.stringify(newSub));

  const subsKey = `app_assignment_subs_${assignmentId}`;
  const rawSubs = safeLocalStorageGet(subsKey);
  let subs: any[] = [];
  if (rawSubs) {
    try {
      subs = JSON.parse(rawSubs);
    } catch (_) {}
  }
  subs.unshift({
    ...newSub,
    student: { id: 'stu_current', profile: { name: 'Tôi (Học sinh)' }, email: 'student@kiyoedu.vn' },
  });
  safeLocalStorageSet(subsKey, JSON.stringify(subs));

  return newSub;
}

export async function gradeAssignmentSubmission(
  token: string | null,
  assignmentId: string,
  submissionId: string,
  score: number,
  feedback: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ score, feedback }),
    });
    if (res.ok) return true;
  } catch (_) {}

  const storageKey = `app_assignment_subs_${assignmentId}`;
  const raw = safeLocalStorageGet(storageKey);
  if (raw) {
    try {
      const subs: any[] = JSON.parse(raw);
      const target = subs.find((s) => s.id === submissionId);
      if (target) {
        target.status = 'GRADED';
        target.score = score;
        target.feedback = feedback;
        safeLocalStorageSet(storageKey, JSON.stringify(subs));
      }
    } catch (_) {}
  }
  return true;
}

export async function deleteClass(token: string | null, classId: string): Promise<boolean> {
  try {
    await fetch(`/api/classes/${classId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (_) {}

  const local = getLocalClasses();
  const updated = local.filter((c) => c.id !== classId);
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
  return true;
}

export async function removeStudentFromClass(token: string | null, classId: string, studentId: string): Promise<boolean> {
  try {
    await fetch(`/api/classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (_) {}

  const storageKey = `app_class_members_${classId}`;
  const raw = safeLocalStorageGet(storageKey);
  if (raw) {
    try {
      const members: any[] = JSON.parse(raw);
      const updated = members.filter((m) => (m.student?.id || m.studentId || m.id) !== studentId);
      safeLocalStorageSet(storageKey, JSON.stringify(updated));

      // Sync member count directly into main classes storage
      const rawClasses = safeLocalStorageGet(STORAGE_KEY);
      if (rawClasses) {
        const clsList: ClassItem[] = JSON.parse(rawClasses);
        if (Array.isArray(clsList)) {
          const updatedCls = clsList.map((c) =>
            c.id === classId ? { ...c, _count: { members: updated.length } } : c
          );
          safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updatedCls));
        }
      }
    } catch (_) {}
  }
  return true;
}

export interface AntiCheatConfig {
  enabled: boolean;
  preventTabSwitch?: boolean;
  fullscreen?: boolean;
  disableCopy?: boolean;
  shuffleQuestions?: boolean;
  maxViolations?: number;
}

export async function createClassAssignment(
  token: string | null,
  payload: {
    classId: string;
    title: string;
    description?: string;
    documentFileId?: string;
    quizId?: string;
    deadline?: string;
    maxScore?: number;
    durationMinutes?: number;
    antiCheat?: boolean;
    antiCheatConfig?: AntiCheatConfig;
  }
): Promise<any> {
  let created: any = null;

  // Encode antiCheat & durationMinutes into description comment for backend DTO compliance
  const metaConfig = {
    durationMinutes: payload.durationMinutes || null,
    antiCheat: Boolean(payload.antiCheat),
    antiCheatConfig: payload.antiCheatConfig || null,
  };
  const configComment = `<!--CONFIG:${JSON.stringify(metaConfig)}-->`;
  const rawDesc = payload.description ? payload.description.trim() : '';
  const encodedDescription = rawDesc ? `${rawDesc}\n\n${configComment}` : configComment;

  try {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        classId: payload.classId,
        title: payload.title.trim(),
        description: encodedDescription,
        documentFileId: payload.documentFileId || undefined,
        quizId: payload.quizId || undefined,
        deadline: payload.deadline || undefined,
        maxScore: payload.maxScore || 10,
      }),
    });

    if (res.ok) {
      const text = await res.text();
      try {
        created = JSON.parse(text);
      } catch (_) {}
    }
  } catch (_) {}

  if (!created) {
    let docFile: any = null;
    if (payload.documentFileId && typeof window !== 'undefined') {
      try {
        const rawFiles = localStorage.getItem('app_documents_files');
        if (rawFiles) {
          const files = JSON.parse(rawFiles);
          docFile = files.find((f: any) => f.id === payload.documentFileId);
        }
        if (!docFile) {
          docFile = await idbGetDocument(payload.documentFileId);
        }
      } catch (_) {}
    }

    created = {
      id: `asg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: payload.title.trim(),
      description: payload.description || '',
      classId: payload.classId,
      documentFileId: payload.documentFileId || null,
      quizId: payload.quizId || null,
      durationMinutes: payload.durationMinutes || null,
      antiCheat: Boolean(payload.antiCheat),
      antiCheatConfig: payload.antiCheatConfig || null,
      documentFile: docFile
        ? {
            id: docFile.id,
            name: docFile.name,
            fileType: docFile.fileType,
            parsedQuiz: docFile.parsedQuiz,
          }
        : null,
      deadline: payload.deadline || null,
      maxScore: payload.maxScore || 10,
      createdAt: new Date().toISOString(),
      _count: { submissions: 0 },
    };
  } else {
    created.durationMinutes = payload.durationMinutes || null;
    created.antiCheat = Boolean(payload.antiCheat);
    created.antiCheatConfig = payload.antiCheatConfig || null;
  }

  // Also strip config from returned created.description for clean UI display
  if (created.description && typeof created.description === 'string') {
    created.description = created.description.replace(/<!--CONFIG:[\s\S]*?-->/, '').trim();
  }

  // Update in localStorage
  if (typeof window !== 'undefined' && payload.classId) {
    const storageKey = `app_class_assignments_${payload.classId}`;
    try {
      const raw = safeLocalStorageGet(storageKey);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      list = [created, ...list.filter((item: any) => item.id !== created.id)];
      safeLocalStorageSet(storageKey, JSON.stringify(list));
    } catch (_) {}

    try {
      const customKey = 'app_custom_assignments';
      const rawCustom = safeLocalStorageGet(customKey);
      let customList = rawCustom ? JSON.parse(rawCustom) : [];
      if (!Array.isArray(customList)) customList = [];
      customList = [created, ...customList.filter((item: any) => item.id !== created.id)];
      safeLocalStorageSet(customKey, JSON.stringify(customList));
    } catch (_) {}
  }

  return created;
}

export async function deleteClassAssignment(
  token: string | null,
  classId: string,
  assignmentId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      // server deletion successful
    }
  } catch (_) {}

  // Update in localStorage
  if (typeof window !== 'undefined') {
    if (classId) {
      const storageKey = `app_class_assignments_${classId}`;
      try {
        const raw = safeLocalStorageGet(storageKey);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((item: any) => item.id !== assignmentId);
            safeLocalStorageSet(storageKey, JSON.stringify(filtered));
          }
        }
      } catch (_) {}
    }

    const customKey = 'app_custom_assignments';
    try {
      const raw = safeLocalStorageGet(customKey);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((item: any) => item.id !== assignmentId);
          safeLocalStorageSet(customKey, JSON.stringify(filtered));
        }
      }
    } catch (_) {}
  }

  return true;
}

