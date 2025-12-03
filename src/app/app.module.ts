import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { HealthModule } from '@/app/health/health.module';
import { UserModule } from '@/contexts/users/user.module';
import { LoggerModule } from '@/shared/logger/logger.module';

import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { MondayModule } from '../modules/monday/monday.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    LoggerModule,
    HealthModule,
    UserModule,
    MondayModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
