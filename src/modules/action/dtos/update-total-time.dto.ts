import { IsObject, IsString } from 'class-validator';
import { ActionRequestDTO } from '../../account/dto/common/_action.dto';
import { Board, Column } from '@mondaydotcomorg/api';
import { BoardDataDTO } from '@/src/modules/field/@types/board-data.type';
import { ColumnDataDTO } from '@/src/modules/field/@types/column-data.type';

class UpdateTotalTimeFieldsDTO {
    @IsString()
    currentBoardId!: string;

    @IsString()
    morningColumnId!: string;

    @IsString()
    eveningColumnId!: string;

    @IsObject()
    subBoardId!: BoardDataDTO;

    @IsObject()
    timeColumnId!: ColumnDataDTO;

    @IsObject()
    minuteColumnId!: ColumnDataDTO;
}

export class UpdateTotalTimeDTO extends ActionRequestDTO<UpdateTotalTimeFieldsDTO> { }