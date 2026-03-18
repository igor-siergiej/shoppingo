import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAIImageGenerator } from './index';

const mockSharpInstance = {
    resize: vi.fn(),
    webp: vi.fn(),
    withMetadata: vi.fn(),
    toBuffer: vi.fn(),
};

mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
mockSharpInstance.withMetadata.mockReturnValue(mockSharpInstance);

vi.mock('sharp', () => ({
    default: vi.fn().mockImplementation(() => mockSharpInstance),
}));

// We also need to mock imageProcessor to control processImage
vi.mock('../imageProcessor', () => ({
    processImage: vi.fn(),
}));

import { processImage } from '../imageProcessor';

const mockProcessImage = vi.mocked(processImage);

describe('OpenAIImageGenerator', () => {
    let generator: OpenAIImageGenerator;

    beforeEach(() => {
        vi.clearAllMocks();
        generator = new OpenAIImageGenerator('test-api-key');
        mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
        mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
        mockSharpInstance.withMetadata.mockReturnValue(mockSharpInstance);
    });

    describe('When apiKey is empty', () => {
        it('should throw an error', async () => {
            const generatorNoKey = new OpenAIImageGenerator('');

            await expect(generatorNoKey.generateImage('test prompt')).rejects.toMatchObject({
                message: 'Image generation service not configured',
                status: 500,
            });
        });
    });

    describe('When OpenAI API returns an error', () => {
        it('should throw a 502 error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                text: vi.fn().mockResolvedValue('Unauthorized'),
            });

            await expect(generator.generateImage('test prompt')).rejects.toMatchObject({
                status: 502,
            });
        });
    });

    describe('When response contains b64_json', () => {
        it('should decode base64 and process the image', async () => {
            const imageBuffer = Buffer.from('fake-image-bytes');
            const processedBuffer = Buffer.from('processed-bytes');
            mockProcessImage.mockResolvedValue(processedBuffer);

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: [{ b64_json: imageBuffer.toString('base64') }],
                }),
            });

            const result = await generator.generateImage('test prompt');

            expect(mockProcessImage).toHaveBeenCalledWith(imageBuffer);
            expect(result.buffer).toEqual(processedBuffer);
            expect(result.contentType).toBe('image/webp');
        });
    });

    describe('When response contains a URL', () => {
        it('should fetch the image from the URL and process it', async () => {
            const imageBuffer = Buffer.from('url-image-bytes');
            const processedBuffer = Buffer.from('processed-url-bytes');
            mockProcessImage.mockResolvedValue(processedBuffer);

            const _mockImageFetch = vi.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: vi.fn().mockResolvedValue(imageBuffer.buffer),
            });

            global.fetch = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue({
                        data: [{ url: 'https://example.com/image.png' }],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: vi.fn().mockResolvedValue(imageBuffer.buffer),
                });

            const result = await generator.generateImage('test prompt');

            expect(result.contentType).toBe('image/webp');
            expect(result.buffer).toEqual(processedBuffer);
        });
    });

    describe('When URL fetch fails', () => {
        it('should throw a 502 error', async () => {
            global.fetch = vi
                .fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue({
                        data: [{ url: 'https://example.com/image.png' }],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                });

            await expect(generator.generateImage('test prompt')).rejects.toMatchObject({ status: 502 });
        });
    });

    describe('When response has neither b64_json nor url', () => {
        it('should throw a 502 error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ data: [{}] }),
            });

            await expect(generator.generateImage('test prompt')).rejects.toMatchObject({ status: 502 });
        });
    });

    describe('When response data is empty', () => {
        it('should throw a 502 error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ data: [] }),
            });

            await expect(generator.generateImage('test prompt')).rejects.toMatchObject({ status: 502 });
        });
    });

    describe('When processImage fails', () => {
        it('should fallback to sharp webp conversion', async () => {
            const imageBuffer = Buffer.from('raw-bytes');
            const fallbackBuffer = Buffer.from('fallback-webp');
            mockProcessImage.mockRejectedValue(new Error('Sharp resize error'));
            mockSharpInstance.toBuffer.mockResolvedValue(fallbackBuffer);

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: [{ b64_json: imageBuffer.toString('base64') }],
                }),
            });

            const result = await generator.generateImage('test prompt');

            expect(result.contentType).toBe('image/webp');
            expect(result.buffer).toEqual(fallbackBuffer);
        });

        it('should fallback to original buffer when all processing fails', async () => {
            const imageBuffer = Buffer.from('raw-bytes');
            mockProcessImage.mockRejectedValue(new Error('Sharp resize error'));
            mockSharpInstance.toBuffer.mockRejectedValue(new Error('Sharp webp error'));

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    data: [{ b64_json: imageBuffer.toString('base64') }],
                }),
            });

            const result = await generator.generateImage('test prompt');

            expect(result.contentType).toBe('image/png');
            expect(result.buffer).toEqual(imageBuffer);
        });
    });
});
