import type { Context } from 'hono';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { IpRateLimiter } from '../../infrastructure/rateLimit';
import { isPrivateIp } from '../../infrastructure/safeFetch';

interface FrontendLog {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    timestamp?: string;
    userAgent?: string;
    url?: string;
}

const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

// The web logger sends one POST per log line, so a busy realtime session legitimately bursts.
const RATE_LIMIT_PER_WINDOW = 300;
const RATE_LIMIT_WINDOW = 60000;
const rateLimiter = new IpRateLimiter(RATE_LIMIT_PER_WINDOW);

setInterval(() => {
    rateLimiter.reset();
}, RATE_LIMIT_WINDOW);

// Each proxy appends the address it received the request from, so entries before the last proxy-added one are whatever
// the client chose to send. Walk back from the end past our own internal proxies (private addresses) and take the
// first public entry; that is the nearest address a trusted hop actually observed. LAN-only chains fall back to the last.
// fallow-ignore-next-line complexity, unused-export
export const clientIpFrom = (forwardedFor: string | undefined, realIp: string | null): string => {
    const entries = (forwardedFor ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (entries.length === 0) {
        return realIp || 'unknown';
    }
    return [...entries].reverse().find((entry) => !isPrivateIp(entry)) ?? entries[entries.length - 1];
};

const getClientIp = (c: Context): string =>
    clientIpFrom(c.req.header('x-forwarded-for'), c.req.raw.headers.get('x-real-ip'));

// Rate limit + validation + log dispatch in one linear flow; splitting further would scatter one request.
// fallow-ignore-next-line complexity
export const receiveLogs = async (c: Context) => {
    const logger = getLogger();
    const clientIp = getClientIp(c);

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
