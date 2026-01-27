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
import { CalendarSubitemService } from '../calendar-subitem.service';
import { AuthService } from '../../auth/auth.service';
import { ManageService } from '../../management/manage.service';

@Controller('google-calendar')
export class CalendarWebhookController {
	constructor(
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly calendarSubitemService: CalendarSubitemService,
		private readonly authService: AuthService,
		private readonly manageService: ManageService,
		private readonly logger: Logger,
	) {}

	@Post('webhook')
	async handleCalendarWebhook(
		@Headers('x-goog-channel-id') channelId: string,
		@Headers('x-goog-resource-id') resourceId: string,
		@Headers('x-goog-resource-uri') resourceUri: string,
		@Headers('x-goog-resource-state') resourceState: string,
		@Headers('x-goog-channel-token') userId: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		try {
			this.logger.info(
				`Received calendar webhook: channelId=${channelId}, state=${resourceState}, userId=${userId}, resourceUri=${resourceUri}, resourceId=${resourceId}`,
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
				await this.processCalendarChange(userId, resourceUri, channelId);
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

	@Get('auth/callback')
	async handleOAuthCallback(
		@Query('code') code: string,
		@Query('state') userId: string,
		@Res() res: Response,
	) {
		try {
			if (!code) {
				return res.status(HttpStatus.BAD_REQUEST).send('Authorization code missing');
			}

			this.logger.info(`Code and state received: code=${code}, userId=${userId}`);

			// Exchange code for tokens
			const tokens = await this.googleCalendarService.getTokenFromCode(code);

			this.logger.info(`OAuth tokens received  ${tokens}`);

			// Store tokens securely
			const secureStorage = this.manageService.getSecureStorage();
			await secureStorage.set(`google-calendar-tokens:${userId}`, JSON.stringify(tokens));

			this.logger.info(`OAuth tokens stored for user ${userId}`);

			// Setup calendar watch
			await this.setupCalendarWatch(userId, tokens.access_token);

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
	async connectGoogleCalendar(@Query('userId') userId: string, @Res() res: Response) {
		try {
			if (!userId) {
				return res.status(HttpStatus.BAD_REQUEST).send('User ID required');
			}

			const authUrl = this.googleCalendarService.getAuthUrl(userId);
			return res.redirect(authUrl);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error generating auth URL: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to generate auth URL');
		}
	}

	@Get('sync-now')
	async syncCalendarNow(
		@Query('userId') userId: string,
		@Query('calendarId') calendarId: string,
		@Res() res: Response,
	) {
		try {
			if (!userId) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					success: false,
					message: 'User ID required',
				});
			}

			this.logger.info(`Manual sync triggered for user ${userId}, calendarId: ${calendarId || 'primary'}`);

			// Get user's calendar tokens
			const secureStorage = this.manageService.getSecureStorage();
			const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

			this.logger.info(`Tokens data from storage: ${JSON.stringify(tokensData)}`);

			if (!tokensData) {
				this.logger.error('No tokens found in storage');
				return res.status(HttpStatus.NOT_FOUND).json({
					success: false,
					message: 'Calendar not connected. Please connect first.',
				});
			}

			const tokens = typeof tokensData === 'string'
				? JSON.parse(tokensData)
				: tokensData;

			this.googleCalendarService.setCredentials(
				tokens.access_token,
				tokens.refresh_token,
			);

			// Use provided calendarId or default to 'primary'
			const targetCalendarId = calendarId || 'primary';

			// Get events from last 7 days to next 30 days
			const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
			const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days future
			
			const events = await this.googleCalendarService.listEvents(
				targetCalendarId,
				timeMin,
				timeMax,
			);

			this.logger.info(`Events fetched for manual sync: ${JSON.stringify(events)}`);

			this.logger.info(`Found ${events.length} events in calendar ${targetCalendarId}`);

			let processedCount = 0;
			const results = [];

			// Process each event
			for (const event of events) {
				const hasMondayMetadata = 
					event.extendedProperties?.private?.mondayItemId ||
					this.googleCalendarService.extractMondayItemIdFromDescription(
						event.description,
					);

				if (hasMondayMetadata) {
					const subitemId = await this.calendarSubitemService.createSubitemFromCalendarEvent(
						userId,
						event,
					);
					
					if (subitemId) {
						processedCount++;
						results.push({
							eventId: event.id,
							eventTitle: event.summary,
							subitemId,
						});
					}
				}
			}

			return res.status(HttpStatus.OK).json({
				success: true,
				message: `Sync completed. Processed ${processedCount} events with Monday metadata.`,
				totalEvents: events.length,
				processedEvents: processedCount,
				results,
			});

		} catch (error) {
			const err = error as Error;
			this.logger.error(`Manual sync error: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `Sync failed: ${err.message}`,
			});
		}
	}

	@Get('list-calendars')
	async listCalendars(@Query('userId') userId: string, @Res() res: Response) {
		try {
			if (!userId) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					success: false,
					message: 'User ID required',
				});
			}

			// Get user's calendar tokens
			const secureStorage = this.manageService.getSecureStorage();
			const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

			if (!tokensData) {
				return res.status(HttpStatus.NOT_FOUND).json({
					success: false,
					message: 'Calendar not connected. Please connect first.',
				});
			}

			const tokens = typeof tokensData === 'string'
				? JSON.parse(tokensData)
				: tokensData;

			this.googleCalendarService.setCredentials(
				tokens.access_token,
				tokens.refresh_token,
			);

			const calendars = await this.googleCalendarService.listCalendars();

			return res.status(HttpStatus.OK).json({
				success: true,
				calendars,
			});

		} catch (error) {
			const err = error as Error;
			this.logger.error(`List calendars error: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				success: false,
				message: `Failed to list calendars: ${err.message}`,
			});
		}
	}

	@Get('check-connection')
	async checkConnection(@Query('userId') userId: string, @Res() res: Response) {
		try {
			if (!userId) {
				return res.status(HttpStatus.BAD_REQUEST).json({
					success: false,
					message: 'User ID required',
				});
			}

			const secureStorage = this.manageService.getSecureStorage();
			const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

			this.logger.info(`Check connection for ${userId}: ${JSON.stringify(tokensData)}`);

			if (!tokensData) {
				return res.status(HttpStatus.OK).json({
					connected: false,
					message: 'Calendar not connected',
				});
			}

			const tokens = typeof tokensData === 'string'
				? JSON.parse(tokensData)
				: tokensData;

			return res.status(HttpStatus.OK).json({
				connected: true,
				message: 'Calendar connected',
				hasAccessToken: !!tokens.access_token,
				hasRefreshToken: !!tokens.refresh_token,
				expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
			});

		} catch (error) {
			const err = error as Error;
			this.logger.error(`Check connection error: ${err.message}`);
			return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
				connected: false,
				message: `Error: ${err.message}`,
			});
		}
	}

	private async processCalendarChange(
		userId: string,
		resourceUri: string,
		channelId: string,
	): Promise<void> {
		try {
			// Get user's calendar tokens
			const secureStorage = this.manageService.getSecureStorage();
			const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

			if (!tokensData) {
				this.logger.warn(`No tokens found for user ${userId}`);
				return;
			}

			this.logger.info(`Tokens data retrieved for user ${userId}: ${JSON.stringify(tokensData)}`);

			const tokens = typeof tokensData === 'string'
				? JSON.parse(tokensData)
				: tokensData;

			this.googleCalendarService.setCredentials(
				tokens.access_token,
				tokens.refresh_token,
			);

			// Extract calendar ID from resource URI
			const calendarId = this.extractCalendarIdFromUri(resourceUri);
			if (!calendarId) {
				this.logger.warn('Could not extract calendar ID from resource URI');
				return;
			}

			this.logger.info(`Processing changes for calendar ID: ${calendarId}`);

			// Get recent events (last 5 minutes to catch new events)
			const timeMin = new Date(Date.now() - 5 * 60 * 1000);
			const events = await this.googleCalendarService.listEvents(
				calendarId,
				timeMin,
			);

			this.logger.info(`Processing ${JSON.stringify(events)} events for user ${userId}`);
			this.logger.info(`Length of events: ${events.length}`);	

			// Process each new event
			for (const event of events) {
				// Check if this event has Monday metadata
				const hasMondayMetadata = 
					event.extendedProperties?.private?.mondayItemId ||
					this.googleCalendarService.extractMondayItemIdFromDescription(
						event.description,
					);

				if (hasMondayMetadata) {
					await this.calendarSubitemService.createSubitemFromCalendarEvent(
						userId,
						event,
					);
				}
			}
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error processing calendar change: ${err.message}`);
		}
	}

	private async setupCalendarWatch(userId: string, accessToken: string): Promise<void> {
		try {
			this.googleCalendarService.setCredentials(accessToken);

			const webhookUrl = `${process.env.MDY_SERVER_ADDRESS}/api/v1/google-calendar/webhook`;
			const channelId = `monday-calendar-${userId}-${Date.now()}`;

			this.logger.info(`Setting up calendar watch with webhookUrl: ${webhookUrl}, channelId: ${channelId}`);

			const channelInfo = await this.googleCalendarService.watchCalendar(
				'1c98fb7b950790094940b94f1f008d150e8b78ad8e5420d9b88439a09af2f26e@group.calendar.google.com',
				channelId,
				webhookUrl,
				userId,
			);

			if (channelInfo) {
				// Store channel info for later cleanup
				const secureStorage = this.manageService.getSecureStorage();
				await secureStorage.set(
					`calendar-channel:${userId}`,
					JSON.stringify(channelInfo),
				);

				this.logger.info(`Calendar watch setup successfully! Channel: ${JSON.stringify(channelInfo)}`);
			} else {
				this.logger.error('Failed to setup calendar watch - channelInfo is null');
			}
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to setup calendar watch: ${err.message}`);
		}
	}

	private extractCalendarIdFromUri(resourceUri: string): string | null {
		const match = resourceUri.match(/calendars\/([^/]+)\/events/);
		return match ? decodeURIComponent(match[1]) : null;
	}
}
