import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponse, UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a student, teacher, or administrator account' })
  @ApiCreatedResponse({ description: 'User created. Password hashes are never returned.' })
  create(@Body() input: CreateUserDto, @Req() req: Request): Promise<UserResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip;
    return this.usersService.create(input, ip);
  }
}
