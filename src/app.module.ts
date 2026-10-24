import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PlansModule } from './plans/plans.module';
import { TestsModule } from './tests/tests.module';
import { QuestionsModule } from './questions/questions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AuditModule } from './audit/audit.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 60,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        autoLogging: true,
        customProps: (req: any) => ({
          ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip,
          userId: req.user?.id,
        }),
      },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    AuditModule,
    PlansModule,
    TestsModule,
    QuestionsModule,
    SubscriptionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
