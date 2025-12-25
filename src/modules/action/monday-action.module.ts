import { Module } from "@nestjs/common";
import { MondayActionController } from "./monday-action.controller";
import { CopyRelationColumnToNameService } from "./services/copy-relation-column-name.service";
import { ManageModule } from "../management/manage.module";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [ManageModule, AuthModule],
    providers: [CopyRelationColumnToNameService],
    controllers: [MondayActionController]
})
export class MondayActionModule { }