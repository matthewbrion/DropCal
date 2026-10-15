import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        fileParallelism: false,
        hookTimeout: 60000,
        globalSetup: './test/globalSetup.js',
    },
});