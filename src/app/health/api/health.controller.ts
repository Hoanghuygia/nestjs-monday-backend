import { Controller, Get, Head, HttpCode } from '@nestjs/common';

import { Logger } from '@/src/utils/logger';

@Controller('health')
export class HealthController {
	constructor(private readonly logger: Logger) {}

	@Get()
	@HttpCode(200)
	check() {
		this.logger.info('Health check (GET) passed');
		return { status: 'ok', message: 'Health check passed' };
	}

	@Head()
	@HttpCode(200)
	headCheck() {
		this.logger.info('Health check (HEAD) passed');
		return;
	}
}
