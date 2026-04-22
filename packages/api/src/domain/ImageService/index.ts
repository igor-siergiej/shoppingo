import type { Logger } from '@imapps/api-utils';

import {
    imageGenerationFailuresTotal,
    imagesGeneratedTotal,
    imagesServedTotal,
} from '../../infrastructure/metrics';
import type { ImageGenerator, ImageStore } from './types';

export class ImageService {
    constructor(
        private readonly store: ImageStore,
        private readonly generator: ImageGenerator,
        private readonly logger?: Logger
    ) {}

    async getImage(name: string): Promise<{
        stream: NodeJS.ReadableStream;
        contentType: string;
        cacheControl: string;
    }> {
        try {
            if (!name) {
                throw Object.assign(new Error('Image name is required'), { status: 400 });
            }

            const normalisedName = name.trim().toLowerCase();

            // Try to fetch from store first
            try {
                const head = await this.store.getHeadObject(normalisedName);
                const contentType = head?.metaData?.['content-type'] ?? 'image/webp';
                const stream = await this.store.getObjectStream(normalisedName);

                this.logger?.info('Image retrieved from cache', {
                    itemName: normalisedName,
                    contentType,
                    source: 'cache',
                });

                imagesServedTotal.inc({ source: 'cache' });

                return {
                    stream,
                    contentType,
                    cacheControl: 'public, max-age=31536000, immutable',
                };
            } catch {
                this.logger?.warn('Image not found in store, falling back to generator', {
                    itemName: normalisedName,
                });
            }

            // Generate new image
            const prompt = this.generatePrompt(normalisedName);
            let buffer: Buffer;
            let contentType: string;
            try {
                ({ buffer, contentType } = await this.generator.generateImage(prompt));
            } catch (genErr) {
                imageGenerationFailuresTotal.inc({ provider: 'openai' });
                throw genErr;
            }

            this.logger?.info('Image generated using AI', {
                itemName: normalisedName,
                contentType,
                source: 'gemini',
            });

            imagesGeneratedTotal.inc({ provider: 'openai' });
            imagesServedTotal.inc({ source: 'fresh' });

            // Store the generated image (fire and forget)
            try {
                await this.store.putObject(normalisedName, buffer, { contentType });
            } catch (uploadErr) {
                this.logger?.error('Failed to store generated image', {
                    itemName: normalisedName,
                    error: uploadErr,
                });
            }

            return {
                stream: this.bufferToStream(buffer),
                contentType,
                cacheControl: 'public, max-age=31536000, immutable',
            };
        } catch (error) {
            this.logger?.error('Failed to get image', {
                itemName: name,
                error,
            });
            throw error;
        }
    }

    private generatePrompt(name: string): string {
        return `Minimalistic flat icon of a ${name} drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text.`;
    }

    private bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
        const { Readable } = require('node:stream');

        return new Readable({
            read() {
                this.push(buffer);
                this.push(null);
            },
        });
    }
}
