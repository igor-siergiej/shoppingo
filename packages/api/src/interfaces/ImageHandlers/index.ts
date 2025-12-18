import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ImageService } from '../../domain/ImageService';

const getImageService = (): ImageService => dependencyContainer.resolve(DependencyToken.ImageService);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getImage = async (ctx: Context) => {
    const { name } = ctx.params as { name: string };
    const logger = getLogger();

    try {
        const { stream, contentType, cacheControl } = await getImageService().getImage(name);

        logger.info('API: Image retrieved', {
            itemName: name,
            contentType,
        });

        ctx.set('Content-Type', contentType);
        ctx.set('Cache-Control', cacheControl);
        ctx.status = 200;

        await new Promise((resolve, reject) => {
            stream.pipe(ctx.res, { end: true });
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to retrieve image', {
            itemName: name,
            error: err.message,
        });
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export default getImage;
