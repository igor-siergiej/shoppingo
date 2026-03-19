import { beforeEach, describe, expect, it } from 'bun:test';
import type { Logger } from '@imapps/api-utils';

import { ImageService } from './index';

class MockImageStore {
    calls: Record<string, Array<Array<unknown>>> = {
        getHeadObject: [],
        getObjectStream: [],
        putObject: [],
    };

    resolvedValues: Record<string, unknown> = {
        getHeadObject: null,
        getObjectStream: null,
        putObject: undefined,
    };

    rejectedErrors: Record<string, Error | null> = {
        getHeadObject: null,
        getObjectStream: null,
        putObject: null,
    };

    async getHeadObject(objName: string) {
        this.calls.getHeadObject.push([objName]);
        if (this.rejectedErrors.getHeadObject) {
            throw this.rejectedErrors.getHeadObject;
        }
        return this.resolvedValues.getHeadObject;
    }

    async getObjectStream(objName: string) {
        this.calls.getObjectStream.push([objName]);
        if (this.rejectedErrors.getObjectStream) {
            throw this.rejectedErrors.getObjectStream;
        }
        return this.resolvedValues.getObjectStream;
    }

    async putObject(objName: string, buffer: unknown, options?: unknown) {
        this.calls.putObject.push([objName, buffer, options]);
        if (this.rejectedErrors.putObject) {
            throw this.rejectedErrors.putObject;
        }
        return this.resolvedValues.putObject;
    }

    reset() {
        this.calls = {
            getHeadObject: [],
            getObjectStream: [],
            putObject: [],
        };
        this.resolvedValues = {
            getHeadObject: null,
            getObjectStream: null,
            putObject: undefined,
        };
        this.rejectedErrors = {
            getHeadObject: null,
            getObjectStream: null,
            putObject: null,
        };
    }
}

class MockImageGenerator {
    calls: Record<string, Array<Array<unknown>>> = {
        generateImage: [],
    };

    resolvedValues: Record<string, unknown> = {
        generateImage: null,
    };

    async generateImage(prompt: string) {
        this.calls.generateImage.push([prompt]);
        return this.resolvedValues.generateImage;
    }

    reset() {
        this.calls = { generateImage: [] };
        this.resolvedValues = { generateImage: null };
    }
}

class MockLogger implements Logger {
    calls: Record<string, Array<Array<unknown>>> = {
        info: [],
        warn: [],
        error: [],
        debug: [],
    };

    info(...args: unknown[]) {
        this.calls.info.push(args);
    }

    warn(...args: unknown[]) {
        this.calls.warn.push(args);
    }

    error(...args: unknown[]) {
        this.calls.error.push(args);
    }

    debug(...args: unknown[]) {
        this.calls.debug.push(args);
    }

    reset() {
        this.calls = {
            info: [],
            warn: [],
            error: [],
            debug: [],
        };
    }
}

const mockImageStore = new MockImageStore();
const mockImageGenerator = new MockImageGenerator();
const mockLogger = new MockLogger();

