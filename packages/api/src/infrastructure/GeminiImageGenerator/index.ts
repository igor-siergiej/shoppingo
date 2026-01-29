import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

import type { ImageGenerator } from '../../domain/ImageService/types';

export class GeminiImageGenerator implements ImageGenerator {
    constructor(
        private readonly apiKey: string,
        private readonly model: string = 'imagen-3.0-fast-001'
    ) {}

    async generateImage(prompt: string): Promise<{ buffer: Buffer; contentType: string }> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Image generation service not configured'), { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        const response = await ai.models.generateContent({
            model: this.model,
            contents: prompt,
        });

        // Extract image data from response
        const candidates = (
            response as {
                candidates?: Array<{
                    content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> };
                }>;
            }
        ).candidates;

        if (!candidates || candidates.length === 0) {
            throw Object.assign(new Error('Invalid image generation response'), {
                status: 502,
            });
        }

        const candidate = candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw Object.assign(new Error('Invalid image generation response'), {
                status: 502,
            });
        }

        const inlineData = candidate.content.parts[0].inlineData;
        if (!inlineData) {
            throw Object.assign(new Error('Invalid image generation response'), {
                status: 502,
            });
        }

        const originalBuffer = Buffer.from(inlineData.data, 'base64');
        const responseContentType = inlineData.mimeType;

        // Process the image: convert to WebP, resize, and compress
        let processedBuffer: Buffer;
        let finalContentType = 'image/webp';

        try {
            processedBuffer = await this.processImage(originalBuffer);
        } catch {
            // Fallback: use original buffer with original content type
            processedBuffer = originalBuffer;
            finalContentType = responseContentType;
        }

        return {
            buffer: processedBuffer,
            contentType: finalContentType,
        };
    }

    private async processImage(inputBuffer: Buffer): Promise<Buffer> {
        return await sharp(inputBuffer)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
                withoutEnlargement: true, // Don't upscale small images
            })
            .webp({
                quality: 85, // Good balance between quality and file size
                effort: 4, // Higher effort for better compression
                lossless: false,
                smartSubsample: true, // Better compression for photographic content
            })
            .withMetadata({})
            .toBuffer();
    }
}
