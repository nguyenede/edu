import {
  idbSaveDocument,
  idbGetDocument,
  idbGetAllDocuments,
  idbDeleteDocument,
  idbSaveFolder,
  idbGetAllFolders,
  idbDeleteFolder,
  idbSyncAndGetAll,
  DocumentFileItem,
  DocumentFolderItem,
} from './indexedDbStorage';
import { safeLocalStorageSet } from './safeStorage';

const API_BASE = typeof window !== 'undefined' ? '/api/documents' : 'http://127.0.0.1:5000/api/documents';

/**
 * Thuật toán so khớp mã tài liệu / ID đề thi thông minh (chống sai lệch URL / encoding / typo)
 */
export function matchDocId(targetId: string, searchId: string): boolean {
  if (!targetId || !searchId) return false;
  if (targetId === searchId) return true;
  if (decodeURIComponent(targetId) === searchId) return true;

  const cleanT = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanS = searchId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanT === cleanS) return true;

  // Khớp nếu cùng chuỗi số timestamp (ví dụ file_1791698305008_... và filc_1791698305008_...)
  const numPartT = targetId.match(/\d{10,}/)?.[0];
  const numPartS = searchId.match(/\d{10,}/)?.[0];
  if (numPartT && numPartS && numPartT === numPartS) {
    return true;
  }

  // Khớp nếu phần đuôi (sau tiền tố 4 ký tự: file vs filc) trùng khớp
  if (cleanT.length >= 10 && cleanS.length >= 10) {
    if (cleanT.slice(4) === cleanS.slice(4)) return true;
  }

  // Khớp nếu ID này bao hàm ID kia
  if (cleanT.includes(cleanS) || cleanS.includes(cleanT)) {
    return true;
  }

  return false;
}

async function safeApiFetch(url: string, options: RequestInit = {}, timeoutMs: number = 800): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    return res;
  } catch {
    return null;
  }
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || 'Không thể đồng bộ tài liệu');
  }
  return data;
}

export async function listDocuments(token: string, folderId?: string | null) {
  // 1. Ưu tiên lấy ngay từ IndexedDB (Tốc độ 0ms, đầy đủ dữ liệu offline)
  if (typeof window !== 'undefined') {
    try {
      const idbData = await idbSyncAndGetAll();
      if (idbData.documents.length > 0 || idbData.folders.length > 0) {
        return {
          folders: idbData.folders,
          files: idbData.documents,
        };
      }
    } catch (err) {
      console.warn('IndexedDB listDocuments error:', err);
    }

    try {
      const rawFolders = localStorage.getItem('app_documents_folders');
      const rawFiles = localStorage.getItem('app_documents_files');
      const allFolders = rawFolders ? JSON.parse(rawFolders) : [];
      const allFiles = rawFiles ? JSON.parse(rawFiles) : [];
      if (allFolders.length > 0 || allFiles.length > 0) {
        return {
          folders: Array.isArray(allFolders) ? allFolders : [],
          files: Array.isArray(allFiles) ? allFiles : [],
        };
      }
    } catch {}
  }

  // 2. Thử fetch backend với timeout ngắn (800ms), tuyệt đối không để treo trình duyệt
  try {
    const url = folderId ? `${API_BASE}?folderId=${encodeURIComponent(folderId)}` : API_BASE;
    const res = await safeApiFetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    }, 800);

    if (res && res.ok) {
      const remote = await parseResponse(res);
      if (remote && (Array.isArray(remote.folders) || Array.isArray(remote.files))) {
        return remote;
      }
    }
  } catch {}

  return { folders: [], files: [] };
}

export async function createDocumentFolder(token: string, payload: { name: string; parentId?: string | null }) {
  const newFolder: DocumentFolderItem = {
    id: 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name: payload.name,
    parentId: payload.parentId || null,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      await idbSaveFolder(newFolder);
      const raw = localStorage.getItem('app_documents_folders');
      const folders = raw ? JSON.parse(raw) : [];
      const updated = [newFolder, ...folders.filter((f: any) => f.id !== newFolder.id)];
      safeLocalStorageSet('app_documents_folders', JSON.stringify(updated));
    } catch {}
  }

  // Đồng bộ ngầm lên backend nếu có (không chặn UI)
  safeApiFetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  }, 800).catch(() => null);

  return newFolder;
}

