import { IsString, IsOptional } from 'class-validator';

export class CallbackQuery {
    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    scope?: string;

    @IsOptional()
    error?: string;
}
