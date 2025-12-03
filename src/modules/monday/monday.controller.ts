import type { Response, Request } from 'express';
import { Body, Controller, Post, Req, Res} from '@nestjs/common';
import { Logger } from '@/src/utils/logger';

@Controller('monday')
export class MondayController {
    private readonly logger = new Logger(MondayController.name);

    constructor() { }

    @Post('test')
    // @UseGuards(MondayAuthGuard)
    async testEndpoint(@Req() req: Request, @Res() res: Response, @Body() body: unknown) {
        try {
            this.logger.info(`testEndpoint called with body: ${JSON.stringify(body)}`);
            this.logger.debug(`Request information headers: ${JSON.stringify(req.headers)},
                                query: ${JSON.stringify(req.query)},
                                params: ${JSON.stringify(req.params)},
                                body: ${JSON.stringify(req.body)},
                                ip: ${req.ip},
                                url: ${req.url},
                                method: ${req.method},`);
            return res.status(200).json({ message: 'Test endpoint reached successfully', data: body });
        }
        catch (error) {
            const errorDetail = error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                response: (error as any)?.response?.data ?? null
            } : {
                name: 'UnknownError',
                message: String(error),
                stack: null,
                response: null
            }
                ;
            this.logger.error(`Error in testEndpoint ${JSON.stringify(errorDetail)}`, { function: this.testEndpoint });
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}