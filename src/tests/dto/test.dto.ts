import { ContentStatus } from '@prisma/client'; import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
export class CreateTestDto { @IsUUID() createdById!: string; @IsString() @MaxLength(160) title!: string; @IsOptional() @IsString() description?: string; @IsNumber() @Min(1) durationMinutes!: number; }
export class UpdateTestDto { @IsOptional() @IsString() @MaxLength(160) title?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsNumber() @Min(1) durationMinutes?: number; @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus; }
export class CreateSectionDto { @IsString() @MaxLength(160) title!: string; @IsNumber() @Min(0) sortOrder!: number; }
export class AddQuestionToTestDto { @IsUUID() questionId!: string; @IsUUID() sectionId!: string; @IsNumber() @Min(0) sortOrder!: number; @IsOptional() @IsNumber() marks?: number; @IsOptional() @IsNumber() negativeMarks?: number; }
