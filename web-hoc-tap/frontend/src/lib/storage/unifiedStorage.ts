import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

function resolveDefaultStorageDir(): string {
  if (process.env.STORAGE_DIR) {
    return path.resolve(process.env.STORAGE_DIR);
  }
  const cwd = process.cwd();
  if (path.basename(cwd) === 'frontend' || path.basename(cwd) === 'backend') {
    return path.resolve(cwd, '..', 'storage');
  }
  if (fsSync.existsSync(path.join(cwd, 'web-hoc-tap'))) {
    return path.resolve(cwd, 'web-hoc-tap', 'storage');
  }
  return path.resolve(cwd, 'storage');
}

// Storage Root Directory on Disk (outside src to prevent Next.js hot-reload triggers)
export const STORAGE_DIR = resolveDefaultStorageDir();

export interface StorageResult {
  storageKey: string;
  filePath: string;
  size: number;
  storageType: 'local' | 's3';
  url: string;
}

export class UnifiedStorageService {
  private s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly region: string;
  private readonly forcePathStyle: boolean;
  private isInitialized = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'appbaitap-exams';
    this.endpoint = process.env.S3_ENDPOINT || undefined;
    this.region = process.env.S3_REGION || 'us-east-1';
    this.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

    this.initS3();
    this.ensureLocalDirs();
  }

  private initS3() {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: this.region,
          endpoint: this.endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: this.forcePathStyle,
        });
        console.log(`[UnifiedStorage] S3 Provider online: bucket="${this.bucket}", region="${this.region}"`);
      } catch (err: any) {
        console.warn(`[UnifiedStorage] S3 initialization failed, falling back to local:`, err.message);
        this.s3Client = null;
      }
    } else {
      this.s3Client = null;
    }
    this.isInitialized = true;
  }

  private ensureLocalDirs() {
    try {
      const dirs = [
        STORAGE_DIR,
        path.join(STORAGE_DIR, 'exams'),
        path.join(STORAGE_DIR, 'images'),
        path.join(STORAGE_DIR, 'documents'),
        path.join(STORAGE_DIR, 'db'),
      ];
      for (const d of dirs) {
        if (!fsSync.existsSync(d)) {
          fsSync.mkdirSync(d, { recursive: true });
        }
      }
    } catch (err) {
      console.warn('[UnifiedStorage] Error ensuring local directories:', err);
    }
  }

  public isS3Active(): boolean {
    return this.s3Client !== null;
  }

  public getStorageType(): 'local' | 's3' {
    return this.isS3Active() ? 's3' : 'local';
  }

  /**
   * Save a file (JSON exam, image, document, etc.)
   * @param storageKey Relative key e.g. "exams/file_123.json" or "images/avatar_1.png"
   * @param content Buffer or String
   * @param contentType MIME type e.g. "application/json", "image/png"
   */
  async saveFile(
    storageKey: string,
    content: Buffer | string,
    contentType: string = 'application/json'
  ): Promise<StorageResult> {
    const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
    const size = buffer.length;

    // 1. If S3 credentials are provided, upload directly to S3
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: cleanKey,
            Body: buffer,
            ContentType: contentType,
          })
        );

        const url = this.endpoint
          ? `${this.endpoint.replace(/\/+$/, '')}/${this.bucket}/${cleanKey}`
          : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${cleanKey}`;

        return {
          storageKey: cleanKey,
          filePath: `s3://${this.bucket}/${cleanKey}`,
          size,
          storageType: 's3',
          url,
        };
      } catch (err: any) {
        console.error(`[UnifiedStorage] S3 PutObject error for key ${cleanKey}:`, err);
        // Fall back to local storage if S3 fails
      }
    }

    // 2. Local File System Mode: Save into physical local directory
    const fullLocalPath = path.join(STORAGE_DIR, cleanKey);
    const parentDir = path.dirname(fullLocalPath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(fullLocalPath, buffer);

    const relativeLocalPath = path.relative(process.cwd(), fullLocalPath).replace(/\\/g, '/');
    const url = `/api/storage/${cleanKey}`;

    return {
      storageKey: cleanKey,
      filePath: relativeLocalPath,
      size,
      storageType: 'local',
      url,
    };
  }

  /**
   * Read raw Buffer of a file
   */
  async getFile(storageKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');

    // 1. Try S3 if active
    if (this.s3Client) {
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: cleanKey,
          })
        );
        if (response.Body) {
          const streamToBuffer = async (stream: any): Promise<Buffer> => {
            const chunks: any[] = [];
            for await (const chunk of stream) chunks.push(chunk);
            return Buffer.concat(chunks);
          };
          const buffer = await streamToBuffer(response.Body);
          return {
            buffer,
            contentType: response.ContentType || 'application/octet-stream',
          };
        }
      } catch (err: any) {
        if (err.name !== 'NoSuchKey') {
          console.warn(`[UnifiedStorage] S3 GetObject error for key ${cleanKey}:`, err.message);
        }
      }
    }

    // 2. Try Local File System
    const fullLocalPath = path.join(STORAGE_DIR, cleanKey);
    try {
      if (fsSync.existsSync(fullLocalPath)) {
        const buffer = await fs.readFile(fullLocalPath);
        let contentType = 'application/octet-stream';
        if (cleanKey.endsWith('.json')) contentType = 'application/json';
        else if (cleanKey.endsWith('.png')) contentType = 'image/png';
        else if (cleanKey.endsWith('.jpg') || cleanKey.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (cleanKey.endsWith('.webp')) contentType = 'image/webp';
        else if (cleanKey.endsWith('.pdf')) contentType = 'application/pdf';

        return { buffer, contentType };
      }
    } catch (err: any) {
      console.warn(`[UnifiedStorage] Local readFile error for key ${cleanKey}:`, err.message);
    }

    return null;
  }

  /**
   * Read text/JSON content of a file
   */
  async getFileString(storageKey: string): Promise<string | null> {
    const file = await this.getFile(storageKey);
    if (!file) return null;
    return file.buffer.toString('utf-8');
  }

  /**
   * Delete a file from disk or S3
   */
  async deleteFile(storageKey: string): Promise<boolean> {
    const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    let deleted = false;

    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: cleanKey,
          })
        );
        deleted = true;
      } catch (err: any) {
        console.warn(`[UnifiedStorage] S3 DeleteObject error:`, err.message);
      }
    }

    const fullLocalPath = path.join(STORAGE_DIR, cleanKey);
    try {
      if (fsSync.existsSync(fullLocalPath)) {
        await fs.unlink(fullLocalPath);
        deleted = true;
      }
    } catch {}

    return deleted;
  }

  /**
   * Check if a file exists
   */
  async hasFile(storageKey: string): Promise<boolean> {
    const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');

    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: this.bucket,
            Key: cleanKey,
          })
        );
        return true;
      } catch {}
    }

    const fullLocalPath = path.join(STORAGE_DIR, cleanKey);
    return fsSync.existsSync(fullLocalPath);
  }
}

// Global Singleton Instance
export const unifiedStorage = new UnifiedStorageService();
