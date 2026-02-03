import {
  EnvironmentVariablesManager,
  Logger as MondayLogger,
} from '@mondaycom/apps-sdk';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from '@/app/app.module';
import { Logger } from '@/src/utils/logger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Monday Logger for bootstrap logic (before NestJS app is fully ready/injectable)
  const loggerMonday = new MondayLogger('Bootstrap');
  const envManage = new EnvironmentVariablesManager({ updateProcessEnv: true });
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.useGlobalInterceptors(new TransformInterceptor());

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
    loggerMonday.warn('FRONTEND_URL is not set in environment variables');
  } else {
    allowedOrigins.push(clientAddress);
  }

  // Add wildcard for Monday.com apps tunnel domains
  allowedOrigins.push('https://*.apps-tunnel.monday.app');

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
      
      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check wildcard patterns (e.g., *.apps-tunnel.monday.app)
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
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

  app.setGlobalPrefix(configService.get<string>('API_PREFIX', '/api/v1'));
  const port = configService.get<string>('PORT', '8080');

  await app.listen(port, '0.0.0.0');

  // Use app.resolve to get a transient scoped provider
  const logger = await app.resolve(Logger);
  logger.info(`App is ready and listening on port ${port} 🚀`);
}

bootstrap().catch(handleError);

function handleError(error: unknown) {
  new MondayLogger('Bootstrap').error(JSON.stringify(error));
  process.exit(1);
}

process.on('uncaughtException', handleError);
