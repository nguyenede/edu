import { Body, Controller, Delete, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiChatService } from './ai-chat.service';

@UseGuards(JwtAuthGuard)
@Controller(['si-chat', 'ai-chat'])
export class AiChatController {
  constructor(private aiChatService: AiChatService) {}

  @Get('sessions')
  async listSessions(@Request() req: any) {
    return this.aiChatService.listSessions(req.user.id);
  }

  @Get('sessions/:id')
  async getSession(@Request() req: any, @Param('id') id: string) {
    return this.aiChatService.getSession(req.user.id, id);
  }

  @Put('sessions/:id')
  async upsertSession(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.aiChatService.upsertSession(req.user.id, { ...dto, id });
  }

  @Delete('sessions/:id')
  async deleteSession(@Request() req: any, @Param('id') id: string) {
    return this.aiChatService.deleteSession(req.user.id, id);
  }
}
