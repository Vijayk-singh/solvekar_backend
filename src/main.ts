import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
