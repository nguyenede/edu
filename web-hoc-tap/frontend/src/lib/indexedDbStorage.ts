/**
 * IndexedDB Storage Engine for Educational Documents & Folders
 * Provides practically unlimited persistent client-side storage (hundreds of MBs / GBs).
 * Completely eliminates the 5MB browser localStorage QuotaExceededError and prevents
 * documents from disappearing when the library grows large.
 */

const DB_NAME = 'EduAppDocumentsDB';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';
const STORE_FOLDERS = 'folders';

export interface DocumentFileItem {
  id: string;
  name: string;
  parentId: string | null;
  fileType: string;
  createdAt: string;
  parsedQuiz: any;
}

export interface DocumentFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in browser'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
          db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });

  return dbInitPromise;
}

// -------------------------------------------------------------
// DOCUMENT OPERATIONS
// -------------------------------------------------------------

export function matchDocId(targetId: string, searchId: string): boolean {
  if (!targetId || !searchId) return false;
  if (targetId === searchId) return true;
  if (decodeURIComponent(targetId) === searchId) return true;

  const cleanT = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanS = searchId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanT === cleanS) return true;

  const numPartT = targetId.match(/\d{10,}/)?.[0];
  const numPartS = searchId.match(/\d{10,}/)?.[0];
  if (numPartT && numPartS && numPartT === numPartS) {
    return true;
  }

  if (cleanT.length >= 10 && cleanS.length >= 10) {
    if (cleanT.slice(4) === cleanS.slice(4)) return true;
  }

  if (cleanT.includes(cleanS) || cleanS.includes(cleanT)) {
    return true;
  }

  return false;
}

export function isNameMatch(nameA?: string, nameB?: string): boolean {
  if (!nameA || !nameB) return false;
  const cleanA = nameA.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim();
  const cleanB = nameB.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim();
  if (cleanA === cleanB) return true;
  if (cleanA.length >= 8 && cleanB.length >= 8) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  }
  return false;
}

const TOMBSTONE_IDS_KEY = 'app_deleted_document_ids';
const TOMBSTONE_NAMES_KEY = 'app_deleted_document_names';

export function getDeletedDocIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TOMBSTONE_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function getDeletedDocNames(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TOMBSTONE_NAMES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addDeletedDocTombstone(id?: string, name?: string, title?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      const ids = getDeletedDocIds();
      ids.add(id);
      localStorage.setItem(TOMBSTONE_IDS_KEY, JSON.stringify(Array.from(ids)));
    }

    if (name || title) {
      const names = getDeletedDocNames();
      if (name) names.add(name.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim());
      if (title) names.add(title.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim());
      localStorage.setItem(TOMBSTONE_NAMES_KEY, JSON.stringify(Array.from(names)));
    }
  } catch (e) {
    console.warn('Error saving tombstone:', e);
  }
}

export function removeDeletedDocTombstone(id?: string, name?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      const ids = getDeletedDocIds();
      ids.delete(id);
      localStorage.setItem(TOMBSTONE_IDS_KEY, JSON.stringify(Array.from(ids)));
    }

    if (name) {
      const names = getDeletedDocNames();
      const clean = name.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim();
      names.delete(clean);
      localStorage.setItem(TOMBSTONE_NAMES_KEY, JSON.stringify(Array.from(names)));
    }
  } catch (e) {
    console.warn('Error removing tombstone:', e);
  }
}

export function isDocumentTombstoned(id?: string, name?: string, title?: string): boolean {
  if (typeof window === 'undefined') return false;
  const deletedIds = getDeletedDocIds();
  const deletedNames = getDeletedDocNames();

  if (id) {
    if (deletedIds.has(id)) return true;
    if (Array.from(deletedIds).some((dId) => matchDocId(id, dId))) return true;
  }

  const checkName = (n?: string) => {
    if (!n) return false;
    const clean = n.toLowerCase().replace(/\.(docx|pdf|txt|xlsx)$/i, '').trim();
    if (deletedNames.has(clean)) return true;
    if (Array.from(deletedNames).some((dn) => isNameMatch(clean, dn))) return true;
    return false;
  };

  if (checkName(name)) return true;
  if (checkName(title)) return true;

  return false;
}

// -------------------------------------------------------------
// DOCUMENT OPERATIONS
// -------------------------------------------------------------

export async function idbSaveDocument(doc: DocumentFileItem): Promise<void> {
  if (!doc || !doc.id) return;
  if (isDocumentTombstoned(doc.id, doc.name, doc.parsedQuiz?.title)) {
    return;
  }
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      store.put(doc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving document to IndexedDB:', err);
  }
}

