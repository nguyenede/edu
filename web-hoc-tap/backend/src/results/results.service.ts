import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  async getClassStatistics(teacherId: string, classId: string) {
    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        members: true,
        assignments: {
          include: {
            submissions: true,
          },
        },
      },
    });

    if (!clazz) {
      throw new NotFoundException('Class not found');
    }

    if (clazz.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    const totalStudents = clazz.members.length;
    const totalAssignments = clazz.assignments.length;

    let totalScore = 0;
    let gradedSubmissionsCount = 0;
    let totalSubmissionsCount = 0;

    const assignmentStats = clazz.assignments.map((assign) => {
      const submissions = assign.submissions;
      const graded = submissions.filter((s) => s.score !== null);
      const avgScore =
        graded.length > 0
          ? graded.reduce((sum, s) => sum + (s.score || 0), 0) / graded.length
          : 0;

      totalSubmissionsCount += submissions.length;
      gradedSubmissionsCount += graded.length;
      totalScore += graded.reduce((sum, s) => sum + (s.score || 0), 0);

      return {
        id: assign.id,
        title: assign.title,
        maxScore: assign.maxScore,
        submissionCount: submissions.length,
        completionRate: totalStudents > 0 ? (submissions.length / totalStudents) * 100 : 0,
        averageScore: Number(avgScore.toFixed(1)),
      };
    });

    const overallAverage =
      gradedSubmissionsCount > 0
        ? Number((totalScore / gradedSubmissionsCount).toFixed(1))
        : 0;

    const overallCompletionRate =
      totalStudents > 0 && totalAssignments > 0
        ? Number(((totalSubmissionsCount / (totalStudents * totalAssignments)) * 100).toFixed(1))
        : 0;

    return {
      classId: clazz.id,
      className: clazz.name,
      totalStudents,
      totalAssignments,
      overallAverage,
      overallCompletionRate,
      assignmentStats,
    };
  }

  async getStudentHistory(studentId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { studentId },
      include: {
        assignment: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      submissions,
      gameHistory: [],
    };
  }
}
