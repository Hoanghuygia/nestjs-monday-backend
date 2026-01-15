import { Logger } from '@/src/utils/logger';
import { retryMondayApi } from '@/src/utils/retry-run.api';
import { getAllItemsQueryWithColumns } from '../../queries/query/item.graphql';
import {
  GetAllGroupsQueryQuery,
  GetAllGroupsQueryQueryVariables,
  GetAllItemsQueryWithColumnsQuery,
  GetAllItemsQueryWithColumnsQueryVariables,
  GetItemWithColumnValueQuery,
  GetItemWithColumnValueQueryVariables,
} from '../../generated/graphql';
import { ApiClient } from '@mondaydotcomorg/api';
import { getAllGroupsQuery } from '../../queries/query/groups.graphql';
import { getItemWithColumnValue } from '../../queries/query/board.graphql';

interface ItemPageResult {
  items: any[];
  cursor: string | null;
}

export async function fetchAllBoardItemsWithColums(
  mondayClient: ApiClient,
  logger: Logger,
  variables: GetAllItemsQueryWithColumnsQueryVariables,
): Promise<ItemPageResult> {
  const response = await retryMondayApi(
    () =>
      mondayClient.request<{
        data: GetAllItemsQueryWithColumnsQuery;
        errors?: any;
      }>(getAllItemsQueryWithColumns, variables),
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
  const page = response?.data?.boards?.[0]?.items_page;

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
