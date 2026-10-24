import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Express, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../dist/app.module';

const server: Express = express();
let isInitialized = false;

async function bootstrap() {
  if (!isInitialized) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { bufferLogs: true });
    app.useLogger(app.get(Logger));
    const config = app.get(ConfigService);
    const prefix = config.get<string>('API_PREFIX', 'api/v1');

    app.setGlobalPrefix(prefix);
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

    const documentConfig = new DocumentBuilder()
      .setTitle('Solvekar API')
      .setDescription('Backend API for the Solvekar test-series platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, documentConfig));

    await app.init();
    isInitialized = true;
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    await bootstrap();
    server(req, res);
  } catch (error: any) {
    console.error('Vercel bootstrap error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Serverless initialization error',
      error: error?.message || String(error),
    });
  }
}
