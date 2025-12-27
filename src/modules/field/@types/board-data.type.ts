import { IsBoolean, IsString } from 'class-validator';

export class BoardDataDTO {
    @IsString()
    title!: string;

    @IsString()
    value!: string;

    @IsBoolean()
    invalid!: boolean;
}
