import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface UserResponse {
  id: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UserForAuth {
  id: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  googleId?: string | null;
  passwordHash: string | null;
  role: UserRole;
  status: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreateUserDto, ipAddress?: string): Promise<UserResponse> {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone?.trim() || null;
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: input.fullName.trim(),
          email,
          phone,
          role: input.role,
          passwordHash: await bcrypt.hash(input.password, 12),
        },
        select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
      });

      await this.auditService.log({
        actorId: user.id,
        action: 'user.signup',
        targetType: 'user',
        targetId: user.id,
        metadata: { email: user.email, phone: user.phone, role: user.role, ipAddress: ipAddress ?? 'unknown' },
      });

      return { ...user, role: user.role as UserRole, createdAt: user.createdAt.toISOString() };
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('A user already exists with this email address or phone number');
      }
      throw error;
    }
  }

  async findByEmailForAuth(email: string): Promise<UserForAuth | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        googleId: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return null;
    }

    return { ...user, role: user.role as UserRole };
  }

  async findByPhoneForAuth(phone: string): Promise<UserForAuth | null> {
    const normalizedPhone = phone.trim();
    const user = await this.prisma.user.findFirst({
      where: { phone: normalizedPhone, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        googleId: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return null;
    }

    return { ...user, role: user.role as UserRole };
  }

  async findByGoogleIdForAuth(googleId: string): Promise<UserForAuth | null> {
    const user = await this.prisma.user.findFirst({
      where: { googleId: googleId.trim(), deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        googleId: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return null;
    }

    return { ...user, role: user.role as UserRole };
  }

  async findById(id: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true },
    });

    if (!user) {
      return null;
    }

    return { ...user, role: user.role as UserRole, createdAt: user.createdAt.toISOString() };
  }
}
