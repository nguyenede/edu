import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from './safeStorage';
import { idbGetDocument } from './indexedDbStorage';
import { getStoredUser } from '@/store/useAuthStore';

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  schoolYear?: string;
  group?: string;
  sharedWith?: string[];
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
const GROUPS_STORAGE_KEY = 'app_class_groups_data';
export const DEFAULT_GROUPS = ['Khác'];

export function getLocalClassGroups(): string[] {
  const raw = safeLocalStorageGet(GROUPS_STORAGE_KEY);
  if (!raw) return DEFAULT_GROUPS;
  try {
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch (_) {}
  return DEFAULT_GROUPS;
}

export function addClassGroup(groupName: string): string[] {
  const name = groupName.trim();
  if (!name) return getLocalClassGroups();
  const current = getLocalClassGroups();
  if (!current.includes(name)) {
    const updated = [...current, name];
    safeLocalStorageSet(GROUPS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
  return current;
}

const DEFAULT_CLASSES: ClassItem[] = [];

export function getLocalClasses(): ClassItem[] {
  const raw = safeLocalStorageGet(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out dummy/fake initial classes and auto-clean any underscore '_' from class IDs
    let hasCleaned = false;
    const list = parsed
      .filter((c) => c && c.id !== 'cls_init_1' && c.id !== 'cls_init_2' && c.id !== 'clsinit1' && c.id !== 'clsinit2')
      .map((c) => {
        if (c.id && typeof c.id === 'string' && c.id.includes('_')) {
          const oldId = c.id;
          const cleanId = oldId.replace(/_/g, '');
          hasCleaned = true;
          if (typeof window !== 'undefined') {
            const oldMemKey = `app_class_members_${oldId}`;
            const newMemKey = `app_class_members_${cleanId}`;
            const memVal = localStorage.getItem(oldMemKey);
            if (memVal && !localStorage.getItem(newMemKey)) {
              localStorage.setItem(newMemKey, memVal);
            }
            const oldAssignKey = `app_class_assignments_${oldId}`;
            const newAssignKey = `app_class_assignments_${cleanId}`;
            const assignVal = localStorage.getItem(oldAssignKey);
            if (assignVal && !localStorage.getItem(newAssignKey)) {
              localStorage.setItem(newAssignKey, assignVal);
            }
          }
          let code = c.code;
          if (!code || /\D/.test(code)) {
            let hash = 0;
            const str = (code || c.id || 'class').toString();
            for (let i = 0; i < str.length; i++) {
              hash = (hash * 31 + str.charCodeAt(i)) % 900000;
            }
            code = (100000 + Math.abs(hash)).toString();
            hasCleaned = true;
          }
          return { ...c, id: cleanId, code };
        }
        if (!c.code || /\D/.test(c.code)) {
          let hash = 0;
          const str = (c.code || c.id || 'class').toString();
          for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) % 900000;
          }
          const code = (100000 + Math.abs(hash)).toString();
          hasCleaned = true;
          return { ...c, code };
        }
        return c;
      });

    if (hasCleaned && typeof window !== 'undefined') {
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(list));
    }

    return list.map((c) => {
      const cleanId = c.id.replace(/_/g, '');
      const memKey = `app_class_members_${cleanId}`;
      const rawMems = safeLocalStorageGet(memKey) || safeLocalStorageGet(`app_class_members_${c.id}`);
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
        id: cleanId,
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

export async function createClass(
  token: string | null,
  name: string,
  user: any,
  options?: { schoolYear?: string; group?: string }
): Promise<ClassItem> {
  const trimmedName = name.trim();
  const schoolYear = options?.schoolYear || '2026 - 2027';
  const group = options?.group || 'Khác';

  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: trimmedName, schoolYear, group }),
    });
    if (res.ok) {
      const created = await res.json();
      const enriched = {
        ...created,
        schoolYear: created.schoolYear || schoolYear,
        group: created.group || group,
        sharedWith: created.sharedWith || [],
      };
      const local = getLocalClasses();
      const updated = [enriched, ...local.filter((c) => c.id !== enriched.id)];
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
      return enriched;
    }
  } catch (_) {
    // Server offline fallback
  }

  // Resilient Local Creation (Offline mode)
  const newClass: ClassItem = {
    id: 'cls' + Date.now() + Math.random().toString(36).substring(2, 6),
    name: trimmedName,
    code: Math.floor(100000 + Math.random() * 900000).toString(),
    schoolYear,
    group,
    sharedWith: [],
    teacherId: user?.id || 'teacherlocal',
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

export function bulkCreateClasses(
  items: Array<{ name: string; schoolYear?: string; group?: string }>,
  user: any
): ClassItem[] {
  const current = getLocalClasses();
  const newlyCreated: ClassItem[] = [];

  items.forEach((item, idx) => {
    const trimmed = (item.name || '').trim();
    if (!trimmed) return;
    const newClass: ClassItem = {
      id: 'cls' + (Date.now() + idx) + Math.random().toString(36).substring(2, 6),
      name: trimmed,
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      schoolYear: item.schoolYear || '2026 - 2027',
      group: item.group || 'Khác',
      sharedWith: [],
      teacherId: user?.id || 'teacherlocal',
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
    newlyCreated.push(newClass);
  });

  const updated = [...newlyCreated, ...current];
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updated));
  return newlyCreated;
}

