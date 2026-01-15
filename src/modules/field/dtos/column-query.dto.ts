import { IsEnum, IsOptional } from 'class-validator';
import { ColumnType } from 'src/graphql/generated/graphql';

export class ColumnsQueryDTO {
    @IsOptional()
    @IsEnum(ColumnType)
    type?: ColumnType;
}