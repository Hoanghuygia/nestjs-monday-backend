import type { GoogleCalendarEvent } from './calendar-event.type';

export type CalendarEventChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface CalendarDomainEvent {
	// google: GoogleCalendarEvent;
	googleEventId: string;
	changeType: CalendarEventChangeType;
	title?: string;
	description?: string;
	startTime?: Date;
	endTime?: Date;
	assignee: string | undefined;
	monday?: {
		itemId?: number;
		boardId?: number;
		userId?: string;
	};
}
