import { Logger } from 'src/utils/logger';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ManageService } from '@/src/modules/management/manage.service';
import { StandardResponse } from '@/src/common/filters/dtos/standard-response';

@Injectable()
export class DevGuard implements CanActivate {
    constructor(
        private readonly manageService: ManageService,
        private readonly logger: Logger,    
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        const token = request.headers['dev-token'];
        if (!token || typeof token !== 'string') {
            this.logger.error(`No dev token present`);
                  const errorResponse = StandardResponse.error(
                    null,
                    'NO_DEV_TOKEN',
                    'No dev token present',
                    '401',
                  );
                  throw new UnauthorizedException(errorResponse);
        }

        this.logger.debug(`Dev token present: ${token}`);   
        const expectedToken = this.manageService.getEnv('DEV_TOKEN')?.toString();
        this.logger.debug(`Expected dev token: ${expectedToken}`);
        if (token !== expectedToken) {
            this.logger.error(`Invalid dev token`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_DEV_TOKEN',
                'Invalid dev token',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }
        return true;
    }
}
