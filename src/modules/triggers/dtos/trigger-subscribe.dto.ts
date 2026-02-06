import { IsDefined, IsEnum } from 'class-validator';
import { TriggerEventType } from '@/src/modules/triggers/others/events';

interface TriggerSubscribeDto {
    payload: {
        webhookUrl: string;
        subscriptionId: number;
        blockMetadata: Record<string, any>;
        inboundFieldValues: Record<string, any>;
        credentialsValues: Record<string, any>;
        inputFields: Record<string, any>;
        recipeId: number;
        integrationId: number;
    };
}
class TriggerSubscribeQueryDto {
    @IsDefined()
    @IsEnum(TriggerEventType)
    event!: TriggerEventType;
}

export type { TriggerSubscribeDto, TriggerSubscribeQueryDto };
