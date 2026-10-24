import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../users/user-role.enum';

export class GoogleLoginDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
    description: 'Google ID token (JWT) returned by Google Sign-In SDK on web or mobile',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.STUDENT,
    description: 'Role to assign if a new user account is created upon first Google Sign-In',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
