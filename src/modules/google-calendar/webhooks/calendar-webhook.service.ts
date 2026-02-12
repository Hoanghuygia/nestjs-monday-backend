import { Injectable } from '@nestjs/common';
import { Logger } from '@/src/utils/logger';
import { GoogleCalendarService } from '../google-calendar.service';
import { ManageService } from '../../management/manage.service';
import { AuthService } from '../../auth/auth.service';
import type { CalendarDomainEvent } from '../@types/calendar-domain-event.type';
import { deleteItemById } from '@/src/graphql/api/mutation/mutation.function';

@Injectable()
export class CalendarWebhookService {
	constructor(
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly manageService: ManageService,
		private readonly authService: AuthService,
		private readonly logger: Logger,
	) { }

	private readonly syncQueue = new Map<string, Promise<void>>();

	async triggerSync(userId: string, resourceUri: string, accountId?: number): Promise<void> {
		const calendarId = this.extractCalendarIdFromUri(resourceUri);
		if (!calendarId) {
			this.logger.warn('Could not extract calendar ID from resource URI');
			return;
		}

		const queueKey = `calendar-sync:${userId}:${calendarId}:${accountId ?? 'na'}`;
		this.enqueueSync(queueKey, async () => {
			await this.processCalendarWebhook(userId, resourceUri, accountId);
		});
	}

	private enqueueSync(queueKey: string, task: () => Promise<void>): void {
		const previous = this.syncQueue.get(queueKey) ?? Promise.resolve();

		const next = previous
			.catch(() => undefined)
			.then(task)
			.catch((error) => {
				const err = error as Error;
				this.logger.error(`Sync task failed: ${err.message}`);
			});

		this.syncQueue.set(
			queueKey,
			next.finally(() => {
				if (this.syncQueue.get(queueKey) === next) {
					this.syncQueue.delete(queueKey);
				}
			}),
		);
	}

