import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AddTestToPlanDto, CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { PlansService } from './plans.service';
@ApiTags('Plans') @Controller('plans') export class PlansController {
  constructor(private readonly service: PlansService) {}
  @Post() create(@Body() dto: CreatePlanDto) { return this.service.create(dto); }
  @Get() list(@Query('published') published?: string) { return this.service.list(published === 'true'); }
  @Get(':id') get(@Param('id') id: string) { return this.service.get(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePlanDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/tests') addTest(@Param('id') id: string, @Body() dto: AddTestToPlanDto) { return this.service.addTest(id, dto); }
}
