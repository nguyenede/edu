import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
    });

    console.log(`Redis connected on ${host}:${port}`);
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // Get raw redis client
  getClient(): Redis {
    return this.client;
  }

  // Room management
  async createRoom(code: string, quizId: string, hostId: string, mode: string) {
    const roomKey = `room:${code}`;
    await this.client.hset(roomKey, {
      quizId,
      hostId,
      status: 'LOBBY',
      mode,
      createdAt: new Date().toISOString(),
    });
    await this.client.expire(roomKey, 86400); // 1 day TTL
  }

  async getRoom(code: string) {
    return this.client.hgetall(`room:${code}`);
  }

  async updateRoomStatus(code: string, status: string) {
    await this.client.hset(`room:${code}`, 'status', status);
  }

  async deleteRoom(code: string) {
    await this.client.del(`room:${code}`);
    await this.client.del(`room:${code}:players`);
    await this.client.del(`room:${code}:questions`);
  }

  // Player management
  async joinPlayer(code: string, nickname: string, socketId: string, userId?: string) {
    const playersKey = `room:${code}:players`;
    const playerData = {
      nickname,
      socketId,
      userId: userId || '',
      score: 0,
      accuracy: 0,
      correctCount: 0,
      wrongCount: 0,
      joinedAt: new Date().toISOString(),
    };
    await this.client.hset(playersKey, nickname, JSON.stringify(playerData));
    await this.client.expire(playersKey, 86400);
    return playerData;
  }

  async getPlayers(code: string): Promise<any[]> {
    const playersKey = `room:${code}:players`;
    const playersMap = await this.client.hgetall(playersKey);
    return Object.values(playersMap).map((p) => JSON.parse(p));
  }

  async getPlayer(code: string, nickname: string) {
    const playersKey = `room:${code}:players`;
    const playerJson = await this.client.hget(playersKey, nickname);
    return playerJson ? JSON.parse(playerJson) : null;
  }

  async updatePlayerStats(
    code: string,
    nickname: string,
    stats: {
      score: number;
      correctCount: number;
      wrongCount: number;
      accuracy: number;
    },
  ) {
    const playersKey = `room:${code}:players`;
    const player = await this.getPlayer(code, nickname);
    if (!player) return null;

    const updatedPlayer = {
      ...player,
      ...stats,
    };

    await this.client.hset(playersKey, nickname, JSON.stringify(updatedPlayer));
    return updatedPlayer;
  }

  async leavePlayer(code: string, nickname: string) {
    const playersKey = `room:${code}:players`;
    await this.client.hdel(playersKey, nickname);
  }

  // Question mapping cache
  async cacheQuestions(code: string, questions: any[]) {
    const key = `room:${code}:questions`;
    await this.client.set(key, JSON.stringify(questions), 'EX', 86400);
  }

  async getCachedQuestions(code: string): Promise<any[]> {
    const key = `room:${code}:questions`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : [];
  }
}
