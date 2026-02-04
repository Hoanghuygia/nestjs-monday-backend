import { SyncItemInCalendarDTO } from "@/src/modules/action/dtos/sync-item-in-calendar.dto";
import { AuthService } from "@/src/modules/auth/auth.service";
import { ManageService } from "@/src/modules/management/manage.service";
import { GoogleCalendarService } from "@/src/modules/google-calendar/google-calendar.service";
import { Logger } from "@/src/utils/logger";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

@Injectable()
export class SyncItemInCalendarService{
    constructor(
        private readonly logger: Logger,
        private readonly authService: AuthService,
        private readonly manageService: ManageService,
        private readonly googleCalendarService: GoogleCalendarService
    ) {}

    async execute(req: Request, body: SyncItemInCalendarDTO){
        this.logger.info(`Executing sync item in calendar service ${JSON.stringify(body)}`);

        const {shortLivedToken, accountId } = req.session;

        if (!shortLivedToken || !accountId) {
			this.logger.error(`No shortlive token or accountId found`);
			return;
		}

		this.logger.info(`AccountId: ${accountId}`);

		const { currentBoardId, itemId, calendarConfig } = body.payload.inputFields;

        if(!currentBoardId || !itemId || !calendarConfig){
            this.logger.error(`Missing fields`);
            return;
        }

        const {title, assignee, startTime, endTime, duration, link, description} = calendarConfig;

        if(!title || !assignee || !startTime || !endTime){
            this.logger.error(`Missing calendar config fields`);
            return;
        }


        this.logger.info(`Calendar config: ${JSON.stringify(calendarConfig)}`);

        // Get Google Calendar tokens from secure storage
        const secureStorage = this.manageService.getSecureStorage();
        const tokensData = await secureStorage.get(`google-calendar-tokens:hoanghuy051230@gmail.com`) as any;
        // cần phải lấy được userId không phải accountId 

        this.logger.info(`Retrieving Google Calendar tokens for accountId: ${accountId}`);

        this.logger.debug(`Retrieved tokens data: ${JSON.stringify(tokensData)}`);
        if (!tokensData) {
            this.logger.warn(`No Google Calendar tokens found for user ${accountId}`);
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

        // Hardcoded calendar ID
        const calendarId = '1c98fb7b950790094940b94f1f008d150e8b78ad8e5420d9b88439a09af2f26e@group.calendar.google.com';

        // Create event on Google Calendar
        const createdEvent = await this.googleCalendarService.createCalendarEvent(
            calendarId,
            title,
            startTime,
            endTime,
            description,
            assignee,
            link,
        );

        if (!createdEvent) {
            this.logger.error(`Failed to create event on Google Calendar`);
            return;
        }

        this.logger.info(`✅ Successfully created event on Google Calendar: ${createdEvent.id}`);
        this.logger.info(`Event link: ${createdEvent.htmlLink}`);

        // TODO: Optionally store the event ID mapping in storage for future reference
        // const eventMapping = {
        //     eventId: createdEvent.id,
        //     boardId,
        //     itemId,
        //     createdAt: new Date().toISOString(),
        // };
        // await secureStorage.set(`event-mapping:${itemId}`, JSON.stringify(eventMapping));

        return createdEvent;
    }
}