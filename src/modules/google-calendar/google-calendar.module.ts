import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { GoogleCalendarService } from './google-calendar.service';
import { CalendarSubitemService } from './calendar-subitem.service';
import { CalendarWebhookController } from './webhooks/calendar-webhook.controller';
import { CalendarWebhookService } from './webhooks/calendar-webhook.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { AuthModule } from '../auth/auth.module';
import { ManageModule } from '../management/manage.module';
import { Logger } from '@/src/utils/logger';

const routes: Routes = [
	{
		path: 'google-calendar',
		children: [],
	},
];

@Module({
	controllers: [CalendarWebhookController, GoogleCalendarController],
	providers: [
		GoogleCalendarService,
		CalendarSubitemService,
		CalendarWebhookService,
		Logger,
	],
	imports: [RouterModule.register(routes), AuthModule, ManageModule],
	exports: [RouterModule, GoogleCalendarService, CalendarSubitemService],
})
export class GoogleCalendarModule {}