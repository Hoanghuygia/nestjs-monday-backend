import { IsString } from 'class-validator';
import { ActionRequestDTO } from '../../account/dto/common/_action.dto';

class CreateSubitemFromOtherBoardFieldsDTO {
    @IsString()
    boardId!: string;

    @IsString()
    scheduleBoardId!: string;
}

export class CreateSubitemFromOtherBoardDTO extends ActionRequestDTO<CreateSubitemFromOtherBoardFieldsDTO> { }
