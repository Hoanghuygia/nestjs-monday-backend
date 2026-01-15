import { gql } from 'graphql-request';

export const getBoardsQuery = gql`
  query getBoards {
    boards(order_by: used_at) {
      id
      name
      type
    }
  }
`;

export const getColumnsQuery = gql`
    query getColumns($boardId: ID!) {
        boards(ids: [$boardId]) {
            columns {
                id
                title
                type
            }
        }
    }
`;

export const getItemWithColumnValue = gql`
    query getItemWithColumnValue(
        $boardId: ID!
        $columnId: ID!
        $compareValue: CompareValue!
        $cursor: String
        ) {
        boards(ids: [$boardId]) {
            id
            items_page(
            limit: 100
            cursor: $cursor
            query_params: {
                rules: [
                {
                    column_id: $columnId
                    operator: any_of
                    compare_value: $compareValue
                }
                ]
            }
            ) {
            cursor
            items {
                id
            }
            }
        }
    }
`
