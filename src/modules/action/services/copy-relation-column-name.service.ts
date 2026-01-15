import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ManageService } from "../../management/manage.service";
import { AuthService } from "../../auth/auth.service";
import { Logger } from "@/src/utils/logger";
import { Request } from 'express';
import { CopyRelationColumnToNameDTO } from "../dtos/copy-relation-column-to-name.dto";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import { fetchAllBoardItemsWithColums } from "@/src/graphql/api/query/query.fucntion";
import { BatchRunUtils } from "@/src/utils/run.api";
import { updateNameColumn } from "@/src/graphql/api/mutation/mutation.function";
import { ApiClient } from "@mondaydotcomorg/api";

interface TargetItem {
    id: string;
    name: string;
}

@Injectable()
export class CopyRelationColumnToNameService {
    constructor(
        private readonly manageService: ManageService,
        private readonly authService: AuthService,
        private readonly logger: Logger,
    ) { }

    async execute(req: Request, body: CopyRelationColumnToNameDTO) {
        if (!req.session.shortLivedToken || !req.session.accountId) {
            this.logger.error(`No shortlive token or accountId found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'No shortlive token or accountId found',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const { subItemBoardId, subColumnBoardId } = body.payload.inputFields;

        const normalizeBoardId = subItemBoardId.value;
        const sourceColumnId = subColumnBoardId.value;

        if (!sourceColumnId || !normalizeBoardId) {
            this.logger.error(`No boardId or columnId found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_BOARD_ID_OR_COLUMN_ID',
                'No boardId or columnId found',
                '400',
            );
            throw new BadRequestException(errorResponse);
        }

        const accessToken = await this.authService.getAccessToken(req.session.accountId.toString());
        if (!accessToken) {
            this.logger.error(`No access token found`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_TOKEN_PAYLOAD',
                'No access token found',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const mondayClient = this.manageService.getMondayClient(accessToken.access_token);

        // 1. Get all items in board
        const foundItems = await this.fetchAllItemsInBoard(mondayClient, this.logger, normalizeBoardId, sourceColumnId);
        this.logger.info(`Found ${foundItems.length} items to update`);

        if (foundItems.length === 0) {
            return StandardResponse.success(
                { count: 0, records: [] },
                'NO_ITEMS_FOUND',
                'No items found in board'
            );
        }

        // 2. Update name column for each item 
        this.logger.info(`Updating name column for each item using batch process`);
        const batchSummary = await BatchRunUtils.runBatch(
            foundItems,
            async (item) => {
                const result = await updateNameColumn(mondayClient, this.logger, {
                    boardId: normalizeBoardId,
                    itemId: item.id,
                    updateValue: JSON.stringify({
                        name: item.name
                    })
                });

                if (!result.success) {
                    this.logger.error(`Failed to update name column for item ${item.id}`);
                    throw new Error(`Failed to update item ${item.id}`);
                }
                return result;
            },
            {
                concurrency: 10,
                retries: 3,
                logger: this.logger,
                stopOnError: false,
            }
        );

        // 3. Return response
        return StandardResponse.success(
            {
                count: batchSummary.total,
                records: [{
                    total: batchSummary.total,
                    successful: batchSummary.successful,
                    failed: batchSummary.failed
                }]
            },
            'PROCESS_COMPLETED',
            `Successfully processed ${foundItems.length} items`
        );
    }

    private async fetchAllItemsInBoard(mondayClient: ApiClient, logger: Logger, subBoardId: string, subColumnId: string) {
        const foundItems: TargetItem[] = [];

        this.logger.info(`Fetching all items in board ${subBoardId} with column ${subColumnId}`);

        let cursor: string | null = null;

        do {
            const page = await fetchAllBoardItemsWithColums(mondayClient, logger, {
                boardId: subBoardId,
                cursor,
                columnIds: [subColumnId]
            });

            this.logger.info(`Fetched ${page.items.length} items from page`);

            for (const item of page.items) {
                const columnValueList = item.column_values ?? [];
                const column = columnValueList.find((col: any) => col.id === subColumnId);
                // Với Mirror/Relation column, display_value hoặc text thường chứa chuỗi hiển thị
                const columnValue = column?.display_value || column?.text || null;

                if (columnValue) {
                    foundItems.push({
                        id: item.id,
                        name: columnValue
                    });
                }
            }

            // Cập nhật cursor để lấy trang tiếp theo
            cursor = page.cursor;

        } while (cursor);

        this.logger.info(`Total items collected: ${foundItems.length}`);

        return foundItems;
    }
}
