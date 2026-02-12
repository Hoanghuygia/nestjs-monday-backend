import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Logger } from '@/src/utils/logger';
import { GoogleCalendarService } from './google-calendar.service';
import { ManageService } from '../management/manage.service';

@Controller('google-calendar')
export class GoogleCalendarController {
	constructor(
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly manageService: ManageService,
		private readonly logger: Logger,
	) {}

	// @Get('sync-now')
	// async syncCalendarNow(
	// 	@Query('userId') userId: string,
	// 	@Query('calendarId') calendarId: string,
	// 	@Res() res: Response,
	// ) {
	// 	try {
	// 		if (!userId) {
	// 			return res.status(HttpStatus.BAD_REQUEST).json({
	// 				success: false,
	// 				message: 'User ID required',
	// 			});
	// 		}

	// 		this.logger.info(`Manual sync triggered for user ${userId}, calendarId: ${calendarId || 'primary'}`);

	// 		// Get user's calendar tokens
	// 		const secureStorage = this.manageService.getSecureStorage();
	// 		const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

	// 		this.logger.info(`Tokens data from storage: ${JSON.stringify(tokensData)}`);

	// 		if (!tokensData) {
	// 			this.logger.error('No tokens found in storage');
	// 			return res.status(HttpStatus.NOT_FOUND).json({
	// 				success: false,
	// 				message: 'Calendar not connected. Please connect first.',
	// 			});
	// 		}

	// 		const tokens = typeof tokensData === 'string'
	// 			? JSON.parse(tokensData)
	// 			: tokensData;

	// 		this.googleCalendarService.setCredentials(
	// 			tokens.access_token,
	// 			tokens.refresh_token,
	// 		);

	// 		// Use provided calendarId or default to 'primary'
	// 		const targetCalendarId = calendarId || 'primary';

	// 		// Get events from last 7 days to next 30 days
	// 		const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
	// 		const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days future
			
	// 		const events = await this.googleCalendarService.listEvents(
	// 			targetCalendarId,
	// 			timeMin,
	// 			timeMax,
	// 		);

	// 		this.logger.info(`Events fetched for manual sync: ${JSON.stringify(events)}`);

	// 		this.logger.info(`Found ${events.length} events in calendar ${targetCalendarId}`);

	// 		let processedCount = 0;
	// 		const results = [];

	// 		// Process each event
	// 		for (const event of events) {
	// 			const hasMondayMetadata = 
	// 				event.extendedProperties?.private?.mondayItemId ||
	// 				this.googleCalendarService.extractMondayItemIdFromDescription(
	// 					event.description,
	// 				);

	// 			if (hasMondayMetadata) {
	// 				const subitemId = await this.calendarSubitemService.createSubitemFromCalendarEvent(
	// 					userId,
	// 					event,
	// 				);
					
	// 				if (subitemId) {
	// 					processedCount++;
	// 					results.push({
	// 						eventId: event.id,
	// 						eventTitle: event.summary,
	// 						subitemId,
	// 					});
	// 				}
	// 			}
	// 		}

	// 		return res.status(HttpStatus.OK).json({
	// 			success: true,
	// 			message: `Sync completed. Processed ${processedCount} events with Monday metadata.`,
	// 			totalEvents: events.length,
	// 			processedEvents: processedCount,
	// 			results,
	// 		});

	// 	} catch (error) {
	// 		const err = error as Error;
	// 		this.logger.error(`Manual sync error: ${err.message}`);
	// 		return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
	// 			success: false,
	// 			message: `Sync failed: ${err.message}`,
	// 		});
	// 	}
	// }

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
}
