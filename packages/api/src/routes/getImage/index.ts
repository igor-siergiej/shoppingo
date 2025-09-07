import { GoogleGenAI } from '@google/genai';
import { Context } from 'koa';

import { config } from '../../config';
import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';

const generatePrompt = (name: string) => `Minimalistic flat icon of a ${name} ingredient drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text, no background.`;

export const getImage = async (ctx: Context) => {
    const { name } = ctx.params as { name: string };

    if (!name) {
        ctx.status = 400;
        ctx.body = { error: 'Image name is required' };

        return;
    }

    const bucket = dependencyContainer.resolve(DependencyToken.Bucket);
    const logger = dependencyContainer.resolve(DependencyToken.Logger);

    // Try to fetch from bucket
    try {
        const head = await bucket.getHeadObject(name);
        const contentType = head?.metaData?.['content-type'] ?? 'image/png';

        ctx.set('Content-Type', contentType);
        ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
        const stream = await bucket.getObjectStream(name);

        ctx.status = 200;
        await new Promise((resolve, reject) => {
            stream.pipe(ctx.res, { end: true });
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        return;
    } catch {
        logger?.warn('Image not found in bucket, falling back to Gemini', { name });
    }

    const apiKey = config.get('geminiApiKey');

    if (!apiKey) {
        ctx.status = 500;
        ctx.body = { error: 'Image generation service not configured' };

        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: generatePrompt(name)
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
            logger?.error('Gemini response missing image data', {
                candidatesCount: candidates.length,
                partsCount: parts.length
            });
            ctx.status = 502;
            ctx.body = { error: 'Invalid image generation response' };

            return;
        }

        const buffer = Buffer.from(base64, 'base64');

        try {
            void bucket.putObject(name, buffer, { contentType: responseContentType });
        } catch (uploadErr) {
            logger?.error('Failed to schedule upload to bucket', { name, error: uploadErr });
        }

        ctx.set('Content-Type', responseContentType);
        ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
        ctx.status = 200;
        ctx.body = buffer;

        return;
    } catch (err) {
        logger?.error('Gemini image generation error', err);
        ctx.status = 500;
        ctx.body = { error: 'Image generation error' };

        return;
    }
};

export default getImage;
