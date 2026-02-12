import { gql } from 'graphql-request';

import { DisplayValueFragment } from '../../fragments/common.graphql';

export const getAllItemsQueryWithColumns = gql`
  ${DisplayValueFragment}
  query GetAllItemsQueryWithColumns($boardId: ID!, $cursor: String, $columnIds: [String!]) {
    boards(ids: [$boardId]) {
      items_count
      items_page(cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values(ids: $columnIds) {
            id
            text
            ...DisplayValue
          }
        }
      }
    }
  }
`;

export const getAllItemsAndSubItem = gql`
  ${DisplayValueFragment}
  query GetAllItemsAndSubItem($boardId: ID!, $cursor: String, $columnIds: [String!]) {
    boards(ids: [$boardId]) {
      items_count
      items_page(cursor: $cursor) {
        cursor
        items {
          id
          subitems {
            id
            column_values(ids: $columnIds) {
              id
              value
              ...DisplayValue
            }
          }
        }
      }
    }
  }
`;

export const getParentItemIdFromSubItemId = gql`
  query getParentItemIdFromSubItemId($itemIds: [ID!]!) {
    items(ids: $itemIds) {
      id
      parent_item {
        id
      }
    }
  }
`;

export const delteItemById = gql`
	mutation deleteItem($itemId: ID!) {
		delete_item(item_id: $itemId){
			id
			name
		}
	}
`;
