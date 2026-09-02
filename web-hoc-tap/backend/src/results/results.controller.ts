import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Roles(Role.TEACHER)
  @Get('class/:classId')
  async getClassStats(@Request() req: any, @Param('classId') classId: string) {
    return this.resultsService.getClassStatistics(req.user.id, classId);
  }

  @Roles(Role.TEACHER)
  @Get('quiz/:quizId')
  async getQuizStats(@Request() req: any, @Param('quizId') quizId: string) {
    return this.resultsService.getQuizStatistics(req.user.id, quizId);
  }

  @Roles(Role.STUDENT)
  @Get('history')
  async getStudentHistory(@Request() req: any) {
    return this.resultsService.getStudentHistory(req.user.id);
  }
}
