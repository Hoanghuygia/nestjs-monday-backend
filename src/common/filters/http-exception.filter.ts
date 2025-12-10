import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { Logger } from '@/src/utils/logger';

import { ErrorResponseDTO } from './dtos/error-response.dto';
import { StandardResponse } from './dtos/standard-response';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  constructor(private readonly configService: ConfigService) { }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if the exception already contains a StandardResponse format
    // StandardResponse has: code, status, message, data, error
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse &&
      'status' in exceptionResponse &&
      'message' in exceptionResponse &&
      'data' in exceptionResponse &&
      'error' in exceptionResponse
    ) {
      this.logger.debug('Exception already in StandardResponse format, returning as-is');
      return response.status(status).json(exceptionResponse);
    }

    const message = exception.message;

    this.logger.error(
      JSON.stringify({
        message,
        stack: exception.stack ?? 'no stack trace',

        response: exceptionResponse ?? 'no response',
      }),
    );

    let errorMessage: string;
    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'message' in (exceptionResponse as Record<string, unknown>)
    ) {
      const msg = (exceptionResponse as Record<string, unknown>).message;
      errorMessage = Array.isArray(msg) ? msg.join(', ') : (msg as string);
    } else {
      errorMessage = message;
    }

    const code =
      ((exceptionResponse as Record<string, unknown>)?.code as string) ||
      status.toString();
    const errorDto = new ErrorResponseDTO();

    const errorResponse = StandardResponse.error(
      errorDto,
      code,
      errorMessage,
      status.toString(),
    );

    if (this.configService.get('NODE_ENV') !== 'production') {
      errorResponse.debug = {
        originalResponse: exceptionResponse,
        stack: exception.stack,
      };
    }

    response.status(status).json(errorResponse);
  }
}
