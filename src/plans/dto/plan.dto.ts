import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @IsUUID() createdById!: string;
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsBoolean() isFree?: boolean;
}
export class UpdatePlanDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional({ enum: ContentStatus }) @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
}
export class AddTestToPlanDto { @IsUUID() testId!: string; @IsOptional() @IsNumber() @Min(0) sortOrder?: number; }
