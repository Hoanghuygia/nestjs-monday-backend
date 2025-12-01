import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { Logger } from '@/src/utils/logger';

import { ErrorResponseDTO } from './dtos/error-response.dto';
import { StandardResponse } from './dtos/standard-response';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);
  constructor(private readonly configService: ConfigService) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorMessage: string;
    let validationErrors: unknown = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const msg = (exceptionResponse as Record<string, unknown>).message;
      if (Array.isArray(msg)) {
        errorMessage = 'Validation failed';
        validationErrors = msg;
      } else {
        errorMessage = (msg as string) || 'Validation failed';
      }
    } else {
      errorMessage = exceptionResponse || 'Validation failed';
    }

    this.logger.error(
      JSON.stringify({
        message: errorMessage,
        validationErrors,
        stack: exception.stack,
      }),
    );

    const errorDto = new ErrorResponseDTO();
    // Here you could map validationErrors to errorDto.records if your DTO supports it

    // If validationErrors is an array, join them for the main message or keep generic
    const finalMessage = Array.isArray(validationErrors)
      ? (validationErrors as string[]).join(', ')
      : errorMessage;

    const errorResponse = StandardResponse.error(
      errorDto,
      'VALIDATION_ERROR',
      finalMessage,
      status.toString(),
    );

    if (this.configService.get('NODE_ENV') !== 'production') {
      errorResponse.debug = {
        originalResponse: exceptionResponse,
        stack: exception.stack,
        validationErrors,
      };
    }

    response.status(status).json(errorResponse);
  }
}
