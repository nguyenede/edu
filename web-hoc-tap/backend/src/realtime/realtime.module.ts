import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RedisService } from './redis.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-key-12345-change-me',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
    }),
  ],
  providers: [RealtimeGateway, RedisService],
  exports: [RedisService],
})
export class RealtimeModule {}
