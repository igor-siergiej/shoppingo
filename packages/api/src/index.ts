import 'dotenv/config';

import bodyParser from '@koa/bodyparser';
import cors from '@koa/cors';
import Koa, { Context, Next } from 'koa';

import { config } from './config';
import { dependencyContainer, registerDepdendencies } from './dependencies';
import { DependencyToken } from './dependencies/types';
import routes from './routes';

const port = config.get('port');

const allowedOrigins: Array<string> = [
    'https://shoppingo.imapps.co.uk',
    'http://shoppingo.imapps.staging',
    'http://localhost:4000',
];

const corsOptions = {
    origin: (ctx: Context) => {
        const origin = ctx.get('origin');

        if (allowedOrigins.includes(origin)) {
            return origin;
        }

        return '*';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
};

export const onStartup = async () => {
    try {
        const app = new Koa();

        app.use(cors(corsOptions));

        registerDepdendencies();

        const logger = dependencyContainer.resolve(DependencyToken.Logger);
        const database = dependencyContainer.resolve(DependencyToken.Database);
        const bucket = dependencyContainer.resolve(DependencyToken.Bucket);

        if (!database) {
            throw new Error('Database dependency not found');
        }

        // Request logger
        const requestLogger = async (ctx: Context, next: Next) => {
            const start = Date.now();

            await next();
            const ms = Date.now() - start;

            if (logger) {
                logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} ${ms}ms`);
            }
        };

        app.use(requestLogger);
        app.use(bodyParser({ enableTypes: ['json', 'form', 'text'] }));

        // Global error handler
        app.use(async (ctx, next) => {
            try {
                await next();
            } catch (err: unknown) {
                const error = err as { status?: number; message?: string };

                ctx.status = error.status ?? 500;
                ctx.body = { error: error.message ?? 'Internal Server Error' };
                if (logger) {
                    logger.error('Unhandled error', error);
                }
            }
        });

        logger.info('Starting API server - connecting to database and object store');
        await database.connect({
            connectionUri: config.get('connectionUri'),
            databaseName: config.get('databaseName')
        });
        logger.info('Connected to database');

        await bucket.connect?.({
            endpoint: config.get('bucketEndpoint'),
            accessKey: config.get('bucketAccessKey'),
            secretKey: config.get('bucketSecretKey'),
            bucketName: config.get('bucketName')
        });
        logger.info('Connected to object store');

        app.use(routes.routes());
        app.use(routes.allowedMethods());

        app.listen(port, () => {
            logger.info(`Shoppingo API server running on port ${port}`);
        });
    } catch (error) {
        const logger = dependencyContainer.resolve(DependencyToken.Logger);

        logger.error('Encountered an error on start up', error);
        process.exit(1);
    }
};

onStartup();
