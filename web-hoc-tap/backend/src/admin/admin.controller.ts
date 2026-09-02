import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.adminService.getUsers(search, role);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}
