import { Logger } from "@/src/utils/logger";
import { retryMondayApi } from "@/src/utils/retry-run.api";
import { MondayServerSdk } from "monday-sdk-js";
import { getAllItemsQueryWithColumns } from "../../queries/query/item.graphql";
import { GetAllItemsQueryWithColumnsQuery, GetAllItemsQueryWithColumnsQueryVariables } from "../../generated/graphql";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import { BadRequestException } from "@nestjs/common";

interface ItemPageResult {
    items: any[];
    cursor: string | null;
}

export async function fetchAllBoardItemsWithColums(
    mondayClient: MondayServerSdk,
    logger: Logger,
    variables: GetAllItemsQueryWithColumnsQueryVariables
): Promise<ItemPageResult>{
    const response = await retryMondayApi(
        () => 
            mondayClient.api<{data: GetAllItemsQueryWithColumnsQuery, errors?: any}>(getAllItemsQueryWithColumns, {
                variables
            }),
        3,
        logger
    );

    if(response?.errors){
        logger.error(response.errors);
        return {
            items: [],
            cursor: null
        };
        // const errorResponse = StandardResponse.error(
        //     null,
        //     'MONDAY_API_ERROR',
        //     'Error in fetching all items',
        //     '400',
        // );
        // throw new BadRequestException(errorResponse);
    }
    const page = response?.data?.boards?.[0]?.items_page;

    return {
        items: page?.items ?? [],
        cursor: page?.cursor ?? null
    }
}