	async processCalendarWebhook(
		userId: string,
		resourceUri: string,
		accountId?: number,
	): Promise<void> {
		this.logger.debug("Processing calendar webhook...");
		try {
			// Get user's calendar tokens
			const secureStorage = this.manageService.getSecureStorage();
			const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

			if (!tokensData) {
				this.logger.warn(`No tokens found for user ${userId}`);
				return;
			}

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

			// Use incremental sync with syncToken
			const { events, nextSyncToken } = await this.googleCalendarService.syncEventsWithToken(
				calendarId,
				syncToken || undefined,
			);

			// Store new syncToken
			if (nextSyncToken) {
				await secureStorage.set(syncTokenKey, nextSyncToken);
				this.logger.info('Updated syncToken in storage');
			}

			if (events.length === 0) {
				this.logger.warn('No events returned from syncEventsWithToken');
				return;
			}

			// Handle logic to process events
			await this.syncEventsInMonday(events, accountId);

		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error processing calendar change: ${err.message}`);
		}
	}

	async syncEventsInMonday(
		events: CalendarDomainEvent[],
		accountId?: number,
	): Promise<void> {
		this.logger.info(`Syncing ${JSON.stringify(events)} events to Monday.com...`);
		const event = events[0];

		const changeTypeHandler: Record<string, () => Promise<void>> = {
			CREATE: async () => {
				this.logger.debug("Created");
			},
			UPDATE: async () => {
				this.logger.debug("Updated");
			},
			DELETE: async () => {
				this.logger.debug("Deletting item on Monday");
				if (!event?.monday?.itemId) {
					this.logger.warn('Missing monday itemId in event payload');
					return;
				}
				if (!accountId) {
					this.logger.warn('Missing accountId for Monday item deletion');
					return;
				}
				await this.deleteItemOnMonday(accountId, event.monday.itemId.toString());
			},
		};

		/*
		Bây giờ mình sẽ gọi trigger của nó ở đây ? cần accountId -> accessToken
		Bên kia là nó sẽ gọi postman truyền vào token -> extract lấy accountId -> 
		-> lấy accessToken -> lấy subscriotion -> execute trigger  
		- DELETE: xóa item trên monday -> lấy itemId từ event.extendedProperites 
		*/

		const handler =
			changeTypeHandler[event?.changeType ?? ''] ??
			(async () => this.logger.debug("Unknown status"));

		await handler();

	}

	private async deleteItemOnMonday(accountId: number, itemId: string): Promise<void> {
		const mondayAccessToken = await this.authService.getAccessToken(accountId.toString());
		let accessToken = mondayAccessToken?.access_token;
		if (!accessToken) {
			this.logger.warn(
				`No Monday access token found for accountId: ${accountId}`,
			);
			accessToken = process.env.LOCAL_ACCESS_TOKEN;
			this.logger.debug(`Using LOCAL_ACCESS_TOKEN for deletion: ${accessToken}`);
			if (!accessToken) {
				this.logger.error('No LOCAL_ACCESS_TOKEN set in environment variables');
				return;
			}
		}

		const mondayClient = this.manageService.getMondayClient(
			accessToken,
		);
		const result = await deleteItemById(mondayClient, this.logger, {
			itemId: itemId,
		});

		if (!result.success) {
			this.logger.error(
				`Failed to delete Monday item ${itemId}`,
				result.errors,
			);
		}
	}

	async setupCalendarWatch(
		userId: string,
		accountId: number,
		accessToken: string,
		calendarId: string,
	): Promise<void> {
		try {
			this.googleCalendarService.setCredentials(accessToken);

			this.logger.info(`Using calendar ID: ${calendarId}`);

			const webhookUrl = `${process.env.MDY_SERVER_ADDRESS}/api/v1/google-calendar/webhook`;
			// Sanitize userId to ensure it only contains alphanumeric characters, hyphens, and underscores
			const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '-');
			const channelId = `monday-calendar-${sanitizedUserId}-${Date.now()}`;
			const channelToken = Buffer.from(
				JSON.stringify({ userId, accountId }),
			).toString('base64');

			this.logger.info(`Setting up calendar watch with webhookUrl: ${webhookUrl}, channelId: ${channelId}`);

			const channelInfo = await this.googleCalendarService.watchCalendar(
				calendarId,
				channelId,
				webhookUrl,
				channelToken,
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
			const { nextSyncToken } = await this.googleCalendarService.syncEventsWithToken(
				calendarId,
			);
			this.logger.info(`Next syncToken: ${nextSyncToken}`);

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

	async handleOAuthCallback(code: string, userId: string, accountId: number): Promise<void> {
		try {
			this.logger.info(`Processing OAuth callback for userId: ${userId}, accountId: ${accountId}`);

			// Exchange code for tokens
			const tokens = await this.googleCalendarService.getTokenFromCode(code);
			this.logger.info(`OAuth tokens received`);

			// Store tokens securely
			const secureStorage = this.manageService.getSecureStorage();
			await secureStorage.set(`google-calendar-tokens:${userId}`, JSON.stringify(tokens));
			this.logger.info(`OAuth tokens stored for user ${userId} with ${JSON.stringify(tokens)}`);

			const mondayAccessToken = await this.authService.getAccessToken(accountId.toString());
			this.logger.info(`Monday access token received: ${JSON.stringify(mondayAccessToken)}`);
			// if (!mondayAccessToken) {
			// 	throw new Error(`No access token found for accountId: ${accountId}`);
			// }

			// Create storage for calendar configuration
			// const storage = this.manageService.createStorage(mondayAccessToken.access_token);

			// const storageKey = 'calendar-config';
			// const calendarConfig = await storage.get(storageKey) as any;

			// if (!calendarConfig.success || !calendarConfig.value) {
			// 	this.logger.warn(`No calendar config found for user ${userId}`);
			// 	return;
			// }

			// this.logger.info(`Retrieved calendar config from storage: ${JSON.stringify(calendarConfig)}`);

			// Parse the JSON string from storage value
			// const parsedConfig = JSON.parse(calendarConfig.value);
			// const calendarId = parsedConfig?.calendarId || 'primary';

			// this.logger.info(`Parsed config: ${JSON.stringify(parsedConfig)}`);
			// this.logger.info(`Using calendar ID from config or default: ${calendarId}`);

			// Hardcoded calendarId for now
			const calendarId = '1c98fb7b950790094940b94f1f008d150e8b78ad8e5420d9b88439a09af2f26e@group.calendar.google.com';


			// Perform initial sync to get syncToken
			await this.performInitialSync(userId, tokens.access_token, calendarId);

			// Setup calendar watch
			await this.setupCalendarWatch(userId, accountId, tokens.access_token, calendarId);

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
