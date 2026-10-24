import { AppThrottlerGuard } from './app-throttler.guard';

describe('AppThrottlerGuard', () => {
  let guard: AppThrottlerGuard;

  beforeEach(() => {
    guard = new AppThrottlerGuard(
      {
        errorMessage: 'Too Many Requests',
        throttlers: [],
      } as any,
      {} as any,
      {} as any,
    );
  });

  it('should prioritize cf-connecting-ip header if present', async () => {
    const req = {
      headers: {
        'cf-connecting-ip': '198.51.100.99',
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
      ip: '10.0.0.1',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('198.51.100.99');
  });

  it('should extract first IP from x-forwarded-for if cf-connecting-ip is not present', async () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.55, 10.0.0.1',
      },
      ip: '10.0.0.1',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('203.0.113.55');
  });

  it('should fallback to req.ip or socket.remoteAddress', async () => {
    const req = {
      headers: {},
      ip: '192.168.1.10',
    };

    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('192.168.1.10');
  });
});
