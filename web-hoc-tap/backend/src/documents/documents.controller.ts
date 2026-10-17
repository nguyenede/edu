import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  async list(@Request() req: any, @Query('folderId') folderId?: string) {
    return this.documentsService.list(req.user.id, folderId || null);
  }

  @Post('folders')
  async createFolder(@Request() req: any, @Body() dto: any) {
    return this.documentsService.createFolder(req.user.id, dto);
  }

  @Patch('folders/:id')
  async renameFolder(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.documentsService.renameFolder(req.user.id, id, String(dto.name || ''));
  }

  @Patch('folders/:id/move')
  @Post('folders/:id/move')
  async moveFolder(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.documentsService.moveFolder(req.user.id, id, dto.parentId || dto.folderId || null);
  }

  @Delete('folders/:id')
  async deleteFolder(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.deleteFolder(req.user.id, id);
  }

  @Post('files')
  async createFile(@Request() req: any, @Body() dto: any) {
    return this.documentsService.createFile(req.user.id, dto);
  }

  @Get('files')
  async listFiles(@Request() req: any) {
    return this.documentsService.listFiles(req.user.id);
  }

  @Get('files/:id')
  async getFile(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.getFile(req.user.id, id);
  }

  @Get('files/:id/json')
  @Get('files/:id/raw')
  async getRawJson(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.getRawFileJson(req.user.id, id);
  }

  @Patch('files/:id')
  async renameFile(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.documentsService.renameFile(req.user.id, id, String(dto.name || ''));
  }

  @Patch('files/:id/move')
  @Post('files/:id/move')
  async moveFile(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.documentsService.moveFile(req.user.id, id, dto.parentId || dto.folderId || null);
  }

  @Delete('files/:id')
  async deleteFile(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.deleteFile(req.user.id, id);
  }

  @Delete('all')
  async clearAll(@Request() req: any) {
    return this.documentsService.clearAll(req.user.id);
  }
}
