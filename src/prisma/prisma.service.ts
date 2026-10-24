import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://neondb_owner:npg_wG3jM0JrXSOP@ep-sweet-wind-aozjo6jd-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error: any) {
      this.logger.error(`Database connection warning on startup: ${error?.message || error}`);
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.once('beforeExit', async () => {
      await app.close();
    });
  }
}
