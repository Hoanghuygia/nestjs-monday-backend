import { SyncItemInCalendarDTO } from "@/src/modules/action/dtos/sync-item-in-calendar.dto";
import { AuthService } from "@/src/modules/auth/auth.service";
import { ManageService } from "@/src/modules/management/manage.service";
import { GoogleCalendarService } from "@/src/modules/google-calendar/google-calendar.service";
import { Logger } from "@/src/utils/logger";
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { CALENDAR_CONFIG_STORAGE_KEY } from "@/src/constant/constant";
import { updateItemColumns } from "@/src/graphql/api/mutation/mutation.function";

@Injectable()
export class SyncItemInCalendarService {
    constructor(
        private readonly logger: Logger,
        private readonly manageService: ManageService,
        private readonly googleCalendarService: GoogleCalendarService
    ) { }

    async execute(req: Request, body: SyncItemInCalendarDTO) {
        this.logger.info(`Executing sync item in calendar service ${JSON.stringify(body)}`);

        const { shortLivedToken, accountId } = req.session;

        if (!shortLivedToken || !accountId) {
            this.logger.error(`No shortlive token or accountId found`);
            return;
        }

        this.logger.info(`AccountId: ${accountId}`);

        const { currentBoardId, itemId, calendarConfig, columnId } = body.payload.inputFields;

        if (!currentBoardId || !itemId || !calendarConfig || !columnId) {
            this.logger.error(`Missing fields`);
            return;
        }

        const { title, assignee, startTime, endTime, description, userId } = calendarConfig;

        if (!title || !assignee || !startTime || !endTime) {
            this.logger.error(`Missing calendar config fields`);
            return;
        }


        this.logger.info(`Calendar config: ${JSON.stringify(calendarConfig)}`);

        // Get Google Calendar tokens from secure storage
        const secureStorage = this.manageService.getSecureStorage();
        const tokensData = await secureStorage.get(`google-calendar-tokens:${userId}`) as any;

        this.logger.info(`Retrieving Google Calendar tokens for userId: ${userId}`);

        if (!tokensData) {
            this.logger.warn(`No Google Calendar tokens found for user ${userId}`);
            return;
        }

        this.logger.info(`Google Calendar tokens retrieved`);

        const tokens = typeof tokensData === 'string'
            ? JSON.parse(tokensData)
            : tokensData;

        // Set credentials for Google Calendar service
        this.googleCalendarService.setCredentials(
            tokens.access_token,
            tokens.refresh_token,
        );

        const storage = this.manageService.createStorage(shortLivedToken);

        const calendarIdConfig = await storage.get(CALENDAR_CONFIG_STORAGE_KEY) as any;

        if (!calendarIdConfig.success || !calendarIdConfig.value) {
            this.logger.warn(`No calendar config found`);
            return;
        }

		// Parse the JSON string from storage value
        const parsedConfig = JSON.parse(calendarIdConfig.value);
        const calendarId = parsedConfig?.calendarId || 'primary';

        this.logger.debug(`Using calendar ID from config or default: ${calendarId}`);

        let attendeeEmail: string | undefined = assignee;

        try {
            const calendars = await this.googleCalendarService.listCalendars();
            this.logger.debug(`Fetched ${JSON.stringify(calendars)}`);
            const primaryCalendar = calendars.find(cal => cal.primary);
            const primaryCalendarId = primaryCalendar?.id;

            if (primaryCalendarId && assignee === primaryCalendarId) {
                this.logger.debug(
                    `Assignee matches primary calendar (${primaryCalendarId}). Skip attendee to avoid duplicate event on primary.`,
                );
                attendeeEmail = undefined;
            }
        } catch (error) {
            const err = error as Error;
            this.logger.warn(`Failed to resolve primary calendar. Continue with attendee. ${err.message}`);
        }

        // Create event on Google Calendar
        const createdEvent = await this.googleCalendarService.createCalendarEvent(
            calendarId,
            title,
            startTime,
            endTime,
            description,
            attendeeEmail,
            {
                boardId: currentBoardId,
                itemId,
                userId
            },
        );

        if (!createdEvent) {
            this.logger.error(`Failed to create event on Google Calendar`);
            return;
        }

        this.logger.info(`Successfully created event on Google Calendar: ${createdEvent.id}`);

        if (!createdEvent.htmlLink) {
            this.logger.warn(`Event created but no htmlLink returned`);
            return;
        }

        const mondayClient = this.manageService.getMondayClient(shortLivedToken);

        const columnValues: any = {};

		columnValues[columnId] = createdEvent.htmlLink;

        const updateResult = await updateItemColumns(
            mondayClient,
            this.logger,
            {
                boardId: currentBoardId,
                itemId,
                columnValues: JSON.stringify(columnValues),
            },
        );

        if (!updateResult.success) {
            this.logger.error(`Failed to update column ${columnId} for item ${itemId}`);
            return;
        }

        this.logger.info(`Updated column ${columnId} with event link`);

        return;
    }
}