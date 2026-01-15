import {IsString} from 'class-validator';
import { ActionRequestDTO } from './common/_action.dto';

// Fields used by copyAllColumnValue
class SetDefaultColumnValueFieldsDTO {
    @IsString()
    boardId!: string;

    @IsString()
    columnId!: string;
}

export class SetDefaultColumnValueDTO extends ActionRequestDTO<SetDefaultColumnValueFieldsDTO> { }
