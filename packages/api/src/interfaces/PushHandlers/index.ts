import { APIError } from '@imapps/api-utils/hono';
import type { PushSubscription } from '@shoppingo/types';
import type { Context } from 'hono';
import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { PushSubscriptionRepository } from '../../domain/PushSubscriptionRepository';
import type { HonoVars } from '../handlerUtils';

const getRepo = (): PushSubscriptionRepository =>
    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getVapidPublicKey = async (c: Context<HonoVars>) => {
    const publicKey = config.get('vapidPublicKey') ?? null;
    return c.json({ publicKey }, 200);
};

export const subscribe = async (c: Context<HonoVars>) => {
    const user = c.get('user');
    const logger = getLogger();
    const body = await c.req.json<{ endpoint?: string; keys?: { p256dh: string; auth: string } }>();

    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        return c.json({ error: 'endpoint and keys (p256dh, auth) are required' }, 400);
    }

    try {
        const sub: PushSubscription = {
            endpoint: body.endpoint,
            userId: user.id,
            keys: body.keys,
            dateAdded: new Date(),
        };
        await getRepo().upsert(sub);
        logger.info('Push subscription saved', { userId: user.id });
        return c.json({ success: true }, 201);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('Failed to save push subscription', { userId: user.id, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};

export const unsubscribe = async (c: Context<HonoVars>) => {
    const user = c.get('user');
    const logger = getLogger();
    const body = await c.req.json<{ endpoint?: string }>();

    if (!body?.endpoint) {
        return c.json({ error: 'endpoint is required' }, 400);
    }

    try {
        await getRepo().deleteByEndpoint(body.endpoint);
        logger.info('Push subscription removed', { userId: user.id });
        return c.json({ success: true }, 200);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        logger.error('Failed to remove push subscription', { userId: user.id, error: err.message });
        throw new APIError(err.message ?? 'Internal Server Error', err.status ?? 500);
    }
};
