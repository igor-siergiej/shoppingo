import { Readable } from 'node:stream';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { ImageService } from '../../domain/ImageService';
import type { HonoVars } from '../handlerUtils';

const getImageService = (): ImageService => dependencyContainer.resolve(DependencyToken.ImageService);
const getBucketStore = () => dependencyContainer.resolve(DependencyToken.ImageStore);
const getLogger = () => dependencyContainer.resolve(DependencyToken.Logger);

export const getImage = async (c: Context<HonoVars>) => {
    const name = c.req.param('name');
    const logger = getLogger();

    try {
        if (name.startsWith('recipe-upload/')) {
            const user = c.get('user');
            if (!user?.id) {
                return c.json({ error: 'Unauthorized' }, 401);
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

                c.header('Content-Type', contentType);
                c.header('Cache-Control', 'public, max-age=31536000, immutable');
                return c.body(Readable.toWeb(stream as Readable) as unknown as ReadableStream);
            }

            return c.json({ error: 'Image not found' }, 404);
        }

        if (name.startsWith('recipe-image/')) {
            const bucketStore = getBucketStore();
            try {
                const head = await bucketStore.getHeadObject(name);
                const contentType = head?.metaData?.['content-type'] ?? 'image/webp';
                const stream = await bucketStore.getObjectStream(name);

                logger.info('API: Recipe AI image retrieved', { imageKey: name, contentType });

                c.header('Content-Type', contentType);
                c.header('Cache-Control', 'public, max-age=31536000, immutable');
                return c.body(Readable.toWeb(stream as Readable) as unknown as ReadableStream);
            } catch {
                return c.json({ error: 'Image not found' }, 404);
            }
        }

        const { stream, contentType, cacheControl } = await getImageService().getImage(name);

        logger.info('API: AI image retrieved', { itemName: name, contentType });

        c.header('Content-Type', contentType);
        c.header('Cache-Control', cacheControl);
        return c.body(Readable.toWeb(stream as Readable) as unknown as ReadableStream);
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        logger.error('API: Failed to retrieve image', { itemName: name, error: err.message });
        return c.json({ error: err.message ?? 'Internal Server Error' }, (err.status ?? 500) as 500);
    }
};
