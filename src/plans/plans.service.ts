import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddTestToPlanDto, CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}
  async create(input: CreatePlanDto) { const plan = await this.prisma.plan.create({ data: { ...input, title: input.title.trim(), price: input.isFree ? 0 : input.price ?? 0, isFree: input.isFree ?? false } }); await this.audit.log({ actorId: input.createdById, action: 'plan.created', targetType: 'plan', targetId: plan.id }); return plan; }
  list(publishedOnly = false) { return this.prisma.plan.findMany({ where: publishedOnly ? { status: ContentStatus.published } : {}, include: { planTests: { include: { test: true } } }, orderBy: { createdAt: 'desc' } }); }
  async get(id: string) { const plan = await this.prisma.plan.findUnique({ where: { id }, include: { planTests: { include: { test: true } } } }); if (!plan) throw new NotFoundException('Plan not found'); return plan; }
  async update(id: string, input: UpdatePlanDto) { await this.get(id); const plan = await this.prisma.plan.update({ where: { id }, data: { ...input, ...(input.isFree ? { price: 0 } : {}) } }); await this.audit.log({ action: 'plan.updated', targetType: 'plan', targetId: id }); return plan; }
  async remove(id: string) { await this.get(id); await this.prisma.plan.delete({ where: { id } }); await this.audit.log({ action: 'plan.deleted', targetType: 'plan', targetId: id }); }
  async addTest(id: string, input: AddTestToPlanDto) { await this.get(id); const link = await this.prisma.planTest.create({ data: { planId: id, testId: input.testId, sortOrder: input.sortOrder ?? 0 } }); await this.audit.log({ action: 'plan.test_added', targetType: 'plan', targetId: id, metadata: { testId: input.testId } }); return link; }
}
