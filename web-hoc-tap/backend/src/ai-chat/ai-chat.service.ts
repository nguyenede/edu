import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiChatService {
  constructor(private prisma: PrismaService) {}

  async listSessions(userId: string) {
    return this.prisma.aiChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
  }

  async getSession(userId: string, id: string) {
    const session = await this.prisma.aiChatSession.findFirst({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  async upsertSession(userId: string, dto: any) {
    const id = String(dto.id || '');
    const title = String(dto.title || 'Đoạn chat mới').slice(0, 120);
    const messages = Array.isArray(dto.messages) ? dto.messages : [];

    if (!id) {
      throw new NotFoundException('Chat session id is required');
    }

    return this.prisma.aiChatSession.upsert({
      where: { id },
      create: {
        id,
        userId,
        title,
        messages,
      },
      update: {
        title,
        messages,
      },
    });
  }

  async deleteSession(userId: string, id: string) {
    await this.getSession(userId, id);
    await this.prisma.aiChatSession.delete({
      where: { id },
    });
    return { success: true };
  }
}
