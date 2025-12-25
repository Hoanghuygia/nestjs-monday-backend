import {IsString} from 'class-validator';
import { ActionRequestDTO } from '../../account/dto/common/_action.dto';

class CopyRelationColumnToNameFieldsDTO {
    @IsString()
    boardId!: string;
}

export class CopyRelationColumnToNameDTO extends ActionRequestDTO<CopyRelationColumnToNameFieldsDTO> { }
