import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthGuardFactory } from '@/src/common/guards/auth.guard';
import { Logger } from '@/src/utils/logger';
import { SetDefaultColumnValueDTO } from '../account/dto/set-default-column-value.dto';

@Controller('monday')
@UseGuards(AuthGuardFactory('MDY_SIGNING_SECRET'))
export class MondayController {
  constructor(private readonly logger: Logger) {}

  @Post('test')
  testEndpoint(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ): Response {
    try {
      this.logger.info(
        `testEndpoint called with body: ${JSON.stringify(body)}`,
      );
      this.logger
        .debug(`Request information headers: ${JSON.stringify(req.headers)},
                                query: ${JSON.stringify(req.query)},
                                params: ${JSON.stringify(req.params)},
                                body: ${JSON.stringify(req.body)},
                                sessionID: ${JSON.stringify(req.session)}`);
      return res
        .status(200)
        .json({ message: 'Test endpoint reached successfully', data: body });
    } catch (error) {
      const errorDetail =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              response: (error as any)?.response?.data ?? null,
            }
          : {
              name: 'UnknownError',
              message: String(error),
              stack: null,
              response: null,
            };
      this.logger.error(`Error in testEndpoint ${JSON.stringify(errorDetail)}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  @Post('set-default column-value')
  async setDefaultColumnvalue(@Req() req: Request, @Res() res: Response, @Body() body: SetDefaultColumnValueDTO){

  }
}
