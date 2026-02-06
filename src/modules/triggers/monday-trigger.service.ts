import { ManageService } from '@/src/modules/management/manage.service';
import { TriggerSubscribeDto } from '@/src/modules/triggers/dtos/trigger-subscribe.dto';
import { TriggerEventType } from '@/src/modules/triggers/others/events';
import { Logger } from '@/src/utils/logger';
import { Injectable } from '@nestjs/common';
import { JsonValue } from 'node_modules/@mondaycom/apps-sdk/dist/types/types/general';

@Injectable()
export class TriggerService {
    constructor(private readonly manageService: ManageService, private readonly logger: Logger) {}

    async saveSubscription(
        data: TriggerSubscribeDto,
        token: string,
        event: TriggerEventType,
    ): Promise<{ success: boolean }> {
        try {
            const storage = this.manageService.createStorage(token);

            const { success, error } = await storage.set(
                `trigger_${event}_${data.payload.subscriptionId}`,
                JSON.stringify(data),
                { shared: false },
            );

            if (!success) {
                this.logger.error(`Failed to save subscription: ${String(error)}`);
                return { success: false };
            }

            this.logger.info(
                `Subscription saved with key: trigger_${event}_${data.payload.subscriptionId}`,
            );
            return { success: true };
        } catch (error) {
            this.logger.error(`Error saving subscription: ${String(error)}`);
            return { success: false };
        }
    }

    async deleteSubscription(
        subscriptionId: number,
        token: string,
        event: TriggerEventType,
    ): Promise<{ success: boolean }> {
        try {
            const storage = this.manageService.createStorage(token);

            const { success, error } = await storage.delete(`trigger_${event}_${subscriptionId}`);

            if (!success) {
                this.logger.error(`Failed to delete subscription`);
                return { success: true }; // If the key doesn't exist, consider it a success
            }

            this.logger.info(`Subscription deleted with key: trigger_${event}_${subscriptionId}`);
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting subscription`);
            return { success: false };
        }
    }

    async getSubscription(
        subscriptionId: string,
        token: string,
        event: TriggerEventType,
    ): Promise<TriggerSubscribeDto | null> {
        try {
            const storage = this.manageService.createStorage(token);

            const { value, success, error } = await storage.get<JsonValue>(
                `trigger_${event}_${subscriptionId}`,
            );

            if (!success) {
                this.logger.error(`Failed to retrieve subscription: ${String(error)}`);
                return null;
            }

            this.logger.info(`Subscription retrieved with key: trigger_${event}_${subscriptionId}`);
            return (value as unknown as TriggerSubscribeDto) || null;
        } catch (error) {
            this.logger.error(`Error retrieving subscription: ${String(error)}`);
            return null;
        }
    }

    async listSubscriptions(
        token: string,
        event: TriggerEventType,
    ): Promise<TriggerSubscribeDto[]> {
        try {
            const storage = this.manageService.createStorage(token);

            const { records, success, error } = await storage.search(`trigger_${event}_`);

            if (!success || !records) {
                this.logger.error(`Failed to list subscriptions: ${String(error)}`);
                return [];
            }

            const subscriptions: TriggerSubscribeDto[] = [];

            for (const record of records) {
                const parsed = JSON.parse(record.value as string) as unknown;
                if (!this.isTriggerSubscribeDto(parsed)) {
                    this.logger.warn(`Skipping record with key ${record.key} due to missing value`);
                    continue;
                }
                subscriptions.push(parsed);
            }

            this.logger.info(
                `Total subscriptions retrieved for event ${event}: ${subscriptions.length}`,
            );
            return subscriptions;
        } catch (error) {
            this.logger.error(`Error listing subscriptions: ${String(error)}`);
            return [];
        }
    }

    private isTriggerSubscribeDto(value: unknown): value is TriggerSubscribeDto {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const maybePayload = (value as { payload?: unknown }).payload;
        if (!maybePayload || typeof maybePayload !== 'object') {
            return false;
        }
        return 'subscriptionId' in maybePayload;
    }
}
