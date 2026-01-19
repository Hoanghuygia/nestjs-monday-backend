import { Module } from '@nestjs/common';

import { SetRatioAndStatusService } from '@/src/modules/action/services/set-ratio-and-status.service';

import { AuthModule } from '../auth/auth.module';
import { ManageModule } from '../management/manage.module';
import { MondayActionController } from './monday-action.controller';
import { CopyRelationColumnToNameService } from './services/copy-relation-column-name.service';
import { CreateSubitemFromOtherBoardService } from './services/create-subitem-from-other-board.service';
import { UpdateTotalTimeService } from './services/update-total-time.service';

@Module({
	imports: [ManageModule, AuthModule],
	providers: [
		CopyRelationColumnToNameService,
		CreateSubitemFromOtherBoardService,
		UpdateTotalTimeService,
		SetRatioAndStatusService,
	],
	controllers: [MondayActionController],
})
export class MondayActionModule {}
