import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        role: dto.role || 'STUDENT',
        profile: {
          create: {
            name: dto.name,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return this.generateTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokenResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or session expired');
    }

    return this.serializeUser(user);
  }

  async updateProfile(userId: string, dto: any) {
    const allowedFields = [
      'name',
      'avatar',
      'gender',
      'phone',
      'birthday',
      'language',
      'homeAddress',
      'workAddress',
    ];

    const data = allowedFields.reduce((acc, field) => {
      if (field in dto) {
        acc[field] = typeof dto[field] === 'string' ? dto[field].trim() : dto[field];
      }
      return acc;
    }, {} as Record<string, any>);

    if ('name' in data && !data.name) {
      throw new BadRequestException('Name is required');
    }

    await this.prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        name: data.name || dto.name || 'Người dùng HocRealtime',
        avatar: data.avatar,
        gender: data.gender,
        phone: data.phone,
        birthday: data.birthday,
        language: data.language,
        homeAddress: data.homeAddress,
        workAddress: data.workAddress,
      },
    });

    return this.getMe(userId);
  }

  async changePassword(userId: string, dto: any) {
    const currentPassword = String(dto.currentPassword || '');
    const newPassword = String(dto.newPassword || '');

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      throw new BadRequestException('Current password and a new password of at least 6 characters are required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found or session expired');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  private generateTokenResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: this.serializeUser(user),
    };
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name || '',
      avatar: user.profile?.avatar || null,
      gender: user.profile?.gender || null,
      phone: user.profile?.phone || null,
      birthday: user.profile?.birthday || null,
      language: user.profile?.language || 'Tiếng Việt (Việt Nam)',
      homeAddress: user.profile?.homeAddress || null,
      workAddress: user.profile?.workAddress || null,
    };
  }
}
