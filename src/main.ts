import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Express } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

const server: Express = express();

export const createNestApp = async (expressInstance: Express) => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), { bufferLogs: true });
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
  return app;
};

// Local development / standalone server
if (!process.env.VERCEL) {
  createNestApp(server).then(async (app) => {
    const config = app.get(ConfigService);
    const port = config.get<number>('PORT', 3000);
    await app.listen(port);
  });
}

// Vercel Serverless Function handler
let isInitialized = false;
export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    await createNestApp(server);
    isInitialized = true;
  }
  server(req, res);
}
