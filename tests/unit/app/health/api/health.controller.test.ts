import { Logger } from '@nestjs/common';

import { createMock, Mock } from '@/tests/utils/mock';

import { HealthController } from '@/app/health/api/health.controller';

describe('HealthController', () => {
  let healthController: HealthController;
  let logger: Mock<Logger>;

  beforeEach(() => {
    logger = {
      log: vi.fn(),
    } as unknown as Mock<Logger>;
    healthController = new HealthController(logger);
  });

  describe('run', () => {
    it('should return is healthy', () => {
      expect(healthController.run()).toEqual({
        status: 'ok',
        message: 'Health check passed',
      });
      expect(logger.log).toHaveBeenCalledTimes(1);
    });
  });
});
