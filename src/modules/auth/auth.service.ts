import { Logger } from "@mondaycom/apps-sdk";
import { Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import axios from "axios";
import { MondayAccessToken } from "./dto/monday-access-token.dto";
import { ManageService } from "../management/manage.service";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import { ACCESS_TOKEN_PREFIX, TOKEN_MONDAY_URL } from "@/src/constant/constant";
import { TokenCacheService } from "./token-cache.service";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
    private readonly logger: Logger = new Logger(AuthService.name);

    constructor(private readonly manageService: ManageService, private readonly tokenCacheService: TokenCacheService) { }

    async exchangeCodeForToken(code: string, redirectUri: string): Promise<MondayAccessToken> {
        const cliendtId = this.manageService.getEnv('MONDAY_CLIENT_ID');
        const clientSecret = this.manageService.getSecret('MONDAY_CLIENT_SECRET');

        if (!cliendtId || !clientSecret) {
            this.logger.error('Monday client ID or client secret is not configured');
            const errorResponse = StandardResponse.error(
                null,
                'MONDAY_CLIENT_CREDENTIALS_NOT_CONFIGURED',
                'Monday client ID or client secret is not configured',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }

        try {
            const response = await axios.post(TOKEN_MONDAY_URL, {
                grant_type: 'authorization_code',
                client_id: cliendtId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri
            });

            return response.data as MondayAccessToken;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to exchange code for token with error: ${errorMessage}`);
            const errorResponse = StandardResponse.error(
                null,
                'FAILED_TO_EXCHANGE_CODE_FOR_TOKEN',
                'Failed to exchange code for token',
                '500'
            );
            throw new ServiceUnavailableException(errorResponse);
        }
    }

    async storeAccessToken(accountId: string, token: MondayAccessToken) {
        const secureStorage = this.manageService.getSecureStorage();

        try {
            await secureStorage.set<MondayAccessToken>(`${ACCESS_TOKEN_PREFIX}${accountId}`, token);

            this.tokenCacheService.set(accountId, token);

            this.logger.info(`Access token stored successfully for accountId: ${accountId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to store access token for accountId: ${accountId} with error: ${errorMessage}`);

            const errorResponse = StandardResponse.error(
                null,
                'FAIL TO STORE ACCESS TOKEN',
                'Failed to store access token',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }
    }

    async getAccessToken(accountId: string): Promise<MondayAccessToken | null> {
        const cacheToken = this.tokenCacheService.get(accountId);
        if (cacheToken) {
            this.logger.info(`Access token retrieved from cache for accountId: ${accountId}`);
            return cacheToken
        }
        try {
            const secureStore = this.manageService.getSecureStorage();
            const token = await secureStore.get<MondayAccessToken>(`${ACCESS_TOKEN_PREFIX}${accountId}`);
            if (token) {
                this.tokenCacheService.set(accountId, token);
                this.logger.info(`Access token retrieved from secure storage for accountId: ${accountId}`);
                return token;
            }
            return null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to retrieve access token for accountId: ${accountId} with error: ${errorMessage}`);
            const errorResponse = StandardResponse.error(
                null,
                'FAIL TO RETRIEVE ACCESS TOKEN',
                'Failed to retrieve access token',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }
    }

    async removeAccessToken(accountId: string) {
        const secureStorage = this.manageService.getSecureStorage();
        try {
            await secureStorage.delete(`${ACCESS_TOKEN_PREFIX}${accountId}`);
            this.tokenCacheService.delete(accountId);
            this.logger.info(`Access token removed successfully for accountId: ${accountId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to remove access token for accountId: ${accountId} with error: ${errorMessage}`);
            const errorResponse = StandardResponse.error(
                null,
                'FAIL TO REMOVE ACCESS TOKEN',
                'Failed to remove access token',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }
    }

    createJwtToken(type: 'MONDAY_SIGNING_SECRET' | 'MONDAY_CLIENT_SECRET', payload?: Record<string, any>): string {
        try {
            const secret = this.manageService.getSecret(type);

            if (!secret || typeof secret !== 'string') {
                this.logger.error(`Signing secret not found or invalid for type: ${type}`);
                const errorResponse = StandardResponse.error(
                    null,
                    'SIGNING_SECRET_NOT_FOUND',
                    'Signing secret not found or invalid',
                    '500'
                );
                throw new InternalServerErrorException(errorResponse);
            }

            const defaultPayload = {
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (5 * 60), // expire in 5 minutes
                ...payload
            }

            const token = jwt.sign(defaultPayload, secret);
            return token;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create JWT token for type: ${type} with error: ${errorMessage}`);
            const errorResponse = StandardResponse.error(
                null,
                'FAIL TO CREATE JWT TOKEN',
                'Failed to create JWT token',
                '500'
            );
            throw new InternalServerErrorException(errorResponse);
        }
    }
}