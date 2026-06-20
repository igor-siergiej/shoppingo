import type { Context } from 'hono';
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
const RATE_LIMIT_WINDOW = 60000;

setInterval(() => {
    rateLimiter.reset();
}, RATE_LIMIT_WINDOW);

export const receiveLogs = async (c: Context) => {
    const logger = getLogger();
    const clientIp = c.req.header('x-forwarded-for') || c.req.raw.headers.get('x-real-ip') || 'unknown';

    if (!rateLimiter.isAllowed(clientIp)) {
        logger.warn('Frontend logs rate limit exceeded', { clientIp });
        return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    const log = await c.req.json<FrontendLog>();

    if (!log.level || !log.message) {
        logger.warn('Invalid frontend log received', { clientIp, receivedData: log });
        return c.json({ error: 'level and message are required' }, 400);
    }

    if (!['debug', 'info', 'warn', 'error'].includes(log.level)) {
        logger.warn('Invalid log level received', { clientIp, level: log.level });
        return c.json({ error: 'Invalid log level' }, 400);
    }

    try {
        const logContext = {
            source: 'frontend',
            clientIp,
            userAgent: log.userAgent || 'unknown',
            url: log.url || 'unknown',
            ...log.context,
        };

        (logger as unknown as Record<string, (msg: string, ctx: unknown) => void>)[log.level](log.message, logContext);

        return new Response(null, { status: 204 });
    } catch (error) {
        logger.error('Failed to process frontend log', { clientIp, error, log });
        return c.json({ error: 'Failed to process log' }, 500);
    }
};
