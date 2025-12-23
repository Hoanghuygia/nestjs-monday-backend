import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { StandardResponse } from '@/src/common/filters/dtos/standard-response';
import { Logger } from '@/src/utils/logger';

import { AuthGuardFactory } from '../../common/guards/auth.guard';
import { AccountService } from '../account/account.service';
import { ManageService } from '../management/manage.service';
import { AuthService } from './auth.service';
import { CallbackQuery } from './dto/monday-callback-query.dto';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly logger: Logger,
    private readonly authService: AuthService,
    private readonly manageService: ManageService,
    private readonly accountService: AccountService,
  ) {}

  @Get('authorize')
  @UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
  async authorize(@Req() req: Request, @Res() res: Response) {
    this.logger.info('Start authorization process');

    // Actualy, we do not need to check session here because AuthGuard already check the token and session
    if (!req.session) {
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_TOKEN_PAYLOAD',
        'Session is not initialized',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const { accountId, userId, backToUrl, shortLivedToken } = req.session;

    if (!accountId || !userId || !shortLivedToken || !backToUrl) {
      this.logger.error(
        'Missing accountId or userId or shortLivedToken or backToUrl in session',
      );
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_TOKEN_PAYLOAD',
        'Missing accountId or userId or shortLivedToken or backToUrl in session',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const accessToken = await this.authService.getAccessToken(
      accountId.toString(),
    );
    if (accessToken) {
      this.logger.info(
        `Access token already exists for accountId: ${accountId}`,
      );
      res.redirect(backToUrl);
      return;
    }

    // Generate state JWT with payload: accountId, backToUrl
    const state = this.generateState(accountId.toString(), backToUrl);

    const clientId = String(this.manageService.getEnv('MDY_CLIENT_ID') ?? '');
    const serverAddress = String(
      this.manageService.getEnv('MDY_SERVER_ADDRESS') ?? '',
    );

    const params = new URLSearchParams({
      client_id: clientId,
      state: state,
      redirect_uri: `${serverAddress}/api/v1/monday/auth/callback`,
    });

    const workSpace =
      await this.accountService.getAccountWorkspace(shortLivedToken);

    if (!workSpace) {
      res.redirect(
        `https://auth.monday.com/oauth2/authorize?${params.toString()}`,
      );
      return;
    }
    res.redirect(
      `https://${workSpace}.monday.com/oauth2/authorize?${params.toString()}`,
    );
  }

  @Get('callback')
  async callback(
    @Query() query: CallbackQuery,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.info('Handling OAuth2 callback');
    const { code, state, error } = query;

    if (!state || error) {
      this.logger.error(
        `Invalid state or error received in callback: ${error}`,
      );
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_CALLBACK_PARAMETERS',
        'Invalid state or error received in callback',
        '401',
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
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    if (!code) {
      this.logger.error(`Code is missing in callback`);
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_CODE_PAYLOAD',
        'Code is missing in callback',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const serverAddress = String(
      this.manageService.getEnv('MDY_SERVER_ADDRESS') ?? '',
    );
    const token = await this.authService.exchangeCodeForToken(
      code,
      `${serverAddress}/api/v1/monday/auth/callback`,
    );
    this.authService
      .storeAccessToken(accountId, token)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to store access token for accountId: ${String(error)}`,
        );
        const errorResponse = StandardResponse.error(
          null,
          'FAILED_TO_STORE_ACCESS_TOKEN',
          'Failed to store access token',
          '500',
        );
        throw new BadRequestException(errorResponse);
      });
    res.redirect(backToUrl);
  }

  private generateState(accountId: string, backToUrl: string): string {
    const singingSecret = this.manageService.getSecret('MDY_SIGNING_SECRET');

    if (!singingSecret || typeof singingSecret !== 'string') {
      this.logger.error('Monday signing secret is not configured');
      const errorResponse = StandardResponse.error(
        null,
        'MDY_SIGNING_SECRET_NOT_CONFIGURED',
        'Monday signing secret is not configured',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    const payload = {
      accountId: accountId,
      backToUrl: backToUrl,
      timestamp: Date.now(),
    };

    return jwt.sign(payload, singingSecret, { expiresIn: '5m' });
  }

  private verifyState(state: string): {
    accountId?: string;
    backToUrl?: string;
  } {
    const singingSecret = this.manageService.getSecret('MDY_SIGNING_SECRET');

    if (!singingSecret || typeof singingSecret !== 'string') {
      this.logger.error('Monday signing secret is not configured');
      const errorResponse = StandardResponse.error(
        null,
        'MDY_SIGNING_SECRET_NOT_CONFIGURED',
        'Monday signing secret is not configured',
        '400',
      );
      throw new BadRequestException(errorResponse);
    }

    const payload = jwt.verify(state, singingSecret);

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('accountId' in payload) ||
      !('backToUrl' in payload)
    ) {
      this.logger.error('Invalid state token payload');
      const errorResponse = StandardResponse.error(
        null,
        'INVALID_STATE_TOKEN_PAYLOAD',
        'State token payload is invalid',
        '401',
      );
      throw new UnauthorizedException(errorResponse);
    }

    return {
      accountId: payload.accountId,
      backToUrl: payload.backToUrl,
    };
  }
}
