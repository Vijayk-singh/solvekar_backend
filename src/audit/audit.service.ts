import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: { actorId?: string; action: string; targetType: string; targetId?: string; metadata?: Prisma.InputJsonValue }) {
    return this.prisma.auditLog.create({ data: input });
  }

  list() {
    return this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