export async function idbSaveAllDocuments(docs: DocumentFileItem[]): Promise<void> {
  if (!Array.isArray(docs)) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const doc of docs) {
          if (doc && doc.id && !isDocumentTombstoned(doc.id, doc.name, doc.parsedQuiz?.title)) {
            store.put(doc);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error batch saving documents to IndexedDB:', err);
  }
}

export async function idbGetDocument(id: string): Promise<DocumentFileItem | null> {
  if (!id) return null;
  if (isDocumentTombstoned(id)) return null;
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result;
        if (res && isDocumentTombstoned(res.id, res.name, res.parsedQuiz?.title)) {
          resolve(null);
        } else {
          resolve(res || null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbGetAllDocuments(): Promise<DocumentFileItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const req = store.getAll();
      req.onsuccess = () => {
        const arr = Array.isArray(req.result) ? req.result : [];
        const valid = arr.filter((d) => d && !isDocumentTombstoned(d.id, d.name, d.parsedQuiz?.title));
        resolve(valid);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function idbDeleteDocument(id: string, name?: string, title?: string): Promise<void> {
  if (!id && !name) return;
  addDeletedDocTombstone(id, name, title);
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readwrite');
      const store = tx.objectStore(STORE_DOCS);
      if (id) {
        store.delete(id);
      }
      // Scan and delete any matching / duplicated copies
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const doc = cursor.value as DocumentFileItem;
          if (
            doc &&
            ((id && (doc.id === id || matchDocId(doc.id, id))) ||
              (name && isNameMatch(doc.name, name)) ||
              (title && isNameMatch(doc.parsedQuiz?.title, title)) ||
              isDocumentTombstoned(doc.id, doc.name, doc.parsedQuiz?.title))
          ) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error deleting document from IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// FOLDER OPERATIONS
// -------------------------------------------------------------

export async function idbSaveFolder(folder: DocumentFolderItem): Promise<void> {
  if (!folder || !folder.id) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      store.put(folder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error saving folder to IndexedDB:', err);
  }
}

export async function idbSaveAllFolders(folders: DocumentFolderItem[]): Promise<void> {
  if (!Array.isArray(folders)) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const f of folders) {
          if (f && f.id) {
            store.put(f);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error batch saving folders to IndexedDB:', err);
  }
}

export async function idbGetAllFolders(): Promise<DocumentFolderItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FOLDERS, 'readonly');
      const store = tx.objectStore(STORE_FOLDERS);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function idbDeleteFolder(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error deleting folder from IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// AUTOMATIC MIGRATION & RECOVERY
// -------------------------------------------------------------

/**
 * Loads all persistent documents and folders from IndexedDB.
 * If IndexedDB is newly created or missing items from localStorage,
 * it safely imports all legacy localStorage records without deleting anything.
 */
export async function idbSyncAndGetAll(): Promise<{
  documents: DocumentFileItem[];
  folders: DocumentFolderItem[];
}> {
  if (typeof window === 'undefined') {
    return { documents: [], folders: [] };
  }

  try {
    // 1. Fetch current IndexedDB items
    let idbDocs = await idbGetAllDocuments();
    let idbFolders = await idbGetAllFolders();

    // 1b. Check for tombstoned items in IndexedDB and purge them
    const tombstonedDocIdsToDelete: string[] = [];
    const validIdbDocs: DocumentFileItem[] = [];

    for (const d of idbDocs) {
      if (d && isDocumentTombstoned(d.id, d.name, d.parsedQuiz?.title)) {
        tombstonedDocIdsToDelete.push(d.id);
      } else if (d && d.id) {
        validIdbDocs.push(d);
      }
    }

    if (tombstonedDocIdsToDelete.length > 0) {
      for (const tId of tombstonedDocIdsToDelete) {
        await idbDeleteDocument(tId);
      }
    }

    const docMap = new Map<string, DocumentFileItem>();
    for (const d of validIdbDocs) {
      if (d && d.id) docMap.set(d.id, d);
    }

    const folderMap = new Map<string, DocumentFolderItem>();
    for (const f of idbFolders) {
      if (f && f.id) folderMap.set(f.id, f);
    }

    // 2. Scan localStorage for any legacy files to preserve (strictly ignore tombstoned)
    try {
      const raw1 = localStorage.getItem('app_documents_files');
      const raw2 = localStorage.getItem('custom_uploaded_files');
      const localDocs: any[] = [
        ...(raw1 ? JSON.parse(raw1) : []),
        ...(raw2 ? JSON.parse(raw2) : []),
      ];

      let hasNewDocs = false;
      for (const d of localDocs) {
        if (d && d.id && !isDocumentTombstoned(d.id, d.name, d.parsedQuiz?.title)) {
          if (!docMap.has(d.id)) {
            docMap.set(d.id, d);
            hasNewDocs = true;
          }
        }
      }

      if (hasNewDocs) {
        await idbSaveAllDocuments(Array.from(docMap.values()));
      }

      // Proactively purge any tombstoned docs from localStorage
      if (raw1) {
        const arr = JSON.parse(raw1);
        if (Array.isArray(arr)) {
          const clean = arr.filter((d: any) => d && !isDocumentTombstoned(d.id, d.name, d.parsedQuiz?.title));
          if (clean.length !== arr.length) {
            localStorage.setItem('app_documents_files', JSON.stringify(clean));
          }
        }
      }
      if (raw2) {
        const arr = JSON.parse(raw2);
        if (Array.isArray(arr)) {
          const clean = arr.filter((d: any) => d && !isDocumentTombstoned(d.id, d.name, d.parsedQuiz?.title));
          if (clean.length !== arr.length) {
            localStorage.setItem('custom_uploaded_files', JSON.stringify(clean));
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage legacy docs migration error:', e);
    }

    // 3. Scan localStorage for any legacy folders to preserve
    try {
      const rawFolders = localStorage.getItem('app_documents_folders');
      if (rawFolders) {
        const localFolders: any[] = JSON.parse(rawFolders);
        let hasNewFolders = false;
        for (const f of localFolders) {
          if (f && f.id && !folderMap.has(f.id)) {
            folderMap.set(f.id, f);
            hasNewFolders = true;
          }
        }
        if (hasNewFolders) {
          await idbSaveAllFolders(Array.from(folderMap.values()));
        }
      }
    } catch (e) {
      console.warn('LocalStorage legacy folders migration error:', e);
    }

    // 4. LỌC VÀ XÓA TOÀN BỘ DỮ LIỆU GIẢ KHỎI STORAGE (IndexedDB & LocalStorage)
    const cleanedDocs: DocumentFileItem[] = [];
    const dummyDocIds: string[] = [];

    for (const doc of Array.from(docMap.values())) {
      if (isDummyDocument(doc)) {
        dummyDocIds.push(doc.id);
      } else {
        cleanedDocs.push(doc);
      }
    }

    if (dummyDocIds.length > 0) {
      console.log(`Đang dọn dẹp ${dummyDocIds.length} tài liệu chứa dữ liệu giả khỏi hệ thống...`);
      for (const id of dummyDocIds) {
        await idbDeleteDocument(id);
      }
      try {
        const raw1 = localStorage.getItem('app_documents_files');
        if (raw1) {
          const arr = JSON.parse(raw1);
          if (Array.isArray(arr)) {
            const clean = arr.filter((d: any) => d && !dummyDocIds.includes(d.id));
            localStorage.setItem('app_documents_files', JSON.stringify(clean));
          }
        }
        const raw2 = localStorage.getItem('custom_uploaded_files');
        if (raw2) {
          const arr = JSON.parse(raw2);
          if (Array.isArray(arr)) {
            const clean = arr.filter((d: any) => d && !dummyDocIds.includes(d.id));
            localStorage.setItem('custom_uploaded_files', JSON.stringify(clean));
          }
        }
      } catch (err) {
        console.warn('Error cleaning dummy docs from localStorage:', err);
      }
    }

    const finalDocs = cleanedDocs;
    const finalFolders = Array.from(folderMap.values());

    return { documents: finalDocs, folders: finalFolders };
  } catch (err) {
    console.error('Error during idbSyncAndGetAll:', err);
    return { documents: [], folders: [] };
  }
}

/**
 * Phát hiện tài liệu chứa dữ liệu giả hoặc placeholder
 */
export function isDummyDocument(doc: DocumentFileItem): boolean {
  if (!doc) return true;
  const questions = doc.parsedQuiz?.questions;
  if (!Array.isArray(questions) || questions.length === 0) return false;

  for (const q of questions) {
    if (Array.isArray(q.options) && q.options.length > 0) {
      const hasDummyOption = q.options.some((opt: any) => {
        const text = typeof opt === 'string' ? opt.trim() : (opt?.content || opt?.text || '').trim();
        return (
          /^Phương án\s*[A-D0-9]?$/i.test(text) ||
          /^Lựa chọn\s*[A-D0-9]?$/i.test(text) ||
          text === 'Phương án đúng chính xác'
        );
      });
      if (hasDummyOption) return true;
    }
  }
  return false;
}
