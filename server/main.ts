import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });

  const clientOrigin = process.env.CLIENT_ORIGIN || '';
  app.enableCors({
    origin: clientOrigin ? clientOrigin.split(',').map((s) => s.trim()) : true,
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));

  // Serve built frontend (dist/client) as static files
  const clientDist = join(process.cwd(), 'dist', 'client');
  if (existsSync(clientDist)) {
    app.useStaticAssets(clientDist, {
      index: false,
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    });
  }

  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = Number(process.env.SERVER_PORT || '3000');

  await app.listen(port, host);
  logger.log(`字庫派對 server running on http://${host}:${port}`);
  logger.log(`API ready at http://${host}:${port}/api`);
}

bootstrap();
