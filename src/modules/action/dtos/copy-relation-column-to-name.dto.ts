import { IsObject } from 'class-validator';
import { ActionRequestDTO } from '../../account/dto/common/_action.dto';
import { BoardDataDTO } from '../../field/@types/board-data.type';
import { ColumnDataDTO } from '../../field/@types/column-data.type';

class CopyRelationColumnToNameFieldsDTO {
    @IsObject()
    subItemBoardId!: BoardDataDTO;

    @IsObject()
    subColumnBoardId!: ColumnDataDTO;
}

export class CopyRelationColumnToNameDTO extends ActionRequestDTO<CopyRelationColumnToNameFieldsDTO> { }
