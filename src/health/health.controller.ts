import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check that the API is running' })
  check() {
    return { status: 'ok', service: 'solvekar-backend', timestamp: new Date().toISOString() };
  }
}
