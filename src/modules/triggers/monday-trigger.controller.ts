import { AuthGuardFactory } from '@/src/common/guards/auth.guard';
import { TriggerSubscribeDto } from '@/src/modules/triggers/dtos/trigger-subscribe.dto';
import { TriggerUnsubscribeDto } from '@/src/modules/triggers/dtos/trigger-unsubscribe.dto';
import { TriggerService } from '@/src/modules/triggers/monday-trigger.service';
import { Logger } from '@/src/utils/logger';
import { BadRequestException, Body, Controller, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';


@Controller('trigger')
export class TriggerController {
    constructor(private readonly triggerService: TriggerService, private readonly logger: Logger) {}

    @Post('subscribe')
    @UseGuards(AuthGuardFactory('MONDAY_SIGNING_SECRET'))
    async subscribe(@Req() req: Request, @Body() body: TriggerSubscribeDto, @Query() query: any) {
        this.logger.info(`Subscribe payload: ${JSON.stringify(body)}`);
        if (!req.session?.shortLivedToken) {
            throw new BadRequestException('Missing shortLivedToken in session');
        }
        await this.triggerService.saveSubscription(body, req.session?.shortLivedToken, query.event);
    }

    @Post('unsubscribe')
    @UseGuards(AuthGuardFactory('MONDAY_SIGNING_SECRET'))
    async unsubscribe(
        @Req() req: Request,
        @Body() body: TriggerUnsubscribeDto,
        @Query() query: any,
    ) {
        this.logger.info(`Unsubscribe payload: ${JSON.stringify(body)}`);
        if (!req.session?.shortLivedToken) {
            throw new BadRequestException('Missing shortLivedToken in session');
        }
        return this.triggerService.deleteSubscription(
            body.payload.webhookId,
            req.session?.shortLivedToken,
            query.event,
        );
    }
}
