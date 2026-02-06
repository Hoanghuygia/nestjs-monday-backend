import type { calendar_v3 } from 'googleapis';

export type GoogleCalendarEventExtendedPrivate = Record<string, string> & {
	itemId?: string;
	boardId?: string;
	userId?: string;
	mondayItemId?: string;
	mondayBoardId?: string;
};

export interface GoogleCalendarEvent extends calendar_v3.Schema$Event {
	extendedProperties?: {
		private?: GoogleCalendarEventExtendedPrivate;
		shared?: Record<string, string>;
	} | null;
}

export interface CalendarChannelInfo {
	channelId: string;
	resourceId: string;
	calendarId: string;
	userId: string;
	expiration: number;
}

export interface EventToSubitemMapping {
	eventId: string;
	parentItemId: number;
	subitemId: number;
	boardId: number;
	assignee: string;
	createdAt: Date;
}
