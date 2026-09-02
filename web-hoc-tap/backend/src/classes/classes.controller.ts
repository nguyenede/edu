import { Controller, Post, Body, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  @Roles(Role.TEACHER)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(req.user.id, dto);
  }

  @Roles(Role.STUDENT)
  @Post('join')
  async join(@Request() req: any, @Body() dto: JoinClassDto) {
    return this.classesService.joinClass(req.user.id, dto);
  }

  @Roles(Role.STUDENT)
  @Post(':id/leave')
  async leave(@Request() req: any, @Param('id') classId: string) {
    return this.classesService.leaveClass(req.user.id, classId);
  }

  @Roles(Role.TEACHER)
  @Get('teacher')
  async getTeacherClasses(@Request() req: any) {
    return this.classesService.getTeacherClasses(req.user.id);
  }

  @Roles(Role.STUDENT)
  @Get('student')
  async getStudentClasses(@Request() req: any) {
    return this.classesService.getStudentClasses(req.user.id);
  }

  @Get(':id')
  async getClassDetail(@Request() req: any, @Param('id') classId: string) {
    return this.classesService.getClassDetail(classId, req.user.id, req.user.role);
  }

  @Roles(Role.TEACHER)
  @Get(':id/members')
  async getClassMembers(@Request() req: any, @Param('id') classId: string) {
    return this.classesService.getClassMembers(classId, req.user.id);
  }

  @Roles(Role.TEACHER)
  @Delete(':id')
  async deleteClass(@Request() req: any, @Param('id') classId: string) {
    return this.classesService.deleteClass(req.user.id, classId);
  }

  @Roles(Role.TEACHER)
  @Delete(':id/students/:studentId')
  async removeStudent(
    @Request() req: any,
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.removeStudent(req.user.id, classId, studentId);
  }
}