describe('ImageService', () => {
    let imageService: ImageService;

    beforeEach(() => {
        mockImageStore.reset();
        mockImageGenerator.reset();
        mockLogger.reset();
        imageService = new ImageService(mockImageStore, mockImageGenerator, mockLogger);
    });

    describe('getImage', () => {
        describe('When image exists in store', () => {
            it('should return image from store', async () => {
                const mockStream = {
                    read: () => {},
                } as unknown as NodeJS.ReadableStream;
                const mockHeadObject = {
                    metaData: { 'content-type': 'image/png' },
                };

                mockImageStore.resolvedValues.getHeadObject = mockHeadObject;
                mockImageStore.resolvedValues.getObjectStream = mockStream;

                const result = await imageService.getImage('test-image');

                expect(mockImageStore.calls.getHeadObject[0]).toEqual(['test-image']);
                expect(mockImageStore.calls.getObjectStream[0]).toEqual(['test-image']);
                expect(result.stream).toBe(mockStream);
                expect(result.contentType).toBe('image/png');
                expect(result.cacheControl).toBe('public, max-age=31536000, immutable');
            });

            it('should use default content type when metadata is missing', async () => {
                const mockStream = {
                    read: () => {},
                } as unknown as NodeJS.ReadableStream;
                const mockHeadObject = { metaData: {} };

                mockImageStore.resolvedValues.getHeadObject = mockHeadObject;
                mockImageStore.resolvedValues.getObjectStream = mockStream;

                const result = await imageService.getImage('test-image');

                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When image does not exist in store', () => {
            it('should generate new image and store it', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.rejectedErrors.getHeadObject = new Error('Not found');
                mockImageGenerator.resolvedValues.generateImage = {
                    buffer: mockBuffer,
                    contentType: 'image/webp',
                };
                mockImageStore.resolvedValues.putObject = undefined;

                const result = await imageService.getImage('shopping-cart');

                expect(mockImageGenerator.calls.generateImage[0]).toEqual([
                    'Minimalistic flat icon of a shopping-cart drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text.',
                ]);
                expect(mockImageStore.calls.putObject[0]).toEqual([
                    'shopping-cart',
                    mockBuffer,
                    { contentType: 'image/webp' },
                ]);
                expect(result.contentType).toBe('image/webp');
                expect(result.cacheControl).toBe('public, max-age=31536000, immutable');
            });

            it('should handle store upload failure gracefully', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.rejectedErrors.getHeadObject = new Error('Not found');
                mockImageGenerator.resolvedValues.generateImage = {
                    buffer: mockBuffer,
                    contentType: 'image/webp',
                };
                mockImageStore.rejectedErrors.putObject = new Error('Upload failed');

                const result = await imageService.getImage('test-item');

                expect(mockLogger.calls.error.length).toBeGreaterThan(0);
                expect(mockLogger.calls.error[0][0]).toBe('Failed to store generated image');
                expect(result.contentType).toBe('image/webp');
            });

            it('should work without logger', async () => {
                mockImageStore.reset();
                mockImageGenerator.reset();
                const serviceWithoutLogger = new ImageService(mockImageStore, mockImageGenerator);
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.rejectedErrors.getHeadObject = new Error('Not found');
                mockImageGenerator.resolvedValues.generateImage = {
                    buffer: mockBuffer,
                    contentType: 'image/webp',
                };
                mockImageStore.rejectedErrors.putObject = new Error('Upload failed');

                const result = await serviceWithoutLogger.getImage('test-item');

                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When image name is invalid', () => {
            it('should throw error for empty name', async () => {
                await expect(imageService.getImage('')).rejects.toThrow('Image name is required');
            });

            it('should throw error for null name', async () => {
                await expect(imageService.getImage(null as any)).rejects.toThrow('Image name is required');
            });

            it('should throw error for undefined name', async () => {
                await expect(imageService.getImage(undefined as any)).rejects.toThrow('Image name is required');
            });
        });

        describe('When generating prompt', () => {
            it('should normalize name to lowercase and trim whitespace', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.rejectedErrors.getHeadObject = new Error('Not found');
                mockImageGenerator.resolvedValues.generateImage = {
                    buffer: mockBuffer,
                    contentType: 'image/webp',
                };

                await imageService.getImage('  SHOPPING CART  ');

                expect(mockImageGenerator.calls.generateImage[0]).toEqual([
                    'Minimalistic flat icon of a shopping cart drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text.',
                ]);
            });
        });

        describe('Stream read callback', () => {
            it('should return readable stream that contains the buffer data', async () => {
                const mockBuffer = Buffer.from('test-image-data-content');

                mockImageStore.rejectedErrors.getHeadObject = new Error('Not found');
                mockImageGenerator.resolvedValues.generateImage = {
                    buffer: mockBuffer,
                    contentType: 'image/webp',
                };

                const result = await imageService.getImage('test-image');
                const stream = result.stream;

                // Consume the stream and collect chunks
                const chunks: Buffer[] = [];

                return new Promise((resolve, reject) => {
                    stream.on('data', (chunk: Buffer) => {
                        chunks.push(chunk);
                    });

                    stream.on('end', () => {
                        const fullData = Buffer.concat(chunks);
                        expect(fullData).toEqual(mockBuffer);
                        resolve(undefined);
                    });

                    stream.on('error', reject);

                    // Trigger the read() callback by reading from the stream
                    stream.read();
                });
            });

            it('should stream cached image data properly', async () => {
                const mockBuffer = Buffer.from('cached-image-data-content');
                const mockStream = {
                    on: function (event: string, callback: Function) {
                        if (event === 'data') {
                            // Simulate stream emitting data
                            setTimeout(() => {
                                callback(mockBuffer);
                            }, 0);
                        } else if (event === 'end') {
                            setTimeout(() => {
                                callback();
                            }, 10);
                        }
                        return this;
                    },
                    read: () => {},
                } as unknown as NodeJS.ReadableStream;

                const mockHeadObject = {
                    metaData: { 'content-type': 'image/png' },
                };

                mockImageStore.resolvedValues.getHeadObject = mockHeadObject;
                mockImageStore.resolvedValues.getObjectStream = mockStream;

                const result = await imageService.getImage('cached-test-image');
                const stream = result.stream;

                // Verify stream is returned
                expect(stream).toBe(mockStream);
                expect(result.contentType).toBe('image/png');
            });
        });
    });
});
