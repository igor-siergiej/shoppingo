import type { Context, Next } from 'hono';
import { config } from '../config';

interface KivoVerifyResponse {
    success: boolean;
    payload?: {
        id: string;
        username: string;
    };
    message?: string;
}

type AuthVariables = { Variables: { user: { id: string; username: string } } };

export const authenticate = async (c: Context<AuthVariables>, next: Next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    try {
        const kivoUrl = config.get('authUrl');
        if (!kivoUrl) {
            return c.json({ error: 'Authentication service not configured' }, 500);
        }

        const originHeader = c.req.header('origin') || c.req.header('referer');
        const headers: Record<string, string> = {
            Authorization: authHeader,
        };

        if (originHeader) {
            const origin = originHeader.includes('://') ? originHeader.split('/', 3).join('/') : originHeader;
            headers.Origin = origin;
        }

        const response = await fetch(`${kivoUrl}/verify`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            return c.json({ error: 'Invalid or expired token' }, 401);
        }

        const data = (await response.json()) as KivoVerifyResponse;

        if (!data.success || !data.payload) {
            return c.json({ error: 'Invalid token response' }, 401);
        }

        c.set('user', { id: data.payload.id, username: data.payload.username });

        await next();
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ error: 'Authentication service unavailable' }, 503);
    }
};
