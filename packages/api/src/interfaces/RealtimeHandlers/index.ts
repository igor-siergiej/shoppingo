import type { Context, Next } from 'hono';
import type { ListRealtimeHub, ListSocket } from '../../domain/ListRealtimeHub';
import type { WsTicketStore } from '../../domain/WsTicketStore';
import { upgradeWebSocket } from '../../infrastructure/bunWebSocket';
import { type AuthUser, type HonoVars, withAuth } from '../handlerUtils';

type WsVars = { Variables: { wsUser: AuthUser } };

interface RealtimeDeps {
    hub: ListRealtimeHub;
    tickets: WsTicketStore;
    getList: (listTitle: string) => Promise<{ users?: Array<{ id: string }> }>;
}

export const createRealtimeHandlers = ({ hub, tickets, getList }: RealtimeDeps) => {
    const isListMember = async (listTitle: string, user: AuthUser): Promise<boolean> => {
        try {
            const list = await getList(listTitle);
            return list.users?.some((member) => member.id === user.id) ?? false;
        } catch {
            return false;
        }
    };

    /** POST /api/lists/:title/socket-ticket — authenticated, list members only. */
    const issueListSocketTicket = withAuth(async (c, user) => {
        const listTitle = c.req.param('title') ?? '';
        if (!(await isListMember(listTitle, user))) return c.json({ error: 'Forbidden' }, 403);
        return c.json({ ticket: tickets.issue(listTitle, user) });
    });

    const upgrade = upgradeWebSocket((c: Context<WsVars>) => {
        const listTitle = c.req.param('title') ?? '';
        const user = c.get('wsUser');
        return {
            onOpen: (_event, ws) => hub.join(listTitle, user, ws.raw as ListSocket),
            onClose: (_event, ws) => hub.leave(listTitle, ws.raw as ListSocket),
        };
    });

    /**
     * GET /api/ws/lists/:title?ticket=… — upgrades to a websocket only when the ticket is valid
     * for this list and its user is (still) a member. Anything else is rejected before the upgrade.
     */
    const connectListSocket = async (c: Context<HonoVars & WsVars>, next: Next) => {
        const listTitle = c.req.param('title') ?? '';
        const user = tickets.redeem(c.req.query('ticket'), listTitle);
        if (!user || !(await isListMember(listTitle, user))) {
            return c.json({ error: 'Invalid or expired ticket' }, 401);
        }
        c.set('wsUser', user);
        return upgrade(c as unknown as Context<WsVars>, next);
    };

    return { issueListSocketTicket, connectListSocket };
};
