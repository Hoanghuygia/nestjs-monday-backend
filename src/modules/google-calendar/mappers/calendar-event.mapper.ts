import type { GoogleCalendarEvent } from '../@types/calendar-event.type';
import type {
	CalendarDomainEvent,
	CalendarEventChangeType,
} from '../@types/calendar-domain-event.type';

const parseOptionalDate = (value?: string | null): Date | undefined => {
	if (!value) return undefined;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseOptionalNumber = (value?: string | null): number | undefined => {
	if (!value) return undefined;
	const numberValue = Number.parseInt(value, 10);
	return Number.isNaN(numberValue) ? undefined : numberValue;
};

const normalizeOptionalString = (value?: string | null): string | undefined =>
	value ?? undefined;

const resolveChangeType = (event: GoogleCalendarEvent): CalendarEventChangeType => {
	if (event.status === 'cancelled') {
		return 'DELETE';
	}

	const createdAt = parseOptionalDate(event.created ?? undefined);
	const updatedAt = parseOptionalDate(event.updated ?? undefined);

	if (!createdAt || !updatedAt) {
		return 'CREATE';
	}

	const diffMs = Math.abs(updatedAt.getTime() - createdAt.getTime());
	if (diffMs <= 2000) {
		return 'CREATE';
	}

	return 'UPDATE';
};

const resolveAssignee = (event: GoogleCalendarEvent): string | undefined => {
	return (
		normalizeOptionalString(event.extendedProperties?.private?.userId) ??
		normalizeOptionalString(event.creator?.email) ??
		normalizeOptionalString(event.organizer?.email) ??
		normalizeOptionalString(event.attendees?.[0]?.email)
	);
};

export const mapGoogleEventToDomain = (
	event: GoogleCalendarEvent,
): CalendarDomainEvent => {
	const startValue = event.start?.dateTime ?? event.start?.date ?? undefined;
	const endValue = event.end?.dateTime ?? event.end?.date ?? undefined;
	const privateProps = event.extendedProperties?.private;

	return {
		// google: event,
		googleEventId: event.id ?? '',
		changeType: resolveChangeType(event),
		title: event.summary ?? undefined,
		description: event.description ?? undefined,
		startTime: parseOptionalDate(startValue),
		endTime: parseOptionalDate(endValue),
		assignee: resolveAssignee(event),
		monday: {
			itemId:
				parseOptionalNumber(privateProps?.itemId) ||
				parseOptionalNumber(privateProps?.mondayItemId),
			boardId:
				parseOptionalNumber(privateProps?.boardId) ||
				parseOptionalNumber(privateProps?.mondayBoardId),
			userId: privateProps?.userId,
		},
	};
};
