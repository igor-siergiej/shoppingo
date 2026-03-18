import { beforeEach, describe, expect, it, vi } from 'bun:test';

import { GeminiImageGenerator } from './index';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: mockGenerateContent,
        },
    })),
}));

const mockProcessImage = vi.fn();

vi.mock('../imageProcessor', () => ({
    processImage: mockProcessImage,
}));

describe('GeminiImageGenerator', () => {
    let generator: GeminiImageGenerator;

    beforeEach(() => {
        vi.clearAllMocks();
        generator = new GeminiImageGenerator('test-api-key');
    });

    describe('Generating images', () => {
        describe('When generating an image successfully', () => {
            it('should generate and process the image', async () => {
                const mockResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/webp',
                                            data: Buffer.from('base64-encoded-image').toString('base64'),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockProcessImage.mockResolvedValue(Buffer.from('processed-image'));

                const result = await generator.generateImage('test prompt');

                expect(mockGenerateContent).toHaveBeenCalledWith({
                    model: 'imagen-3.0-fast-001',
                    contents: 'test prompt',
                });
                expect(mockProcessImage).toHaveBeenCalledWith(Buffer.from('base64-encoded-image'));
                expect(result.buffer).toEqual(Buffer.from('processed-image'));
                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When no candidates are returned', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    candidates: [],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt')).rejects.toMatchObject({
                    message: 'Invalid image generation response',
                    status: 502,
                });
            });
        });

        describe('When no content in candidate', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    candidates: [{}],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt')).rejects.toMatchObject({
                    message: 'Invalid image generation response',
                    status: 502,
                });
            });
        });

        describe('When no parts in content', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    candidates: [
                        {
                            content: {},
                        },
                    ],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt')).rejects.toMatchObject({
                    message: 'Invalid image generation response',
                    status: 502,
                });
            });
        });

        describe('When no inline data in parts', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [{}],
                            },
                        },
                    ],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt')).rejects.toMatchObject({
                    message: 'Invalid image generation response',
                    status: 502,
                });
            });
        });

        describe('When generateContent fails', () => {
            it('should throw the error', async () => {
                mockGenerateContent.mockRejectedValue(new Error('API error'));

                await expect(generator.generateImage('test prompt')).rejects.toThrow('API error');
            });
        });

        describe('When sharp processing fails', () => {
            it('should fallback to original buffer', async () => {
                const mockResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: Buffer.from('base64-encoded-image').toString('base64'),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockProcessImage.mockRejectedValue(new Error('Sharp processing error'));

                const result = await generator.generateImage('test prompt');

                expect(result.buffer).toEqual(Buffer.from('base64-encoded-image'));
                expect(result.contentType).toBe('image/png');
            });
        });

        describe('When working without logger', () => {
            it('should work without logger', async () => {
                const generatorWithoutLogger = new GeminiImageGenerator('test-api-key');
                const mockResponse = {
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: 'image/png',
                                            data: Buffer.from('base64-encoded-image').toString('base64'),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockProcessImage.mockResolvedValue(Buffer.from('processed-image'));

                const result = await generatorWithoutLogger.generateImage('test prompt');

                expect(result.buffer).toEqual(Buffer.from('processed-image'));
                expect(result.contentType).toBe('image/webp');
            });
        });
    });
});
