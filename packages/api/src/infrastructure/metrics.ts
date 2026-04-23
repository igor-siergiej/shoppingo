import { Counter, collectDefaultMetrics, Histogram, register } from 'prom-client';

let defaultsStarted = false;

export const startDefaultMetrics = () => {
    if (defaultsStarted) return;
    collectDefaultMetrics({ register, prefix: 'shoppingo_api_' });
    defaultsStarted = true;
};

export const httpRequestsTotal = new Counter({
    name: 'shoppingo_api_http_requests_total',
    help: 'Total HTTP requests handled by the shoppingo API',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
    name: 'shoppingo_api_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

export const imagesServedTotal = new Counter({
    name: 'shoppingo_images_served_total',
    help: 'AI images served by source (cache hit vs freshly generated)',
    labelNames: ['source'] as const,
    registers: [register],
});

export const imagesGeneratedTotal = new Counter({
    name: 'shoppingo_images_generated_total',
    help: 'AI images freshly generated from the image provider',
    labelNames: ['provider'] as const,
    registers: [register],
});

export const imageGenerationFailuresTotal = new Counter({
    name: 'shoppingo_image_generation_failures_total',
    help: 'Failures while generating an AI image',
    labelNames: ['provider'] as const,
    registers: [register],
});

export const metricsRegister = register;
