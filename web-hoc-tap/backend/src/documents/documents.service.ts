import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private s3Storage: S3StorageService,
  ) {}

  async list(ownerId: string, folderId?: string | null) {
    const parentId = folderId || null;
    const [folders, files] = await Promise.all([
      this.prisma.documentFolder.findMany({
        where: { ownerId, parentId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentFile.findMany({
        where: { ownerId, folderId: parentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      folders: folders.map(this.serializeFolder),
      files: files.map(this.serializeFile),
    };
  }

  async listFiles(ownerId: string) {
    const files = await this.prisma.documentFile.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return files.map(this.serializeFile);
  }

  async createFolder(ownerId: string, dto: any) {
    const name = String(dto.name || '').trim();
    const parentId = dto.parentId ? String(dto.parentId) : null;
    if (!name) throw new BadRequestException('Folder name is required');
    if (parentId) await this.assertFolderOwner(ownerId, parentId);

    const folder = await this.prisma.documentFolder.create({
      data: { ownerId, name, parentId },
    });
    return this.serializeFolder(folder);
  }

  async createFile(ownerId: string, dto: any) {
    const rawName = String(dto.name || '').trim();
    const folderId = dto.parentId || dto.folderId ? String(dto.parentId || dto.folderId) : null;
    if (!rawName) throw new BadRequestException('File name is required');
    if (folderId) await this.assertFolderOwner(ownerId, folderId);

    // Chuẩn hóa 100% đề thi thành file .json
    const baseName = rawName.replace(/\.[^/.]+$/, '');
    const jsonName = `${baseName}.json`;
    const targetId = dto.id ? String(dto.id) : randomUUID();

    // Lưu vào file vật lý cục bộ hoặc S3 API
    const { storageKey, filePath, size, examJson } = await this.s3Storage.uploadExamJson(ownerId, targetId, {
      ...dto,
      name: jsonName,
    });

    // Chỉ lưu thông tin tệp & đường dẫn vào DB, KHÔNG lưu toàn bộ JSON vào DB
    const file = await this.prisma.documentFile.create({
      data: {
        id: targetId,
        ownerId,
        folderId,
        name: jsonName,
        fileType: 'json',
        mimeType: 'application/json',
        size,
        storageKey,
        parsedQuiz: undefined,
      },
    });

    return {
      ...this.serializeFile(file),
      filePath,
      parsedQuiz: examJson.parsedQuiz,
    };
  }

  async getFile(ownerId: string, id: string) {
    const file = await this.assertFileOwner(ownerId, id);
    if (file.storageKey) {
      try {
        const s3Data = await this.s3Storage.getExamJson(file.storageKey);
        if (s3Data && s3Data.parsedQuiz) {
          return {
            ...this.serializeFile(file),
            parsedQuiz: s3Data.parsedQuiz,
          };
        }
      } catch {}
    }
    return this.serializeFile(file);
  }

  async getRawFileJson(ownerId: string, id: string) {
    const file = await this.assertFileOwner(ownerId, id);
    if (file.storageKey) {
      const s3Data = await this.s3Storage.getExamJson(file.storageKey);
      if (s3Data) return s3Data;
    }
    return this.s3Storage.formatExamJson(ownerId, file.id, file);
  }

  async renameFolder(ownerId: string, id: string, name: string) {
    await this.assertFolderOwner(ownerId, id);
    const folder = await this.prisma.documentFolder.update({
      where: { id },
      data: { name: name.trim() },
    });
    return this.serializeFolder(folder);
  }

  async renameFile(ownerId: string, id: string, name: string) {
    const file = await this.assertFileOwner(ownerId, id);
    const cleanBase = name.trim().replace(/\.[^/.]+$/, '');
    const newName = `${cleanBase}.json`;
    const updated = await this.prisma.documentFile.update({
      where: { id },
      data: { name: newName },
    });
    if (updated.storageKey) {
      await this.s3Storage.uploadExamJson(ownerId, id, {
        ...updated,
        name: newName,
      });
    }
    return this.serializeFile(updated);
  }

  async moveFile(ownerId: string, id: string, folderId?: string | null) {
    await this.assertFileOwner(ownerId, id);
    const targetFolderId = folderId || null;
    if (targetFolderId) await this.assertFolderOwner(ownerId, targetFolderId);
    const file = await this.prisma.documentFile.update({
      where: { id },
      data: { folderId: targetFolderId },
    });
    return this.serializeFile(file);
  }

  async moveFolder(ownerId: string, id: string, parentId?: string | null) {
    await this.assertFolderOwner(ownerId, id);
    const targetParentId = parentId || null;
    if (targetParentId === id) throw new BadRequestException('Cannot move folder into itself');
    if (targetParentId) await this.assertFolderOwner(ownerId, targetParentId);
    const folder = await this.prisma.documentFolder.update({
      where: { id },
      data: { parentId: targetParentId },
    });
    return this.serializeFolder(folder);
  }

  async deleteFolder(ownerId: string, id: string) {
    const folder = await this.prisma.documentFolder.findUnique({ where: { id } });
    if (!folder) return { success: true };
    if (folder.ownerId !== ownerId) throw new ForbiddenException('Access denied');
    await this.prisma.documentFolder.delete({ where: { id } });
    return { success: true };
  }

  async deleteFile(ownerId: string, id: string) {
    const file = await this.prisma.documentFile.findUnique({ where: { id } });
    if (!file) return { success: true };
    if (file.ownerId !== ownerId) throw new ForbiddenException('Access denied');

    if (file.storageKey) {
      await this.s3Storage.deleteExamJson(file.storageKey);
    }

    // Safe unlink assignments before deletion
    await this.prisma.assignment.updateMany({
      where: { documentFileId: id },
      data: { documentFileId: null },
    });

    await this.prisma.documentFile.delete({ where: { id } });
    return { success: true };
  }

  async clearAll(ownerId: string) {
    await this.prisma.documentFile.deleteMany({ where: { ownerId } });
    await this.prisma.documentFolder.deleteMany({ where: { ownerId } });
    return { success: true };
  }

  private async assertFolderOwner(ownerId: string, id: string) {
    const folder = await this.prisma.documentFolder.findUnique({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenException('Access denied');
    return folder;
  }

  private async assertFileOwner(ownerId: string, id: string) {
    const file = await this.prisma.documentFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    if (file.ownerId !== ownerId) throw new ForbiddenException('Access denied');
    return file;
  }

  private serializeFolder(folder: any) {
    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private serializeFile(file: any) {
    return {
      id: file.id,
      name: file.name,
      parentId: file.folderId,
      fileType: file.fileType,
      mimeType: file.mimeType,
      size: file.size,
      storageKey: file.storageKey,
      parsedQuiz: file.parsedQuiz,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
