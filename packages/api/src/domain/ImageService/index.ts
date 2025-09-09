import { Logger } from '@igor-siergiej/api-utils';

import { ImageGenerator, ImageStore } from './types';

export class ImageService {
    constructor(
        private readonly store: ImageStore,
        private readonly generator: ImageGenerator,
        private readonly logger?: Logger
    ) {}

    async getImage(name: string): Promise<{ stream: NodeJS.ReadableStream; contentType: string; cacheControl: string }> {
        if (!name) {
            throw Object.assign(new Error('Image name is required'), { status: 400 });
        }

        // Try to fetch from store first
        try {
            const head = await this.store.getHeadObject(name);
            const contentType = head?.metaData?.['content-type'] ?? 'image/webp';
            const stream = await this.store.getObjectStream(name);

            return {
                stream,
                contentType,
                cacheControl: 'public, max-age=31536000, immutable'
            };
        } catch {
            this.logger?.warn('Image not found in store, falling back to generator', { name });
        }

        // Generate new image
        const prompt = this.generatePrompt(name.trim().toLowerCase());
        const { buffer, contentType } = await this.generator.generateImage(prompt);

        // Store the generated image (fire and forget)
        try {
            await this.store.putObject(name, buffer, { contentType });
        } catch (uploadErr) {
            this.logger?.error('Failed to store generated image', { name, error: uploadErr });
        }

        return {
            stream: this.bufferToStream(buffer),
            contentType,
            cacheControl: 'public, max-age=31536000, immutable'
        };
    }

    private generatePrompt(name: string): string {
        return `Minimalistic flat icon of a ${name} drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text, no background.`;
    }

    private bufferToStream(buffer: Buffer): NodeJS.ReadableStream {
        const { Readable } = require('stream');

        return new Readable({
            read() {
                this.push(buffer);
                this.push(null);
            }
        });
    }
}
