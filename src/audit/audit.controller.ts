import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit logs')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List the latest audit events (admin guard will be added with JWT auth)' })
  list() { return this.auditService.list(); }
}
