import 'dotenv/config';

import { createApp } from '@imapps/api-utils/hono';
import { config } from './config';
import { dependencyContainer, registerDepdendencies } from './dependencies';
import { DependencyToken } from './dependencies/types';
import {
    httpRequestDurationSeconds,
    httpRequestsTotal,
    metricsRegister,
    startDefaultMetrics,
} from './infrastructure/metrics';
import { createRoutes } from './routes';

const port = config.get('port');

const allowedOrigins: Array<string> = [
    'https://shoppingo.imapps.co.uk',
    'http://shoppingo.imapps.staging',
    'http://localhost:4000',
];

export const onStartup = async () => {
    try {
        startDefaultMetrics();

        registerDepdendencies();

        const logger = dependencyContainer.resolve(DependencyToken.Logger);
        const database = dependencyContainer.resolve(DependencyToken.Database);
        const bucket = dependencyContainer.resolve(DependencyToken.Bucket);

        if (!database) {
            throw new Error('Database dependency not found');
        }

        const app = createApp({ logger, allowedOrigins });

        // Metrics endpoint — exposed before auth
        app.get('/api/metrics', async (c) => {
            c.header('Content-Type', metricsRegister.contentType);
            return c.body(await metricsRegister.metrics());
        });

        // Prometheus instrumentation middleware
        app.use(async (c, next) => {
            const endTimer = httpRequestDurationSeconds.startTimer();
            await next();
            const route = c.req.routePath ?? 'unmatched';
            const labels = { method: c.req.method, route, status: String(c.res.status) };
            endTimer(labels);
            httpRequestsTotal.inc(labels);
        });

        logger.info('Starting API server - connecting to database and object store');
        await database.connect({
            connectionUri: config.get('connectionUri'),
            databaseName: config.get('databaseName'),
        });
        logger.info('Connected to database');

        await bucket.connect?.({
            endpoint: config.get('bucketEndpoint'),
            accessKey: config.get('bucketAccessKey'),
            secretKey: config.get('bucketSecretKey'),
            bucketName: config.get('bucketName'),
        });
        logger.info('Connected to object store');

        app.route('/', createRoutes());

        Bun.serve({
            port,
            fetch: app.fetch,
        });

        logger.info(`Shoppingo API server running on port ${port}`);

        dependencyContainer.resolve(DependencyToken.DailyReminderScheduler).start();
        logger.info('Daily todo reminder scheduler started');
    } catch (error) {
        const logger = dependencyContainer.resolve(DependencyToken.Logger);
        logger.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
