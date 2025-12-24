import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { StandardResponse } from '@/src/common/filters/dtos/standard-response';
import { GetAccountWorkspaceQuery } from '@/src/graphql/generated/graphql';
import { workspaceQuery } from '@/src/graphql/queries/query/profile.graphql';
import { Logger } from '@/src/utils/logger';

import { ManageService } from '../management/manage.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly logger: Logger,
    private readonly manageService: ManageService,
  ) {}
  async getAccountWorkspace(shortLivedToken: string) {
    try {
      const mondayClient = this.manageService.getServer(shortLivedToken);
      const result = await mondayClient.api<{
        data: GetAccountWorkspaceQuery;
        errors: any;
      }>(workspaceQuery);
      return result.data.account?.slug;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get account workspace with error: ${errorMessage}`,
      );
      const errorResponse = StandardResponse.error(
        null,
        'FAIL TO GET ACCOUNT WORKSPACE',
        'Failed to get account workspace',
        '404',
      );
      throw new InternalServerErrorException(errorResponse);
    }
  }
}
