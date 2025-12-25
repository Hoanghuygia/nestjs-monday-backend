import { Controller, Query, Req, Res, UseGuards, Post, UnauthorizedException } from "@nestjs/common";
import { AuthGuardFactory } from "@/src/common/guards/auth.guard";
import { Logger } from "@/src/utils/logger";
import { Request, Response } from "express";
import { BoardsQueryDTO } from "./dtos/boards-quert.dto";
import { StandardResponse } from "@/src/common/filters/dtos/standard-response";
import { MondayFieldService } from "./monday-field.service";

@Controller('field')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayFieldController {
    constructor(private readonly logger: Logger, private readonly fieldService: MondayFieldService) { }

    @Post('lookup-remote-board')
    async lookupRemoteBoard(@Req() req: Request, @Res() res: Response, @Query() query: BoardsQueryDTO) {
        this.logger.info(`Call endpoint lookup remote board`);
        const {accountId, shortlivedToken} = req.session || {};

        if (!accountId || !shortlivedToken) {
            this.logger.error(`Code is missing in callback`);
                  const errorResponse = StandardResponse.error(
                    null,
                    'INVALID_CODE_PAYLOAD',
                    'Code is missing in callback',
                    '401',
                  );
                  throw new UnauthorizedException(errorResponse);
        }

        const board = await this.fieldService.lookupRemoteBoard(shortlivedToken, query.type);
        this.logger.info(`Call endpoint lookup remote board success with board: ${JSON.stringify(board)}`);
        return {
            data: board
        }
    }
}