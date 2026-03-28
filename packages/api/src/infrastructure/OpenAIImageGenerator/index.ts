import sharp from 'sharp';

import type { ImageGenerator } from '../../domain/ImageService/types';
import { processImage } from '../imageProcessor';

export class OpenAIImageGenerator implements ImageGenerator {
    constructor(
        private readonly apiKey: string,
        private readonly model: string = 'gpt-image-1-mini',
        private readonly outputSize: number = 256
    ) {}

    async generateImage(prompt: string): Promise<{ buffer: Buffer; contentType: string }> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Image generation service not configured'), { status: 500 });
        }

        // Build request body
        const requestBody: Record<string, unknown> = {
            model: this.model,
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'low', // Lowest cost option
        };

        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.text();
            throw Object.assign(new Error(`OpenAI API error: ${error}`), { status: 502 });
        }

        const data = (await response.json()) as unknown;

        const responseData = (data as { data?: Array<{ url?: string; b64_json?: string }> }).data?.[0];
        let originalBuffer: Buffer;

        if (responseData && typeof responseData === 'object' && 'b64_json' in responseData) {
            // Response is base64 encoded
            const b64 = (responseData as { b64_json: string }).b64_json;
            originalBuffer = Buffer.from(b64, 'base64');
        } else if (responseData && typeof responseData === 'object' && 'url' in responseData) {
            // Response is a URL, fetch it
            const imageResponse = await fetch((responseData as { url: string }).url);
            if (!imageResponse.ok) {
                throw Object.assign(new Error('Failed to download image from OpenAI'), { status: 502 });
            }
            originalBuffer = Buffer.from(await imageResponse.arrayBuffer());
        } else {
            throw Object.assign(new Error(`Invalid image generation response: ${JSON.stringify(data)}`), {
                status: 502,
            });
        }

        // Process the image: convert to WebP, resize, and compress
        let processedBuffer: Buffer;
        let finalContentType = 'image/webp';

        try {
            processedBuffer = await processImage(originalBuffer, undefined, this.outputSize);
        } catch {
            // Fallback: try to at least convert to WebP without resizing
            try {
                processedBuffer = await sharp(originalBuffer).webp({ quality: 85 }).withMetadata({}).toBuffer();
                finalContentType = 'image/webp';
            } catch {
                processedBuffer = originalBuffer;
                finalContentType = 'image/png';
            }
        }

        return {
            buffer: processedBuffer,
            contentType: finalContentType,
        };
    }
}
