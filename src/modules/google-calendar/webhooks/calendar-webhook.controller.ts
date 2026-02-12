import {
	Controller,
	Post,
	Headers,
	Req,
	Res,
	HttpStatus,
	Get,
	Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@/src/utils/logger';
import { GoogleCalendarService } from '../google-calendar.service';
import { ManageService } from '../../management/manage.service';
import { CalendarWebhookService } from './calendar-webhook.service';

@Controller('google-calendar')
export class CalendarWebhookController {
	constructor(
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly calendarWebhookService: CalendarWebhookService,
		private readonly manageService: ManageService,
		private readonly logger: Logger,
	) {}

	@Post('webhook')
	async handleCalendarWebhook(
		@Headers('x-goog-channel-id') channelId: string,
		@Headers('x-goog-resource-id') resourceId: string,
		@Headers('x-goog-resource-uri') resourceUri: string,
		@Headers('x-goog-resource-state') resourceState: string,
		@Headers('x-goog-channel-token') channelToken: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		try {
			const parsedToken = this.parseChannelToken(channelToken);
			const userId = parsedToken?.userId ?? '';
			const accountId = parsedToken?.accountId;

			if (!userId) {
				this.logger.warn('Missing or invalid x-goog-channel-token');
				return res.status(HttpStatus.BAD_REQUEST).json({
					success: false,
					message: 'Missing or invalid channel token',
				});
			}

			this.logger.info(
				`Received calendar webhook: channelId=${channelId}, state=${resourceState}, userId=${userId}, accountId=${accountId ?? 'n/a'}, resourceUri=${resourceUri}, resourceId=${resourceId}`,
			);

			// Verify webhook authenticity
			if (!channelId || !resourceId) {
				this.logger.warn('Invalid webhook notification');
				return res.status(HttpStatus.BAD_REQUEST).json({
					success: false,
					message: 'Invalid webhook notification',
				});
			}

			// Handle sync event (initial verification)
			if (resourceState === 'sync') {
				this.logger.info('Webhook sync verified');
				return res.status(HttpStatus.OK).json({ success: true });
			}

			// Handle exists event (new or updated event)
			if (resourceState === 'exists') {
				void this.calendarWebhookService.triggerSync(userId, resourceUri, accountId);
			}

			return res.status(HttpStatus.OK).json({ success: true });
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error handling calendar webhook: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: err.message,
			});
		}
	}

	private parseChannelToken(
		channelToken: string,
	): { userId: string; accountId?: number } | null {
		if (!channelToken) {
			return null;
		}

		try {
			const decoded = Buffer.from(channelToken, 'base64').toString('utf-8');
			const parsed = JSON.parse(decoded) as { userId?: unknown; accountId?: unknown };
			if (typeof parsed.userId !== 'string' || parsed.userId.length === 0) {
				return null;
			}

			const accountId =
				typeof parsed.accountId === 'number'
					? parsed.accountId
					: typeof parsed.accountId === 'string'
						? Number.parseInt(parsed.accountId, 10)
						: undefined;

			return Number.isFinite(accountId)
				? { userId: parsed.userId, accountId }
				: { userId: parsed.userId };
		} catch (error) {
			return { userId: channelToken };
		}
	}

	@Get('auth/callback')
	async handleOAuthCallback(
		@Query('code') code: string,
		@Query('state') state: string,
		@Res() res: Response,
	) {
		try {
			if (!code) {
				return res.status(HttpStatus.BAD_REQUEST).send('Authorization code missing');
			}

			this.logger.info(`Code and state received: code=${code}, state=${state}`);

			// Decode state
			const decodedState = Buffer.from(state, 'base64').toString('utf-8');
			const { userId, accountId } = JSON.parse(decodedState);

			this.logger.info(`Decoded state: userId=${userId}, accountId=${accountId}`);

			// Handle OAuth callback logic through service
			await this.calendarWebhookService.handleOAuthCallback(code, userId, accountId);

			return res.send(`
				<html>
					<body>
						<h1>Google Calendar Connected Successfully!</h1>
						<p>You can now close this window and return to Monday.com</p>
						<script>window.close();</script>
					</body>
				</html>
			`);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`OAuth callback error: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to authorize');
		}
	}

	@Get('auth/connect')
	async connectGoogleCalendar(
		@Query('userId') userId: string,
		@Query('accountId') accountId: number,
		@Res() res: Response
	) {
		try {
			if (!userId || !accountId) {
				return res.status(HttpStatus.BAD_REQUEST).send('User ID and Account ID required');
			}

			const authUrl = this.googleCalendarService.getAuthUrl(userId, accountId);
			return res.redirect(authUrl);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error generating auth URL: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to generate auth URL');
		}
	}
}

