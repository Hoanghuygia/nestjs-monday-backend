import { Logger } from "@/src/utils/logger";
import { MondayServerSdk } from "monday-sdk-js";
import { UpdateItemNameColumnMutation, UpdateItemNameColumnMutationVariables } from "../../generated/graphql";
import { retryMondayApi } from "@/src/utils/retry-run.api";
import { updateItemNameColumn } from "../../queries/mutation/item.graphql";

export interface MutationResult {
    success: boolean;
    errors?: any;
    itemId?: string;
}

export  async function updateNameColumn(
    mondayClient: MondayServerSdk,
    logger: Logger,
    variables: UpdateItemNameColumnMutationVariables
): Promise<MutationResult> {
    const response = await retryMondayApi(
        () => 
            mondayClient.api<{data: UpdateItemNameColumnMutation, errors?: any}>(updateItemNameColumn, {
                variables
            }),
        3,
        logger
    );

    if(response?.errors){
        logger.error("Error in updating item name column", response.errors);
        return {
            success: false,
            errors: response.errors
        }
    }

    return {
        success: true,
        itemId: response?.data?.change_multiple_column_values?.id
    }
}