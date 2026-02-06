import { Module } from '@nestjs/common';
import { TriggerService } from './trigger.service';
import { TriggerController } from './trigger.controller';
import { MondayModule } from 'src/monday/monday.module';

@Module({
    imports: [MondayModule],
    controllers: [TriggerController],
    providers: [TriggerService],
    exports: [TriggerService],
})
export class TriggerModule {}
