import { AuthGuardFactory } from "@/src/common/guards/auth.guard";
import { Logger } from "@/src/utils/logger";
import { Controller, Post, UseGuards , Req, Res, Body} from "@nestjs/common";
import type { Request, Response } from 'express';
import { CopyRelationColumnToNameDTO } from "./dtos/copy-relation-column-to-name.dto";

@Controller('action')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayActionController {
    constructor(
        private readonly logger: Logger
    ) {}

    @Post('copy-relation-column-to-name')
    async copyRelationColumnToName(@Req() req: Request, @Res() res: Response, @Body() body: CopyRelationColumnToNameDTO) {
        this.logger.info(`Call endpoint copy relation column to name`);
    }
}