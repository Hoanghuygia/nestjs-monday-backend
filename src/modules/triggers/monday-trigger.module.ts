import { TriggerController } from '@/src/modules/triggers/monday-trigger.controller';
import { TriggerService } from '@/src/modules/triggers/monday-trigger.service';
import { ManageModule } from '@/src/modules/management/manage.module';
import { Module } from '@nestjs/common';


@Module({
    imports: [ManageModule],
    controllers: [TriggerController],
    providers: [TriggerService],
    exports: [TriggerService],
})
export class MondayTriggerModule {}
