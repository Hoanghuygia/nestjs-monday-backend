import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { Observable } from 'rxjs';

import { ManageService } from '@/src/modules/management/manage.service';
import { Logger } from '@/src/utils/logger';

import { StandardResponse } from '../filters/dtos/standard-response';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly logger: Logger,
    private readonly manageService: ManageService,
    private readonly secretKeyName: string,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Validation logic - no try-catch to preserve exception format
    let { authorization } = req.headers;

    if (!authorization && req.query && typeof req.query.token === 'string') {
      this.logger.debug('Checking query for token');
      authorization = req.query.token;
    }

    if (!authorization) {
      this.logger.error(`No authorization header present`);
      const errorResponse = StandardResponse.error(
        null,
        'NO_AUTHORIZATION_HEADER',
        'No authorization header present',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    if (typeof authorization !== 'string') {
      this.logger.error(`Invalid authorization header type`);
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_AUTHORIZATION_HEADER',
        'Authorization header must be a string',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const signingSecret = this.manageService.getSecret(this.secretKeyName);
    if (!signingSecret || typeof signingSecret !== 'string') {
      this.logger.error(`Signing secret not found or invalid`);
      const errorResponse = StandardResponse.error(
        null,
        'SIGNING_SECRET_NOT_FOUND',
        'Signing secret not found or invalid',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const tokenPart = authorization.split(' ');
    if (tokenPart.length === 1) {
      authorization = tokenPart[0];
    } else if (tokenPart.length === 2) {
      authorization = tokenPart[1];
    } else {
      this.logger.error(`Invalid authorization header format`);
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_AUTHORIZATION_HEADER',
        'Authorization token must be in format "Bearer <token>" or "<token>"',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const payload = jwt.verify(authorization, signingSecret);

    req.session = payload as MondayTokenPayload;
    return true;
  }
}

// Support dynamic guards: MDY_SIGNING_SECRET, MONDAY_CLINET_SECRET, etc.
export function AuthGuardFactory(secretKeyName: string): Type<CanActivate> {
  @Injectable()
  class CustomAuthGuard extends AuthGuard {
    constructor(logger: Logger, manageService: ManageService) {
      super(logger, manageService, secretKeyName);
    }
  }
  return mixin(CustomAuthGuard);
}
