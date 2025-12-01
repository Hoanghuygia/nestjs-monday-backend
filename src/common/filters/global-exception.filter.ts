import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { Logger } from '@/src/utils/logger';

import { ErrorResponseDTO } from './dtos/error-response.dto';
import { StandardResponse } from './dtos/standard-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Internal server error';

    this.logger.error(
      JSON.stringify({
        message: (exception as Error).message || message,
        stack: (exception as Error).stack ?? 'no stack trace',
      }),
    );

    const errorDto = new ErrorResponseDTO();
    const errorResponse = StandardResponse.error(
      errorDto,
      'INTERNAL_SERVER_ERROR',
      message,
      status.toString(),
    );

    if (this.configService.get('NODE_ENV') !== 'production') {
      errorResponse.debug = {
        message: (exception as Error).message,
        stack: (exception as Error).stack,
      };
    }

    response.status(status).json(errorResponse);
  }
}
