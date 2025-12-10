import { Controller, Get, InternalServerErrorException, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { AuthService } from './auth.service';
import { Logger } from "@mondaycom/apps-sdk";
import { AuthGuardFactory } from '../../common/guards/auth.guard';
import { Request, Response } from "express";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import * as jwt from 'jsonwebtoken';
import { CallbackQuery } from "./dto/monday-callback-query.dto";
import { ManageService } from "../management/manage.service";
import { AccountService } from "../account/account.service";

@Controller('/auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService, private readonly manageService: ManageService, private readonly accountService: AccountService) { }

    @Get('authorize')
    @UseGuards(AuthGuardFactory('MONDAY_SIGNING_SECRET'))
    async authorize(@Req() req: Request, @Res() res: Response) {
        this.logger.info("Start authorization process");

        // Actualy, we do not need to check session here because AuthGuard already check the token and session
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

        if (!accountId || !userId || !shortLivedToken || !backToUrl) {
            this.logger.error("Missing accountId or userId or shortLivedToken or backToUrl in session");
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'Missing accountId or userId or shortLivedToken or backToUrl in session',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        const accessToken = await this.authService.getAccessToken(accountId.toString());
        if (accessToken) {
            return res.redirect(backToUrl);
        }

        // Generate state JWT with payload: accountId, backToUrl
        const state = this.generateState(accountId.toString(), backToUrl);

        const params = new URLSearchParams({
            client_id: String(this.manageService.getEnv('MONDAY_CLIENT_ID')),
            state: state,
            redirect_uri: `${this.manageService.getEnv('MONDAY_SERVER_ADDRESS')}/monday/auth/callback`
        });

        const workSpace = await this.accountService.getAccountWorkspace(shortLivedToken);

        if (!workSpace) {
            res.redirect(`https://auth.monday.com/oauth2/authorize?${params.toString()}`);
        }
        res.redirect(`https://${workSpace}.monday.com/oauth2/authorize?${params.toString()}`);
    }

    @Get('callback')
    async callback(
        @Query() query: CallbackQuery,
        @Req() req: Request,
        @Res() res: Response
    ) {
        this.logger.info("Handling OAuth2 callback");
        this.logger.debug(`Callback query parameters: ${JSON.stringify(query)}`);
        const { code, state, scope, error } = query;

        if (!state || error) {
            this.logger.error(`Invalid state or error received in callback: ${error}`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_CALLBACK_PARAMETERS',
                'Invalid state or error received in callback',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        const { accountId, backToUrl } = this.verifyState(state);
        if (!accountId || !backToUrl) {
            // trong case này hình như là nếu không có thf là do user không approve quyền 
            this.logger.error(`AccountId or backToUrl missing in state payload`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_STATE_PAYLOAD',
                'State payload is invalid',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        try {
            this.logger.info(`Exchanging code for access token for accountId: ${accountId}`);
            const token = await this.authService.exchangeCodeForToken(code!, `${this.manageService.getEnv('BASE_URL')}/monday/auth/callback`);
            this.authService.storeAccessToken(accountId, token);
            this.logger.info(`Access token stored successfully for accountId: ${accountId}`);
            return res.redirect(backToUrl);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error exchanging code for token or storing access token: ${errorMessage}`);
            const errorResponse = StandardResponse.error(
                null,
                'TOKEN_EXCHANGE_FAILED',
                'Failed to exchange code for token or store access token',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }
    }

    private generateState(accountId: string, backToUrl: string): string {
        const singingSecret = this.manageService.getSecret('MONDAY_SIGNING_SECRET');

        if (!singingSecret || typeof singingSecret !== 'string') {
            this.logger.error('Monday signing secret is not configured');
            const errorResponse = StandardResponse.error(
                null,
                'MONDAY_SIGNING_SECRET_NOT_CONFIGURED',
                'Monday signing secret is not configured',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }

        const payload = {
            accountId: accountId,
            backToUrl: backToUrl,
            timestamp: Date.now()
        };

        return jwt.sign(payload, singingSecret, { expiresIn: '5m' });
    }

    private verifyState(state: string): { accountId?: string, backToUrl?: string } {
        const singingSecret = this.manageService.getSecret('MONDAY_SIGNING_SECRET');

        if (!singingSecret || typeof singingSecret !== 'string') {
            this.logger.error('Monday signing secret is not configured');
            const errorResponse = StandardResponse.error(
                null,
                'MONDAY_SIGNING_SECRET_NOT_CONFIGURED',
                'Monday signing secret is not configured',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }

        const payload = jwt.verify(state, singingSecret);

        if (!payload || typeof payload !== 'object' || !('accountId' in payload) || !('backToUrl' in payload)) {
            this.logger.error('Invalid state token payload');
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_STATE_TOKEN_PAYLOAD',
                'State token payload is invalid',
                '401'
            );
            throw new UnauthorizedException(errorResponse);
        }

        return {
            accountId: payload.accountId,
            backToUrl: payload.backToUrl,
        };
    }

}
