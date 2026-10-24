import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'student@example.com',
    description: 'Destination target: email address (e.g. user@gmail.com) or mobile phone number (e.g. +919876543210)',
  })
  @IsString()
  @IsNotEmpty()
  target!: string;

  @ApiProperty({
    enum: ['email', 'mobile'],
    example: 'email',
    description: 'Channel to use for sending OTP',
  })
  @IsIn(['email', 'mobile'])
  type!: 'email' | 'mobile';
}
