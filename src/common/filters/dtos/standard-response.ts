import { IsObject, IsOptional, IsString } from 'class-validator';

import { ErrorResponseDTO } from './error-response.dto';
import { SuccessResponseDTO } from './success-response.dto';

export class StandardResponse<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  @IsString()
  status!: string;

  @IsString()
  code!: string;

  @IsString()
  message!: string;

  @IsObject()
  @IsOptional()
  data!: SuccessResponseDTO<T> | null;

  @IsObject()
  @IsOptional()
  error!: ErrorResponseDTO<T> | null;

  @IsObject()
  @IsOptional()
  debug?: unknown;

  // Static convenience methods
  static success<T extends Record<string, unknown> = Record<string, unknown>>(
    data: SuccessResponseDTO<T>,
    code: string,
    message = 'SUCCESS',
    status = '200',
  ): StandardResponse<T> {
    const response = new StandardResponse<T>();
    response.code = code;
    response.message = message;
    response.error = null;
    response.data = data;
    response.status = status;
    return response;
  }

  static error<T extends Record<string, unknown> = Record<string, unknown>>(
    error: ErrorResponseDTO<T> | null = null,
    code: string,
    message: string,
    status = '500',
  ): StandardResponse<T> {
    const errorResponse = new StandardResponse<T>();
    errorResponse.code = code;
    errorResponse.message = message;
    errorResponse.error = error;
    errorResponse.data = null;
    errorResponse.status = status;
    return errorResponse;
  }
}
