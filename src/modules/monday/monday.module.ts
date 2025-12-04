import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { MondayController } from './monday.controller';
import { ManageService } from '../management/manage.service';


const routes: Routes = [
    {
        path: 'monday',
        children: [],
    }
]

@Module({
    controllers: [  MondayController ],
    providers: [ManageService],
    imports: [RouterModule.register(routes)],
    exports: [RouterModule],
})

export class MondayModule {}