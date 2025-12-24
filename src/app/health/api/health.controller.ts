import { Controller, Get, HttpCode } from '@nestjs/common';

import { Logger } from '@/src/utils/logger';

@Controller('health')
export class HealthController {
  constructor(private readonly logger: Logger) {}

  @Get()
  @HttpCode(200)
  run() {
    this.logger.info('Health check passed');
    return { status: 'ok', message: 'Health check passed' };
  }
}
