import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { MondayController } from './monday.controller';
import { ManageService } from '../management/manage.service';
import { AuthModule } from '../auth/auth.module';


const routes: Routes = [
    {
        path: 'monday',
        children: [AuthModule],
    }
]

@Module({
    controllers: [  MondayController ],
    providers: [ManageService],
    imports: [RouterModule.register(routes), AuthModule],
    exports: [RouterModule],
})

export class MondayModule {}