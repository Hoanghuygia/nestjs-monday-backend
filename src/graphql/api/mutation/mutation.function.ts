import { Logger } from '@/src/utils/logger';
import {
	ChangeMultipleColumnValueMutation,
	ChangeMultipleColumnValueMutationVariables,
	CreateNewItemWithColumnValueMutation,
	CreateNewItemWithColumnValueMutationVariables,
	DeleteItemMutation,
	DeleteItemMutationVariables,
	DuplicateItemMutationMutation,
	DuplicateItemMutationMutationVariables,
	MoveItemMutationMutation,
	MoveItemMutationMutationVariables,
} from '../../generated/graphql';
import { retryMondayApi } from '@/src/utils/retry-run.api';
import {
	changeMultipleColumnValue,
	createNewItemWithColumnValue,
	duplicateItemMutation,
	moveItemWitMutation,
} from '../../queries/mutation/item.graphql';
import { delteItemById } from '../../queries/query/item.graphql';
import { ApiClient } from '@mondaydotcomorg/api';

export interface MutationResult {
	success: boolean;
	errors?: any;
	itemId?: string;
}

export async function createNewItemWithColumnValueInGroup(
	mondayClient: ApiClient,
	logger: Logger,
	variables: CreateNewItemWithColumnValueMutationVariables,
): Promise<MutationResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<{
				data: CreateNewItemWithColumnValueMutation;
				errors?: any;
			}>(createNewItemWithColumnValue, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(
			'Error in creating new item with column value',
			response.errors,
		);
		return {
			success: false,
			errors: response.errors,
		};
	}

	return {
		success: true,
		itemId: response?.data?.create_item?.id,
	};
}

export async function duplicateItem(mondayClient: ApiClient, logger: Logger, variables: DuplicateItemMutationMutationVariables): Promise<MutationResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<DuplicateItemMutationMutation & {
				errors?: any;
			}>(duplicateItemMutation, variables),
		3,
		logger,
	);

	logger.info(`Duplicate item full response: ${JSON.stringify(response)}`);
	logger.info(`Duplicate item data: ${JSON.stringify(response)}`);
	logger.info(`Duplicate item id from data: ${response?.duplicate_item?.id}`);

	if (response?.errors) {
		logger.error(
			'Error in duplicating item',
			response.errors,
		);
		return {
			success: false,
			errors: response.errors,
		};
	}

	return {
		success: true,
		itemId: response?.duplicate_item?.id,
	};
}

export async function moveItemToBoard(mondayClient: ApiClient, logger: Logger, variables: MoveItemMutationMutationVariables): Promise<MutationResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<MoveItemMutationMutation & {
				errors?: any;
			}>(moveItemWitMutation, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(
			'Error in moving item to board',
			response.errors,
		);
		return {
			success: false,
			errors: response.errors,
		};
	}

	return {
		success: true,
		itemId: response?.move_item_to_board?.id,
	};
}

export async function updateItemColumns(
	mondayClient: ApiClient,
	logger: Logger,
	variables: ChangeMultipleColumnValueMutationVariables,
): Promise<MutationResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<ChangeMultipleColumnValueMutation & {
				errors?: any;
			}>(changeMultipleColumnValue, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(
			'Error in updating item columns',
			response.errors,
		);
		return {
			success: false,
			errors: response.errors,
		};
	}

	return {
		success: true,
		itemId: response?.change_multiple_column_values?.id,
	};
}

export async function deleteItemById(
	mondayClient: ApiClient,
	logger: Logger,
	variables: DeleteItemMutationVariables,
): Promise<MutationResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<DeleteItemMutation & {
				errors?: any;
			}>(delteItemById, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error('Error in deleting item', response.errors);
		return {
			success: false,
			errors: response.errors,
		};
	}

	return {
		success: true,
		itemId: response?.delete_item?.id,
	};
}
