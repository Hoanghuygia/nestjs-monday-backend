import { Module } from "@nestjs/common";
import { MondayFieldController } from "./monday-field.controller";
import { ManageService } from "../management/manage.service";
import { AuthService } from "../auth/auth.service";

@Module({
    providers: [ManageService, AuthService],
    controllers: [MondayFieldController],
    imports: []
})
export class MondayFieldModule {}