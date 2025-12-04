import { ManageService } from "@/src/modules/management/manage.service";
import { CanActivate, ExecutionContext, Injectable, Logger, mixin, Type, UnauthorizedException } from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";
import { StandardResponse } from "../filters/dtos/standard-response";
import jwt from "jsonwebtoken";

@Injectable()
export class AuthGuard implements CanActivate {
    private logger = new Logger(AuthGuard.name);

    constructor(private readonly manageService: ManageService, private readonly secretKeyName: string) {

    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const req = context.switchToHttp().getRequest<Request>(); // nếu không để express thì nó là gì ? 

        try {
            let { authorization } = req.headers;
            this.logger.debug(`Authorization header: ${authorization}`);
            if (!authorization) {
                this.logger.error(`No authorization header present`);
                return false;
            }

            if (typeof authorization !== 'string') {
                this.logger.error(`Invalid authorization header type`);
                const errorResponse = StandardResponse.error(
                    null,
                    'INVALID_AUTHORIZATION_HEADER',
                    'Authorization header must be a string',
                    '401'
                );
                throw new UnauthorizedException(errorResponse);
            }

            const signingSecret = this.manageService.getSecret(this.secretKeyName);
            if(!signingSecret || typeof signingSecret !== 'string'){
                this.logger.error(`Signing secret not found or invalid`);
                const errorResponse = StandardResponse.error(
                    null,
                    'SIGNING_SECRET_NOT_FOUND',
                    'Signing secret not found or invalid',
                    '401'
                );
                throw new UnauthorizedException(errorResponse);
            }

            const tokenPart = authorization.split(' ');
            if (tokenPart.length === 2 || tokenPart[0] === 'Bearer') {
                authorization = tokenPart[1];
            }else
                {
                this.logger.error(`Invalid authorization header format`);
                const errorResponse = StandardResponse.error(
                    null,
                    'INVALID_AUTHORIZATION_FORMAT',
                    'Authorization header must be in the format: Bearer <token>',
                    '401'
                );
                throw new UnauthorizedException(errorResponse);
            }
            authorization = tokenPart[1];

            const payload = jwt.verify(authorization, signingSecret);
            if (!payload || typeof payload !== 'object' || !('userId' in payload) || !('accountId' in payload)) {
                this.logger.error(`Invalid token payload`);
                const errorResponse = StandardResponse.error(
                    null,
                    'INVALID_TOKEN_PAYLOAD',
                    'Token payload is invalid',
                    '401'
                );
                throw new UnauthorizedException(errorResponse);
            }

            req.session = payload as MondayTokenPayload;
        }
        catch (error) {
            const errorDetail = error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                response: (error as any)?.response?.data ?? null
            } : {
                name: 'UnknownError',
                message: String(error),
                stack: null,
                response: null
            }
                ;
            this.logger.error(`AuthGuard error: ${errorDetail.message}`);
        }
        return true;
    }
}

// Support dynamic guards: MONDAY_SIGNING_SECRET, MONDAY_CLINET_SECRET, etc.
export function AuthGuardFactory(secretKeyName: string): Type<CanActivate> {
    @Injectable()
    class CustomAuthGuard extends AuthGuard{
        constructor(manageService: ManageService) {
            super(manageService, secretKeyName);
        }
    }
    return mixin(CustomAuthGuard);
}