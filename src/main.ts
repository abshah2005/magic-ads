import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.use(
    '/api/v1/subscriptions/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useLogger(['error', 'warn', 'log', 'debug', 'verbose']);
  

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
