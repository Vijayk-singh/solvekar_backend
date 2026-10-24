import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../users/user-role.enum';

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn().mockResolvedValue('mock_jwt_token_123'),
  })),
}));

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let usersService: any;
  let jwtService: any;
  let auditService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      otpVerification: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    usersService = {
      findByEmailForAuth: jest.fn(),
      findById: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_jwt_token_123'),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'GOOGLE_CLIENT_ID') return 'mock-client-id.apps.googleusercontent.com';
        return defaultVal;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditService, useValue: auditService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Password Login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      usersService.findByEmailForAuth.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nonexistent@solvekar.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account has no passwordHash set', async () => {
      usersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        fullName: 'OTP User',
        email: 'otp@solvekar.com',
        passwordHash: null,
        role: UserRole.STUDENT,
        status: 'active',
      });

      await expect(
        service.login({ email: 'otp@solvekar.com', password: 'password123' }),
      ).rejects.toThrow('No password set for this account');
    });

    it('should authenticate successfully with valid password and return accessToken', async () => {
      const hashed = await bcrypt.hash('secretpass', 10);
      usersService.findByEmailForAuth.mockResolvedValue({
        id: 'u1',
        fullName: 'Rahul Verma',
        email: 'rahul@solvekar.com',
        phone: '+919876543210',
        passwordHash: hashed,
        role: UserRole.STUDENT,
        status: 'active',
      });

      const result = await service.login({ email: 'rahul@solvekar.com', password: 'secretpass' });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.email).toBe('rahul@solvekar.com');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });
  });

  describe('OTP - Send & Verify', () => {
    it('should validate and reject invalid email target format', async () => {
      await expect(
        service.sendOtp({ target: 'invalid-email', type: 'email' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate and reject invalid mobile phone format', async () => {
      await expect(
        service.sendOtp({ target: '1234', type: 'mobile' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate 6-digit OTP and store hash for valid email', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue(null);
      prisma.otpVerification.deleteMany.mockResolvedValue({ count: 0 });
      prisma.otpVerification.create.mockResolvedValue({});

      const res = await service.sendOtp({ target: 'Student@Solvekar.com', type: 'email' });

      expect(res.success).toBe(true);
      expect(res.expiresInSeconds).toBe(300);
      expect(res.devOtp).toMatch(/^\d{6}$/);
      expect(prisma.otpVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            target: 'student@solvekar.com',
            type: 'email',
          }),
        }),
      );
    });

    it('should rate-limit OTP generation if requested within 60 seconds', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-recent',
        createdAt: new Date(),
      });

      await expect(
        service.sendOtp({ target: 'student@solvekar.com', type: 'email' }),
      ).rejects.toThrow('Please wait 60 seconds');
    });

    it('should verify valid OTP and auto-create user if not found', async () => {
      const code = '654321';
      const codeHash = await bcrypt.hash(code, 10);

      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        target: 'newuser@solvekar.com',
        type: 'email',
        codeHash,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
      });
      prisma.otpVerification.delete.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue(null); // new user
      prisma.user.create.mockResolvedValue({
        id: 'new-u1',
        fullName: 'New Student',
        email: 'newuser@solvekar.com',
        phone: null,
        role: UserRole.STUDENT,
        status: 'active',
      });

      const res = await service.verifyOtp({
        target: 'newuser@solvekar.com',
        type: 'email',
        otp: code,
        fullName: 'New Student',
      });

      expect(res.accessToken).toBe('mock_jwt_token_123');
      expect(res.user.fullName).toBe('New Student');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.signup' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });

    it('should reject expired OTP', async () => {
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-expired',
        target: 'test@solvekar.com',
        type: 'email',
        codeHash: 'hash',
        expiresAt: new Date(Date.now() - 1000), // in the past
        attempts: 0,
      });
      prisma.otpVerification.delete.mockResolvedValue({});

      await expect(
        service.verifyOtp({
          target: 'test@solvekar.com',
          type: 'email',
          otp: '123456',
        }),
      ).rejects.toThrow('OTP has expired');
    });

    it('should increment attempts and reject incorrect OTP', async () => {
      const codeHash = await bcrypt.hash('111111', 10);
      prisma.otpVerification.findFirst.mockResolvedValue({
        id: 'otp-1',
        target: 'test@solvekar.com',
        type: 'email',
        codeHash,
        expiresAt: new Date(Date.now() + 60000),
        attempts: 1,
      });
      prisma.otpVerification.update.mockResolvedValue({});

      await expect(
        service.verifyOtp({
          target: 'test@solvekar.com',
          type: 'email',
          otp: '999999',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.otpVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attempts: { increment: 1 } },
        }),
      );
    });
  });

  describe('Google Login', () => {
    it('should throw UnauthorizedException if token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

      await expect(
        service.loginWithGoogle({ idToken: 'invalid_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if ticket payload has no email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ sub: 'google-sub-123' }),
      });

      await expect(
        service.loginWithGoogle({ idToken: 'no_email_token' }),
      ).rejects.toThrow('Google ID token does not contain a verified email address');
    });

    it('should auto-create new user with student role and return access token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-999',
          email: 'googleuser@gmail.com',
          name: 'Priya Patel',
        }),
      });

      prisma.user.findFirst.mockResolvedValue(null); // not found
      prisma.user.create.mockResolvedValue({
        id: 'u-google-1',
        fullName: 'Priya Patel',
        email: 'googleuser@gmail.com',
        googleId: 'google-sub-999',
        phone: null,
        role: UserRole.STUDENT,
        status: 'active',
      });

      const result = await service.loginWithGoogle({ idToken: 'valid_google_token' });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.user.fullName).toBe('Priya Patel');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'googleuser@gmail.com',
            googleId: 'google-sub-999',
            fullName: 'Priya Patel',
          }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.signup' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });

    it('should link googleId to existing user if found by email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-888',
          email: 'existing@solvekar.com',
          name: 'Existing User',
        }),
      });

      prisma.user.findFirst.mockResolvedValue({
        id: 'u-existing',
        fullName: 'Existing User',
        email: 'existing@solvekar.com',
        googleId: null,
        phone: null,
        role: UserRole.STUDENT,
        status: 'active',
      });

      prisma.user.update.mockResolvedValue({
        id: 'u-existing',
        fullName: 'Existing User',
        email: 'existing@solvekar.com',
        googleId: 'google-sub-888',
        phone: null,
        role: UserRole.STUDENT,
        status: 'active',
      });

      const result = await service.loginWithGoogle({ idToken: 'valid_google_token' });

      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-existing' },
          data: { googleId: 'google-sub-888' },
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });
  });
});
