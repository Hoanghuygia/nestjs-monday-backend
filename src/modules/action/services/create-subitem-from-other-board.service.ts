import {
	BadRequestException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ManageService } from '../../management/manage.service';
import { AuthService } from '../../auth/auth.service';
import { Logger } from '@/src/utils/logger';
import { CreateSubitemFromOtherBoardDTO } from '../dtos/create-subitem-from-other-board.dto';
import { Request } from 'express';
import { StandardResponse } from '@/src/common/filters/dtos/standard-response';
import { getCurrentDateOfWeek } from '@/src/utils/get-current-date-of-the-week.func';
import { fetchItemWithColumnvalue } from '@/src/graphql/api/query/query.fucntion';
import { getCurrentDate } from '@/src/utils/get-current-date.func';
import { duplicateItem, moveItemToBoard, updateItemColumns } from '@/src/graphql/api/mutation/mutation.function';
import { ApiClient } from '@mondaydotcomorg/api';
import { GROUP_MAPPING_PREFIX } from '@/src/constant/mapping-constant';
import type { GroupMappingData } from '@/src/modules/@type/group-mapping-daily.type';

@Injectable()
export class CreateSubitemFromOtherBoardService {
	constructor(
		private readonly manageService: ManageService,
		private readonly authService: AuthService,
		private readonly logger: Logger,
	) { }

	async execute(req: Request, body: CreateSubitemFromOtherBoardDTO) {
		if (!req.session.shortLivedToken || !req.session.accountId) {
			this.logger.error(`No shortlive token or accountId found`);
			const errorResponse = StandardResponse.error(
				null,
				'INVALID_TOKEN_PAYLOAD',
				'No shortlive token or accountId found',
				'401',
			);
			//   throw new UnauthorizedException(errorResponse);
			return;
		}

		const { boardId, scheduleColumnId, scheduleBoardId } =
			body.payload.inputFields;
		this.logger.info(
			`Input field: ${JSON.stringify(body.payload.inputFields)}`,
		);

		if (!boardId || !scheduleBoardId || !scheduleColumnId) {
			this.logger.warn(
				`No boardId or scheduleBoardId or scheduleColumnId found`,
			);
			return;
			//   this.logger.error(
			//     `No boardId or scheduleBoardId or scheduleColumnId found`,
			//   );
			//   const errorResponse = StandardResponse.error(
			//     null,
			//     'INVALID_BOARD_ID',
			//     'No boardId found',
			//     '400',
			//   );
			//   throw new BadRequestException(errorResponse);
		}

		const accessToken = await this.authService.getAccessToken(
			req.session.accountId.toString(),
		);
		if (!accessToken) {
			this.logger.error(`No access token found`);
			const errorResponse = StandardResponse.error(
				null,
				'INVALID_TOKEN_PAYLOAD',
				'No access token found',
				'401',
			);
			throw new UnauthorizedException(errorResponse);
		}

		const currentDateOfWeek = getCurrentDateOfWeek();
		this.logger.info(`Current date of the week: ${currentDateOfWeek}`);

		const mondayClient = this.manageService.getMondayClient(
			accessToken.access_token,
		);

		const scheduleItemId = await this.fetchScheduleItem(
			mondayClient,
			String(scheduleBoardId),
			currentDateOfWeek,
		);
		this.logger.info(`Schedule item id: ${scheduleItemId}`);

		if (!scheduleItemId) {
			this.logger.warn(`No schedule item found`);
			return;
			//   this.logger.error(`No schedule item found`);
			//   const errorResponse = StandardResponse.error(
			//     null,
			//     'INVALID_SCHEDULE_ITEM_ID',
			//     'No schedule item found',
			//     '400',
			//   );
			//   throw new BadRequestException(errorResponse);
		}

		const dupplicatedItemId = await this.duplicatedItem(
			mondayClient,
			scheduleBoardId,
			scheduleItemId
		);
		if(!dupplicatedItemId) {
			this.logger.warn(`Failed to duplicate item`);
			return;
		}
		this.logger.info(`Dupplicated item id: ${dupplicatedItemId}`);

		const currentDate = getCurrentDate('dd/mm/yyyy');
		this.logger.info(`Current date: ${currentDate}`);

		const storage = this.manageService.createStorage(accessToken.access_token);
		const storageKey = `${GROUP_MAPPING_PREFIX}${boardId}`;
		const groupMapping = await storage.get(storageKey);

		if (!groupMapping.success || !groupMapping.value) {
			this.logger.warn(`No group mapping found for board ${boardId}`);
			return;
			//   this.logger.error(`No group mapping found for board ${boardId}`);
			//   const errorResponse = StandardResponse.error(
			//     null,
			//     'INVALID_BOARD_ID',
			//     'No group mapping found for board',
			//     '400',
			//   );
			//   throw new BadRequestException(errorResponse);
		}

		const groupMappingValue: GroupMappingData =
			typeof groupMapping.value === 'string'
				? JSON.parse(groupMapping.value)
				: groupMapping.value;

	const dayKey: keyof GroupMappingData = currentDateOfWeek.toLowerCase() as keyof GroupMappingData;
		const groupToMove = groupMappingValue[dayKey];
		this.logger.info(`Group to move: ${groupToMove}`);

		if (!groupToMove) {
			this.logger.warn(
				`No group mapping found for day ${String(dayKey)} in board ${boardId}`,
			);
			return;
			//   this.logger.error(
			//     `No group mapping found for day ${dayKey} in board ${boardId}`,
			//   );
			//   const errorResponse = StandardResponse.error(
			//     null,
			//     'INVALID_GROUP_MAPPING',
			//     `No group mapping found for day ${dayKey}`,
			//     '400',
			//   );
			//   throw new BadRequestException(errorResponse);
		}

		// Wait about 15s to wait for copy finish
		await new Promise((resolve) => setTimeout(resolve, 15000));

		const moveItemResult = await this.moveItemToOtherBoard(
			mondayClient,
			dupplicatedItemId!,
			boardId,
			groupToMove
		);

		this.logger.info(`Move item result id: ${moveItemResult}`);

		if (!moveItemResult) {
			this.logger.warn(`Failed to move item to board ${boardId}`);
			return;
		}

		const updateNameResult = await this.updateNameColumn(
			mondayClient,
			dupplicatedItemId!,
			boardId,
			`${currentDateOfWeek} - ${currentDate}`,
		);

		if (!updateNameResult) {
			this.logger.warn(`Failed to update name column for item ${dupplicatedItemId}`);
			return;
		}

		this.logger.info(`Successfully run action!!!!!!!!`);
	}

