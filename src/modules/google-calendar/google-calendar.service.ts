import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '@/src/utils/logger';
import type { GoogleCalendarEvent, CalendarChannelInfo } from './@types/calendar-event.type';
import { CalendarDomainEvent } from '@/src/modules/google-calendar/@types/calendar-domain-event.type';
import { mapGoogleEventToDomain } from '@/src/modules/google-calendar/mappers/calendar-event.mapper';

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

	getAuthUrl(userId: string, accountId: number): string {
		const scopes = [
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/calendar.events',
		];

        const state = JSON.stringify({ userId, accountId });
        const encodedState = Buffer.from(state).toString('base64');

		return this.oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: scopes,
			state: encodedState,
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

	async createCalendarEvent(
		calendarId: string,
		title: string,
		startTime: string,
		endTime: string,
		description?: string,
		attendeeEmail?: string,
		metadata?: Record<string, string>,
	): Promise<GoogleCalendarEvent | null> {
		try {
			const normalizedStartTime = this.normalizeDateTime(startTime);
			const normalizedEndTime = this.normalizeDateTime(endTime);

			if (!normalizedStartTime || !normalizedEndTime) {
				this.logger.error(
					`Invalid datetime format. startTime=${startTime}, endTime=${endTime}`,
				);
				return null;
			}

			const event = {
				summary: title,
				description: description || '',
				extendedProperties: metadata
					? { private: metadata }
					: undefined,
				start: {
					dateTime: normalizedStartTime,
					timeZone: 'Asia/Ho_Chi_Minh',
				},
				end: {
					dateTime: normalizedEndTime,
					timeZone: 'Asia/Ho_Chi_Minh',
				},
				attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
			};

			this.logger.info(`Creating calendar event with data: ${JSON.stringify(event)}`);

			const response = await this.calendar.events.insert({
				calendarId,
				requestBody: event,
			});

			this.logger.info(`Event link: ${response.data.htmlLink}`);
			return response.data as GoogleCalendarEvent;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`❌ Failed to create calendar event: ${err.message}`);
			this.logger.error(`Error stack: ${err.stack}`);
			return null;
		}
	}

	private normalizeDateTime(input: string): string | null {
		if (!input) return null;

		const trimmed = input.trim();

		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
			return trimmed;
		}

		const monthMap: Record<string, string> = {
			january: '01',
			february: '02',
			march: '03',
			april: '04',
			may: '05',
			june: '06',
			july: '07',
			august: '08',
			september: '09',
			october: '10',
			november: '11',
			december: '12',
		};

		const monthNameMatch = trimmed.match(/^\d{2}\s+[A-Za-z]+\s+\d{4}\s+\d{2}:\d{2}$/);
		if (monthNameMatch) {
			const [dayStr, monthStr, yearStr, timeStr] = trimmed.split(/\s+/);
			const monthKey = monthStr.toLowerCase();
			const month = monthMap[monthKey];
			if (!month) return null;
			const [hour, minute] = timeStr.split(':');
			return `${yearStr}-${month}-${dayStr}T${hour}:${minute}:00+07:00`;
		}

		const ymdMatch = trimmed.match(/^\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}$/);
		if (ymdMatch) {
			const [dateStr, timeStr] = trimmed.split(/\s+/);
			const [year, month, day] = dateStr.split(/[-/]/);
			const [hour, minute] = timeStr.split(':');
			return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
		}

		const dmyMatch = trimmed.match(/^\d{2}[-/]\d{2}[-/]\d{4}\s+\d{2}:\d{2}$/);
		if (dmyMatch) {
			const [dateStr, timeStr] = trimmed.split(/\s+/);
			const [day, month, year] = dateStr.split(/[-/]/);
			const [hour, minute] = timeStr.split(':');
			return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
		}

		return null;
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
	): Promise<{ events: CalendarDomainEvent[]; nextSyncToken: string }> {
		try {			
			const response = await this.calendar.events.list({
				calendarId,
				syncToken: syncToken || undefined,
				singleEvents: true,
				showDeleted: true,
				maxResults: 2500,
			});

			const events = (response.data.items || []).map(mapGoogleEventToDomain);
			const nextSyncToken = response.data.nextSyncToken || '';
			
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
