import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';
import { UnauthorizedException, UseFilters } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (token) {
        const payload = this.jwtService.verify(token);
        client.data.user = payload; // Attach user payload to socket
      }
    } catch {
      // Allow guest connections for students joining with code without an account
    }
  }

  handleDisconnect(client: Socket) {
    // If the client was in a room, handle leave
    const { roomCode, nickname } = client.data;
    if (roomCode && nickname) {
      this.handlePlayerLeave(roomCode, nickname, client);
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.auth?.token || client.handshake.headers['authorization'];
    if (!authHeader) return null;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return authHeader;
  }

  @SubscribeMessage('room:create')
  async onCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string; mode: string },
  ) {
    const user = client.data.user;
    if (!user || user.role !== 'TEACHER') {
      client.emit('error', 'Only teachers can host a game room');
      return;
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: data.quizId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      client.emit('error', 'Quiz not found');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    await this.redisService.createRoom(code, quiz.id, user.sub, data.mode);

    // Cache the quiz questions in Redis for fast access
    const questions = quiz.questions.map((qq) => qq.question);
    await this.redisService.cacheQuestions(code, questions);

    client.data.roomCode = code;
    client.data.nickname = 'HOST';
    client.join(code);

    client.emit('room:created', { code, mode: data.mode });
  }

  @SubscribeMessage('room:join')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; nickname: string },
  ) {
    const room = await this.redisService.getRoom(data.code);
    if (!room || Object.keys(room).length === 0) {
      client.emit('error', 'Room not found or expired');
      return;
    }

    if (room.status !== 'LOBBY') {
      client.emit('error', 'Game has already started');
      return;
    }

    const players = await this.redisService.getPlayers(data.code);
    if (players.some((p) => p.nickname.toLowerCase() === data.nickname.toLowerCase())) {
      client.emit('error', 'Nickname already taken in this room');
      return;
    }

    const userId = client.data.user?.sub || null;
    const player = await this.redisService.joinPlayer(data.code, data.nickname, client.id, userId);

    client.data.roomCode = data.code;
    client.data.nickname = data.nickname;
    client.join(data.code);

    client.emit('room:joined', { player, mode: room.mode });
    this.server.to(data.code).emit('player:joined', player);

    // Update player list
    const updatedPlayers = await this.redisService.getPlayers(data.code);
    this.server.to(data.code).emit('room:players', updatedPlayers);
  }

  @SubscribeMessage('room:start')
  async onStartRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const room = await this.redisService.getRoom(data.code);
    if (!room || Object.keys(room).length === 0) return;

    if (room.hostId !== client.data.user?.sub) {
      client.emit('error', 'Access denied: not the host');
      return;
    }

    await this.redisService.updateRoomStatus(data.code, 'PLAYING');
    
    // Save GameRoom in PostgreSQL
    const dbRoom = await this.prisma.gameRoom.create({
      data: {
        code: data.code,
        quizId: room.quizId,
        hostId: room.hostId,
        status: 'PLAYING',
        mode: room.mode,
      },
    });

    const players = await this.redisService.getPlayers(data.code);
    for (const player of players) {
      await this.prisma.gamePlayer.create({
        data: {
          roomId: dbRoom.id,
          nickname: player.nickname,
          userId: player.userId || null,
          socketId: player.socketId,
        },
      });
    }

    // Create session
    await this.prisma.gameSession.create({
      data: {
        roomId: dbRoom.id,
      },
    });

    this.server.to(data.code).emit('game:started', { mode: room.mode });

    // Initialize mode specific state
    if (room.mode === 'CHAOS') {
      await this.initializeChaosMode(data.code);
    } else {
      await this.initializeClassicMode(data.code);
    }
  }

  @SubscribeMessage('quiz:answer')
  async onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; questionId: string; optionId: string },
  ) {
    const { nickname } = client.data;
    if (!nickname) return;

    const room = await this.redisService.getRoom(data.code);
    if (!room || room.status !== 'PLAYING') return;

    const questions = await this.redisService.getCachedQuestions(data.code);
    const question = questions.find((q) => q.id === data.questionId);
    if (!question) return;

    const selectedOption = question.options.find((o: any) => o.id === data.optionId);
    const isCorrect = selectedOption ? selectedOption.isCorrect : false;

    // Calculate score
    const player = await this.redisService.getPlayer(data.code, nickname);
    if (!player) return;

    const correctCount = player.correctCount + (isCorrect ? 1 : 0);
    const wrongCount = player.wrongCount + (isCorrect ? 0 : 1);
    const totalAnswers = correctCount + wrongCount;
    const accuracy = totalAnswers > 0 ? (correctCount / totalAnswers) * 100 : 0;
    const scoreDelta = isCorrect ? question.points * 100 : 0; // standard 100 multiplier
    const score = player.score + scoreDelta;

    const updatedPlayer = await this.redisService.updatePlayerStats(data.code, nickname, {
      score,
      correctCount,
      wrongCount,
      accuracy,
    });

    // Write to PostgreSQL game statistics
    const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code: data.code } });
    const dbPlayer = await this.prisma.gamePlayer.findFirst({
      where: { roomId: dbRoom?.id, nickname },
    });

    if (dbPlayer) {
      await this.prisma.gameAnswer.create({
        data: {
          playerId: dbPlayer.id,
          questionId: data.questionId,
          optionId: data.optionId,
          isCorrect,
          scoreDelta,
        },
      });

      await this.prisma.gamePlayer.update({
        where: { id: dbPlayer.id },
        data: {
          score,
          correctCount,
          wrongCount,
          accuracy,
        },
      });
    }

    client.emit('answer:result', { isCorrect, score, scoreDelta });
    this.broadcastLeaderboard(data.code);
  }

  @SubscribeMessage('chaos:answer')
  async onChaosAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; questionId: string; optionId: string },
  ) {
    const { nickname } = client.data;
    if (!nickname) return;

    const room = await this.redisService.getRoom(data.code);
    if (!room || room.status !== 'PLAYING') return;

    const questions = await this.redisService.getCachedQuestions(data.code);
    const question = questions.find((q) => q.id === data.questionId);
    if (!question) return;

    const selectedOption = question.options.find((o: any) => o.id === data.optionId);
    const isCorrect = selectedOption ? selectedOption.isCorrect : false;

    // Chaos Quiz Rules: Correct: +100 points, Wrong: -100 penalty
    const player = await this.redisService.getPlayer(data.code, nickname);
    if (!player) return;

    const correctCount = player.correctCount + (isCorrect ? 1 : 0);
    const wrongCount = player.wrongCount + (isCorrect ? 0 : 1);
    const totalAnswers = correctCount + wrongCount;
    const accuracy = totalAnswers > 0 ? (correctCount / totalAnswers) * 100 : 0;
    
    const scoreDelta = isCorrect ? 100 : -100;
    const score = Math.max(0, player.score + scoreDelta); // score cannot be below 0

    await this.redisService.updatePlayerStats(data.code, nickname, {
      score,
      correctCount,
      wrongCount,
      accuracy,
    });

    // Write to PostgreSQL game statistics
    const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code: data.code } });
    const dbPlayer = await this.prisma.gamePlayer.findFirst({
      where: { roomId: dbRoom?.id, nickname },
    });

    if (dbPlayer) {
      await this.prisma.gameAnswer.create({
        data: {
          playerId: dbPlayer.id,
          questionId: data.questionId,
          optionId: data.optionId,
          isCorrect,
          scoreDelta,
        },
      });

      await this.prisma.gamePlayer.update({
        where: { id: dbPlayer.id },
        data: {
          score,
          correctCount,
          wrongCount,
          accuracy,
        },
      });
    }

    client.emit('answer:result', { isCorrect, score, scoreDelta });

    // Replaces the answered question with a new one from remaining questions pool
    await this.replacePlayerChaosQuestion(client, data.code, data.questionId);
    this.broadcastLeaderboard(data.code);
  }

  @SubscribeMessage('room:end')
  async onEndRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const room = await this.redisService.getRoom(data.code);
    if (!room || Object.keys(room).length === 0) return;

    if (room.hostId !== client.data.user?.sub) {
      client.emit('error', 'Access denied');
      return;
    }

    await this.redisService.updateRoomStatus(data.code, 'ENDED');

    const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code: data.code } });
    if (dbRoom) {
      await this.prisma.gameRoom.update({
        where: { id: dbRoom.id },
        data: { status: 'ENDED' },
      });

      await this.prisma.gameSession.updateMany({
        where: { roomId: dbRoom.id, endTime: null },
        data: { endTime: new Date() },
      });
    }

    const leaderboard = await this.getLeaderboardData(data.code);
    this.server.to(data.code).emit('game:ended', { leaderboard });

    // Clean up Redis keys
    await this.redisService.deleteRoom(data.code);
  }

  // Classic Quiz loop
  private async initializeClassicMode(code: string) {
    const questions = await this.redisService.getCachedQuestions(code);
    // Send standard questions sequence to student screens.
    // In Classic mode, host controls question progression or students play at their own pace.
    // For this implementation, we allow students to answer the sequence directly.
    this.server.to(code).emit('classic:init', {
      questions: questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        options: q.options.map((o: any) => ({ id: o.id, content: o.content })), // Hide isCorrect
      })),
    });
  }

  // Chaos Quiz Loop
  private async initializeChaosMode(code: string) {
    const questions = await this.redisService.getCachedQuestions(code);
    const players = await this.redisService.getPlayers(code);

    for (const player of players) {
      const socket = this.server.sockets.sockets.get(player.socketId);
      if (!socket) continue;

      // Pool for Chaos Mode: Display 20-30 questions (or as many as available)
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      const activeSize = Math.min(25, shuffled.length);
      const activeQuestions = shuffled.slice(0, activeSize);
      const remainingQuestions = shuffled.slice(activeSize);

      // Save active question IDs and remaining pool to Socket Session in Redis
      await this.redisService.getClient().set(
        `chaos:${code}:${player.nickname}:active`,
        JSON.stringify(activeQuestions.map((q) => q.id)),
        'EX',
        86400,
      );
      await this.redisService.getClient().set(
        `chaos:${code}:${player.nickname}:pool`,
        JSON.stringify(remainingQuestions.map((q) => q.id)),
        'EX',
        86400,
      );

      socket.emit('chaos:init', {
        activeQuestions: activeQuestions.map((q) => ({
          id: q.id,
          content: q.content,
          type: q.type,
          options: q.options.map((o: any) => ({ id: o.id, content: o.content })), // Mask isCorrect
        })),
      });
    }
  }

  private async replacePlayerChaosQuestion(client: Socket, code: string, oldQuestionId: string) {
    const nickname = client.data.nickname;
    const activeKey = `chaos:${code}:${nickname}:active`;
    const poolKey = `chaos:${code}:${nickname}:pool`;

    const activeIdsStr = await this.redisService.getClient().get(activeKey);
    const poolIdsStr = await this.redisService.getClient().get(poolKey);

    if (!activeIdsStr || !poolIdsStr) return;

    let activeIds: string[] = JSON.parse(activeIdsStr);
    let poolIds: string[] = JSON.parse(poolIdsStr);

    // Remove old question
    activeIds = activeIds.filter((id) => id !== oldQuestionId);

    let newQuestion: any = null;

    if (poolIds.length > 0) {
      // Pick next question from pool
      const nextId = poolIds.shift();
      const questions = await this.redisService.getCachedQuestions(code);
      const originalNewQuestion = questions.find((q) => q.id === nextId);

      if (originalNewQuestion) {
        newQuestion = {
          id: originalNewQuestion.id,
          content: originalNewQuestion.content,
          type: originalNewQuestion.type,
          options: originalNewQuestion.options.map((o: any) => ({ id: o.id, content: o.content })),
        };
        activeIds.push(nextId!);
      }
    }

    // Save updated arrays
    await this.redisService.getClient().set(activeKey, JSON.stringify(activeIds), 'EX', 86400);
    await this.redisService.getClient().set(poolKey, JSON.stringify(poolIds), 'EX', 86400);

    // Emit replacement event to this student specifically
    client.emit('chaos:replace', {
      oldQuestionId,
      newQuestion, // Will be null if pool is empty
    });
  }

  private async broadcastLeaderboard(code: string) {
    const leaderboard = await this.getLeaderboardData(code);
    this.server.to(code).emit('room:leaderboard', leaderboard);
  }

  private async getLeaderboardData(code: string): Promise<any[]> {
    const players = await this.redisService.getPlayers(code);
    return players
      .map((p) => ({
        nickname: p.nickname,
        score: p.score,
        accuracy: p.accuracy,
        correctCount: p.correctCount,
        wrongCount: p.wrongCount,
      }))
      .sort((a, b) => b.score - a.score);
  }

  private async handlePlayerLeave(code: string, nickname: string, client: Socket) {
    await this.redisService.leavePlayer(code, nickname);
    this.server.to(code).emit('player:left', { nickname });

    const updatedPlayers = await this.redisService.getPlayers(code);
    this.server.to(code).emit('room:players', updatedPlayers);

    // Clean client data
    client.data.roomCode = null;
    client.data.nickname = null;

    this.broadcastLeaderboard(code);
  }
}