	private async fetchScheduleItem(
		mondayClient: ApiClient,
		boardId: string,
		currentDateOfWeek: string,
	): Promise<string | null> {
		this.logger.info(
			`Fetching schedule item for board ${boardId} and date ${currentDateOfWeek}`,
		);
		let cursor: string | null = null;

		do {
			const page = await fetchItemWithColumnvalue(mondayClient, this.logger, {
				boardId,
				columnId: 'name',
				compareValue: currentDateOfWeek,
				cursor,
			} as any);

			if (page.items && page.items.length > 0) {
				return page.items[0].id;
			}

			cursor = page.cursor;
		} while (cursor);

		return null;
	}

	private async duplicatedItem(mondayClient: ApiClient, scheduleBoardId: string, scheduleItemId: string): Promise<string | null> {
		this.logger.info(`Duplicating item ${scheduleItemId} in board ${scheduleBoardId}`);
		const result = await duplicateItem(
			mondayClient,
			this.logger,
			{
				boardId: scheduleBoardId,
				itemId: scheduleItemId
			}
		);

		this.logger.info(`Duplicate item result: ${JSON.stringify(result)}`);

		if (!result.success) {
			this.logger.warn(`Failed to duplicate item ${scheduleItemId}`);
			return null;
		}

		return result.itemId ?? null;
	}

	private async moveItemToOtherBoard(mondayClient: ApiClient, duplicatedItemId: string, targetBoardId: string, targetGroupId: string): Promise<string | null> {
		this.logger.info(`Moving item ${duplicatedItemId} to board ${targetBoardId} and group ${targetGroupId}`);
		const result = await moveItemToBoard(
			mondayClient,
			this.logger,
			{
				targetBoardId,
				targetGroupId,
				itemId: duplicatedItemId
			}
		);

		if (!result.success) {
			this.logger.warn(`Failed to move item ${duplicatedItemId}`);
			return null;
		}

		return result.itemId ?? null;
	}

	private async updateNameColumn(mondayClient: ApiClient, itemId: string, boardId: string, name: string): Promise<boolean> {
		this.logger.info(`Updating name column for item ${itemId} in board ${boardId}}`);
		const result = await updateItemColumns(
			mondayClient,
			this.logger,
			{
				boardId,
				itemId,
				columnValues: JSON.stringify({name: name})
			}
		);
		return result.success;
	}
}
