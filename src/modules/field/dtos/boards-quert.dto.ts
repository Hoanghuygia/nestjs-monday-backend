import { IsEnum, IsOptional } from 'class-validator';
import { BoardObjectType } from 'src/graphql/generated/graphql';

export class BoardsQueryDTO {
    @IsOptional()
    @IsEnum(BoardObjectType)
    type?: BoardObjectType;
}
