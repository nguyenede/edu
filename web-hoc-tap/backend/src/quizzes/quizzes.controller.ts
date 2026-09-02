import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Roles(Role.TEACHER)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateQuizDto) {
    return this.quizzesService.createQuiz(req.user.id, dto);
  }

  @Roles(Role.TEACHER)
  @Get('teacher')
  async getTeacherQuizzes(@Request() req: any) {
    return this.quizzesService.getTeacherQuizzes(req.user.id);
  }

  @Get('class/:classId')
  async getClassQuizzes(
    @Request() req: any,
    @Param('classId') classId: string,
  ) {
    return this.quizzesService.getClassQuizzes(req.user.id, classId, req.user.role);
  }

  @Get(':id')
  async getDetail(@Request() req: any, @Param('id') quizId: string) {
    return this.quizzesService.getQuizDetail(quizId, req.user.id, req.user.role);
  }

  @Roles(Role.TEACHER)
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') quizId: string) {
    return this.quizzesService.deleteQuiz(req.user.id, quizId);
  }
}
