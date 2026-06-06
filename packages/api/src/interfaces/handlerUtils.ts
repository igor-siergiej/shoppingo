import type { Context } from 'koa';

interface AuthUser {
    id: string;
    username: string;
}

const getAuthenticatedUser = (ctx: Context): AuthUser | null => {
    const user = ctx.state.user as AuthUser | undefined;
    return user?.id ? user : null;
};

const failResponse = (ctx: Context, error: unknown): void => {
    const err = error as { status?: number; message?: string };
    ctx.status = err.status ?? 500;
    ctx.body = { error: err.message ?? 'Internal Server Error' };
};

export const withAuth =
    (handler: (ctx: Context, user: AuthUser) => Promise<void>) =>
    async (ctx: Context): Promise<void> => {
        const user = getAuthenticatedUser(ctx);
        if (!user) {
            ctx.status = 401;
            ctx.body = { error: 'Unauthorized' };
            return;
        }
        try {
            await handler(ctx, user);
        } catch (error) {
            failResponse(ctx, error);
        }
    };
