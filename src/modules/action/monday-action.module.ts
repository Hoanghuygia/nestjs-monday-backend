import { Module } from "@nestjs/common";
import { MondayActionController } from "./monday-action.controller";
import { CopyRelationColumnToNameService } from "./services/copy-relation-column-name.service";
import { ManageModule } from "../management/manage.module";
import { AuthModule } from "../auth/auth.module";
import { CreateSubitemFromOtherBoardService } from "./services/create-subitem-from-other-board.service";

@Module({
    imports: [ManageModule, AuthModule],
    providers: [CopyRelationColumnToNameService, CreateSubitemFromOtherBoardService],
    controllers: [MondayActionController]
})
export class MondayActionModule { }