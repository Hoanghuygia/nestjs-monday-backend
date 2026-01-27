import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '@/src/utils/logger';
import type { GoogleCalendarEvent, CalendarChannelInfo } from './@types/calendar-event.type';
import { CalendarEventDto } from './dto/calendar-event.dto';

@Injectable()
export class GoogleCalendarService {
	private oauth2Client!: OAuth2Client;
	private calendar!: calendar_v3.Calendar;

	constructor(
		private readonly configService: ConfigService,
		private readonly logger: Logger,
	) {
		this.initializeGoogleClient();
	}

	private initializeGoogleClient() {
		const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
		const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
		const redirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

		if (!clientId || !clientSecret || !redirectUri) {
			this.logger.warn('Google Calendar credentials not configured');
			return;
		}

		this.oauth2Client = new google.auth.OAuth2(
			clientId,
			clientSecret,
			redirectUri,
		) as any;

		this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client as any });
	}

	setCredentials(accessToken: string, refreshToken?: string) {
		this.oauth2Client.setCredentials({
			access_token: accessToken,
			refresh_token: refreshToken,
		});
	}

	getAuthUrl(userId: string): string {
		const scopes = [
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/calendar.events',
		];

		return this.oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			state: userId,
			prompt: 'consent',
		});
	}

	async getTokenFromCode(code: string): Promise<any> {
		try {
			const { tokens } = await this.oauth2Client.getToken(code);
			this.logger.info(`Obtained tokens from authorization code ${JSON.stringify(tokens)}`);
			this.oauth2Client.setCredentials(tokens);
			return tokens;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to get tokens from code: ${err.message}`);
			throw error;
		}
	}

	async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent | null> {
		try {
			const response = await this.calendar.events.get({
				calendarId,
				eventId,
			});

			return response.data as GoogleCalendarEvent;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to get event ${eventId}: ${err.message}`);
			return null;
		}
	}

	async listEvents(calendarId: string, timeMin?: Date, timeMax?: Date): Promise<GoogleCalendarEvent[]> {
		try {
			this.logger.info(`Fetching events from calendar ${calendarId}, timeMin: ${timeMin?.toISOString()}, timeMax: ${timeMax?.toISOString()}`);
			
			const response = await this.calendar.events.list({
				calendarId,
				timeMin: timeMin?.toISOString(),
				timeMax: timeMax?.toISOString(),
				singleEvents: true,
				orderBy: 'startTime',
				maxResults: 100,
			});

			const events = (response.data.items || []) as GoogleCalendarEvent[];
			this.logger.info(`Found ${events.length} events in calendar ${calendarId}`);
			
			return events;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to list events: ${err.message}`);
			this.logger.error(`Error stack: ${err.stack}`);
			return [];
		}
	}

	async createEvent(calendarId: string, eventData: CalendarEventDto): Promise<GoogleCalendarEvent | null> {
		try {
			const event = {
				summary: eventData.summary,
				description: eventData.description,
				start: {
					dateTime: eventData.startDateTime,
					timeZone: eventData.timeZone || 'UTC',
				},
				end: {
					dateTime: eventData.endDateTime,
					timeZone: eventData.timeZone || 'UTC',
				},
				attendees: eventData.attendees?.map(email => ({ email })),
			};

			const response = await this.calendar.events.insert({
				calendarId,
				requestBody: event,
			});

			this.logger.info(`Created event: ${response.data.id}`);
			return response.data as GoogleCalendarEvent;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to create event: ${err.message}`);
			return null;
		}
	}

	async watchCalendar(
		calendarId: string,
		channelId: string,
		webhookUrl: string,
		userId: string,
	): Promise<CalendarChannelInfo | null> {
		try {
			this.logger.info(`Attempting to watch calendar ${calendarId} with webhook ${webhookUrl}`);
			
			const response = await this.calendar.events.watch({
				calendarId,
				requestBody: {
					id: channelId,
					type: 'web_hook',
					address: webhookUrl,
					token: userId,
				},
			});

			const channelInfo: CalendarChannelInfo = {
				channelId: response.data.id!,
				resourceId: response.data.resourceId!,
				calendarId,
				userId,
				expiration: Number.parseInt(response.data.expiration!, 10),
			};

			this.logger.info(`✅ Successfully watching calendar ${calendarId} with channel ${channelId}. Expiration: ${new Date(channelInfo.expiration).toISOString()}`);
			return channelInfo;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`❌ Failed to watch calendar: ${err.message}`);
			this.logger.error(`Error details: ${JSON.stringify(error)}`);
			return null;
		}
	}

	async stopWatching(channelId: string, resourceId: string): Promise<boolean> {
		try {
			await this.calendar.channels.stop({
				requestBody: {
					id: channelId,
					resourceId,
				},
			});

			this.logger.info(`Stopped watching channel ${channelId}`);
			return true;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to stop watching: ${err.message}`);
			return false;
		}
	}

	async calculateEventDuration(startTime: string, endTime: string): Promise<number> {
		const start = new Date(startTime);
		const end = new Date(endTime);
		const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
		return Math.round(durationInHours * 100) / 100;
	}

	extractMondayItemIdFromDescription(description?: string): number | null {
		if (!description) return null;

		const match = description.match(/monday-item-id:\s*(\d+)/i);
		return match ? Number.parseInt(match[1], 10) : null;
	}

	async listCalendars(): Promise<any[]> {
		try {
			const response = await this.calendar.calendarList.list({
				minAccessRole: 'writer',
			});

			const calendars = (response.data.items || []).map(cal => ({
				id: cal.id,
				summary: cal.summary,
				description: cal.description,
				primary: cal.primary,
				accessRole: cal.accessRole,
				backgroundColor: cal.backgroundColor,
			}));

			this.logger.info(`Found ${calendars.length} calendars`);
			return calendars;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to list calendars: ${err.message}`);
			return [];
		}
	}

	async syncEventsWithToken(
		calendarId: string,
		syncToken?: string,
	): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken: string }> {
		try {
			this.logger.info(`Syncing events for calendar ${calendarId} with syncToken: ${syncToken ? 'yes' : 'no (initial sync)'}`);
			
			const response = await this.calendar.events.list({
				calendarId,
				syncToken: syncToken || undefined,
				singleEvents: true,
				showDeleted: true,
				maxResults: 2500,
			});

			const events = (response.data.items || []) as GoogleCalendarEvent[];
			const nextSyncToken = response.data.nextSyncToken || '';

			this.logger.info(`Sync completed: ${events.length} events, nextSyncToken: ${nextSyncToken}`);
			
			return {
				events,
				nextSyncToken,
			};
		} catch (error) {
			const err = error as any;
			
			// If syncToken is invalid, do a full sync
			if (err.code === 410) {
				this.logger.warn('SyncToken expired, performing full sync');
				return this.syncEventsWithToken(calendarId);
			}

			this.logger.error(`Failed to sync events: ${err.message}`);
			throw error;
		}
	}
}
