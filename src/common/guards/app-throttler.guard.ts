import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cfIp = req.headers?.['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') {
      return cfIp;
    }

    const xForwardedFor = req.headers?.['x-forwarded-for'];
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }

    return req.socket?.remoteAddress || req.ip || '127.0.0.1';
  }
}