export function updateClassInfo(
  classId: string,
  updates: Partial<ClassItem>
): ClassItem | null {
  const current = getLocalClasses();
  let updatedItem: ClassItem | null = null;
  const next = current.map((c) => {
    if (c.id === classId) {
      updatedItem = { ...c, ...updates };
      return updatedItem;
    }
    return c;
  });
  if (updatedItem) {
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(next));
  }
  return updatedItem;
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
      id: 'mem' + Date.now() + Math.random().toString(36).substring(2, 5),
      joinedAt: new Date().toISOString(),
      studentId: currentUser?.id || 'student' + Date.now(),
      student: {
        id: currentUser?.id || 'student' + Date.now(),
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
    const cleanClassId = classId.replace(/_/g, '');
    detail = local.find(
      (c) =>
        c.id === classId ||
        c.id === cleanClassId ||
        c.id.replace(/_/g, '') === cleanClassId ||
        c.code === classId
    ) || null;
  }

  if (!detail) {
    return null as any;
  }

  // Sync member count from members storage
  const cleanClassId = classId.replace(/_/g, '');
  const memKey = `app_class_members_${cleanClassId}`;
  const rawMems = safeLocalStorageGet(memKey) || safeLocalStorageGet(`app_class_members_${classId}`);
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
  let list: any[] = [];
  try {
    const res = await fetch(`/api/assignments/class/${classId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        list = data.filter((a: any) => !isDummyAssignment(a));
      }
    }
  } catch (_) {}

  const cleanClassId = classId.replace(/_/g, '');
  const storageKey = `app_class_assignments_${cleanClassId}`;
  const raw = safeLocalStorageGet(storageKey) || safeLocalStorageGet(`app_class_assignments_${classId}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.filter((a: any) => !isDummyAssignment(a)).forEach((item) => {
          if (!list.some((existing) => existing.id === item.id)) {
            list.push(item);
          }
        });
      }
    } catch (_) {}
  }

  // Tự động đồng bộ các bài tập/đề thi giao cho lớp này từ app_blooket_homeworks
  try {
    const rawHw = safeLocalStorageGet('app_blooket_homeworks');
    if (rawHw) {
      const hwList = JSON.parse(rawHw);
      if (Array.isArray(hwList)) {
        hwList.forEach((hw: any) => {
          if (hw && (hw.classId === classId || (classId === 'public' && !hw.classId))) {
            if (!list.some((existing) => existing.id === hw.id)) {
              list.push({
                id: hw.id,
                title: hw.title,
                description: hw.description || '',
                classId: hw.classId,
                className: hw.className || '',
                class: { name: hw.className || '' },
                pin: hw.pin,
                deadline: hw.deadline,
                maxScore: 10,
                antiCheat: hw.antiCheating,
                antiCheatConfig: hw.antiCheatConfig,
                durationMinutes: hw.durationMinutes,
                minSubmitMinutes: hw.minSubmitMinutes || 0,
                quiz: {
                  id: `quiz_${hw.id}`,
                  title: hw.quizData?.title || hw.title,
                  questions: hw.quizData?.questions || [],
                },
                _count: { submissions: hw._count?.submissions || 0 },
                createdAt: hw.createdAt || new Date().toISOString(),
              });
            }
          }
        });
      }
    }
  } catch (_) {}

  return list;
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

  const cleanClassId = classId.replace(/_/g, '');
  const storageKey = `app_class_members_${cleanClassId}`;
  const raw = safeLocalStorageGet(storageKey) || safeLocalStorageGet(`app_class_members_${classId}`);
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
  if (cleanClassId !== classId) {
    safeLocalStorageSet(`app_class_members_${classId}`, JSON.stringify(allMembers));
  }

  // Sync member count directly into main classes storage
  const rawClasses = safeLocalStorageGet(STORAGE_KEY);
  if (rawClasses) {
    try {
      const clsList: ClassItem[] = JSON.parse(rawClasses);
      if (Array.isArray(clsList)) {
        const updatedCls = clsList.map((c) =>
          (c.id === classId || c.id === cleanClassId || c.id?.replace(/_/g, '') === cleanClassId)
            ? { ...c, _count: { members: allMembers.length } }
            : c
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

  // Also check inside app_blooket_homeworks
  if (!found && typeof window !== 'undefined') {
    try {
      const rawHw = safeLocalStorageGet('app_blooket_homeworks');
      if (rawHw) {
        const hwList = JSON.parse(rawHw);
        if (Array.isArray(hwList)) {
          const matched = hwList.find((h: any) => h.id === assignmentId || h.pin === assignmentId);
          if (matched) {
            const questions = (matched.quizData?.questions || []).map((q: any, idx: number) => ({
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
            }));

            found = {
              id: matched.id,
              title: matched.title,
              description: matched.description || '',
              classId: matched.classId || 'public',
              className: matched.className || 'Toàn trường / Công khai',
              class: { name: matched.className || 'Toàn trường / Công khai' },
              pin: matched.pin,
              deadline: matched.deadline,
              maxScore: 10,
              antiCheat: Boolean(matched.antiCheating),
              antiCheatConfig: matched.antiCheatConfig,
              durationMinutes: matched.durationMinutes,
              minSubmitMinutes: matched.minSubmitMinutes || 0,
              quiz: {
                id: `quiz_${matched.id}`,
                title: matched.quizData?.title || matched.title,
                questions,
              },
              _count: { submissions: matched._count?.submissions || 0 },
              createdAt: matched.createdAt,
            };
          }
        }
      }
    } catch (_) {}
  }

  if (found) {
    const localClasses = getLocalClasses();
    // Resolve classId and className from class assignments storage if needed
    if ((!found.classId || found.classId === 'public') && typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('app_class_assignments_')) {
          const cId = k.replace('app_class_assignments_', '');
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list) && list.some((a: any) => a.id === found.id || a.pin === found.pin)) {
                found.classId = cId;
                break;
              }
            }
          } catch (_) {}
        }
      }
    }

    if (found.classId && found.classId !== 'public') {
      const matchedClass = localClasses.find((c) => c.id === found.classId);
      if (matchedClass) {
        found.className = matchedClass.name;
        found.class = { name: matchedClass.name };
      }
    }

    if (!found.class) {
      found.class = { name: found.className || 'Toàn trường / Công khai' };
    }

    // If questions are missing in quiz, recover from app_blooket_homeworks
    if ((!found.quiz?.questions || found.quiz.questions.length === 0) && typeof window !== 'undefined') {
      try {
        const rawHw = safeLocalStorageGet('app_blooket_homeworks');
        if (rawHw) {
          const hwList = JSON.parse(rawHw);
          const hw = hwList.find((h: any) => h.id === found.id || h.pin === found.pin);
          if (hw?.quizData?.questions?.length) {
            found.quiz = {
              id: `quiz_${found.id}`,
              title: hw.quizData.title || found.title,
              questions: hw.quizData.questions.map((q: any, idx: number) => ({
                id: `qq_${idx + 1}`,
                question: q,
              })),
            };
          }
          if (hw && (!found.classId || found.classId === 'public') && hw.classId) {
            found.classId = hw.classId;
            found.className = hw.className;
            found.class = { name: hw.className };
          }
        }
      } catch (_) {}
    }

    // If questions are still missing, recover from app_documents_files or custom_uploaded_files
    if ((!found.quiz?.questions || found.quiz.questions.length === 0) && typeof window !== 'undefined') {
      try {
        const rawDocs = safeLocalStorageGet('app_documents_files') || safeLocalStorageGet('custom_uploaded_files');
        if (rawDocs) {
          const docList = JSON.parse(rawDocs);
          if (Array.isArray(docList)) {
            const cleanTitle = (found.title || '').replace(/^Bài tập:\s*/i, '').trim().toLowerCase();
            const matchedDoc = docList.find((d: any) => {
              if (found.documentFileId && d.id === found.documentFileId) return true;
              if (found.documentId && d.id === found.documentId) return true;
              const dTitle = (d.parsedQuiz?.title || d.name || '').replace(/\.[^/.]+$/, '').trim().toLowerCase();
              return dTitle && (dTitle === cleanTitle || cleanTitle.includes(dTitle) || dTitle.includes(cleanTitle));
            });

            if (matchedDoc?.parsedQuiz?.questions?.length) {
              found.quiz = {
                id: `quiz_${found.id}`,
                title: matchedDoc.parsedQuiz.title || found.title,
                questions: matchedDoc.parsedQuiz.questions.map((q: any, idx: number) => ({
                  id: `qq_${idx + 1}`,
                  question: q,
                })),
              };
            }
          }
        }
      } catch (_) {}
    }

    if (found.description && typeof found.description === 'string') {
      const match = found.description.match(/<!--CONFIG:([\s\S]*?)-->/);
      if (match) {
        try {
          const cfg = JSON.parse(match[1]);
          if (cfg.durationMinutes !== undefined && cfg.durationMinutes !== null) {
            found.durationMinutes = cfg.durationMinutes;
          }
          if (cfg.minSubmitMinutes !== undefined && cfg.minSubmitMinutes !== null) {
            found.minSubmitMinutes = cfg.minSubmitMinutes;
          }
          if (cfg.antiCheat !== undefined && cfg.antiCheat !== null) {
            found.antiCheat = cfg.antiCheat;
          }
          if (cfg.antiCheatConfig) {
            found.antiCheatConfig = cfg.antiCheatConfig;
          }
          if (cfg.pin && !found.pin) {
            found.pin = cfg.pin;
          }
          found.description = found.description.replace(/<!--CONFIG:[\s\S]*?-->/, '').trim();
        } catch (_) {}
      }
    }
  }

  return found;
}

