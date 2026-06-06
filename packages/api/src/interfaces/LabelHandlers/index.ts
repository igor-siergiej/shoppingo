import { dependencyContainer } from '../../dependencies/container';
import { DependencyToken } from '../../dependencies/types';
import type { CreateLabelInput, LabelService, UpdateLabelInput } from '../../domain/LabelService';
import { withAuth } from '../handlerUtils';

const getLabelService = (): LabelService => dependencyContainer.resolve(DependencyToken.LabelService);

export const getLabels = withAuth(async (ctx, user) => {
    ctx.status = 200;
    ctx.body = await getLabelService().getLabelsByOwner(user.id);
});

export const createLabel = withAuth(async (ctx, user) => {
    ctx.status = 201;
    ctx.body = await getLabelService().createLabel(user.id, ctx.request.body as CreateLabelInput);
});

export const updateLabel = withAuth(async (ctx, user) => {
    const { id } = ctx.params as { id: string };
    ctx.status = 200;
    ctx.body = await getLabelService().updateLabel(id, user.id, ctx.request.body as UpdateLabelInput);
});

export const deleteLabel = withAuth(async (ctx, user) => {
    const { id } = ctx.params as { id: string };
    await getLabelService().deleteLabel(id, user.id);
    ctx.status = 204;
});
