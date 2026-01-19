import { ApiClient } from '@mondaydotcomorg/api';

import { Logger } from '@/src/utils/logger';
import { retryMondayApi } from '@/src/utils/retry-run.api';

import {
	GetAllGroupsQueryQuery,
	GetAllGroupsQueryQueryVariables,
	GetAllItemsAndSubItemQuery,
	GetAllItemsAndSubItemQueryVariables,
	GetAllItemsQueryWithColumnsQuery,
	GetAllItemsQueryWithColumnsQueryVariables,
	GetItemWithColumnValueQuery,
	GetItemWithColumnValueQueryVariables,
	GetParentItemIdFromSubItemIdQuery,
	GetParentItemIdFromSubItemIdQueryVariables,
	GetSingleItemAndSubitemsQuery,
	GetSingleItemAndSubitemsQueryVariables,
} from '../../generated/graphql';
import {
	getItemWithColumnValue,
	getSingleItemAndSubitems,
} from '../../queries/query/board.graphql';
import { getAllGroupsQuery } from '../../queries/query/groups.graphql';
import {
	getAllItemsAndSubItem,
	getAllItemsQueryWithColumns,
	getParentItemIdFromSubItemId,
} from '../../queries/query/item.graphql';

interface ItemPageResult {
	items: any[];
	cursor: string | null;
}

interface ItemResult {
	id: string | null;
	subitems: any[] | null;
	name: string | null;
}

export async function fetchAllBoardItemsWithColums(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetAllItemsQueryWithColumnsQueryVariables,
): Promise<ItemPageResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<
				GetAllItemsQueryWithColumnsQuery & {
					errors?: any;
				}
			>(getAllItemsQueryWithColumns, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return {
			items: [],
			cursor: null,
		};
	}
	const page = response?.boards?.[0]?.items_page;

	return {
		items: page?.items ?? [],
		cursor: page?.cursor ?? null,
	};
}

export async function getAllGroupsInBoard(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetAllGroupsQueryQueryVariables,
): Promise<any[]> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<{ data: GetAllGroupsQueryQuery; errors?: any }>(
				getAllGroupsQuery,
				variables,
			),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return [];
	}

	return response?.data?.boards?.[0]?.groups ?? [];
}

export async function fetchItemWithColumnvalue(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetItemWithColumnValueQueryVariables,
): Promise<ItemPageResult> {
	logger.info(
		`[fetchItemWithColumnvalue] Variables: ${JSON.stringify(variables)}`,
	);
	const response = await retryMondayApi(
		() =>
			mondayClient.request<{ data: GetItemWithColumnValueQuery; errors?: any }>(
				getItemWithColumnValue,
				variables,
			),
		3,
		logger,
	);
	logger.info(
		`[fetchItemWithColumnvalue] Response: ${JSON.stringify(response)}`,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return {
			items: [],
			cursor: null,
		};
	}
	// Check if the response structure has 'data' property or if it is the data itself
	const data = (response as any)?.data ?? response;
	const page = data?.boards?.[0]?.items_page;

	return {
		items: page?.items ?? [],
		cursor: page?.cursor ?? null,
	};
}

export async function fetchAllBoardItemsAndSubitems(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetAllItemsAndSubItemQueryVariables,
): Promise<ItemPageResult> {
	const response = await retryMondayApi(
		() =>
			mondayClient.request<
				GetAllItemsAndSubItemQuery & {
					errors?: any;
				}
			>(getAllItemsAndSubItem, variables),
		3,
		logger,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return {
			items: [],
			cursor: null,
		};
	}
	const page = response?.boards?.[0]?.items_page;

	return {
		items: page?.items ?? [],
		cursor: page?.cursor ?? null,
	};
}

export async function getSingleItemAndSubitemsFunc(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetSingleItemAndSubitemsQueryVariables,
): Promise<ItemResult> {
	logger.info(
		`[getSingleItemAndSubitemsFunc] Variables: ${JSON.stringify(variables)}`,
	);
	const response = await retryMondayApi(
		() =>
			mondayClient.request<
				GetSingleItemAndSubitemsQuery & {
					errors?: any;
				}
			>(getSingleItemAndSubitems, variables),
		3,
		logger,
	);
	logger.info(
		`[getSingleItemAndSubitemsFunc] Response: ${JSON.stringify(response)}`,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return {
			id: null,
			subitems: null,
			name: null,
		};
	}

	// Handle both response structures: with and without 'data' wrapper
	const data = (response as any)?.data ?? response;
	const item = data?.items?.[0];

	return {
		id: item?.id ?? null,
		subitems: item?.subitems ?? null,
		name: item?.name ?? null,
	};
}

export async function getParentItemIdFromSubItemIdFunc(
	mondayClient: ApiClient,
	logger: Logger,
	variables: GetParentItemIdFromSubItemIdQueryVariables,
): Promise<string | null> {
	logger.info(
		`[getParentItemIdFromSubItemIdFunc] Variables: ${JSON.stringify(variables)}`,
	);
	const response = await retryMondayApi(
		() =>
			mondayClient.request<
				GetParentItemIdFromSubItemIdQuery & {
					errors?: any;
				}
			>(getParentItemIdFromSubItemId, variables),
		3,
		logger,
	);
	logger.info(
		`[getParentItemIdFromSubItemIdFunc] Response: ${JSON.stringify(response)}`,
	);

	if (response?.errors) {
		logger.error(response.errors);
		return null;
	}

	// Handle both response structures: with and without 'data' wrapper
	const data = (response as any)?.data ?? response;
	const item = data?.items?.[0];
	const parentId = item?.parent_item?.id ?? null;

	logger.info(`[getParentItemIdFromSubItemIdFunc] Parent ID: ${parentId}`);
	return parentId;
}
