import { Module } from "@nestjs/common";
import { MondayActionController } from "./monday-action.controller";
import { CopyRelationColumnToNameService } from "./services/copy-relation-column-name.service";
import { ManageModule } from "../management/manage.module";
import { AuthModule } from "../auth/auth.module";
import { CreateSubitemFromOtherBoardService } from "./services/create-subitem-from-other-board.service";
import { UpdateTotalTimeService } from './services/update-total-time.service';

@Module({
    imports: [ManageModule, AuthModule],
    providers: [CopyRelationColumnToNameService, CreateSubitemFromOtherBoardService, UpdateTotalTimeService],
    controllers: [MondayActionController]
})
export class MondayActionModule { }