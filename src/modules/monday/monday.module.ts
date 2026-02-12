import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { MondayController } from './monday.controller';
import { ManageService } from '../management/manage.service';
import { AuthModule } from '../auth/auth.module';
import { MondayActionModule } from '../action/monday-action.module';
import { MondayFieldModule } from '../field/monday-field.module';
import { MondayTriggerModule } from '@/src/modules/triggers/monday-trigger.module';


const routes: Routes = [
    {
        path: 'monday',
        children: [AuthModule, MondayActionModule, MondayFieldModule, MondayTriggerModule],
    }
]

@Module({
    controllers: [MondayController],
    providers: [ManageService],
    imports: [RouterModule.register(routes), AuthModule, MondayActionModule, MondayFieldModule, MondayTriggerModule],
    exports: [RouterModule],
})

export class MondayModule {}