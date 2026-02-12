import {
	Body,
	Controller,
	HttpCode,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuardFactory } from '@/src/common/guards/auth.guard';
import { SetRatioAndStatusService } from '@/src/modules/action/services/set-ratio-and-status.service';
import { UpdateTotalTimeService } from '@/src/modules/action/services/update-total-time.service';
import { Logger } from '@/src/utils/logger';

import { CopyRelationColumnToNameDTO } from './dtos/copy-relation-column-to-name.dto';
import { CreateSubitemFromOtherBoardDTO } from './dtos/create-subitem-from-other-board.dto';
import { CopyRelationColumnToNameService } from './services/copy-relation-column-name.service';
import { CreateSubitemFromOtherBoardService } from './services/create-subitem-from-other-board.service';
import { SyncItemInCalendarService } from '@/src/modules/action/services/sync-item-in-calendar.service';

@Controller('action')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayActionController {
	constructor(
		private readonly logger: Logger,
		private readonly copyRelationColumnToNameService: CopyRelationColumnToNameService,
		private readonly createSubitemFromOtherBoardService: CreateSubitemFromOtherBoardService,
		private readonly updateTotalTimeService: UpdateTotalTimeService,
		private readonly setRatioAndStatusService: SetRatioAndStatusService,
		private readonly syncItemInCalendarService: SyncItemInCalendarService
	) { }

	@Post('copy-relation-column-to-name')
	@HttpCode(200)
	async copyRelationColumnToName(
		@Req() req: Request,
		@Body() body: CopyRelationColumnToNameDTO,
	) {
		this.logger.info(`Call endpoint copy relation column to name`);
		return await this.copyRelationColumnToNameService.execute(req, body);
	}

	@Post('auto-create-daily-task')
	@HttpCode(200)
	async autoCreateDailyTask(
		@Req() req: Request,
		@Body() body: CreateSubitemFromOtherBoardDTO,
	) {
		this.logger.info(`Call endpoint auto create daily task`);
		await this.createSubitemFromOtherBoardService.execute(req, body);
	}

	@Post('update-total-time')
	@HttpCode(200)
	async updateTotalTime(@Req() req: Request, @Body() body: any) {
		this.logger.info(`Call endpoint update total time`);
		await this.updateTotalTimeService.execute(req, body);
	}

	@Post('set-ratio-and-status')
	@HttpCode(200)
	async setRatioAndStatus(@Req() req: Request, @Body() body: any) {
		this.logger.info(`Call endpoint set ratio and status`);
		return await this.setRatioAndStatusService.execute(req, body);
	}

	@Post('sync-item-in-calendar')
	@HttpCode(200)
	async syncItemInCalendar(@Req() req: Request, @Body() body: any) {
		this.logger.info(`Call endpoint sync item in calendar ${JSON.stringify(body)}`);
		return await this.syncItemInCalendarService.execute(req, body);
	}

	@Post('test-action')
	@HttpCode(200)
	async test(@Req() req: Request, @Body() body: any) {
		this.logger.info(`Call endpoint sync item in calendar ${JSON.stringify(body)}`);
		return { success: true };
	}
}
