import { Logger } from "@/src/utils/logger";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ManageService } from "../management/manage.service";
import { BoardObjectType, GetBoardsQuery } from "@/src/graphql/generated/graphql";
import { getBoardsQuery } from "@/src/graphql/queries/query/board.graphql";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";

@Injectable()
export class MondayFieldService {
    constructor(private readonly logger: Logger, private readonly manageService: ManageService) {}

    async lookupRemoteBoard(shortlivedToken: string, type: BoardObjectType | undefined = undefined): Promise<{title: string, value: string}[]> {
        this.logger.info(`Call endpoint lookup remote board`);

        const mondayClient = this.manageService.getServer(shortlivedToken);

        const result = await mondayClient.api<{data: GetBoardsQuery; errors: any[]}>(
            getBoardsQuery,
            {}
        );

        if(result.errors){
            this.logger.error(`Call endpoint lookup remote board failed`);
            const errorResponse = StandardResponse.error(
            null,
            'MONDAY_LOOKUP_REMOTE_BOARD_FAILED',
            'Call endpoint lookup remote board failed',
            '400',
            );
            throw new BadRequestException(errorResponse);
        }

        const boards = result.data?.boards
            ?.filter((board) => board !== null && board !== undefined)
            .filter((board) => (type ? board.type === type : true))
            .map((board) => ({
                title: board.name,
                value: board.id,
            }));

        return boards ?? [];
    }
    

}