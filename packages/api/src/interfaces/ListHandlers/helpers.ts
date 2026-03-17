import type { Context } from 'koa';
import type { Logger } from '@imapps/api-utils';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ListService } from '../../domain/ListService';

const getListService = (): ListService => dependencyContainer.resolve(DependencyToken.ListService);

/**
 * Handle error response with standardized format
 */
export const handleError = (
	ctx: Context,
	error: unknown,
	logger: Logger,
	context?: Record<string, unknown>
): void => {
	const err = error instanceof Error ? error : new Error(String(error));
	const status = (error as any)?.status ?? 500;
	const message = err.message || 'Internal Server Error';

	logger.error('Handler error', { ...context, error: message, status });
	ctx.status = status;
	ctx.body = { error: message };
};

/**
 * Verify user has list access and return 403 if not
 */
export const requireListAccess = async (
	title: string,
	authenticatedUser: { id: string; username: string },
	ctx: Context,
	logger: Logger
): Promise<boolean> => {
	try {
		const list = await getListService().getList(title);
		const hasAccess = list.users?.some((u: { id: string; username: string }) => u.id === authenticatedUser.id) ?? false;

		if (!hasAccess) {
			logger.warn('Unauthorized list access attempt', {
				authenticatedUserId: authenticatedUser.id,
				listTitle: title,
			});
			ctx.status = 403;
			ctx.body = { error: 'Forbidden' };
		}

		return hasAccess;
	} catch {
		logger.warn('Unauthorized list access attempt', {
			authenticatedUserId: authenticatedUser.id,
			listTitle: title,
		});
		ctx.status = 403;
		ctx.body = { error: 'Forbidden' };
		return false;
	}
};
