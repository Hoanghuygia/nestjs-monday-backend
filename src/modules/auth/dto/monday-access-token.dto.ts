import { JsonValue } from 'node_modules/@mondaycom/apps-sdk/dist/types/types/general';

export interface MondayAccessToken extends Record<string, JsonValue> {
    access_token: string;
    token_type: string;
    scope: string;
}