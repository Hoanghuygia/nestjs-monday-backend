import { gql } from "graphql-request";
import { DisplayValueFragment } from "../../fragments/common.graphql";

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
`