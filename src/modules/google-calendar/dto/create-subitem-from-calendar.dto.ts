import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateSubitemFromCalendarDto {
	@IsNotEmpty()
	@IsNumber()
	parentItemId!: number;

	@IsNotEmpty()
	@IsNumber()
	boardId!: number;

	@IsNotEmpty()
	@IsString()
	eventId!: string;

	@IsNotEmpty()
	@IsString()
	eventName!: string;

	@IsNotEmpty()
	@IsString()
	assignee!: string;

	@IsNotEmpty()
	@IsString()
	startTime!: string;

	@IsNotEmpty()
	@IsString()
	endTime!: string;

	@IsOptional()
	@IsString()
	description?: string;
}
