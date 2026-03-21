import type { Context } from 'koa';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ImageService } from '../../domain/ImageService';

const getImageService = (): ImageService => dependencyContainer.resolve(DependencyToken.ImageService);
const getBucketStore = () => dependencyContainer.resolve(DependencyToken.ImageStore);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getImage = async (ctx: Context) => {
    const { name } = ctx.params as { name: string };
    const logger = getLogger();

    try {
        // Check if it's a stored image key (e.g., recipe-uploads/...)
        if (name.includes('/')) {
            // Stored images require authentication
            const user = ctx.state.user as { id: string; username: string } | undefined;
            if (!user?.id) {
                ctx.status = 401;
                ctx.body = { error: 'Unauthorized' };
                return;
            }

            const bucketStore = getBucketStore();
            const head = await bucketStore.getHeadObject(name);

            if (head) {
                const contentType = head.metaData?.['content-type'] ?? 'image/webp';
                const stream = await bucketStore.getObjectStream(name);

                logger.info('API: Stored image retrieved', {
                    imageKey: name,
                    userId: user.id,
                    contentType,
                });

                ctx.set('Content-Type', contentType);
                ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
                ctx.status = 200;

                await new Promise((resolve, reject) => {
                    stream.pipe(ctx.res, { end: true });
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });
                return;
            }

            ctx.status = 404;
            ctx.body = { error: 'Image not found' };
            return;
        }

        // AI-generated images are public (no auth required)
        const { stream, contentType, cacheControl } = await getImageService().getImage(name);

        logger.info('API: AI image retrieved', {
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
