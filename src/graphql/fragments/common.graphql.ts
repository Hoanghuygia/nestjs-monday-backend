import { gql } from 'graphql-request';

export const DisplayValueFragment = gql`
  fragment DisplayValue on ColumnValue {
    __typename
    type
    ... on BoardRelationValue {
      display_value
      linked_item_ids
    }
    ... on MirrorValue {
      display_value
    }
    ... on FormulaValue {
      display_value
    }
    ... on DropdownValue {
      values {
        id
        label
      }
    }
    ... on StatusValue {
      index
    }
    ... on LocationValue {
      address
      city
      country_short
      street_number
      street
    }
    ... on DateValue {
      date
    }
  }
`;
