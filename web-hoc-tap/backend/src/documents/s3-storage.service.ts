import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

export interface StandardExamJson {
  id: string;
  ownerId: string;
  title: string;
  subject?: string;
  grade?: string;
  fileType: 'json';
  mimeType: 'application/json';
  version: string;
  durationMinutes: number;
  description: string;
  totalPoints?: number;
  questionsCount: number;
  questions: any[];
  parsedQuiz: {
    title: string;
    description: string;
    durationMinutes: number;
    questions: any[];
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly region: string;
  private readonly forcePathStyle: boolean;

  constructor(private configService: ConfigService) {
    this.endpoint =
      this.configService.get<string>('S3_ENDPOINT') ||
      process.env.S3_ENDPOINT ||
      undefined;
    this.region =
      this.configService.get<string>('S3_REGION') ||
      process.env.S3_REGION ||
      'us-east-1';
    this.bucket =
      this.configService.get<string>('S3_BUCKET') ||
      process.env.S3_BUCKET ||
      'appbaitap-exams';
    const forcePathStyleVal =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') ||
      process.env.S3_FORCE_PATH_STYLE;
    this.forcePathStyle =
      forcePathStyleVal === 'true' || forcePathStyleVal === '1';

    const accessKeyId =
      this.configService.get<string>('S3_ACCESS_KEY_ID') ||
      process.env.S3_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_ACCESS_KEY') ||
      process.env.S3_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: this.region,
          endpoint: this.endpoint || undefined,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: this.forcePathStyle,
        });
        this.logger.log(
          `S3 Client initialized successfully for bucket "${this.bucket}" (endpoint: ${this.endpoint || 'AWS Default'}, region: ${this.region})`,
        );
      } catch (err: any) {
        this.logger.error(`Failed to initialize S3Client: ${err.message}`, err.stack);
        this.s3Client = null;
      }
    } else {
      this.logger.warn(
        `S3 credentials (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) not provided. S3 API storage operating in local database fallback mode for bucket "${this.bucket}".`,
      );
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null;
  }

  getBucketName(): string {
    return this.bucket;
  }

  getStorageKey(ownerId: string, fileId: string): string {
    return `exams/${ownerId}/${fileId}.json`;
  }

  /**
   * Normalizes exam data into 100% standardized JSON structure
   */
  formatExamJson(ownerId: string, fileId: string, inputData: any): StandardExamJson {
    const rawParsed = inputData.parsedQuiz || {};
    const title =
      String(inputData.name || rawParsed.title || inputData.title || 'Đề thi trắc nghiệm')
        .replace(/\.[^/.]+$/, '')
        .trim();

    const questions: any[] = Array.isArray(rawParsed.questions)
      ? rawParsed.questions
      : Array.isArray(inputData.questions)
      ? inputData.questions
      : [];

    const durationMinutes =
      Number(rawParsed.durationMinutes || inputData.durationMinutes) || 45;
    const description = String(rawParsed.description || inputData.description || '').trim();

    return {
      id: fileId,
      ownerId,
      title,
      subject: inputData.subject || rawParsed.subject || undefined,
      grade: inputData.grade || rawParsed.grade || undefined,
      fileType: 'json',
      mimeType: 'application/json',
      version: '1.0',
      durationMinutes,
      description,
      questionsCount: questions.length,
      questions,
      parsedQuiz: {
        title,
        description,
        durationMinutes,
        questions,
      },
      metadata: inputData.metadata || {},
      createdAt: inputData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Uploads exam JSON payload to S3 API
   */
  async uploadExamJson(
    ownerId: string,
    fileId: string,
    inputData: any,
  ): Promise<{ storageKey: string; size: number; s3Synced: boolean; examJson: StandardExamJson }> {
    const examJson = this.formatExamJson(ownerId, fileId, inputData);
    const storageKey = this.getStorageKey(ownerId, fileId);
    const jsonBuffer = Buffer.from(JSON.stringify(examJson, null, 2), 'utf-8');
    const size = jsonBuffer.length;

    if (!this.s3Client) {
      return { storageKey, size, s3Synced: false, examJson };
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: jsonBuffer,
          ContentType: 'application/json',
          ContentLength: size,
          Metadata: {
            ownerId,
            fileId,
            title: encodeURIComponent(examJson.title),
            questionsCount: String(examJson.questionsCount),
          },
        }),
      );
      this.logger.log(`Successfully uploaded exam JSON to S3: s3://${this.bucket}/${storageKey} (${size} bytes)`);
      return { storageKey, size, s3Synced: true, examJson };
    } catch (err: any) {
      this.logger.warn(`Failed to upload to S3 key ${storageKey}: ${err.message}. Preserving DB fallback.`);
      return { storageKey, size, s3Synced: false, examJson };
    }
  }

  /**
   * Fetches exam JSON from S3 API
   */
  async getExamJson(storageKey: string): Promise<StandardExamJson | null> {
    if (!this.s3Client || !storageKey) {
      return null;
    }

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );

      if (!response.Body) {
        return null;
      }

      const bodyString = await response.Body.transformToString();
      return JSON.parse(bodyString) as StandardExamJson;
    } catch (err: any) {
      this.logger.warn(`Error reading from S3 (${storageKey}): ${err.message}`);
      return null;
    }
  }

  /**
   * Deletes exam JSON from S3 API
   */
  async deleteExamJson(storageKey: string): Promise<boolean> {
    if (!this.s3Client || !storageKey) {
      return false;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        }),
      );
      this.logger.log(`Deleted S3 object: s3://${this.bucket}/${storageKey}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Error deleting S3 object (${storageKey}): ${err.message}`);
      return false;
    }
  }
}
