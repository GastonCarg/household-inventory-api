import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  // Photos for /lookup/image are sent as base64 JSON
  app.useBodyParser('json', { limit: '5mb' });

  app.enableCors({
    origin: ['https://household-inventory-seven.vercel.app', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
