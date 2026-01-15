import { IsBoolean, IsString } from 'class-validator';

export class ColumnDataDTO {
    @IsString()
    title!: string;

    @IsString()
    value!: string;

    @IsBoolean()
    invalid!: boolean;
}
