import { IsString } from 'class-validator';
import { ActionRequestDTO } from '../../account/dto/common/_action.dto';

class UpdateTotalTimeFieldsDTO {
    @IsString()
    currentBoardId!: string;

    @IsString()
    morningColumnId!: string;

    @IsString()
    eveningColumnId!: string;
}

export class UpdateTotalTimeDTO extends ActionRequestDTO<UpdateTotalTimeFieldsDTO> { }