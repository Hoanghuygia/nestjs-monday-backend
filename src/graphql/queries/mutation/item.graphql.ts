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

export const createItemMutation = gql`
    mutation createItemMutation($boardId: ID!, $itemName: String!, $columnValues: JSON!, $groupId: String!) {
        create_item(
            board_id: $boardId
            item_name: $itemName
            column_values: $columnValues
            group_id: $groupId
        ) {
            id
        }
    }`

export const createNewItemWithColumnValue = gql`
    mutation createNewItemWithColumnValue(
        $boardId: ID!
        $groupId: String!
        $itemName: String!
        $columnValues: JSON!
        ) {
        create_item(
            board_id: $boardId
            group_id: $groupId
            item_name: $itemName
            column_values: $columnValues
        ) {
            id
        }
    }`

export const duplicateItemMutation = gql`
    mutation duplicateItemMutation($boardId: ID!, $itemId: ID!){
        duplicate_item(board_id: $boardId, item_id: $itemId, with_updates: false){
            id
        }
    }
`

export const moveItemWitMutation = gql`
    mutation moveItemMutation($targetBoardId: ID!, $targetGroupId: ID!, $itemId: ID!) {
        move_item_to_board(
            board_id: $targetBoardId
            group_id: $targetGroupId
            item_id: $itemId
        ) {
            id
        }
    }
`

export const changeMultipleColumnValue = gql`
    mutation ChangeMultipleColumnValue($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
            item_id: $itemId
            board_id: $boardId
            column_values: $columnValues
            create_labels_if_missing: true
        ) {
            id
        }
    }
`;