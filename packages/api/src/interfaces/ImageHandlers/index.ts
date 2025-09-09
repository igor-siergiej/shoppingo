import { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import { ImageService } from '../../domain/ImageService';

const getImageService = (): ImageService =>
    dependencyContainer.resolve(DependencyToken.ImageService);

export const getImage = async (ctx: Context) => {
    const { name } = ctx.params as { name: string };

    try {
        const { stream, contentType, cacheControl } = await getImageService().getImage(name);

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

        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal Server Error' };
    }
};

export default getImage;
