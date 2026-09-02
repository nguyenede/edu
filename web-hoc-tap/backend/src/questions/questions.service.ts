import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  // Question Banks
  async createQuestionBank(teacherId: string, dto: CreateQuestionBankDto) {
    return this.prisma.questionBank.create({
      data: {
        name: dto.name,
        description: dto.description,
        teacherId,
      },
    });
  }

  async getQuestionBanks(teacherId: string) {
    return this.prisma.questionBank.findMany({
      where: { teacherId },
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteQuestionBank(teacherId: string, bankId: string) {
    const bank = await this.prisma.questionBank.findUnique({
      where: { id: bankId },
    });

    if (!bank) {
      throw new NotFoundException('Question bank not found');
    }

    if (bank.teacherId !== teacherId) {
      throw new ForbiddenException('Only the owner can delete this bank');
    }

    await this.prisma.questionBank.delete({
      where: { id: bankId },
    });

    return { message: 'Successfully deleted question bank' };
  }

  // Questions
  async createQuestion(teacherId: string, dto: CreateQuestionDto) {
    if (dto.questionBankId) {
      const bank = await this.prisma.questionBank.findUnique({
        where: { id: dto.questionBankId },
      });
      if (!bank || bank.teacherId !== teacherId) {
        throw new ForbiddenException('Invalid question bank selected');
      }
    }

    return this.prisma.question.create({
      data: {
        questionBankId: dto.questionBankId || null,
        content: dto.content,
        type: dto.type,
        difficulty: dto.difficulty,
        tags: dto.tags || [],
        points: dto.points ?? 1.0,
        explanation: dto.explanation || null,
        timeLimit: dto.timeLimit ?? 30,
        imageUrl: dto.imageUrl || null,
        options: {
          create: dto.options.map((opt) => ({
            content: opt.content,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex ?? null,
            matchKey: opt.matchKey ?? null,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  async getQuestions(
    teacherId: string,
    filters: {
      bankId?: string;
      difficulty?: string;
      type?: string;
      search?: string;
      tag?: string;
    },
  ) {
    const whereClause: any = {};

    // Filter by banks owned by teacher
    if (filters.bankId) {
      const bank = await this.prisma.questionBank.findUnique({
        where: { id: filters.bankId },
      });
      if (!bank || bank.teacherId !== teacherId) {
        throw new ForbiddenException('Access denied to this question bank');
      }
      whereClause.questionBankId = filters.bankId;
    } else {
      // General filter: questions in banks owned by teacher, OR free questions created by teacher
      whereClause.OR = [
        {
          questionBank: {
            teacherId: teacherId,
          },
        },
      ];
    }

    if (filters.difficulty) {
      whereClause.difficulty = filters.difficulty;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.tag) {
      whereClause.tags = {
        has: filters.tag,
      };
    }

    if (filters.search) {
      whereClause.content = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    return this.prisma.question.findMany({
      where: whereClause,
      include: {
        options: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuestionDetail(teacherId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        questionBank: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.questionBank && question.questionBank.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return question;
  }

  async updateQuestion(teacherId: string, questionId: string, dto: CreateQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { questionBank: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.questionBank && question.questionBank.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete old options
    await this.prisma.questionOption.deleteMany({
      where: { questionId },
    });

    // Update question details and create new options
    return this.prisma.question.update({
      where: { id: questionId },
      data: {
        questionBankId: dto.questionBankId || null,
        content: dto.content,
        type: dto.type,
        difficulty: dto.difficulty,
        tags: dto.tags || [],
        points: dto.points ?? 1.0,
        explanation: dto.explanation || null,
        timeLimit: dto.timeLimit ?? 30,
        imageUrl: dto.imageUrl || null,
        options: {
          create: dto.options.map((opt) => ({
            content: opt.content,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex ?? null,
            matchKey: opt.matchKey ?? null,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  async deleteQuestion(teacherId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { questionBank: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.questionBank && question.questionBank.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.question.delete({
      where: { id: questionId },
    });

    return { message: 'Successfully deleted question' };
  }
}
