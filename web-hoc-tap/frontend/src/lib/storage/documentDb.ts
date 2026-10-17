import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { STORAGE_DIR, unifiedStorage } from './unifiedStorage';

export interface DocumentFolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFileRecord {
  id: string;
  name: string;              // e.g. "Đề thi Toán 12.json"
  parentId: string | null;    // Folder ID
  fileType: string;          // "json", "pdf", "docx", etc.
  mimeType: string;          // "application/json"
  size: number;              // File size in bytes
  storageKey: string;        // e.g. "exams/file_123.json"
  filePath: string;          // Physical path or S3 URI
  storageType: 'local' | 's3';
  createdAt: string;
  updatedAt: string;
  // NOTE: Absolutely NO parsedQuiz or raw question JSON is stored in this database record!
}

interface MetadataDatabaseSchema {
  version: number;
  folders: DocumentFolderRecord[];
  files: DocumentFileRecord[];
  updatedAt: string;
}

const DB_FILE_PATH = path.join(STORAGE_DIR, 'db', 'documents_metadata.json');

class DocumentMetadataDatabase {
  private cache: MetadataDatabaseSchema | null = null;
  private isLoaded = false;
  private writeLock: Promise<void> = Promise.resolve();

  private async loadDb(): Promise<MetadataDatabaseSchema> {
    if (this.cache && this.isLoaded) return this.cache;

    try {
      if (fsSync.existsSync(DB_FILE_PATH)) {
        const raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
        this.cache = JSON.parse(raw);
        this.isLoaded = true;
        return this.cache!;
      }
    } catch (err) {
      console.warn('[DocumentDB] Could not read metadata DB file, initializing empty:', err);
    }

    this.cache = {
      version: 1,
      folders: [],
      files: [],
      updatedAt: new Date().toISOString(),
    };
    this.isLoaded = true;
    await this.persist();
    return this.cache;
  }

  private async persist(): Promise<void> {
    if (!this.cache) return;
    this.cache.updatedAt = new Date().toISOString();

    const currentLock = this.writeLock;
    this.writeLock = (async () => {
      await currentLock;
      try {
        const dir = path.dirname(DB_FILE_PATH);
        if (!fsSync.existsSync(dir)) {
          await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(DB_FILE_PATH, JSON.stringify(this.cache, null, 2), 'utf-8');
      } catch (err) {
        console.error('[DocumentDB] Error writing metadata DB to disk:', err);
      }
    })();
    await this.writeLock;
  }

  // ---------------- FOLDERS ----------------

  async listFolders(parentId?: string | null): Promise<DocumentFolderRecord[]> {
    const db = await this.loadDb();
    if (parentId !== undefined) {
      return db.folders.filter((f) => f.parentId === (parentId || null));
    }
    return db.folders;
  }

  async getFolder(id: string): Promise<DocumentFolderRecord | null> {
    const db = await this.loadDb();
    return db.folders.find((f) => f.id === id) || null;
  }

  async saveFolder(folder: { id?: string; name: string; parentId?: string | null }): Promise<DocumentFolderRecord> {
    const db = await this.loadDb();
    const existingIdx = folder.id ? db.folders.findIndex((f) => f.id === folder.id) : -1;
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      const updated: DocumentFolderRecord = {
        ...db.folders[existingIdx],
        name: folder.name.trim(),
        parentId: folder.parentId !== undefined ? (folder.parentId || null) : db.folders[existingIdx].parentId,
        updatedAt: now,
      };
      db.folders[existingIdx] = updated;
      await this.persist();
      return updated;
    } else {
      const created: DocumentFolderRecord = {
        id: folder.id || `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: folder.name.trim(),
        parentId: folder.parentId || null,
        createdAt: now,
        updatedAt: now,
      };
      db.folders.unshift(created);
      await this.persist();
      return created;
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = await this.loadDb();
    const initialLen = db.folders.length;
    db.folders = db.folders.filter((f) => f.id !== id);
    if (db.folders.length !== initialLen) {
      await this.persist();
      return true;
    }
    return false;
  }

  // ---------------- FILES ----------------

  async listFiles(parentId?: string | null): Promise<DocumentFileRecord[]> {
    const db = await this.loadDb();
    if (parentId !== undefined) {
      return db.files.filter((f) => f.parentId === (parentId || null));
    }
    return db.files;
  }

  async getFileRecord(id: string): Promise<DocumentFileRecord | null> {
    const db = await this.loadDb();
    return db.files.find((f) => f.id === id) || null;
  }

  /**
   * Save file record in DB (metadata + storage path only, NO JSON)
   */
  async saveFileRecord(record: {
    id: string;
    name: string;
    parentId?: string | null;
    fileType?: string;
    mimeType?: string;
    size: number;
    storageKey: string;
    filePath: string;
    storageType: 'local' | 's3';
    createdAt?: string;
  }): Promise<DocumentFileRecord> {
    const db = await this.loadDb();
    const existingIdx = db.files.findIndex((f) => f.id === record.id);
    const now = new Date().toISOString();

    const fileRecord: DocumentFileRecord = {
      id: record.id,
      name: record.name,
      parentId: record.parentId || null,
      fileType: record.fileType || 'json',
      mimeType: record.mimeType || 'application/json',
      size: record.size,
      storageKey: record.storageKey,
      filePath: record.filePath,
      storageType: record.storageType,
      createdAt: record.createdAt || (existingIdx >= 0 ? db.files[existingIdx].createdAt : now),
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      db.files[existingIdx] = fileRecord;
    } else {
      db.files.unshift(fileRecord);
    }

    await this.persist();
    return fileRecord;
  }

  async renameFileRecord(id: string, newName: string): Promise<DocumentFileRecord | null> {
    const db = await this.loadDb();
    const target = db.files.find((f) => f.id === id);
    if (!target) return null;

    target.name = newName.trim();
    target.updatedAt = new Date().toISOString();
    await this.persist();
    return target;
  }

  async deleteFileRecord(id: string): Promise<boolean> {
    const db = await this.loadDb();
    const target = db.files.find((f) => f.id === id);
    if (!target) return false;

    // Delete physical file or S3 object
    await unifiedStorage.deleteFile(target.storageKey);

    db.files = db.files.filter((f) => f.id !== id);
    await this.persist();
    return true;
  }
}

export const documentDb = new DocumentMetadataDatabase();
