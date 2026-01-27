import { Injectable } from '@nestjs/common';
import { Logger } from '@/src/utils/logger';
import { GoogleCalendarService } from '../google-calendar.service';
import { CalendarSubitemService } from '../calendar-subitem.service';
import { ManageService } from '../../management/manage.service';

@Injectable()
export class CalendarWebhookService {
	constructor(
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly calendarSubitemService: CalendarSubitemService,
		private readonly manageService: ManageService,
		private readonly logger: Logger,
	) {}

	async processCalendarChange(
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

			// Get syncToken from storage
			const syncTokenKey = `calendar-sync-token:${userId}:${calendarId}`;
			const syncToken = await secureStorage.get(syncTokenKey) as string | null;

			this.logger.info(`Using syncToken: ${syncToken ? 'yes' : 'no (initial sync)'}`);
			this.logger.info(`Sync token value: ${syncToken}`);

			// Use incremental sync with syncToken
			const { events, nextSyncToken } = await this.googleCalendarService.syncEventsWithToken(
				calendarId,
				syncToken || undefined,
			);

			this.logger.info(`Synced ${events.length} events (including deleted)`);
			this.logger.info(`Event: ${JSON.stringify(events)}`);

			// Store new syncToken
			if (nextSyncToken) {
				await secureStorage.set(syncTokenKey, nextSyncToken);
				this.logger.info('Updated syncToken in storage');
			}

			this.logger.info(`Processing events !!!!!!!!`);

			// Handle logic to process events 

		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error processing calendar change: ${err.message}`);
		}
	}

	async setupCalendarWatch(userId: string, accessToken: string, calendarId: string): Promise<void> {
		try {
			this.googleCalendarService.setCredentials(accessToken);

			this.logger.info(`Using calendar ID: ${calendarId}`);

			const webhookUrl = `${process.env.MDY_SERVER_ADDRESS}/api/v1/google-calendar/webhook`;
			const channelId = `monday-calendar-${userId}-${Date.now()}`;

			this.logger.info(`Setting up calendar watch with webhookUrl: ${webhookUrl}, channelId: ${channelId}`);

			const channelInfo = await this.googleCalendarService.watchCalendar(
				calendarId,
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
			throw error;
		}
	}

	async performInitialSync(userId: string, accessToken: string, calendarId: string): Promise<void> {
		try {
			this.googleCalendarService.setCredentials(accessToken);

			// Perform initial sync to get syncToken
			const { events, nextSyncToken } = await this.googleCalendarService.syncEventsWithToken(
				calendarId,
			);

			this.logger.info(`Initial sync completed: ${events.length} events, syncToken obtained`);

			// Store syncToken
			if (nextSyncToken) {
				const secureStorage = this.manageService.getSecureStorage();
				const syncTokenKey = `calendar-sync-token:${userId}:${calendarId}`;
				await secureStorage.set(syncTokenKey, nextSyncToken);
				this.logger.info('Stored initial syncToken');
			}

			this.logger.info(`Initial sync processed`);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to perform initial sync: ${err.message}`);
		}
	}

	async handleOAuthCallback(code: string, userId: string): Promise<void> {
		try {
			this.logger.info(`Processing OAuth callback for userId: ${userId}`);

			// Exchange code for tokens
			const tokens = await this.googleCalendarService.getTokenFromCode(code);
			this.logger.info(`OAuth tokens received`);

			// Store tokens securely
			const secureStorage = this.manageService.getSecureStorage();
			await secureStorage.set(`google-calendar-tokens:${userId}`, JSON.stringify(tokens));
			this.logger.info(`OAuth tokens stored for user ${userId}`);

			// Create storage for calendar configuration
			const storage = this.manageService.createStorage(tokens.access_token);

			// TODO: Get calendarId from storage config
			// const storageKey = 'calendar-config';
			// const calendarConfig = await storage.get(storageKey) as any;
			// const calendarId = calendarConfig?.calendarId || 'primary';

			// Hardcoded calendarId for now
			const calendarId = '1c98fb7b950790094940b94f1f008d150e8b78ad8e5420d9b88439a09af2f26e@group.calendar.google.com';

			// Setup calendar watch
			await this.setupCalendarWatch(userId, tokens.access_token, calendarId);

			// Perform initial sync to get syncToken
			await this.performInitialSync(userId, tokens.access_token, calendarId);

			this.logger.info(`OAuth callback processing completed for user ${userId}`);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error in handleOAuthCallback: ${err.message}`);
			throw error;
		}
	}

	private extractCalendarIdFromUri(resourceUri: string): string | null {
		const match = resourceUri.match(/calendars\/([^/]+)\/events/);
		return match ? decodeURIComponent(match[1]) : null;
	}
}
