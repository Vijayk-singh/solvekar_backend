import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Aditi Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'aditi@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Optional mobile phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'A-strong-password1' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
  @IsEnum(UserRole)
  role!: UserRole;
}
