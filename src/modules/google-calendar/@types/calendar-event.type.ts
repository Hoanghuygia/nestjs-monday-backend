export interface GoogleCalendarEvent {
	id: string;
	summary: string;
	description?: string;
	start: {
		dateTime: string;
		timeZone?: string;
	};
	end: {
		dateTime: string;
		timeZone?: string;
	};
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus?: string;
	}>;
	creator?: {
		email: string;
		displayName?: string;
	};
	organizer?: {
		email: string;
		displayName?: string;
	};
	status: string;
	htmlLink: string;
	created: string;
	updated: string;
	extendedProperties?: {
		private?: Record<string, string>;
		shared?: Record<string, string>;
	};
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
