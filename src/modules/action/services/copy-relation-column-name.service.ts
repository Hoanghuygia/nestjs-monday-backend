import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ManageService } from "../../management/manage.service";
import { AuthService } from "../../auth/auth.service";
import { Logger } from "@/src/utils/logger";
import { Request, Response } from 'express';
import { CopyRelationColumnToNameDTO } from "../dtos/copy-relation-column-to-name.dto";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";

@Injectable()
export class CopyRelationColumnToNameService {
    constructor(
        private readonly manageService: ManageService,
        private readonly authService: AuthService,
        private readonly logger: Logger,
    ){}

    async execute(req: Request, res: Response, body: CopyRelationColumnToNameDTO) {
        if(!req.session.shortLivedToken || !req.session.accountId){
            this.logger.error(`No shortlive token or accountId found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'No shortlive token or accountId found',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const boardId = body.payload.inputFields;

        if(!boardId){
            this.logger.error(`No boardId found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_BOARD_ID',
                'No boardId found',
                '400',
            );
            throw new BadRequestException(errorResponse);
        }

        const accessToken = await this.authService.getAccessToken(req.session.accountId.toString());
        if(!accessToken){
            this.logger.error(`No access token found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'No access token found',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const mondayClient = this.manageService.getServer(accessToken.access_token);

        // get all item in board
        

    }
}