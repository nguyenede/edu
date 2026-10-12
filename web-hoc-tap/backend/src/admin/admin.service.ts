import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSystemStats() {
    const [usersCount, teachersCount, studentsCount, classesCount, questionsCount, submissionsCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'TEACHER' } }),
        this.prisma.user.count({ where: { role: 'STUDENT' } }),
        this.prisma.class.count(),
        this.prisma.question.count(),
        this.prisma.submission.count(),
      ]);

    return {
      usersCount,
      teachersCount,
      studentsCount,
      classesCount,
      questionsCount,
      submissionsCount,
    };
  }

  async getUsers(search?: string, role?: any) {
    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      include: {
        profile: true,
        _count: {
          select: {
            classes: true,
            memberships: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted successfully' };
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          select: { email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
