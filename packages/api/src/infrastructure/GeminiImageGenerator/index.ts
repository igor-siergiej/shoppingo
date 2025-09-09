import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

import { ImageGenerator } from '../../domain/ImageService/types';

export class GeminiImageGenerator implements ImageGenerator {
    constructor(private readonly apiKey: string) {}

    async generateImage(prompt: string): Promise<{ buffer: Buffer; contentType: string }> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Image generation service not configured'), { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: prompt
        });

        const candidates = response?.candidates ?? [];
        const parts = candidates[0]?.content?.parts ?? [];

        const imagePart = parts.find((p: unknown) =>
            Boolean((p as { inlineData?: { data?: string } })?.inlineData?.data
                || (p as { inline_data?: { data?: string } })?.inline_data?.data)
        ) as { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } } | undefined;

        const inlineDataField = imagePart?.inlineData || imagePart?.inline_data;
        const base64 = inlineDataField?.data;

        let responseContentType = 'image/png';

        if (inlineDataField) {
            if ('mimeType' in inlineDataField && typeof (inlineDataField as { mimeType?: unknown }).mimeType === 'string') {
                responseContentType = (inlineDataField as { mimeType: string }).mimeType;
            } else if ('mime_type' in inlineDataField && typeof (inlineDataField as { mime_type?: unknown }).mime_type === 'string') {
                responseContentType = (inlineDataField as { mime_type: string }).mime_type;
            }
        }

        if (!base64) {
            throw Object.assign(new Error('Invalid image generation response'), { status: 502 });
        }

        const originalBuffer = Buffer.from(base64, 'base64');

        // Process the image: convert to WebP, resize, and compress
        let processedBuffer: Buffer;
        let finalContentType = 'image/webp';

        try {
            processedBuffer = await this.processImage(originalBuffer);
        } catch {
            // Fallback: try to at least convert to WebP without resizing
            try {
                processedBuffer = await sharp(originalBuffer)
                    .webp({ quality: 85 })
                    .withMetadata({})
                    .toBuffer();
                finalContentType = 'image/webp';
            } catch {
                processedBuffer = originalBuffer;
                finalContentType = responseContentType;
            }
        }

        return {
            buffer: processedBuffer,
            contentType: finalContentType
        };
    }

    private async processImage(inputBuffer: Buffer): Promise<Buffer> {
        return await sharp(inputBuffer)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
                withoutEnlargement: true // Don't upscale small images
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
