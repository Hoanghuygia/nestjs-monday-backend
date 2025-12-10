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

        // Validation logic - no try-catch to preserve exception format
        let { authorization } = req.headers;
        this.logger.debug(`Authorization header: ${authorization}`);

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
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        this.logger.debug(`Authorization header: ${authorization}`);

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
        if (!signingSecret || typeof signingSecret !== 'string') {
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
        authorization = tokenPart[1];

        const payload = jwt.verify(authorization, signingSecret);

        req.session = payload as MondayTokenPayload;
        return true;

    }
}

// Support dynamic guards: MONDAY_SIGNING_SECRET, MONDAY_CLINET_SECRET, etc.
export function AuthGuardFactory(secretKeyName: string): Type<CanActivate> {
    @Injectable()
    class CustomAuthGuard extends AuthGuard {
        constructor(manageService: ManageService) {
            super(manageService, secretKeyName);
        }
    }
    return mixin(CustomAuthGuard);
}