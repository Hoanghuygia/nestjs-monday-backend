import { ApiClient } from '@mondaydotcomorg/api';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

import { GROUP_MAPPING_PREFIX } from '@/src/constant/mapping-constant';
import {
	duplicateItem,
	moveItemToBoard,
	updateItemColumns,
} from '@/src/graphql/api/mutation/mutation.function';
import { fetchItemWithColumnvalue } from '@/src/graphql/api/query/query.fucntion';
import type { GroupMappingData } from '@/src/modules/@type/group-mapping-daily.type';
import { getCurrentDate } from '@/src/utils/get-current-date.func';
import { getCurrentDateOfWeek } from '@/src/utils/get-current-date-of-the-week.func';
import { Logger } from '@/src/utils/logger';

import { AuthService } from '../../auth/auth.service';
import { ManageService } from '../../management/manage.service';
import { CreateSubitemFromOtherBoardDTO } from '../dtos/create-subitem-from-other-board.dto';

@Injectable()
export class CreateSubitemFromOtherBoardService {
	constructor(
		private readonly manageService: ManageService,
		private readonly authService: AuthService,
		private readonly logger: Logger,
	) {}

	async execute(req: Request, body: CreateSubitemFromOtherBoardDTO) {
		if (!req.session.shortLivedToken || !req.session.accountId) {
			this.logger.error(`No shortlive token or accountId found`);
			return;
		}

		this.logger.info(`AccountId: ${req.session.accountId}`);

		const { boardId, scheduleBoardId } = body.payload.inputFields;
		this.logger.info(
			`Input field: ${JSON.stringify(body.payload.inputFields)}`,
		);

		if (!boardId || !scheduleBoardId) {
			this.logger.warn(
				`No boardId or scheduleBoardId found`,
			);
			return;
		}

		const accessToken = await this.authService.getAccessToken(
			req.session.accountId.toString(),
		);

		this.logger.info(`AccessToken: ${accessToken}`);
		if (!accessToken) {
			this.logger.error(`No access token found`);
			return;
		}

		const currentDateOfWeek = getCurrentDateOfWeek();
		this.logger.info(`Current date of the week: ${currentDateOfWeek}`);

		const mondayClient = this.manageService.getMondayClient(
			accessToken.access_token,
		);

		const scheduleItemId = await this.fetchScheduleItem(
			mondayClient,
			scheduleBoardId,
			currentDateOfWeek,
		);
		this.logger.info(`Schedule item id: ${scheduleItemId}`);

		if (!scheduleItemId) {
			this.logger.warn(`No schedule item found`);
			return;
		}

		const dupplicatedItemId = await this.duplicatedItem(
			mondayClient,
			scheduleBoardId,
			scheduleItemId,
		);
		if (!dupplicatedItemId) {
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
		}

		const groupMappingValue: GroupMappingData =
			typeof groupMapping.value === 'string'
				? JSON.parse(groupMapping.value)
				: groupMapping.value;

		const dayKey: keyof GroupMappingData =
			currentDateOfWeek.toLowerCase() as keyof GroupMappingData;
		const groupToMove = groupMappingValue[dayKey];
		this.logger.info(`Group to move: ${groupToMove}`);

		if (!groupToMove) {
			this.logger.warn(
				`No group mapping found for day ${dayKey} in board ${boardId}`,
			);
			return;
		}

		// Wait about 15s to wait for duplicate finish
		await new Promise(resolve => setTimeout(resolve, 15000));

		const moveItemResult = await this.moveItemToOtherBoard(
			mondayClient,
			dupplicatedItemId,
			boardId,
			groupToMove,
		);

		this.logger.info(`Move item result id: ${moveItemResult}`);

		if (!moveItemResult) {
			this.logger.warn(`Failed to move item to board ${boardId}`);
			return;
		}

		const updateNameResult = await this.updateNameColumn(
			mondayClient,
			dupplicatedItemId,
			boardId,
			`${currentDateOfWeek} - ${currentDate}`,
		);

		if (!updateNameResult) {
			this.logger.warn(
				`Failed to update name column for item ${dupplicatedItemId}`,
			);
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

	private async duplicatedItem(
		mondayClient: ApiClient,
		scheduleBoardId: string,
		scheduleItemId: string,
	): Promise<string | null> {
		this.logger.info(
			`Duplicating item ${scheduleItemId} in board ${scheduleBoardId}`,
		);
		const result = await duplicateItem(mondayClient, this.logger, {
			boardId: scheduleBoardId,
			itemId: scheduleItemId,
		});

		this.logger.info(`Duplicate item result: ${JSON.stringify(result)}`);

		if (!result.success) {
			this.logger.warn(`Failed to duplicate item ${scheduleItemId}`);
			return null;
		}

		return result.itemId ?? null;
	}

	private async moveItemToOtherBoard(
		mondayClient: ApiClient,
		duplicatedItemId: string,
		targetBoardId: string,
		targetGroupId: string,
	): Promise<string | null> {
		this.logger.info(
			`Moving item ${duplicatedItemId} to board ${targetBoardId} and group ${targetGroupId}`,
		);
		const result = await moveItemToBoard(mondayClient, this.logger, {
			targetBoardId,
			targetGroupId,
			itemId: duplicatedItemId,
		});

		if (!result.success) {
			this.logger.warn(`Failed to move item ${duplicatedItemId}`);
			return null;
		}

		return result.itemId ?? null;
	}

	private async updateNameColumn(
		mondayClient: ApiClient,
		itemId: string,
		boardId: string,
		name: string,
	): Promise<boolean> {
		this.logger.info(
			`Updating name column for item ${itemId} in board ${boardId}}`,
		);
		const result = await updateItemColumns(mondayClient, this.logger, {
			boardId,
			itemId,
			columnValues: JSON.stringify({ name: name }),
		});
		return result.success;
	}
}
