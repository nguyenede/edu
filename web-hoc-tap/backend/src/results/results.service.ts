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

  async getQuizStatistics(teacherId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        gameRooms: {
          include: {
            players: {
              include: {
                answers: true,
              },
            },
          },
        },
        questions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.teacherId !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    let allPlayers: any[] = [];
    quiz.gameRooms.forEach((room) => {
      allPlayers = allPlayers.concat(room.players);
    });

    const totalParticipants = allPlayers.length;
    const avgAccuracy =
      totalParticipants > 0
        ? Number(
            (
              allPlayers.reduce((sum, p) => sum + p.accuracy, 0) / totalParticipants
            ).toFixed(1),
          )
        : 0;

    const avgScore =
      totalParticipants > 0
        ? Number(
            (
              allPlayers.reduce((sum, p) => sum + p.score, 0) / totalParticipants
            ).toFixed(1),
          )
        : 0;

    return {
      quizId: quiz.id,
      title: quiz.title,
      totalRoomsHosted: quiz.gameRooms.length,
      totalParticipants,
      avgAccuracy,
      avgScore,
      questionsCount: quiz.questions.length,
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

    const gameHistory = await this.prisma.gamePlayer.findMany({
      where: { userId: studentId },
      include: {
        room: {
          include: {
            quiz: { select: { title: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 20,
    });

    return {
      submissions,
      gameHistory,
    };
  }
}
