import { IsObject, IsString } from 'class-validator';

import { ActionRequestDTO } from '@/src/modules/account/dto/common/_action.dto';
import { BoardDataDTO } from '@/src/modules/field/@types/board-data.type';
import { ColumnDataDTO } from '@/src/modules/field/@types/column-data.type';

class SetRatioAndStatusFieldsDTO {
	@IsString()
	boardId!: string;

	@IsString()
	itemId!: string;

	@IsString()
	statusColumnId!: string;

	@IsString()
	ratioColumnId!: string;

	@IsObject()
	remoteColumnId!: ColumnDataDTO;

	@IsObject()
	subBoardId!: BoardDataDTO;
}

export class SetRatioAndStatusDTO extends ActionRequestDTO<SetRatioAndStatusFieldsDTO> {}
