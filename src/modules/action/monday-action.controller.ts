import { AuthGuardFactory } from "@/src/common/guards/auth.guard";
import { Logger } from "@/src/utils/logger";
import { Controller, Post, UseGuards, Req, Body, HttpCode } from "@nestjs/common";
import type { Request, Response } from 'express';
import { CopyRelationColumnToNameDTO } from "./dtos/copy-relation-column-to-name.dto";
import { CopyRelationColumnToNameService } from "./services/copy-relation-column-name.service";
import { CreateSubitemFromOtherBoardDTO } from "./dtos/create-subitem-from-other-board.dto";
import { CreateSubitemFromOtherBoardService } from "./services/create-subitem-from-other-board.service";

@Controller('action')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayActionController {
    constructor(
        private readonly logger: Logger,
        private readonly copyRelationColumnToNameService: CopyRelationColumnToNameService,
        private readonly createSubitemFromOtherBoardService: CreateSubitemFromOtherBoardService
    ) { }

    @Post('copy-relation-column-to-name')
    @HttpCode(200)
    async copyRelationColumnToName(@Req() req: Request, @Body() body: CopyRelationColumnToNameDTO) {
        this.logger.info(`Call endpoint copy relation column to name`);
        return await this.copyRelationColumnToNameService.execute(req, body);
    }

    @Post('auto-create-daily-task')
    @HttpCode(200)
    async autoCreateDailyTask(@Req() req: Request, @Body() body: CreateSubitemFromOtherBoardDTO) {
        this.logger.info(`Call endpoint auto create daily task`);
        return await this.createSubitemFromOtherBoardService.execute(req, body);
    }

    @Post('update-total-time')
    @HttpCode(200)
    async updateTotalTime(@Req() req: Request, @Body() body: any) {
        this.logger.info(`Call endpoint update total time`);
        return { success: true };
    }
}