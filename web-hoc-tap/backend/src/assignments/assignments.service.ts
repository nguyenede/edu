import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(teacherId: string, dto: CreateAssignmentDto) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!clazz || clazz.teacherId !== teacherId) {
      throw new ForbiddenException('Invalid class selection or access denied');
    }

    if (dto.quizId) {
      const quiz = await this.prisma.quiz.findUnique({ where: { id: dto.quizId } });
      if (!quiz || quiz.teacherId !== teacherId) {
        throw new ForbiddenException('Invalid quiz selection or access denied');
      }
    }

    if (dto.documentFileId) {
      const documentFile = await this.prisma.documentFile.findUnique({
        where: { id: dto.documentFileId },
      });
      if (!documentFile || documentFile.ownerId !== teacherId) {
        throw new ForbiddenException('Invalid document selection or access denied');
      }
    }

    return this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description || null,
        classId: dto.classId,
        quizId: dto.quizId || null,
        documentFileId: dto.documentFileId || null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        maxScore: dto.maxScore ?? 10.0,
        teacherId,
      },
    });
  }

  async getTeacherAssignments(teacherId: string) {
    return this.prisma.assignment.findMany({
      where: { teacherId },
      include: {
        class: { select: { name: true } },
        quiz: { select: { id: true, title: true } },
        documentFile: { select: { id: true, name: true, fileType: true, parsedQuiz: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClassAssignments(userId: string, classId: string, role: string) {
    if (role === 'STUDENT') {
      const isMember = await this.prisma.classMember.findFirst({
        where: { classId, studentId: userId },
      });
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.prisma.assignment.findMany({
      where: { classId },
      include: {
        quiz: { select: { title: true } },
        documentFile: { select: { id: true, name: true, fileType: true, parsedQuiz: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssignmentDetail(assignmentId: string, userId: string, role: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        class: true,
        quiz: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        documentFile: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (role === 'TEACHER' && assignment.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (role === 'STUDENT') {
      const isMember = await this.prisma.classMember.findFirst({
        where: { classId: assignment.classId, studentId: userId },
      });
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }

      // Hide isCorrect from students if deadline not passed or not allowed
      if (assignment.quiz) {
        assignment.quiz.questions = assignment.quiz.questions.map((qq) => {
          qq.question.options = qq.question.options.map((opt) => ({
            ...opt,
            isCorrect: assignment.quiz?.showAnswers ? opt.isCorrect : false,
          }));
          return qq;
        });
      }

      if (assignment.documentFile?.parsedQuiz) {
        assignment.documentFile.parsedQuiz = this.sanitizeParsedQuizForStudent(
          assignment.documentFile.parsedQuiz,
        );
      }
    }

    return assignment;
  }

  async submitAssignment(studentId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                question: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        documentFile: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check membership
    const membership = await this.prisma.classMember.findFirst({
      where: { classId: assignment.classId, studentId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not enrolled in this class');
    }

    // Check deadline
    if (assignment.deadline && new Date() > assignment.deadline) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // Check previous submissions
    const existingSubmission = await this.prisma.submission.findFirst({
      where: { assignmentId, studentId },
    });

    if (existingSubmission) {
      throw new ConflictException('You have already submitted this assignment');
    }

    // Process autograding if a quiz is attached
    let autoScore = 0;
    let totalPoints = 0;
    const mappedAnswers = [];

    if (assignment.quiz) {
      const quizQuestions = assignment.quiz.questions;
      for (const ans of dto.answers) {
        const qq = quizQuestions.find((q) => q.questionId === ans.questionId);
        if (!qq) continue;

        const originalQuestion = qq.question;
        totalPoints += originalQuestion.points;

        let isCorrect = false;

        if (
          originalQuestion.type === 'MULTIPLE_CHOICE' ||
          originalQuestion.type === 'TRUE_FALSE'
        ) {
          // Check matching option
          const correctOption = originalQuestion.options.find((opt) => opt.isCorrect);
          if (correctOption && correctOption.id === ans.answerContent) {
            isCorrect = true;
          }
        } else if (originalQuestion.type === 'SHORT_ANSWER' || originalQuestion.type === 'FILL_IN_THE_BLANK') {
          // String match
          const correctOptions = originalQuestion.options.filter((opt) => opt.isCorrect);
          isCorrect = correctOptions.some(
            (opt) => opt.content.trim().toLowerCase() === ans.answerContent.trim().toLowerCase(),
          );
        }

        const scoreGained = isCorrect ? originalQuestion.points : 0;
        if (isCorrect) {
          autoScore += scoreGained;
        }

        mappedAnswers.push({
          questionId: ans.questionId,
          answerContent: ans.answerContent,
          isCorrect,
          scoreGained,
        });
      }
    } else if (assignment.documentFile?.parsedQuiz) {
      const parsedQuiz = assignment.documentFile.parsedQuiz as any;
      const docQuestions = Array.isArray(parsedQuiz?.questions) ? parsedQuiz.questions : [];
      for (const ans of dto.answers) {
        const questionIndex = docQuestions.findIndex((q: any, idx: number) => {
          const id = q?.id || `q_${idx + 1}`;
          return id === ans.questionId;
        });
        if (questionIndex === -1) continue;

        const question = docQuestions[questionIndex];
        const options = Array.isArray(question.options) ? question.options : [];
        const points = Number(question.points) || 1;
        totalPoints += points;

        const selectedIndex = Number(ans.answerContent);
        const selectedOption = Number.isInteger(selectedIndex) ? options[selectedIndex] : null;
        const isCorrect = selectedOption
          ? Boolean(selectedOption.isCorrect)
          : options.some(
              (opt: any) =>
                Boolean(opt?.isCorrect) &&
                String(opt?.content || '').trim().toLowerCase() ===
                  ans.answerContent.trim().toLowerCase(),
            );

        const scoreGained = isCorrect ? points : 0;
        if (isCorrect) {
          autoScore += scoreGained;
        }

        mappedAnswers.push({
          questionId: ans.questionId,
          answerContent: ans.answerContent,
          isCorrect,
          scoreGained,
        });
      }
    } else {
      // General task: no autograding, wait for teacher
      dto.answers.forEach((ans) => {
        mappedAnswers.push({
          questionId: ans.questionId,
          answerContent: ans.answerContent,
          isCorrect: null,
          scoreGained: null,
        });
      });
    }

    // Normalize score to scale of maxScore
    let finalScore: number | null = null;
    if ((assignment.quiz || assignment.documentFile?.parsedQuiz) && totalPoints > 0) {
      finalScore = (autoScore / totalPoints) * assignment.maxScore;
    }

    return this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        score: finalScore,
        status: assignment.quiz || assignment.documentFile?.parsedQuiz ? 'GRADED' : 'SUBMITTED',
        answers: {
          create: mappedAnswers,
        },
      },
      include: {
        answers: true,
      },
    });
  }

  async getSubmissions(teacherId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        answers: true,
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getStudentSubmission(studentId: string, assignmentId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { assignmentId, studentId },
      include: {
        answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found for this student');
    }

    return submission;
  }

  async gradeSubmission(teacherId: string, submissionId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.assignment.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied to grade this submission');
    }

    if (dto.score > submission.assignment.maxScore) {
      throw new BadRequestException(`Score cannot exceed maximum score of ${submission.assignment.maxScore}`);
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback || null,
        status: 'GRADED',
      },
    });
  }

  private sanitizeParsedQuizForStudent(parsedQuiz: any) {
    if (!parsedQuiz || typeof parsedQuiz !== 'object') return parsedQuiz;
    return {
      ...parsedQuiz,
      questions: Array.isArray(parsedQuiz.questions)
        ? parsedQuiz.questions.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options)
              ? q.options.map((opt: any) => ({
                  ...opt,
                  isCorrect: false,
                }))
              : [],
          }))
        : [],
    };
  }
}
