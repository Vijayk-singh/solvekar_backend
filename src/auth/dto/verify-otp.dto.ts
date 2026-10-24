import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { UserRole } from '../../users/user-role.enum';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Target email address or mobile phone number that received the OTP',
  })
  @IsString()
  @IsNotEmpty()
  target!: string;

  @ApiProperty({
    enum: ['email', 'mobile'],
    example: 'email',
    description: 'Channel type used for sending OTP',
  })
  @IsIn(['email', 'mobile'])
  type!: 'email' | 'mobile';

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received by email or mobile SMS',
  })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiPropertyOptional({
    example: 'Aditi Sharma',
    description: 'Full name to register if user account does not exist yet',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.STUDENT,
    description: 'Role to assign if a new user account is created upon OTP verification',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
