import { Global, Module } from '@nestjs/common';

import { Logger } from '@/src/utils/logger';

@Global()
@Module({
  providers: [Logger],
  exports: [Logger],
})
export class GlobalLoggerModule {}
