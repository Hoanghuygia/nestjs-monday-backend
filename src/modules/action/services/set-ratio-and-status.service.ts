import { ApiClient } from '@mondaydotcomorg/api';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

import { updateItemColumns } from '@/src/graphql/api/mutation/mutation.function';
import {
	getParentItemIdFromSubItemIdFunc,
	getSingleItemAndSubitemsFunc,
} from '@/src/graphql/api/query/query.fucntion';
import { SetRatioAndStatusDTO } from '@/src/modules/action/dtos/set-ratio-and-status.dto';
import { AuthService } from '@/src/modules/auth/auth.service';
import { ManageService } from '@/src/modules/management/manage.service';
import { getMondayClientFromRequest } from '@/src/utils/get-monday-client.util';
import { Logger } from '@/src/utils/logger';

interface SubitemFinish {
	id: string;
	finishChecked: boolean;
}

enum StatusLabel {
	NOT_FINISH_ANYTHING = 'Not finish anything',
	NOT_FINISH_ALL = 'Not Finish All',
	DONE = 'Done',
}

@Injectable()
export class SetRatioAndStatusService {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly manageService: ManageService,
	) {}

	async execute(request: Request, body: SetRatioAndStatusDTO): Promise<any> {
		this.logger.info(`Executing set ratio and status service`);

		// Get Monday client from request session
		const clientResult = await getMondayClientFromRequest(
			request,
			this.authService,
			this.manageService,
			this.logger,
		);

		if (!clientResult.success) {
			this.logger.error(`Failed to get Monday client: ${clientResult.error}`);
			return { success: false, error: clientResult.error };
		}

		const mondayClient = clientResult.client;

		const { boardId, itemId, statusColumnId, ratioColumnId, remoteColumnId } =
			body.payload.inputFields;

		this.logger.info(
			`Input field: ${JSON.stringify(body.payload.inputFields)}`,
		);

		// Extract finishColumnId from remoteColumnId
		const finishColumnId = remoteColumnId?.value;

		if (
			!boardId ||
			!itemId ||
			!statusColumnId ||
			!ratioColumnId ||
			!finishColumnId
		) {
			this.logger.warn(
				`Missing required fields: boardId=${boardId} itemId=${itemId}, statusColumnId=${statusColumnId}, ratioColumnId=${ratioColumnId}, finishColumnId=${finishColumnId}`,
			);
			return { success: false, error: 'Missing required fields' };
		}

		// 1. Get parent item ID from subitem ID
		const parentItemId = await getParentItemIdFromSubItemIdFunc(
			mondayClient,
			this.logger,
			{ itemIds: [itemId] },
		);

		this.logger.info(`Parent item ID for subitem ${itemId} is ${parentItemId}`);
		if (!parentItemId) {
			this.logger.error(`Could not find parent item for subitem ${itemId}`);
			return { success: false, error: 'Parent item not found' };
		}

		this.logger.info(
			`Found parent item ID: ${parentItemId} for subitem ${itemId}`,
		);

		// 2. Fetch the parent item with its subitems and finish column
		const subitems = await this.fetchItemSubitemsWithFinishColumn(
			mondayClient,
			parentItemId,
			finishColumnId,
		);

		if (subitems.length === 0) {
			this.logger.warn(`No subitems found for parent item ${parentItemId}`);
			return;
		}

		this.logger.info(
			`Found ${subitems.length} subitems for parent item ${parentItemId}`,
		);

		// 2. Count how many subitems have finish column checked = true
		let finishCount = 0;
		for (const subitem of subitems) {
			if (subitem.finishChecked) {
				finishCount++;
			}
		}

		this.logger.info(
			`Current finish count: ${finishCount} out of ${subitems.length}`,
		);

		// Ensure finishCount is within valid range
		finishCount = Math.max(0, Math.min(finishCount, subitems.length));

		// 4. Calculate ratio
		const ratio = subitems.length > 0 ? finishCount / subitems.length : 0;

		// Determine status label based on finish count
		let statusLabel: StatusLabel;
		if (finishCount === 0) {
			statusLabel = StatusLabel.NOT_FINISH_ANYTHING;
		} else if (finishCount === subitems.length) {
			statusLabel = StatusLabel.DONE;
		} else {
			statusLabel = StatusLabel.NOT_FINISH_ALL;
		}

		this.logger.info(`Calculated ratio: ${ratio}, status: ${statusLabel}`);

		// 5. Update ratioColumnId and statusColumnId on the parent item
		const updateResult = await this.updateRatioAndStatus(
			mondayClient,
			boardId,
			parentItemId,
			ratioColumnId,
			statusColumnId,
			ratio * 100,
			statusLabel,
		);

		if (!updateResult) {
			this.logger.error(
				`Failed to update ratio and status for parent item ${parentItemId}`,
			);
			return { success: false };
		}

		this.logger.info(
			`Successfully updated ratio and status for parent item ${parentItemId}`,
		);
		return {
			success: true,
			ratio,
			status: statusLabel,
			finishCount,
			totalSubitems: subitems.length,
		};
	}

	private async fetchItemSubitemsWithFinishColumn(
		mondayClient: ApiClient,
		itemId: string,
		finishColumnId: string,
	): Promise<SubitemFinish[]> {
		this.logger.info(
			`Fetching subitems for item ${itemId} with finish column ${finishColumnId}`,
		);

		const itemData = await getSingleItemAndSubitemsFunc(
			mondayClient,
			this.logger,
			{
				itemId,
				columnIds: [finishColumnId],
			},
		);

		if (!itemData?.subitems) {
			this.logger.warn(`No item data or subitems found for item ${itemId}`);
			return [];
		}

		const subitems: SubitemFinish[] = [];
		const subitemsList = itemData.subitems ?? [];

		for (const subitem of subitemsList) {
			const columnValues = subitem.column_values ?? [];

			const columnMap: Record<string, any> = {};
			for (const col of columnValues) {
				columnMap[col.id] = col;
			}

			const finishCol = columnMap[finishColumnId];
			if (!finishCol) {
				this.logger.warn(`Finish column not found for subitem ${subitem.id}`);
				continue;
			}

			// Parse the checkbox value
			let finishChecked = false;
			try {
				const value = finishCol.value ?? finishCol.text;
				if (value) {
					const parsed = typeof value === 'string' ? JSON.parse(value) : value;
					finishChecked = parsed.checked === true;
				}
			} catch (error) {
				this.logger.warn(
					`Failed to parse finish column value for subitem ${subitem.id}: ${String(error)}`,
				);
			}

			subitems.push({
				id: subitem.id,
				finishChecked,
			});
		}

		this.logger.info(
			`Fetched ${subitems.length} subitems with finish column data`,
		);
		return subitems;
	}

	private async updateRatioAndStatus(
		mondayClient: ApiClient,
		boardId: string,
		itemId: string,
		ratioColumnId: string,
		statusColumnId: string,
		ratio: number,
		statusLabel: StatusLabel,
	): Promise<boolean> {
		this.logger.info(
			`Updating item ${itemId} in board ${boardId} with ratio=${ratio}, status=${statusLabel}`,
		);

		const columnValues: any = {};

		// Update ratio column (number column)
		columnValues[ratioColumnId] = ratio;

		// Update status column (status column with label)
		columnValues[statusColumnId] = { label: statusLabel };

		this.logger.info(
			`Column values to update: ${JSON.stringify(columnValues)}`,
		);

		const result = await updateItemColumns(mondayClient, this.logger, {
			boardId,
			itemId,
			columnValues: JSON.stringify(columnValues),
		});

		return result.success;
	}
}
