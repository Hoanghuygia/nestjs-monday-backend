import { Controller, Get, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthService } from './auth.service';
import { Logger } from "@mondaycom/apps-sdk/dist/types/utils/logger";
import { AuthGuardFactory } from '../../common/guards/auth.guard';
import { Request, Response } from "express";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";

@Controller('monday/auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService, private readonly manageService: ManageService) { }

    @Get('authorize')
    @UseGuards(AuthGuardFactory('MONDAY_SIGNING_SECRET'))
    async authorize(@Req() req: Request, @Res() res: Response) {
        this.logger.info("Start authorization process");

        if (!req.session) {
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'Session is not initialized',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }


        const { accountId, userId, backToUrl, shortLivedToken } = req.session;

        if (!accountId || !userId || !shortLivedToken) {
            this.logger.error("Missing accountId or userId or shortLivedToken in session");
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'Missing accountId or userId or shortLivedToken in session',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        const accessToken = await this.authService.getAccessToken(accountId.toString());
        if (accessToken) {
            return res.redirect(backToUrl);
        }

        const state = this.generateState(accountId.toString(), backToUrl);

        const params = new URLSearchParams({
            client_id: String(this.manageService.getEnv('MONDAY_CLIENT_ID')),
            state: state,
            redirect_uri: `${this.manageService.getEnv('BASE_URL')}/monday/auth/callback`
        });

        const workSpace = await this.accountService.getAccountWorkspace(shortLivedToken);

        if (workSpace) {
            res.redirect(`https://auth.monday.com/oauth2/authorize?${params.toString()}`);
        }
        res.redirect(`https://${workSpace}.monday.com/oauth2/authorize?${params.toString()}`);`);


    }
} 
