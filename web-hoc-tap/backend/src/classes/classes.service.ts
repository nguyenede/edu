import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async createClass(teacherId: string, dto: CreateClassDto) {
    const code = await this.generateUniqueClassCode();
    return this.prisma.class.create({
      data: {
        name: dto.name,
        code,
        teacherId,
      },
    });
  }

  async joinClass(studentId: string, dto: JoinClassDto) {
    const clazz = await this.prisma.class.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!clazz) {
      throw new NotFoundException('Class with this code not found');
    }

    const existingMember = await this.prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId: clazz.id,
          studentId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this class');
    }

    return this.prisma.classMember.create({
      data: {
        classId: clazz.id,
        studentId,
      },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                profile: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  async leaveClass(studentId: string, classId: string) {
    const member = await this.prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    await this.prisma.classMember.delete({
      where: {
        id: member.id,
      },
    });

    return { message: 'Successfully left class' };
  }

  async removeStudent(teacherId: string, classId: string, studentId: string) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!clazz) {
      throw new NotFoundException('Class not found');
    }

    if (clazz.teacherId !== teacherId) {
      throw new ForbiddenException('Only the teacher can remove students');
    }

    const member = await this.prisma.classMember.findUnique({
      where: {
        classId_studentId: {
          classId,
          studentId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Student is not a member of this class');
    }

    await this.prisma.classMember.delete({
      where: {
        id: member.id,
      },
    });

    return { message: 'Successfully removed student from class' };
  }

  async deleteClass(teacherId: string, classId: string) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!clazz) {
      throw new NotFoundException('Class not found');
    }

    if (clazz.teacherId !== teacherId) {
      throw new ForbiddenException('Only the teacher can delete this class');
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    return { message: 'Successfully deleted class' };
  }

  async getTeacherClasses(teacherId: string) {
    return this.prisma.class.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentClasses(studentId: string) {
    return this.prisma.classMember.findMany({
      where: { studentId },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                profile: { select: { name: true } },
              },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async getClassDetail(classId: string, userId: string, role: string) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
    });

    if (!clazz) {
      throw new NotFoundException('Class not found');
    }

    // Verify ownership or membership
    if (role === 'TEACHER' && clazz.teacherId !== userId) {
      throw new ForbiddenException('Access denied to this class');
    }

    if (role === 'STUDENT') {
      const membership = await this.prisma.classMember.findUnique({
        where: {
          classId_studentId: {
            classId,
            studentId: userId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of this class');
      }
    }

    return clazz;
  }

  async getClassMembers(classId: string, teacherId: string) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!clazz) {
      throw new NotFoundException('Class not found');
    }

    if (clazz.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.classMember.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true, avatar: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  private async generateUniqueClassCode(): Promise<string> {
    const chars = '0123456789';
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.prisma.class.findUnique({
        where: { code },
      });
      if (!existing) {
        isUnique = true;
      }
    }
    return code;
  }
}
