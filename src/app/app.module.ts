import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { HealthModule } from '@/app/health/health.module';
import { UserModule } from '@/contexts/users/user.module';

import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ValidationExceptionFilter } from '../common/filters/validation-exception.filter';
import { GlobalLoggerModule } from '../modules/global-logger.module';
import { ManageModule } from '../modules/management/manage.module';
import { MondayModule } from '../modules/monday/monday.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    GlobalLoggerModule,
    HealthModule,
    UserModule,
    MondayModule,
    ManageModule,
  ],
  providers: [
    // Filters are executed in REVERSE order of registration
    // Register GlobalExceptionFilter first so it executes LAST (as fallback)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
  ],
})
export class AppModule {}
