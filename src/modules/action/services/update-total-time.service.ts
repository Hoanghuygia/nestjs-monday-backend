import { Injectable } from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { ManageService } from "../../management/manage.service";
import { Logger } from "@/src/utils/logger";
import { Request } from "express";
import { UpdateTotalTimeDTO } from "../dtos/update-total-time.dto";
import { ApiClient } from "@mondaydotcomorg/api";
import { fetchAllBoardItemsAndSubitems } from "@/src/graphql/api/query/query.fucntion";
import { updateItemColumns } from "@/src/graphql/api/mutation/mutation.function";

interface TargetItem {
	id: string;
	minute: string;
	time: string;
}

interface ParentItemWithSubitems {
	id: string;
	subitems: TargetItem[];
}

enum TimePeriod {
	MORNING = 'morning',
	EVENING = 'evening'
}

@Injectable()
export class UpdateTotalTimeService {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly manageService: ManageService
	) { }

	async execute(req: Request, body: UpdateTotalTimeDTO) {
		this.logger.info(`Executing update total time service`);
		if (!req.session.shortLivedToken || !req.session.accountId) {
			this.logger.error(`No shortlive token or accountId found`);
			return;
		}

		const { currentBoardId, morningColumnId, eveningColumnId, timeColumnId, minuteColumnId } =
			body.payload.inputFields;
		this.logger.info(
			`Input field: ${JSON.stringify(body.payload.inputFields)}`,
		);

		if (!currentBoardId || !morningColumnId || !eveningColumnId) {
			this.logger.warn(
				`No currentBoardId or morningColumnId or eveningColumnId found`,
			);
			return;
		}

		const accessToken = await this.authService.getAccessToken(
			req.session.accountId.toString(),
		);
		if (!accessToken) {
			this.logger.error(`No access token found`);
			return;
		}

		const mondayClient = this.manageService.getMondayClient(
			accessToken.access_token,
		);

		const normalizeTimeColumnId = timeColumnId.value;
		const normalizeMiniteColumnId = minuteColumnId.value;

		// 1. Fetch all items from the current board with their subitems
		const parentItems = await this.fetchAllParentItemsWithSubitems(
			mondayClient,
			currentBoardId,
			normalizeMiniteColumnId,
			normalizeTimeColumnId
		);
		this.logger.info(`Found ${parentItems.length} parent items to process`);

		if (parentItems.length === 0) {
			this.logger.warn(`No parent items found in board ${currentBoardId}`);
			return;
		}

		// 2. Process all parent items in parallel using Promise.all
		await Promise.all(
			parentItems.map(async (parentItem) => {
				return this.processParentItem(
					mondayClient,
					currentBoardId,
					parentItem,
					morningColumnId,
					eveningColumnId
				);
			})
		);

		this.logger.info(`Successfully completed update total time service`);
	}

	private async fetchAllParentItemsWithSubitems(
		mondayClient: ApiClient,
		boardId: string,
		subMinuteColumnId: string,
		subTimeColumnId: string
	): Promise<ParentItemWithSubitems[]> {
		this.logger.info(`Fetching all parent items with subitems from board ${boardId}`);
		const parentItems: ParentItemWithSubitems[] = [];
		let cursor: string | null = null;

		do {
			const page = await fetchAllBoardItemsAndSubitems(
				mondayClient,
				this.logger,
				{
					boardId: boardId,
					cursor,
					columnIds: [subMinuteColumnId, subTimeColumnId]
				}
			);

			this.logger.info(`Fetched ${page.items.length} parent items from page`);

			for (const item of page.items) {
				const subitems: TargetItem[] = [];
				const subitemsList = (item as any).subitems ?? [];

				for (const subitem of subitemsList) {
					const columnValues = subitem.column_values ?? [];

					const columnMap: Record<string, any> = {};
					for (const col of columnValues) {
						columnMap[col.id] = col;
					}

					const minuteCol = columnMap[subMinuteColumnId];
					if (!minuteCol) continue;

					const timeCol = columnMap[subTimeColumnId];

					subitems.push({
						id: subitem.id,
						minute: minuteCol.display_value ?? minuteCol.text ?? minuteCol.value,
						time: timeCol?.display_value ?? timeCol?.text ?? timeCol?.value ?? null
					});
				}

				parentItems.push({
					id: item.id,
					subitems
				});
			}


			cursor = page.cursor;
		} while (cursor);

		this.logger.info(`Total parent items collected: ${parentItems.length}`);

		return parentItems;
	}

	private async processParentItem(
		mondayClient: ApiClient,
		currentBoardId: string,
		parentItem: ParentItemWithSubitems,
		morningColumnId: string,
		eveningColumnId: string
	): Promise<void> {
		this.logger.info(`Processing parent item ${parentItem.id}`);

		// Use subitems from parent item (already fetched)
		const subitems = parentItem.subitems;

		if (subitems.length === 0) {
			this.logger.info(`No subitems found for parent item ${parentItem.id}`);
			return;
		}

		this.logger.info(`Found ${subitems.length} subitems for parent item ${parentItem.id}`);

		// Initialize total minute counters
		let totalMinuteMorning = 0;
		let totalMinuteEvening = 0;

		// Calculate totals based on time column value
		for (const subitem of subitems) {
			const minuteValue = parseFloat(subitem.minute) || 0;
			const timeValue = (subitem.time || '').toLowerCase().trim();

			this.logger.info(
				`Subitem ${subitem.id}: time=${timeValue}, minute=${minuteValue}`
			);

			if (timeValue === TimePeriod.MORNING) {
				totalMinuteMorning += minuteValue;
			} else if (timeValue === TimePeriod.EVENING) {
				totalMinuteEvening += minuteValue;
			}
		}

		this.logger.info(
			`Parent item ${parentItem.id}: totalMinuteMorning=${totalMinuteMorning}, totalMinuteEvening=${totalMinuteEvening}`
		);

		// Update parent item with calculated totals
		const updateResult = await this.updateParentItemTotals(
			mondayClient,
			currentBoardId,
			parentItem.id,
			morningColumnId,
			eveningColumnId,
			totalMinuteMorning,
			totalMinuteEvening
		);

		if (!updateResult) {
			this.logger.warn(
				`Failed to update totals for parent item ${parentItem.id}`
			);
		} else {
			this.logger.info(
				`Successfully updated totals for parent item ${parentItem.id}`
			);
		}
	}

	private async updateParentItemTotals(
		mondayClient: ApiClient,
		boardId: string,
		itemId: string,
		morningColumnId: string,
		eveningColumnId: string,
		totalMinuteMorning: number,
		totalMinuteEvening: number
	): Promise<boolean> {
		this.logger.info(
			`Updating parent item ${itemId} in board ${boardId} with morning=${totalMinuteMorning}, evening=${totalMinuteEvening}`
		);

		this.logger.info(`morningColumnId: ${morningColumnId}, eveningColumnId: ${eveningColumnId}`);
		this.logger.info(`totalMinuteMorning: ${totalMinuteMorning}, totalMinuteEvening: ${totalMinuteEvening}`);

		const columnValues: any = {};
		columnValues[morningColumnId] = totalMinuteMorning;
		columnValues[eveningColumnId] = totalMinuteEvening;

		const result = await updateItemColumns(mondayClient, this.logger, {
			boardId,
			itemId,
			columnValues: JSON.stringify(columnValues)
		});

		return result.success;
	}
}