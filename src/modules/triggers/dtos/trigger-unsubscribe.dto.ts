import { IsDefined, IsEnum } from 'class-validator';
import { TriggerEventType } from '../utils/events';
import { Transform } from 'class-transformer';

interface TriggerUnsubscribeDto {
    payload: {
        webhookId: number;
        [key: string]: any;
    };
}

class TriggerUnsubscribeQueryDto {
    @IsDefined()
    @IsEnum(TriggerEventType)
    event: TriggerEventType;
}

export type { TriggerUnsubscribeDto, TriggerUnsubscribeQueryDto };
