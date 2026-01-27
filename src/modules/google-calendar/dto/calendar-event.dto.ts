import { IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class CalendarEventDto {
	@IsNotEmpty()
	@IsString()
	summary!: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsNotEmpty()
	@IsDateString()
	startDateTime!: string;

	@IsNotEmpty()
	@IsDateString()
	endDateTime!: string;

	@IsOptional()
	@IsString()
	timeZone?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	attendees?: string[];
}
