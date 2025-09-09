import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GeminiImageGenerator } from './index';

const mockGenerateContent = vi.fn();

const mockGoogleAI = {
    models: {
        generateContent: mockGenerateContent
    }
};

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => mockGoogleAI)
}));

const mockSharpInstance = {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
    toBuffer: vi.fn()
};

vi.mock('sharp', () => ({
    default: vi.fn().mockImplementation(() => mockSharpInstance)
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
                    candidates: [{
                        content: {
                            parts: [{
                                inlineData: {
                                    mimeType: 'image/webp',
                                    data: Buffer.from('base64-encoded-image').toString('base64')
                                }
                            }]
                        }
                    }]
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image'));

                const result = await generator.generateImage('test prompt');

                expect(mockGenerateContent).toHaveBeenCalledWith({
                    model: 'gemini-2.5-flash-image-preview',
                    contents: 'test prompt'
                });
                expect(mockSharpInstance.resize).toHaveBeenCalled();
                expect(mockSharpInstance.webp).toHaveBeenCalled();
                expect(mockSharpInstance.withMetadata).toHaveBeenCalled();
                expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
                expect(result.buffer).toEqual(Buffer.from('processed-image'));
                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When no candidates are returned', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    response: {
                        candidates: []
                    }
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt'))
                    .rejects.toMatchObject({
                        message: 'Invalid image generation response',
                        status: 502
                    });
            });
        });

        describe('When no content in candidate', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    response: {
                        candidates: [{}]
                    }
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt'))
                    .rejects.toMatchObject({
                        message: 'Invalid image generation response',
                        status: 502
                    });
            });
        });

        describe('When no parts in content', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    response: {
                        candidates: [{
                            content: {}
                        }]
                    }
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt'))
                    .rejects.toMatchObject({
                        message: 'Invalid image generation response',
                        status: 502
                    });
            });
        });

        describe('When no inline data in parts', () => {
            it('should throw an error', async () => {
                const mockResponse = {
                    response: {
                        candidates: [{
                            content: {
                                parts: [{}]
                            }
                        }]
                    }
                };

                mockGenerateContent.mockResolvedValue(mockResponse);

                await expect(generator.generateImage('test prompt'))
                    .rejects.toMatchObject({
                        message: 'Invalid image generation response',
                        status: 502
                    });
            });
        });

        describe('When generateContent fails', () => {
            it('should throw the error', async () => {
                mockGenerateContent.mockRejectedValue(new Error('API error'));

                await expect(generator.generateImage('test prompt'))
                    .rejects.toThrow('API error');
            });
        });

        describe('When sharp processing fails', () => {
            it('should fallback to original buffer', async () => {
                const mockResponse = {
                    candidates: [{
                        content: {
                            parts: [{
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: Buffer.from('base64-encoded-image').toString('base64')
                                }
                            }]
                        }
                    }]
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockSharpInstance.toBuffer.mockRejectedValue(new Error('Sharp processing error'));

                const result = await generator.generateImage('test prompt');

                expect(result.buffer).toEqual(Buffer.from('base64-encoded-image'));
                expect(result.contentType).toBe('image/png');
            });
        });

        describe('When working without logger', () => {
            it('should work without logger', async () => {
                const generatorWithoutLogger = new GeminiImageGenerator('test-api-key');
                const mockResponse = {
                    candidates: [{
                        content: {
                            parts: [{
                                inlineData: {
                                    mimeType: 'image/png',
                                    data: Buffer.from('base64-encoded-image').toString('base64')
                                }
                            }]
                        }
                    }]
                };

                mockGenerateContent.mockResolvedValue(mockResponse);
                mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-image'));

                const result = await generatorWithoutLogger.generateImage('test prompt');

                expect(result.buffer).toEqual(Buffer.from('processed-image'));
                expect(result.contentType).toBe('image/webp');
            });
        });
    });
});
