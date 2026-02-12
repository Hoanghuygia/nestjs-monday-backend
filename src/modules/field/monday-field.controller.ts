import { Controller, Query, Req, Res, UseGuards, Post, UnauthorizedException, Body } from "@nestjs/common";
import { AuthGuardFactory } from "@/src/common/guards/auth.guard";
import { Logger } from "@/src/utils/logger";
import { Request, Response } from "express";
import { BoardsQueryDTO } from "./dtos/boards-quert.dto";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import { MondayFieldService } from "./monday-field.service";
import { ColumnsQueryDTO } from "./dtos/column-query.dto";
import { ColumnsFieldBodyDTO } from "./dtos/column.dto";

@Controller('field')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayFieldController {
    constructor(private readonly logger: Logger, private readonly fieldService: MondayFieldService) { }

    @Post('lookup-remote-board')
    async lookupRemoteBoard(@Req() req: Request, @Res() res: Response, @Query() query: BoardsQueryDTO) {
        this.logger.info(`Call endpoint lookup remote board`);
        const { accountId, shortLivedToken } = req.session || {};

        if (!accountId || !shortLivedToken) {
            this.logger.error(`Code is missing in callback`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_CODE_PAYLOAD',
                'Code is missing in callback',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const boards = await this.fieldService.lookupRemoteBoard(shortLivedToken, query.type);
        this.logger.info(`Call endpoint lookup remote board success with board: ${JSON.stringify(boards)}`);
        // trả về board có thể không cần phải có cấu trúc chuẩn vì monday nó sẽ lấy data này mà 
        return res.status(200).json(boards);
    }

    @Post('lookup-remote-column')
    async lookupRemoteColumn(@Req() req: Request, @Res() res: Response, @Query() query: ColumnsQueryDTO, @Body() body: ColumnsFieldBodyDTO) {
        this.logger.info(`Call endpoint lookup remote column`);

        const { accountId, shortLivedToken } = req.session || {};

        if (!accountId || !shortLivedToken) {
            this.logger.error(`Code is missing in callback`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_CODE_PAYLOAD',
                'Code is missing in callback',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const boardData = body.payload.dependencyData.remoteBoardData;
        this.logger.info(`Call endpoint lookup remote column with board data: ${JSON.stringify(boardData)}`);

        const columns = await this.fieldService.lookupRemoteColumn(shortLivedToken, query.type, boardData.value);

        this.logger.info(`Call endpoint lookup remote column success with column: ${JSON.stringify(columns)}`);
        return res.status(200).json(columns);
    }

    @Post('lookup-calendar-config')
    async lookupCalendarConfig(@Req() req: Request, @Res() res: Response) {
        const { accountId, shortLivedToken } = req.session || {};

        this.logger.info(`Received request for single column config list ${JSON.stringify(req.body)}`);
        if (!accountId || !shortLivedToken) {
            this.logger.error(`Account ID or short-lived token is missing in session`);
            const errorResponse = StandardResponse.error(
                null,
                'INVALID_CODE_PAYLOAD',
                'Code is missing in callback',
                '401',
            );
            throw new UnauthorizedException(errorResponse);
        }

        const config = this.fieldService.getCalendarConfigList();
        this.logger.info(`Fetched single column config: ${JSON.stringify(config)}`);
        
        return res.status(200).json(config);
    }
}