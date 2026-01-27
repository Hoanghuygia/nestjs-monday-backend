import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CalendarWebhookNotificationDto {
	@IsNotEmpty()
	@IsString()
	channelId!: string;

	@IsNotEmpty()
	@IsString()
	resourceId!: string;

	@IsNotEmpty()
	@IsString()
	resourceUri!: string;

	@IsOptional()
	@IsString()
	resourceState?: string;

	@IsOptional()
	@IsString()
	eventId?: string;

	@IsOptional()
	@IsString()
	eventType?: string;
}
