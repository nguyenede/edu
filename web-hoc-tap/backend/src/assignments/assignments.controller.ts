import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Roles(Role.TEACHER)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.createAssignment(req.user.id, dto);
  }

  @Roles(Role.TEACHER)
  @Get('teacher')
  async getTeacherAssignments(@Request() req: any) {
    return this.assignmentsService.getTeacherAssignments(req.user.id);
  }

  @Get('class/:classId')
  async getClassAssignments(
    @Request() req: any,
    @Param('classId') classId: string,
  ) {
    return this.assignmentsService.getClassAssignments(req.user.id, classId, req.user.role);
  }

  @Get(':id')
  async getDetail(@Request() req: any, @Param('id') assignmentId: string) {
    return this.assignmentsService.getAssignmentDetail(assignmentId, req.user.id, req.user.role);
  }

  @Roles(Role.STUDENT)
  @Post(':id/submit')
  async submit(
    @Request() req: any,
    @Param('id') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submitAssignment(req.user.id, assignmentId, dto);
  }

  @Roles(Role.TEACHER)
  @Get(':id/submissions')
  async getSubmissions(@Request() req: any, @Param('id') assignmentId: string) {
    return this.assignmentsService.getSubmissions(req.user.id, assignmentId);
  }

  @Roles(Role.STUDENT)
  @Get(':id/submission/me')
  async getMySubmission(@Request() req: any, @Param('id') assignmentId: string) {
    return this.assignmentsService.getStudentSubmission(req.user.id, assignmentId);
  }

  @Roles(Role.TEACHER)
  @Post('submissions/:submissionId/grade')
  async grade(
    @Request() req: any,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.gradeSubmission(req.user.id, submissionId, dto);
  }
}
