import { IsDefined, IsEnum } from 'class-validator';
import { TriggerEventType } from '@/src/modules/triggers/others/events';

interface TriggerUnsubscribeDto {
    payload: {
        webhookId: number;
        [key: string]: any;
    };
}

class TriggerUnsubscribeQueryDto {
    @IsDefined()
    @IsEnum(TriggerEventType)
    event!: TriggerEventType;
}

export type { TriggerUnsubscribeDto, TriggerUnsubscribeQueryDto };
