import type { Context, Next } from 'hono';
import type { ListRealtimeHub } from '../domain/ListRealtimeHub';

/**
 * Wrap a successful `/api/lists/:title/...` mutation: once the handler has answered with a
 * non-error status, tell everyone with that list open that it changed. `onSuccess` runs first
 * so a route can also react (e.g. drop a removed member's sockets).
 */
export const notifyListChanged =
    (hub: ListRealtimeHub, onSuccess?: (c: Context, listTitle: string) => void) =>
    async (c: Context, next: Next): Promise<void> => {
        await next();
        if (c.res.status >= 400) return;
        const listTitle = c.req.param('title');
        if (!listTitle) return;
        onSuccess?.(c, listTitle);
        hub.notifyChanged(listTitle);
    };
