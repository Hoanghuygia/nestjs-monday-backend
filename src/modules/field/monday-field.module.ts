import { Module } from "@nestjs/common";
import { MondayFieldController } from "./monday-field.controller";
import { AuthModule } from "../auth/auth.module";
import { ManageModule } from "../management/manage.module";
import { MondayFieldService } from "./monday-field.service";

@Module({
    imports: [AuthModule, ManageModule],
    controllers: [MondayFieldController],
    providers: [MondayFieldService]
})
export class MondayFieldModule { }