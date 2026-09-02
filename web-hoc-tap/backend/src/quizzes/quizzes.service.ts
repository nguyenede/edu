import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(teacherId: string, dto: CreateQuizDto) {
    // If classId is specified, check if teacher owns it
    if (dto.classId) {
      const clazz = await this.prisma.class.findUnique({
        where: { id: dto.classId },
      });
      if (!clazz || clazz.teacherId !== teacherId) {
        throw new ForbiddenException('Invalid class selection');
      }
    }

    const { questionIds, ...quizData } = dto;

    const quiz = await this.prisma.quiz.create({
      data: {
        ...quizData,
        teacherId,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });

    // Link questions
    if (questionIds && questionIds.length > 0) {
      await this.prisma.quizQuestion.createMany({
        data: questionIds.map((qId, index) => ({
          quizId: quiz.id,
          questionId: qId,
          orderIndex: index,
        })),
      });
    }

    return this.getQuizDetail(quiz.id, teacherId, 'TEACHER');
  }

  async getTeacherQuizzes(teacherId: string) {
    return this.prisma.quiz.findMany({
      where: { teacherId },
      include: {
        class: { select: { name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClassQuizzes(userId: string, classId: string, role: string) {
    // If student, check class membership
    if (role === 'STUDENT') {
      const isMember = await this.prisma.classMember.findFirst({
        where: { classId, studentId: userId },
      });
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }
    }

    const quizzes = await this.prisma.quiz.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes;
  }

  async getQuizDetail(quizId: string, userId: string, role: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
        class: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (role === 'TEACHER' && quiz.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (role === 'STUDENT') {
      // Check membership
      if (quiz.classId) {
        const isMember = await this.prisma.classMember.findFirst({
          where: { classId: quiz.classId, studentId: userId },
        });
        if (!isMember) {
          throw new ForbiddenException('You are not enrolled in this class');
        }
      }

      // Security Check: Hide correct answer status from students!
      quiz.questions = quiz.questions.map((qq) => {
        const q = qq.question;
        q.options = q.options.map((opt) => ({
          ...opt,
          isCorrect: quiz.showAnswers ? opt.isCorrect : false, // Mask if disallowed
        }));
        return qq;
      });
    }

    return quiz;
  }

  async deleteQuiz(teacherId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });

    return { message: 'Successfully deleted quiz' };
  }
}
