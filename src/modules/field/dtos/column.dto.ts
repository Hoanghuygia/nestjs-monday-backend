import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldPayloadDTO } from './field-payload.dto';
import { BoardDataDTO } from '../@types/board-data.type';


export class ColumnsDependencyDataDTO {
    @ValidateNested()
    @Type(() => BoardDataDTO)
    @IsObject()
    remoteBoardData!: BoardDataDTO;
}

export class ColumnsPayloadDTO extends FieldPayloadDTO<ColumnsDependencyDataDTO> {
    @ValidateNested()
    @Type(() => ColumnsDependencyDataDTO)
    declare dependencyData: ColumnsDependencyDataDTO;
}

export class ColumnsFieldBodyDTO {
    @ValidateNested()
    @Type(() => ColumnsPayloadDTO)
    payload!: ColumnsPayloadDTO;
}
