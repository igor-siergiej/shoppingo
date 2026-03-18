import type { Context } from 'koa';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { IpRateLimiter } from '../../infrastructure/rateLimit';

interface FrontendLog {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    timestamp?: string;
    userAgent?: string;
    url?: string;
}

const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

const rateLimiter = new IpRateLimiter(100);
const RATE_LIMIT_WINDOW = 60000; // 1 minute

setInterval(() => {
    rateLimiter.reset();
}, RATE_LIMIT_WINDOW);

export const receiveLogs = async (ctx: Context) => {
    const logger = getLogger();
    const clientIp = ctx.ip || ctx.request.ip || 'unknown';

    // Rate limiting
    if (!rateLimiter.isAllowed(clientIp)) {
        logger.warn('Frontend logs rate limit exceeded', { clientIp });
        ctx.status = 429;
        ctx.body = { error: 'Rate limit exceeded' };
        return;
    }

    const log = ctx.request.body as FrontendLog;

    // Validate required fields
    if (!log.level || !log.message) {
        logger.warn('Invalid frontend log received', {
            clientIp,
            receivedData: log,
        });
        ctx.status = 400;
        ctx.body = { error: 'level and message are required' };
        return;
    }

    // Validate log level
    if (!['debug', 'info', 'warn', 'error'].includes(log.level)) {
        logger.warn('Invalid log level received', {
            clientIp,
            level: log.level,
        });
        ctx.status = 400;
        ctx.body = { error: 'Invalid log level' };
        return;
    }

    try {
        // Log with context
        const logContext = {
            source: 'frontend',
            clientIp,
            userAgent: log.userAgent || 'unknown',
            url: log.url || 'unknown',
            ...log.context,
        };

        // Use the appropriate log level
        logger[log.level](log.message, logContext);

        ctx.status = 204;
    } catch (error) {
        logger.error('Failed to process frontend log', {
            clientIp,
            error,
            log,
        });
        ctx.status = 500;
        ctx.body = { error: 'Failed to process log' };
    }
};