export async function renameDocumentFolder(token: string, id: string, name: string) {
  if (typeof window !== 'undefined') {
    try {
      const folders = await idbGetAllFolders();
      const target = folders.find((f) => f.id === id);
      if (target) {
        target.name = name;
        await idbSaveFolder(target);
      }
      const raw = localStorage.getItem('app_documents_folders');
      if (raw) {
        const localFolders = JSON.parse(raw).map((f: any) => (f.id === id ? { ...f, name } : f));
        safeLocalStorageSet('app_documents_folders', JSON.stringify(localFolders));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  }, 800).catch(() => null);

  return { success: true, name };
}

export async function deleteDocumentFolder(token: string, id: string) {
  if (typeof window !== 'undefined') {
    try {
      await idbDeleteFolder(id);
      const raw = localStorage.getItem('app_documents_folders');
      if (raw) {
        const folders = JSON.parse(raw).filter((f: any) => f.id !== id);
        safeLocalStorageSet('app_documents_folders', JSON.stringify(folders));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/folders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, 800).catch(() => null);

  return { success: true };
}

export async function createDocumentFile(token: string, payload: any): Promise<any> {
  const newFile: DocumentFileItem = {
    id: payload.id || ('file_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    name: payload.name,
    parentId: payload.parentId || null,
    fileType: payload.fileType || 'docx',
    parsedQuiz: payload.parsedQuiz,
    createdAt: new Date().toISOString(),
  };

  // 1. LƯU NGAY LẬP TỨC VÀO INDEXEDDB & LOCALSTORAGE (Tốc độ 0ms, không phụ thuộc mạng/backend)
  if (typeof window !== 'undefined') {
    try {
      await idbSaveDocument(newFile);
      const raw = localStorage.getItem('app_documents_files');
      const files = raw ? JSON.parse(raw) : [];
      const updated = [newFile, ...files.filter((f: any) => f.id !== newFile.id)];
      safeLocalStorageSet('app_documents_files', JSON.stringify(updated));
    } catch (err) {
      console.warn('Error saving new document to local cache:', err);
    }
  }

  // 2. ĐỒNG BỘ NGẦM LÊN BACKEND NẾU CÓ (Timeout 800ms, không block caller)
  safeApiFetch(`${API_BASE}/files`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(newFile),
  }, 800).then(async (res) => {
    if (res && res.ok) {
      const result = await res.json().catch(() => null);
      if (result && result.id && result.id !== newFile.id) {
        await idbSaveDocument(result);
      }
    }
  }).catch(() => null);

  // 3. TRẢ VỀ NGAY LẬP TỨC (0ms)
  return newFile;
}

export async function listDocumentFiles(token: string) {
  if (typeof window !== 'undefined') {
    try {
      const idbFiles = await idbGetAllDocuments();
      if (idbFiles.length > 0) return idbFiles;
      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  try {
    const res = await safeApiFetch(`${API_BASE}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    }, 800);
    if (res && res.ok) {
      const remote = await parseResponse(res);
      if (Array.isArray(remote)) return remote;
    }
  } catch {}

  return [];
}

export async function getDocumentFile(token: string, id: string): Promise<DocumentFileItem | null> {
  if (!id) return null;

  // 1. KIỂM TRA NGAY TRÊN INDEXEDDB & LOCALSTORAGE (Tốc độ 0ms, tức thì, chống treo)
  if (typeof window !== 'undefined') {
    try {
      // 1a. Tìm trực tiếp trong IndexedDB theo ID chính xác
      const idbDoc = await idbGetDocument(id);
      if (idbDoc) return idbDoc;

      // 1b. Quét toàn bộ IndexedDB với matchDocId (chống sai lệch encoding / typo)
      const allIdb = await idbGetAllDocuments();
      const matchInIdb = allIdb.find((d) => d && matchDocId(d.id, id));
      if (matchInIdb) return matchInIdb;

      // 1c. Tìm trong localStorage app_documents_files
      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const files = JSON.parse(raw);
        if (Array.isArray(files)) {
          const matchInFiles = files.find((f: any) => f && matchDocId(f.id, id));
          if (matchInFiles) return matchInFiles;
        }
      }

      // 1d. Tìm trong localStorage custom_uploaded_files
      const rawCustom = localStorage.getItem('custom_uploaded_files');
      if (rawCustom) {
        const customFiles = JSON.parse(rawCustom);
        if (Array.isArray(customFiles)) {
          const matchInCustom = customFiles.find((f: any) => f && matchDocId(f.id, id));
          if (matchInCustom) return matchInCustom;
        }
      }

      // 1e. Quét trong chatcoi_history_sessions để khôi phục đề nếu có
      const rawSessions = localStorage.getItem('chatcoi_history_sessions');
      if (rawSessions) {
        const sessions = JSON.parse(rawSessions);
        if (Array.isArray(sessions)) {
          for (const s of sessions) {
            for (const msg of s.messages || []) {
              for (const act of msg.executedActions || []) {
                if (act.actionType === 'exam' && act.data && matchDocId(act.data.examId, id)) {
                  const examData = act.data;
                  const questionsList = Array.isArray(examData.questions) ? examData.questions : [];
                  if (questionsList.length > 0) {
                    const recoveredDoc: DocumentFileItem = {
                      id: id,
                      name: `${examData.title || 'Đề thi trắc nghiệm'}.docx`,
                      parentId: null,
                      fileType: 'docx',
                      createdAt: new Date().toISOString(),
                      parsedQuiz: {
                        title: examData.title || 'Đề thi trắc nghiệm',
                        description: `Đề thi do SI ChatCoi tạo tự động.`,
                        durationMinutes: Number(examData.durationMinutes) || 45,
                        questions: questionsList,
                      },
                    };
                    return recoveredDoc;
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error reading local document caches in getDocumentFile:', err);
    }
  }

  // 2. NẾU VẪN CHƯA THẤY: Thử gọi backend với timeout ngắn (800ms), tuyệt đối không treo trình duyệt
  try {
    const res = await safeApiFetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
      headers: authHeaders(token),
    }, 800);

    if (res && res.ok) {
      const remote = await parseResponse(res);
      if (remote && remote.id) return remote;
    }
  } catch {}

  return null;
}

export async function renameDocumentFile(token: string, id: string, name: string) {
  if (typeof window !== 'undefined') {
    try {
      const doc = await idbGetDocument(id);
      if (doc) {
        doc.name = name;
        if (doc.parsedQuiz) doc.parsedQuiz.title = name;
        await idbSaveDocument(doc);
      }
      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const files = JSON.parse(raw).map((f: any) =>
          f.id === id ? { ...f, name, parsedQuiz: { ...(f.parsedQuiz || {}), title: name } } : f
        );
        safeLocalStorageSet('app_documents_files', JSON.stringify(files));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  }, 800).catch(() => null);

  return { success: true, name };
}

export async function deleteDocumentFile(token: string, id: string) {
  if (typeof window !== 'undefined') {
    try {
      await idbDeleteDocument(id);
      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const files = JSON.parse(raw).filter((f: any) => f.id !== id);
        safeLocalStorageSet('app_documents_files', JSON.stringify(files));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, 800).catch(() => null);

  return { success: true };
}

export async function moveDocumentFile(token: string, id: string, targetFolderId: string | null) {
  if (typeof window !== 'undefined') {
    try {
      const doc = await idbGetDocument(id);
      if (doc) {
        doc.parentId = targetFolderId;
        await idbSaveDocument(doc);
      }
      const raw = localStorage.getItem('app_documents_files');
      if (raw) {
        const files = JSON.parse(raw).map((f: any) => (f.id === id ? { ...f, parentId: targetFolderId } : f));
        safeLocalStorageSet('app_documents_files', JSON.stringify(files));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/files/${encodeURIComponent(id)}/move`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ parentId: targetFolderId }),
  }, 800).catch(() => null);

  return { success: true };
}

export async function moveDocumentFolder(token: string, id: string, targetFolderId: string | null) {
  if (typeof window !== 'undefined') {
    try {
      const folders = await idbGetAllFolders();
      const target = folders.find((f) => f.id === id);
      if (target) {
        target.parentId = targetFolderId;
        await idbSaveFolder(target);
      }
      const raw = localStorage.getItem('app_documents_folders');
      if (raw) {
        const updated = JSON.parse(raw).map((f: any) => (f.id === id ? { ...f, parentId: targetFolderId } : f));
        safeLocalStorageSet('app_documents_folders', JSON.stringify(updated));
      }
    } catch {}
  }

  safeApiFetch(`${API_BASE}/folders/${encodeURIComponent(id)}/move`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ parentId: targetFolderId }),
  }, 800).catch(() => null);

  return { success: true };
}

export async function clearAllDocumentsApi(token: string) {
  safeApiFetch(`${API_BASE}/all`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, 800).catch(() => null);

  return { success: true };
}
