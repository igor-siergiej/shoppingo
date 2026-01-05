import type { Context, Next } from 'koa';
import { config } from '../config';

interface KivoVerifyResponse {
    success: boolean;
    payload?: {
        id: string;
        username: string;
    };
    message?: string;
}

/**
 * Authentication middleware that delegates token verification to Kivo
 * Makes request to Kivo's /verify endpoint to validate JWT tokens
 * Sets user information in ctx.state for use by handlers
 */
export const authenticate = async (ctx: Context, next: Next) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: 'Missing or invalid authorization header' };
        return;
    }

    try {
        // Delegate verification to Kivo
        const kivoUrl = config.get('authUrl');
        if (!kivoUrl) {
            ctx.status = 500;
            ctx.body = { error: 'Authentication service not configured' };
            return;
        }

        // Get the origin for the request (for service-to-service CORS)
        // Use the request's origin if available, otherwise use a default
        const originHeader = ctx.request.headers.origin || ctx.request.headers.referer;
        const headers: Record<string, string> = {
            Authorization: authHeader,
        };

        // Add Origin header for service-to-service communication
        if (originHeader) {
            // Extract just the origin part from referer if needed (protocol + domain)
            const origin = originHeader.includes('://') ? originHeader.split('/', 3).join('/') : originHeader;
            headers.Origin = origin;
        }

        const response = await fetch(`${kivoUrl}/verify`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            // Kivo returned error - token is invalid or expired
            ctx.status = 401;
            ctx.body = { error: 'Invalid or expired token' };
            return;
        }

        const data = (await response.json()) as KivoVerifyResponse;

        if (!data.success || !data.payload) {
            ctx.status = 401;
            ctx.body = { error: 'Invalid token response' };
            return;
        }

        // Token is valid - set user information in context for handlers to use
        ctx.state.user = {
            id: data.payload.id,
            username: data.payload.username,
        };

        await next();
    } catch (error) {
        // Network error or Kivo is unavailable
        console.error('Authentication error:', error);
        ctx.status = 503;
        ctx.body = { error: 'Authentication service unavailable' };
    }
};
