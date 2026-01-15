import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DependencyDataDTO } from './dependency-data.dto';


export class FieldPayloadDTO<T extends DependencyDataDTO = DependencyDataDTO> {
    @IsOptional()
    @ValidateNested()
    @Type(() => Object) // This will be overridden in specific implementations
    dependencyData?: T;

    @IsNumber()
    recipeId!: number;

    @IsNumber()
    integrationId!: number;
}
