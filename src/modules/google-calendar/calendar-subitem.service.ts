import { Injectable } from '@nestjs/common';
import { ApiClient } from '@mondaydotcomorg/api';
import { Logger } from '@/src/utils/logger';
import { ManageService } from '../management/manage.service';
import { AuthService } from '../auth/auth.service';
import { CreateSubitemFromCalendarDto } from './dto/create-subitem-from-calendar.dto';
import type { GoogleCalendarEvent } from './@types/calendar-event.type';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class CalendarSubitemService {
	constructor(
		private readonly manageService: ManageService,
		private readonly authService: AuthService,
		private readonly googleCalendarService: GoogleCalendarService,
		private readonly logger: Logger,
	) {}

	async createSubitemFromCalendarEvent(
		accountId: string,
		calendarEvent: GoogleCalendarEvent,
	): Promise<number | null> {
		try {
			// Extract Monday item ID from event description or extended properties
			const parentItemId = this.extractParentItemId(calendarEvent);
			if (!parentItemId) {
				this.logger.warn(`No parent item ID found in calendar event ${calendarEvent.id}`);
				return null;
			}

			// Get board ID from extended properties
			const boardId = this.extractBoardId(calendarEvent);
			if (!boardId) {
				this.logger.warn(`No board ID found in calendar event ${calendarEvent.id}`);
				return null;
			}

			// Get assignee email
			const assignee = calendarEvent.creator?.email || '';

			const accessToken = await this.authService.getAccessToken(accountId);
			if (!accessToken) {
				this.logger.error('No access token found');
				return null;
			}

			const mondayClient = this.manageService.getMondayClient(accessToken.access_token);

			// Calculate duration
			const duration = await this.googleCalendarService.calculateEventDuration(
				calendarEvent.start.dateTime,
				calendarEvent.end.dateTime,
			);

			// Create subitem
			const subitemId = await this.createSubitem(
				mondayClient,
				boardId,
				parentItemId,
				calendarEvent.summary,
				assignee,
				duration,
				calendarEvent.start.dateTime,
				calendarEvent.end.dateTime,
				calendarEvent.description,
			);

			if (subitemId) {
				this.logger.info(
					`Created subitem ${subitemId} for calendar event ${calendarEvent.id}`,
				);
				
				// Store mapping in Monday storage
				await this.storeEventMapping(
					accessToken.access_token,
					calendarEvent.id,
					parentItemId,
					subitemId,
					boardId,
					assignee,
				);
			}

			return subitemId;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to create subitem from calendar event: ${err.message}`);
			return null;
		}
	}

	private extractParentItemId(event: GoogleCalendarEvent): number | null {
		// Check extended properties first
		if (event.extendedProperties?.private?.mondayItemId) {
			return Number.parseInt(event.extendedProperties.private.mondayItemId, 10);
		}

		// Check description
		return this.googleCalendarService.extractMondayItemIdFromDescription(event.description);
	}

	private extractBoardId(event: GoogleCalendarEvent): number | null {
		if (event.extendedProperties?.private?.mondayBoardId) {
			return Number.parseInt(event.extendedProperties.private.mondayBoardId, 10);
		}

		if (event.description) {
			const match = event.description.match(/monday-board-id:\s*(\d+)/i);
			return match ? Number.parseInt(match[1], 10) : null;
		}

		return null;
	}

	private async createSubitem(
		mondayClient: ApiClient,
		boardId: number,
		parentItemId: number,
		itemName: string,
		assignee: string,
		duration: number,
		startTime: string,
		endTime: string,
		description?: string,
	): Promise<number | null> {
		try {
			const mutation = `
				mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
					create_subitem (
						parent_item_id: $parentItemId
						item_name: $itemName
						column_values: $columnValues
					) {
						id
						name
					}
				}
			`;

			const columnValues = {
				person: { personsAndTeams: [{ id: assignee, kind: 'person' }] },
				numbers: duration,
				date: {
					date: new Date(startTime).toISOString().split('T')[0],
					time: new Date(startTime).toTimeString().slice(0, 5),
				},
				text: description || '',
			};

			const variables = {
				parentItemId: parentItemId.toString(),
				itemName,
				columnValues: JSON.stringify(columnValues),
			};

			const response = await mondayClient.request(mutation, { variables }) as any;

			if (response.create_subitem?.id) {
				return Number.parseInt(response.create_subitem.id, 10);
			}

			return null;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to create subitem in Monday: ${err.message}`);
			return null;
		}
	}

	private async storeEventMapping(
		accessToken: string,
		eventId: string,
		parentItemId: number,
		subitemId: number,
		boardId: number,
		assignee: string,
	): Promise<void> {
		try {
			const storage = this.manageService.createStorage(accessToken);
			const storageKey = `calendar-event-mapping:${eventId}`;

			const mapping = {
				eventId,
				parentItemId,
				subitemId,
				boardId,
				assignee,
				createdAt: new Date().toISOString(),
			};

			await storage.set(storageKey, JSON.stringify(mapping));
			this.logger.info(`Stored event mapping for ${eventId}`);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to store event mapping: ${err.message}`);
		}
	}

	async getEventMapping(accessToken: string, eventId: string): Promise<any> {
		try {
			const storage = this.manageService.createStorage(accessToken);
			const storageKey = `calendar-event-mapping:${eventId}`;
			const result = await storage.get(storageKey);

			if (result.success && result.value) {
				return typeof result.value === 'string'
					? JSON.parse(result.value)
					: result.value;
			}

			return null;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Failed to get event mapping: ${err.message}`);
			return null;
		}
	}
}
