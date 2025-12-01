import swc from 'unplugin-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import { createVitestTestConfig } from './create-vitest-test-config';

export default defineConfig({
  test: createVitestTestConfig('e2e'),
  plugins: [swc.vite(), tsconfigPaths()],
});
