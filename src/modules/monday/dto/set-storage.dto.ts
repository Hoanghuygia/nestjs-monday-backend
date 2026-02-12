import { IsNotEmpty, IsString } from 'class-validator';

export class SetStorageDto {
	@IsString()
	@IsNotEmpty()
	key!: string;

	@IsNotEmpty()
	value!: any;
}
