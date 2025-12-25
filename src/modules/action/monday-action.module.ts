import { Module } from "@nestjs/common";
import { MondayActionController } from "./monday-action.controller";
import { CopyRelationColumnToNameService } from "./services/copy-relation-column-name.service";

@Module({
    providers: [],
    controllers: [MondayActionController]
})
export class MondayActionModule {}