import { Logger } from "@/src/utils/logger";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ManageService } from "../management/manage.service";
import { BoardObjectType, ColumnType, GetBoardsQuery, GetColumnsQuery } from "@/src/graphql/generated/graphql";
import { getBoardsQuery, getColumnsQuery } from "@/src/graphql/queries/query/board.graphql";
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

        this.logger.info(`Call endpoint lookup remote board with result: ${JSON.stringify(result)}`);   

        // có thể phải trả về lỗi severityCode 4000 để ở client có thể thấy được 
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

        this.logger.info(`Call endpoint lookup remote board with boards: ${JSON.stringify(boards)}`);

        return boards ?? [];
    }
    
    async lookupRemoteColumn(shortlivedToken: string, type: ColumnType | undefined = undefined, boardId: string): Promise<{title: string, value: string}[]> {
        this.logger.info(`Call endpoint lookup remote column`);

        const mondayClient = this.manageService.getServer(shortlivedToken);

        // Change to call - retry, since monday only handle for action, but realy do we need for find columns ? 
        const result = await mondayClient.api<{data: GetColumnsQuery; errors: any[]}>(
            getColumnsQuery,
            {
                variables: {
                    boardId
                }
            }
        );

        if(result.errors){
            this.logger.error(`Call endpoint lookup remote column failed`);
            const errorResponse = StandardResponse.error(
            null,
            'MONDAY_LOOKUP_REMOTE_COLUMN_FAILED',
            'Call endpoint lookup remote column failed',
            '400',
            );
            throw new BadRequestException(errorResponse);
        }

        const columns = result.data?.boards?.[0]?.columns
            ?.filter((column) => column !== null && column !== undefined)
            .filter((column) => (type ? column.type === type : true))
            .map((column) => ({
                title: column.title,
                value: column.id,
            }));

        this.logger.info(`Call endpoint lookup remote column success with column: ${JSON.stringify(columns)}`);

        return columns ?? [];
    }

    getCalendarConfigList() {
        this.logger.info(`Call endpoint get calendar config list`);

        const schema = {
            title: {
                title: "Value",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: false,
            },
            assignee: {
                title: "Assignee",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: true,
            },
            startTime: {
                title: "Start Time",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: false,
            },
            endTime: {
                title: "End Time",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: false,
            },
            description: {
                title: "Description",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: false,
            },
            userId: {
                title: "UserId",
                type: "primitive",
                primitiveType: "string",
                isNullable: false,
                isArray: false,
            }
        };

        return schema;
    }
}