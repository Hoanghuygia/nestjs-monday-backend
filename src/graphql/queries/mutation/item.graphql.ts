import { gql } from "graphql-request";

export const updateItemNameColumn = gql`
    mutation updateItemNameColumn($boardId: ID!, $itemId: ID!, $updateValue: JSON!) {
        change_multiple_column_values(
            board_id: $boardId
            item_id: $itemId
            column_values: $updateValue
        ) {
            id
            name
        }
    }
`