export async function fetchAssignmentSubmissions(token: string | null, assignmentId: string): Promise<any[]> {
  let subs: any[] = [];
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submissions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        subs = data.filter((s: any) => !isDummySubmission(s));
      }
    }
  } catch (_) {}

  // Check if assignment has associated PIN
  const cleanAssignmentId = assignmentId.replace(/_/g, '');
  let assocPin = '';
  try {
    const rawHw = safeLocalStorageGet('app_blooket_homeworks');
    if (rawHw) {
      const hwList = JSON.parse(rawHw);
      const matched = hwList.find((h: any) => h.id === assignmentId || h.id?.replace(/_/g, '') === cleanAssignmentId || h.pin === assignmentId);
      if (matched?.pin) assocPin = matched.pin;
    }
  } catch (_) {}

  const storageKey = `app_assignment_subs_${cleanAssignmentId}`;
  const raw = safeLocalStorageGet(storageKey) || safeLocalStorageGet(`app_assignment_subs_${assignmentId}`);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.filter((s: any) => !isDummySubmission(s)).forEach((item) => {
          if (!subs.some((s) => s.id === item.id)) {
            subs.push(item);
          }
        });
      }
    } catch (_) {}
  }

  if (assocPin && assocPin !== assignmentId) {
    const rawPinSubs = safeLocalStorageGet(`app_assignment_subs_${assocPin}`);
    if (rawPinSubs) {
      try {
        const parsedPin = JSON.parse(rawPinSubs);
        if (Array.isArray(parsedPin)) {
          parsedPin.filter((s: any) => !isDummySubmission(s)).forEach((item) => {
            if (!subs.some((s) => s.id === item.id)) {
              subs.push(item);
            }
          });
        }
      } catch (_) {}
    }
  }

  // Tự động gộp bài nộp từ hệ thống kiểm tra Blooket / Play
  const keysToCheck = [`app_homework_subs_${assignmentId}`];
  if (assocPin && assocPin !== assignmentId) {
    keysToCheck.push(`app_homework_subs_${assocPin}`);
  }

  keysToCheck.forEach((hwSubsKey) => {
    const rawHw = safeLocalStorageGet(hwSubsKey);
    if (rawHw) {
      try {
        const parsedHw = JSON.parse(rawHw);
        if (Array.isArray(parsedHw)) {
          parsedHw.forEach((hSub: any) => {
            if (!subs.some((s) => s.id === hSub.id)) {
              const stuName = hSub.studentName || hSub.student?.profile?.name || 'Học sinh';
              subs.push({
                id: hSub.id,
                status: 'GRADED',
                score: hSub.score,
                feedback: hSub.feedback || null,
                submittedAt: hSub.submittedAt,
                violationCount: hSub.violationCount || 0,
                violationLogs: hSub.violationLogs || [],
                timeSpentSeconds: hSub.timeSpentSeconds || 0,
                student: {
                  id: hSub.studentId || `stu_${hSub.id}`,
                  profile: { name: stuName },
                  email: `${stuName.toLowerCase().replace(/\s+/g, '')}@student.edu`,
                },
                answers: Object.entries(hSub.answers || {}).map(([qId, ans]: [string, any]) => ({
                  id: `ans_${qId}`,
                  questionId: qId,
                  answerContent: typeof ans === 'object' && ans !== null ? ans.selectedAnswer : ans,
                  isCorrect: typeof ans === 'object' && ans !== null ? Boolean(ans.isCorrect) : true,
                })),
              });
            }
          });
        }
      } catch (_) {}
    }
  });

  // Nhóm và gộp theo từng học sinh: Mỗi học sinh chỉ có duy nhất 1 bài nộp mới nhất trong danh sách
  const studentSubMap = new Map<string, any>();
  for (const s of subs) {
    if (!s) continue;
    const stuName = (s.student?.profile?.name || s.student?.name || s.studentName || '').trim().toLowerCase();
    const stuId = s.student?.id && !s.student.id.startsWith('stu_my_') && !s.student.id.startsWith('stu_current') && !s.student.id.startsWith('stu_sub_')
      ? s.student.id
      : null;
    const key = stuId || stuName || s.id;

    if (!studentSubMap.has(key)) {
      studentSubMap.set(key, s);
    } else {
      const existing = studentSubMap.get(key);
      const existingTime = new Date(existing.submittedAt).getTime() || 0;
      const curTime = new Date(s.submittedAt).getTime() || 0;
      // Ưu tiên giữ bài nộp mới nhất
      if (curTime >= existingTime) {
        studentSubMap.set(key, s);
      }
    }
  }

  const finalSubs = Array.from(studentSubMap.values()).sort(
    (a, b) => (new Date(b.submittedAt).getTime() || 0) - (new Date(a.submittedAt).getTime() || 0)
  );

  // Tự động dọn dẹp các bản ghi trùng lặp trong localStorage
  if (finalSubs.length < subs.length && typeof window !== 'undefined') {
    try {
      safeLocalStorageSet(storageKey, JSON.stringify(finalSubs));
    } catch (_) {}
  }

  return finalSubs;
}

