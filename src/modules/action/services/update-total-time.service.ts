import { Injectable } from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { ManageService } from "../../management/manage.service";
import { Logger } from "@/src/utils/logger";
import { Request } from "express";
import { UpdateTotalTimeDTO } from "../dtos/update-total-time.dto";

@Injectable()
export class UpdateTotalTimeService {
    constructor(
        private readonly logger: Logger,
        private readonly authService: AuthService,
        private readonly manageService: ManageService
    ) { }

    async execute(req: Request, body: UpdateTotalTimeDTO){
        this.logger.info(`Executing update total time service`);
        if (!req.session.shortLivedToken || !req.session.accountId) {
			this.logger.error(`No shortlive token or accountId found`);
			return;
		}

		const { currentBoardId, morningColumnId, eveningColumnId } =
			body.payload.inputFields;
		this.logger.info(
			`Input field: ${JSON.stringify(body.payload.inputFields)}`,
		);

		if (!currentBoardId || !morningColumnId || !eveningColumnId) {
			this.logger.warn(
				`No currentBoardId or morningColumnId or eveningColumnId found`,
			);
			return;
		}

		const accessToken = await this.authService.getAccessToken(
			req.session.accountId.toString(),
		);
		if (!accessToken) {
			this.logger.error(`No access token found`);
			return;
		}

		const mondayClient = this.manageService.getMondayClient(
			accessToken.access_token,
		);
    }
}