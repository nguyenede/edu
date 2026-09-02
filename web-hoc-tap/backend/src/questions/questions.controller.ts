import { Controller, Post, Body, Get, Put, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  // Banks
  @Post('banks')
  async createBank(@Request() req: any, @Body() dto: CreateQuestionBankDto) {
    return this.questionsService.createQuestionBank(req.user.id, dto);
  }

  @Get('banks')
  async getBanks(@Request() req: any) {
    return this.questionsService.getQuestionBanks(req.user.id);
  }

  @Delete('banks/:id')
  async deleteBank(@Request() req: any, @Param('id') bankId: string) {
    return this.questionsService.deleteQuestionBank(req.user.id, bankId);
  }

  // Questions
  @Post()
  async create(@Request() req: any, @Body() dto: CreateQuestionDto) {
    return this.questionsService.createQuestion(req.user.id, dto);
  }

  @Get()
  async getQuestions(
    @Request() req: any,
    @Query('bankId') bankId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
  ) {
    return this.questionsService.getQuestions(req.user.id, {
      bankId,
      difficulty,
      type,
      search,
      tag,
    });
  }

  @Get(':id')
  async getDetail(@Request() req: any, @Param('id') questionId: string) {
    return this.questionsService.getQuestionDetail(req.user.id, questionId);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') questionId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(req.user.id, questionId, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') questionId: string) {
    return this.questionsService.deleteQuestion(req.user.id, questionId);
  }
}