export async function fetchMyAssignmentSubmission(token: string | null, assignmentId: string): Promise<any | null> {
  const cleanAssignmentId = assignmentId.replace(/_/g, '');
  try {
    const res = await fetch(`/api/assignments/${assignmentId}/submission/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) return await res.json();
  } catch (_) {}

  const storageKey = `app_my_assignment_sub_${cleanAssignmentId}`;
  const raw = safeLocalStorageGet(storageKey) || safeLocalStorageGet(`app_my_assignment_sub_${assignmentId}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }

  // Fallback: Tìm trong danh sách nộp bài nếu học sinh nộp qua phòng thi /play
  try {
    const currentU = getStoredUser();
    if (currentU) {
      const subs = await fetchAssignmentSubmissions(token, assignmentId);
      const mySub = subs.find((s) => {
        const sId = s.student?.id || s.studentId;
        const sName = (s.student?.profile?.name || s.student?.name || s.studentName || '').toLowerCase().trim();
        const uName = (currentU.name || '').toLowerCase().trim();
        const sEmail = (s.student?.email || s.email || '').toLowerCase().trim();
        const uEmail = (currentU.email || '').toLowerCase().trim();
        return (sId && sId === currentU.id) || (sName && sName === uName) || (sEmail && sEmail === uEmail);
      });
      if (mySub) {
        safeLocalStorageSet(storageKey, JSON.stringify(mySub));
        return mySub;
      }
    }
  } catch (_) {}

  return null;
}

export async function submitAssignment(
  token: string | null,
  assignmentId: string,
  answersList: any[],
  extraMeta?: {
    violationCount?: number;
    violationLogs?: any[];
    timeSpentSeconds?: number;
  }
): Promise<any> {
  // Tải chi tiết bài tập để tự động chấm trắc nghiệm
  let assignment: any = null;
  try {
    assignment = await fetchAssignmentDetail(token, assignmentId);
  } catch (_) {}

  let correctCount = 0;
  const totalQuestions = assignment?.quiz?.questions?.length ||
    assignment?.documentFile?.parsedQuiz?.questions?.length ||
    answersList.length || 1;

  const gradedAnswers = answersList.map((a, idx) => {
    let isCorrect: boolean | null = null;

    if (assignment) {
      if (assignment.quiz?.questions) {
        const quizQ = assignment.quiz.questions.find(
          (qq: any) => qq.question?.id === a.questionId || qq.questionId === a.questionId || qq.id === a.questionId
        );
        if (quizQ?.question?.options) {
          const chosenOpt = quizQ.question.options.find(
            (opt: any) => opt.id === a.answerContent || opt.content === a.answerContent
          );
          if (chosenOpt) {
            isCorrect = Boolean(chosenOpt.isCorrect);
          }
        }
      } else if (assignment.documentFile?.parsedQuiz?.questions) {
        const docQ = assignment.documentFile.parsedQuiz.questions.find(
          (q: any, qIdx: number) => (q.id || `q_${qIdx + 1}`) === a.questionId
        );
        if (docQ?.options) {
          const selectedIdx = Number(a.answerContent);
          if (Number.isInteger(selectedIdx) && docQ.options[selectedIdx]) {
            isCorrect = Boolean(docQ.options[selectedIdx].isCorrect);
          } else {
            const matchedOpt = docQ.options.find((opt: any) => opt.content === a.answerContent);
            if (matchedOpt) isCorrect = Boolean(matchedOpt.isCorrect);
          }
        }
      }
    }

    if (isCorrect === true) correctCount++;
    return {
      id: `ans_my_${idx + 1}`,
      questionId: a.questionId,
      answerContent: a.answerContent,
      isCorrect,
    };
  });

  const hasAutoGrading = gradedAnswers.some((a) => a.isCorrect !== null);
  const maxScore = assignment?.maxScore || 10;
  const calculatedScore = hasAutoGrading
    ? Math.round((correctCount / totalQuestions) * maxScore * 10) / 10
    : null;

  const currentU = getStoredUser();
  const studentName = currentU?.name || 'Học sinh';
  const studentEmail = currentU?.email || 'student@kiyoedu.vn';

  const newSub = {
    id: `submy${Date.now()}`,
    status: hasAutoGrading ? 'GRADED' : 'SUBMITTED',
    score: calculatedScore,
    correctCount: hasAutoGrading ? correctCount : undefined,
    totalQuestions,
    feedback: hasAutoGrading ? `Tự động chấm: Đúng ${correctCount}/${totalQuestions} câu` : null,
    submittedAt: new Date().toISOString(),
    violationCount: extraMeta?.violationCount || 0,
    violationLogs: extraMeta?.violationLogs || [],
    timeSpentSeconds: extraMeta?.timeSpentSeconds || 0,
    student: {
      id: currentU?.id || 'stu_current',
      profile: { name: studentName },
      email: studentEmail,
    },
    answers: gradedAnswers,
  };

  const storageKey = `app_my_assignment_sub_${assignmentId}`;
  safeLocalStorageSet(storageKey, JSON.stringify(newSub));

  const subsKey = `app_assignment_subs_${assignmentId}`;
  const rawSubs = safeLocalStorageGet(subsKey);
  let subs: any[] = [];
  if (rawSubs) {
    try {
      subs = JSON.parse(rawSubs);
      if (!Array.isArray(subs)) subs = [];
    } catch (_) {}
  }

  const currentUserId = currentU?.id;
  const currentNormalizedName = studentName.trim().toLowerCase();
  const existingSubIdx = subs.findIndex((s) => {
    const sId = s.student?.id;
    const sName = (s.student?.profile?.name || s.student?.name || s.studentName || '').trim().toLowerCase();
    return (
      (currentUserId && sId && sId === currentUserId) ||
      (sName && sName === currentNormalizedName)
    );
  });
  if (existingSubIdx >= 0) {
    subs[existingSubIdx] = newSub;
  } else {
    subs.unshift(newSub);
  }
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

  // Cập nhật cả bên app_homework_subs_${assignmentId}
  const hwSubsKey = `app_homework_subs_${assignmentId}`;
  const rawHw = safeLocalStorageGet(hwSubsKey);
  if (rawHw) {
    try {
      const hwSubs: any[] = JSON.parse(rawHw);
      const targetHw = hwSubs.find((s) => s.id === submissionId);
      if (targetHw) {
        targetHw.score = score;
        safeLocalStorageSet(hwSubsKey, JSON.stringify(hwSubs));
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
  enabled?: boolean;
  preventTabSwitch?: boolean;
  detectTabSwitch?: boolean;
  fullscreen?: boolean;
  forceFullscreen?: boolean;
  disableCopy?: boolean;
  preventCopyPaste?: boolean;
  shuffleQuestions?: boolean;
  maxViolations?: number;
  autoSubmitOnLimit?: boolean;
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
    minSubmitMinutes?: number;
    antiCheat?: boolean;
    antiCheatConfig?: AntiCheatConfig;
  }
): Promise<any> {
  let created: any = null;

  const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

  // Encode antiCheat, durationMinutes & minSubmitMinutes into description comment for backend DTO compliance
  const metaConfig = {
    durationMinutes: payload.durationMinutes || null,
    minSubmitMinutes: payload.minSubmitMinutes || null,
    antiCheat: Boolean(payload.antiCheat),
    antiCheatConfig: payload.antiCheatConfig || null,
    pin: generatedPin,
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

    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    created = {
      id: `asg${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      pin: generatedPin,
      title: payload.title.trim(),
      description: payload.description || '',
      classId: payload.classId,
      documentFileId: payload.documentFileId || null,
      quizId: payload.quizId || null,
      durationMinutes: payload.durationMinutes || null,
      minSubmitMinutes: payload.minSubmitMinutes || null,
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
    created.pin = generatedPin;
    created.durationMinutes = payload.durationMinutes || null;
    created.minSubmitMinutes = payload.minSubmitMinutes || null;
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

    try {
      const hwKey = 'app_blooket_homeworks';
      const rawHw = safeLocalStorageGet(hwKey);
      let hwList = rawHw ? JSON.parse(rawHw) : [];
      if (!Array.isArray(hwList)) hwList = [];
      if (!hwList.some((h: any) => h.id === created.id || h.pin === created.pin)) {
        hwList.unshift({
          id: created.id,
          pin: created.pin || generatedPin,
          title: created.title,
          description: created.description || '',
          classId: created.classId,
          className: created.class?.name || 'Lớp học',
          deadline: created.deadline,
          durationMinutes: created.durationMinutes || 45,
          shuffleQuestions: true,
          shuffleOptions: false,
          showAnswersAfterSubmit: true,
          antiCheating: Boolean(created.antiCheat),
          antiCheatConfig: created.antiCheatConfig || {
            forceFullscreen: true,
            detectTabSwitch: true,
            maxViolations: 3,
            preventCopyPaste: true,
            autoSubmitOnLimit: true,
          },
          quizData: {
            title: created.title,
            durationMinutes: created.durationMinutes || 45,
            questions: created.documentFile?.parsedQuiz?.questions || [],
          },
          status: 'active',
          createdAt: created.createdAt || new Date().toISOString(),
          _count: { submissions: 0 },
        });
        safeLocalStorageSet(hwKey, JSON.stringify(hwList));
      }
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

    // Xóa cả trong app_blooket_homeworks và dọn dẹp bài nộp
    try {
      const rawHw = safeLocalStorageGet('app_blooket_homeworks');
      if (rawHw) {
        const hwList = JSON.parse(rawHw);
        if (Array.isArray(hwList)) {
          safeLocalStorageSet('app_blooket_homeworks', JSON.stringify(hwList.filter((item: any) => item.id !== assignmentId)));
        }
      }
    } catch (_) {}

    safeLocalStorageRemove(`app_assignment_subs_${assignmentId}`);
    safeLocalStorageRemove(`app_homework_subs_${assignmentId}`);
    safeLocalStorageRemove(`app_my_assignment_sub_${assignmentId}`);
  }

  return true;
}

// ==================== STUDENT MANAGEMENT ====================
export interface ClassStudentData {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  studentCode?: string;
}

export function addStudentToClassManual(classId: string, data: ClassStudentData): any {
  const memKey = `app_class_members_${classId}`;
  const rawMems = safeLocalStorageGet(memKey);
  let memList = rawMems ? JSON.parse(rawMems) : [];
  if (!Array.isArray(memList)) memList = [];

  const studentId = 'std' + Date.now() + Math.random().toString(36).substring(2, 6);
  const newMember = {
    id: 'mem' + Date.now() + Math.random().toString(36).substring(2, 6),
    studentId,
    joinedAt: new Date().toISOString(),
    studentCode: data.studentCode || ('HS' + Math.floor(1000 + Math.random() * 9000)),
    phone: data.phone || '',
    gender: data.gender || 'Nam',
    dob: data.dob || '',
    student: {
      id: studentId,
      email: data.email || `${studentId}@kiyoedu.com`,
      phone: data.phone || '',
      profile: {
        name: data.name.trim(),
        avatar: null,
      },
    },
  };

  memList.unshift(newMember);
  safeLocalStorageSet(memKey, JSON.stringify(memList));

  // Sync class member count
  const local = getLocalClasses();
  const updatedClasses = local.map((c) =>
    c.id === classId ? { ...c, _count: { members: memList.length } } : c
  );
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updatedClasses));

  return newMember;
}

export function bulkAddStudentsToClass(classId: string, students: ClassStudentData[]): number {
  const memKey = `app_class_members_${classId}`;
  const rawMems = safeLocalStorageGet(memKey);
  let memList = rawMems ? JSON.parse(rawMems) : [];
  if (!Array.isArray(memList)) memList = [];

  let addedCount = 0;
  students.forEach((data, idx) => {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) return;

    const studentId = 'std' + (Date.now() + idx) + Math.random().toString(36).substring(2, 6);
    const newMember = {
      id: 'mem' + (Date.now() + idx) + Math.random().toString(36).substring(2, 6),
      studentId,
      joinedAt: new Date().toISOString(),
      studentCode: data.studentCode || ('HS' + Math.floor(1000 + Math.random() * 9000)),
      phone: data.phone || '',
      gender: data.gender || 'Nam',
      dob: data.dob || '',
      student: {
        id: studentId,
        email: data.email || `${studentId}@kiyoedu.com`,
        phone: data.phone || '',
        profile: {
          name: trimmedName,
          avatar: null,
        },
      },
    };
    memList.push(newMember);
    addedCount++;
  });

  safeLocalStorageSet(memKey, JSON.stringify(memList));

  // Sync class member count
  const local = getLocalClasses();
  const updatedClasses = local.map((c) =>
    c.id === classId ? { ...c, _count: { members: memList.length } } : c
  );
  safeLocalStorageSet(STORAGE_KEY, JSON.stringify(updatedClasses));

  return addedCount;
}

// ==================== CLASS POSTS / ANNOUNCEMENTS ====================
export interface ClassPost {
  id: string;
  classId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  comments?: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
}

export function getClassPosts(classId: string): ClassPost[] {
  const key = `app_class_posts_${classId}`;
  const raw = safeLocalStorageGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createClassPost(classId: string, authorName: string, content: string): ClassPost {
  const posts = getClassPosts(classId);
  const newPost: ClassPost = {
    id: 'post' + Date.now(),
    classId,
    authorName: authorName || 'Giáo viên',
    authorRole: 'Giáo viên',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    comments: [],
  };
  const updated = [newPost, ...posts];
  safeLocalStorageSet(`app_class_posts_${classId}`, JSON.stringify(updated));
  return newPost;
}

// ==================== CLASS COURSES / LESSONS ====================
export interface ClassCourseItem {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  createdAt: string;
}

export function getClassCourses(classId: string): ClassCourseItem[] {
  const key = `app_class_courses_${classId}`;
  const raw = safeLocalStorageGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addClassCourse(classId: string, title: string, description: string): ClassCourseItem {
  const courses = getClassCourses(classId);
  const newCourse: ClassCourseItem = {
    id: 'course' + Date.now(),
    title: title.trim(),
    description: description.trim(),
    lessonCount: 1,
    createdAt: new Date().toISOString(),
  };
  const updated = [newCourse, ...courses];
  safeLocalStorageSet(`app_class_courses_${classId}`, JSON.stringify(updated));
  return newCourse;
}

/**
 * Kiểm tra xem tài khoản người dùng có quyền làm bài tập được giao cho một lớp học hay không.
 * - Giáo viên / Admin luôn được phép (để xem trước hoặc kiểm tra)
 * - Người tạo lớp (teacherId) luôn được phép
 * - Học sinh phải có ID hoặc Email trong danh sách thành viên của lớp
 */
export async function checkUserInClass(
  user: { id?: string; email?: string; role?: string; name?: string } | null,
  classId: string,
  token?: string | null
): Promise<{ allowed: boolean; reason?: 'not_logged_in' | 'not_in_class' | 'ok' }> {
  if (!user) {
    return { allowed: false, reason: 'not_logged_in' };
  }

  // Giáo viên hoặc Quản trị viên luôn có quyền truy cập
  if (user.role === 'TEACHER' || user.role === 'ADMIN') {
    return { allowed: true, reason: 'ok' };
  }

  const cleanClassId = classId.replace(/_/g, '');
  const localClasses = getLocalClasses();
  const foundClass = localClasses.find(
    (c) => c.id === classId || c.id === cleanClassId || c.id.replace(/_/g, '') === cleanClassId
  );

  // Nếu là giáo viên phụ trách lớp
  if (foundClass && foundClass.teacherId && foundClass.teacherId === user.id) {
    return { allowed: true, reason: 'ok' };
  }

  try {
    const members = await fetchClassMembers(token || null, classId);
    const userEmail = (user.email || '').trim().toLowerCase();
    const userId = user.id ? String(user.id) : '';
    const userName = (user.name || '').trim().toLowerCase();

    const isMember = members.some((m: any) => {
      const mId = m.studentId || m.student?.id || m.id ? String(m.studentId || m.student?.id || m.id) : '';
      const mEmail = (m.student?.email || m.email || '').trim().toLowerCase();
      const mName = (m.student?.profile?.name || m.name || '').trim().toLowerCase();

      if (userId && mId && mId === userId) return true;
      if (userEmail && mEmail && mEmail === userEmail) return true;
      if (userName && mName && mName === userName) return true;
      return false;
    });

    if (isMember) {
      return { allowed: true, reason: 'ok' };
    }

    // Tự động ghi danh học sinh vào lớp khi đã nhập mã PIN hợp lệ của bài tập lớp
    const newMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      studentId: userId || `stu_${Date.now()}`,
      joinedAt: new Date().toISOString(),
      student: {
        id: userId || `stu_${Date.now()}`,
        email: user.email || 'student@school.com',
        profile: {
          name: user.name || 'Em Nguyễn Văn Học',
          avatar: null,
        },
      },
    };
    const updatedMembers = [...members, newMember];
    const storageKey = `app_class_members_${cleanClassId}`;
    safeLocalStorageSet(storageKey, JSON.stringify(updatedMembers));
    return { allowed: true, reason: 'ok' };
  } catch (err) {
    console.error('Error checking class membership:', err);
  }

  return { allowed: false, reason: 'not_in_class' };
}

