import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone?: string | null;
    role: UserRole;
  };
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  devOtp?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailForAuth(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Account is suspended. Please contact support.');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('No password set for this account. Please log in using Google or OTP.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.auditService.log({
      actorId: user.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
      metadata: { method: 'password', email: user.email, role: user.role, ipAddress: ipAddress ?? 'unknown' },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async loginWithGoogle(googleDto: GoogleLoginDto, ipAddress?: string): Promise<AuthResponse> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || undefined;
    const client = new OAuth2Client(googleClientId);

    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken: googleDto.idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (error: any) {
      this.logger.warn(`Google token verification failed: ${error?.message}`);
      throw new UnauthorizedException(`Invalid Google ID token: ${error?.message || 'Token verification failed'}`);
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Google ID token does not contain a verified email address');
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
        deletedAt: null,
      },
    });

    if (user) {
      if (user.status === 'suspended') {
        throw new UnauthorizedException('Account is suspended. Please contact support.');
      }

      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      const role = googleDto.role || UserRole.STUDENT;
      const fullName = payload.name?.trim() || payload.given_name?.trim() || email.split('@')[0];

      user = await this.prisma.user.create({
        data: {
          fullName,
          email,
          googleId,
          role: role as any,
          status: 'active',
        },
      });

      await this.auditService.log({
        actorId: user.id,
        action: 'user.signup',
        targetType: 'user',
        targetId: user.id,
        metadata: { method: 'google', email: user.email, role: user.role, ipAddress: ipAddress ?? 'unknown' },
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    await this.auditService.log({
      actorId: user.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
      metadata: { method: 'google', email: user.email, role: user.role, ipAddress: ipAddress ?? 'unknown' },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
      },
    };
  }

  async sendOtp(sendOtpDto: SendOtpDto): Promise<SendOtpResponse> {
    const target = this.normalizeTarget(sendOtpDto.target, sendOtpDto.type);

    const recent = await this.prisma.otpVerification.findFirst({
      where: {
        target,
        type: sendOtpDto.type,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recent) {
      throw new BadRequestException('Please wait 60 seconds before requesting another OTP.');
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.otpVerification.deleteMany({
      where: { target, type: sendOtpDto.type },
    });

    await this.prisma.otpVerification.create({
      data: {
        target,
        type: sendOtpDto.type,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
    });

    this.logger.log(`[OTP] Generated 6-digit code for ${sendOtpDto.type} (${target}): ${code}`);

    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    return {
      success: true,
      message: `OTP sent successfully to ${target}`,
      expiresInSeconds: 300,
      ...(isDev ? { devOtp: code } : {}),
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto, ipAddress?: string): Promise<AuthResponse> {
    const target = this.normalizeTarget(verifyOtpDto.target, verifyOtpDto.type);

    const record = await this.prisma.otpVerification.findFirst({
      where: { target, type: verifyOtpDto.type },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No pending OTP request found for this destination. Please request a new OTP.');
    }

    if (record.expiresAt < new Date()) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (record.attempts >= 5) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});
      throw new BadRequestException('Too many invalid attempts. Please request a new OTP.');
    }

    const isMatch = await bcrypt.compare(verifyOtpDto.otp, record.codeHash);
    if (!isMatch) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP code.');
    }

    await this.prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});

    let user = await this.prisma.user.findFirst({
      where:
        verifyOtpDto.type === 'email'
          ? { email: target, deletedAt: null }
          : { phone: target, deletedAt: null },
    });

    if (user) {
      if (user.status === 'suspended') {
        throw new UnauthorizedException('Account is suspended. Please contact support.');
      }
    } else {
      const role = verifyOtpDto.role || UserRole.STUDENT;
      let fullName = verifyOtpDto.fullName?.trim();
      if (!fullName) {
        fullName =
          verifyOtpDto.type === 'email'
            ? target.split('@')[0]
            : `User-${target.slice(-4)}`;
      }

      user = await this.prisma.user.create({
        data: {
          fullName,
          email: verifyOtpDto.type === 'email' ? target : null,
          phone: verifyOtpDto.type === 'mobile' ? target : null,
          role: role as any,
          status: 'active',
        },
      });

      await this.auditService.log({
        actorId: user.id,
        action: 'user.signup',
        targetType: 'user',
        targetId: user.id,
        metadata: { method: `otp_${verifyOtpDto.type}`, target, role: user.role, ipAddress: ipAddress ?? 'unknown' },
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    await this.auditService.log({
      actorId: user.id,
      action: 'auth.login',
      targetType: 'user',
      targetId: user.id,
      metadata: { method: `otp_${verifyOtpDto.type}`, target, role: user.role, ipAddress: ipAddress ?? 'unknown' },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
      },
    };
  }

  private normalizeTarget(target: string, type: 'email' | 'mobile'): string {
    if (type === 'email') {
      const cleaned = target.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleaned)) {
        throw new BadRequestException('Please provide a valid email address.');
      }
      return cleaned;
    } else {
      let cleaned = target.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[1-9]\d{9,14}$/.test(cleaned)) {
        throw new BadRequestException(
          'Please provide a valid mobile number (e.g., +919876543210 or 10-digit mobile number).',
        );
      }
      if (/^\d{10}$/.test(cleaned)) {
        cleaned = `+91${cleaned}`;
      }
      return cleaned;
    }
  }
}
