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
