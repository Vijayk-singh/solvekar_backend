import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService, AuthResponse, SendOtpResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserResponse } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email and password (Rate limit: 5 req/min)' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT access token returned.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or suspended account.' })
  @ApiResponse({ status: 429, description: 'Too many login attempts. Please try again later.' })
  login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip;
    return this.authService.login(loginDto, ip);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in or sign up using Google Sign-In (Rate limit: 10 req/min)' })
  @ApiResponse({ status: 200, description: 'Google authentication successful, JWT access token returned.' })
  @ApiResponse({ status: 401, description: 'Invalid Google ID token.' })
  @ApiResponse({ status: 429, description: 'Too many authentication attempts. Please try again later.' })
  loginWithGoogle(@Body() googleDto: GoogleLoginDto, @Req() req: Request): Promise<AuthResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip;
    return this.authService.loginWithGoogle(googleDto, ip);
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send 6-digit OTP to mobile SMS or email (Rate limit: 3 req/min)' })
  @ApiResponse({ status: 200, description: 'OTP generated and dispatched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid target address/number or rate limit cooldown.' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests. Please try again later.' })
  sendOtp(@Body() sendOtpDto: SendOtpDto): Promise<SendOtpResponse> {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP and log in / auto-register (Rate limit: 5 req/min)' })
  @ApiResponse({ status: 200, description: 'OTP verified, user authenticated, JWT access token returned.' })
  @ApiResponse({ status: 400, description: 'OTP expired or not found.' })
  @ApiResponse({ status: 401, description: 'Invalid OTP code.' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts. Please try again later.' })
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: Request): Promise<AuthResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip;
    return this.authService.verifyOtp(verifyOtpDto, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile of current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current authenticated user profile.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Bearer token.' })
  getCurrentUser(@CurrentUser() user: UserResponse): UserResponse {
    return user;
  }
}
