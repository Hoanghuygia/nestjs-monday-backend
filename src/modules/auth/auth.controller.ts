import { Controller, Get, Query, Res } from "@nestjs/common";
import { AuthService } from './auth.service';
import { Logger } from "@mondaycom/apps-sdk/dist/types/utils/logger";

@Controller('monday/auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService) { }

    @Get('redirect')
    async oauthRedirect(
        @Query('code') code: string,
        @Res() res: Response
    ) {
    //     try {
    //         const accessToken = await this.authService.exchangeCodeForToken(code);
    //         this.logger.info(`OAuth2 code exchanged for access token successfully.`);
    //         return res.send({
    //             message: 'Authentication successful',
    //             accessToken: accessToken
    //         });

    //     } catch (error) {
    //         this.logger.error(`Error exchanging OAuth2 code for access token: ${error.message}`);
    //         return res.status(500).send({
    //             message: 'Authentication failed',
    //             error: error.message
    //         });
    //     }
    }
} 
