import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { QuestionsModule } from './questions/questions.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResultsModule } from './results/results.module';
import { AdminModule } from './admin/admin.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    ClassesModule,
    QuestionsModule,
    QuizzesModule,
    AssignmentsModule,
    RealtimeModule,
    NotificationsModule,
    ResultsModule,
    AdminModule,
    AiChatModule,
    DocumentsModule,
  ],
})
export class AppModule {}
