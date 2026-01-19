import { ApiClient } from '@mondaydotcomorg/api';
import { Request } from 'express';

import { AuthService } from '@/src/modules/auth/auth.service';
import { ManageService } from '@/src/modules/management/manage.service';
import { Logger } from '@/src/utils/logger';

interface MondayClientResult {
	success: true;
	client: ApiClient;
	shortLivedToken?: string;
	accessToken?: string;
}

interface MondayClientError {
	success: false;
	error: string;
}

type MondayClientResponse = MondayClientResult | MondayClientError;

/**
 * Utility function to get Monday API client from request session
 * Validates session tokens and retrieves access token
 *
 * @param request - Express request with session data
 * @param authService - Auth service to get access token
 * @param manageService - Management service to create Monday client
 * @param logger - Logger instance
 * @returns Monday API client or error object
 */
export async function getMondayClientFromRequest(
	request: Request,
	authService: AuthService,
	manageService: ManageService,
	logger: Logger,
): Promise<MondayClientResponse> {
	// Validate session tokens
	if (!request.session.shortLivedToken || !request.session.accountId) {
		logger.error(`No shortlive token or accountId found`);
		return {
			success: false,
			error: 'Missing session tokens',
		};
	}

	// Get access token
	const accessToken = await authService.getAccessToken(
		request.session.accountId.toString(),
	);

	if (!accessToken) {
		logger.error(`No access token found`);
		return {
			success: false,
			error: 'No access token found',
		};
	}

	// Create and return Monday client
	const mondayClient = manageService.getMondayClient(accessToken.access_token);

	logger.info(
		`Successfully created Monday client for account ${request.session.accountId}`,
	);

	return {
		success: true,
		client: mondayClient,
		shortLivedToken: request.session.shortLivedToken,
		accessToken: accessToken.access_token,
	};
}
