import { gql } from "graphql-request";

export const getAllGroupsQuery = gql`
    query GetAllGroupsQuery($boardId: ID!) {
        boards(ids: [$boardId]) {
            id
            name
            groups {
                id
                title
            }
        }
    }
`
