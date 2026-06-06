import type { Context } from 'koa';
import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateLabelInput, LabelService, UpdateLabelInput } from '../../domain/LabelService';

const getLabelService = (): LabelService => dependencyContainer.resolve(DependencyToken.LabelService);

const getUser = (ctx: Context): { id: string; username: string } | null => {
    const user = ctx.state.user as { id: string; username: string } | undefined;
    return user?.id ? user : null;
};

const fail = (ctx: Context, error: unknown) => {
    const err = error as { status?: number; message?: string };
    ctx.status = err.status ?? 500;
    ctx.body = { error: err.message ?? 'Internal Server Error' };
};

export const getLabels = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 200;
        ctx.body = await getLabelService().getLabelsByOwner(user.id);
    } catch (error) {
        fail(ctx, error);
    }
};

export const createLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    try {
        ctx.status = 201;
        ctx.body = await getLabelService().createLabel(user.id, ctx.request.body as CreateLabelInput);
    } catch (error) {
        fail(ctx, error);
    }
};

export const updateLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        ctx.status = 200;
        ctx.body = await getLabelService().updateLabel(id, user.id, ctx.request.body as UpdateLabelInput);
    } catch (error) {
        fail(ctx, error);
    }
};

export const deleteLabel = async (ctx: Context): Promise<void> => {
    const user = getUser(ctx);
    if (!user) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
    }
    const { id } = ctx.params as { id: string };
    try {
        await getLabelService().deleteLabel(id, user.id);
        ctx.status = 204;
    } catch (error) {
        fail(ctx, error);
    }
};
