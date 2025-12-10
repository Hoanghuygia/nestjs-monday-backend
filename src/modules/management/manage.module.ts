import { Module } from "@nestjs/common";
import { ManageService } from "./manage.service";

@Module({
    providers: [ManageService],
    exports: [ManageService]
})

export class ManageModule { }