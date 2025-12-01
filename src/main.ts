import {
  EnvironmentVariablesManager,
  Logger as MondayLogger,
} from '@mondaycom/apps-sdk';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from '@/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const loggerMonday = new MondayLogger('Bootstrap');
  const envManage = new EnvironmentVariablesManager({ updateProcessEnv: true });
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  // Load allowed origins
  const serverAddress = envManage.get('MNDY_SERVER_ADDRESS');
  const clientAddress = envManage.get('FRONTEND_URL');

  const allowedOrigins: string[] = [];
  if (!serverAddress || typeof serverAddress !== 'string') {
    loggerMonday.error(
      'MNDY_SERVER_ADDRESS is not set in environment variables',
    );
  } else {
    allowedOrigins.push(serverAddress);
  }

  if (!clientAddress || typeof clientAddress !== 'string') {
    loggerMonday.error('FRONTEND_URL is not set in environment variables');
  } else {
    allowedOrigins.push(clientAddress);
  }

  loggerMonday.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (
      origin: string,
      callback: (arg0: Error | null, arg1: boolean) => any,
    ) => {
      if (!origin) {
        // block requests without Origin header
        return callback(null, false);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'jwt-session-token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // await app.listen(process.env.PORT ?? 8080);

  app.setGlobalPrefix(configService.get<string>('apiPrefix', 'api'));
  const port = configService.get<string>('PORT', '8080');

  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`App is ready and listening on port ${port} 🚀`);
}

bootstrap().catch(handleError);

function handleError(error: unknown) {
  new Logger('Bootstrap').error(error);
  process.exit(1);
}

process.on('uncaughtException', handleError);
