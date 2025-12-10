import { gql } from "graphql-request";

export const workspaceQuery = gql`
    query GetAccountWorkspace {
        account{
            slug
        }
    }
`