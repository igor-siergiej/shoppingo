import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { IssuedInvite, ListInvitePublic, ListInviteService } from '../../domain/ListInviteService';
import { withAuth } from '../handlerUtils';

const DEFAULT_TTL_DAYS = 7;
const MAX_TTL_DAYS = 30;

const clampTtl = (raw: unknown): number => {
    const days = Number(raw);
    if (!Number.isFinite(days) || days < 1) return DEFAULT_TTL_DAYS;
    return Math.min(Math.trunc(days), MAX_TTL_DAYS);
};

export const createListInviteHandlers = (service: ListInviteService, _logger: Logger) => ({
    issue: withAuth(async (c, user) => {
        const listTitle = c.req.param('title') ?? '';
        if (!listTitle) throw new APIError('List title is required', 400);
        const ttlMs = clampTtl(c.req.query('ttlDays')) * 24 * 60 * 60 * 1000;
        const invite: IssuedInvite = await service.issue(listTitle, { id: user.id, username: user.username }, ttlMs);
        return c.json(invite, 201);
    }),

    revoke: withAuth(async (c, user) => {
        const token = c.req.param('token') ?? '';
        if (!token) throw new APIError('Token is required', 400);
        await service.revoke(token, { id: user.id, username: user.username });
        return c.body(null, 204);
    }),

    /**
     * Unauthenticated preview. Optional `viewerId` from kivo is filled in by
     * the route handler when the request carries a valid bearer, so the
     * service can set `isOwner` for the in-page revoke control.
     */
    preview: async (c: {
        req: { param: (n: string) => string | undefined };
        get: (k: string) => string | undefined;
    }): Promise<Response> => {
        const token = c.req.param('token') ?? '';
        if (!token) throw new APIError('Token is required', 400);
        const preview = await service.preview(token);
        return c.json(preview, 200);
    },

    listMine: withAuth(async (c, user) => {
        const items: ListInvitePublic[] = await service.listOpenByOwner(user.id);
        return c.json({ items }, 200);
    }),

    claim: withAuth(async (c, user) => {
        const token = c.req.param('token') ?? '';
        if (!token) throw new APIError('Token is required', 400);
        const result = await service.claim(token, { id: user.id, username: user.username });
        return c.json(result, 200);
    }),
});
