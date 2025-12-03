import { Module } from '@nestjs/common';
import { RouterModule, Routes } from '@nestjs/core';
import { MondayController } from './monday.controller';


const routes: Routes = [
    {
        path: 'monday',
        children: [],
    }
]

@Module({
    controllers: [  MondayController ],
    providers: [],
    imports: [RouterModule.register(routes)],
    exports: [RouterModule],
})

export class MondayModule {}