import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'build',
    target: 'node22',
    format: ['cjs'],
    splitting: false,
    shims: false,
    sourcemap: true,
    clean: true,
    dts: false,
    noExternal: ['koa', '@koa/cors', 'koa-body', 'koa-router', 'dotenv', 'mongodb', '@igor-siergiej/api-utils']
});
