import { Logger } from '@igor-siergiej/api-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageService } from './index';

const mockImageStore = {
    getHeadObject: vi.fn(),
    getObjectStream: vi.fn(),
    putObject: vi.fn()
};

const mockImageGenerator = {
    generateImage: vi.fn()
};

const mockLogger = {
    warn: vi.fn(),
    error: vi.fn()
} as unknown as Logger;

describe('ImageService', () => {
    let imageService: ImageService;

    beforeEach(() => {
        vi.clearAllMocks();
        imageService = new ImageService(mockImageStore, mockImageGenerator, mockLogger);
    });

    describe('getImage', () => {
        describe('When image exists in store', () => {
            it('should return image from store', async () => {
                const mockStream = { read: vi.fn() } as unknown as NodeJS.ReadableStream;
                const mockHeadObject = {
                    metaData: { 'content-type': 'image/png' }
                };

                mockImageStore.getHeadObject.mockResolvedValue(mockHeadObject);
                mockImageStore.getObjectStream.mockResolvedValue(mockStream);

                const result = await imageService.getImage('test-image');

                expect(mockImageStore.getHeadObject).toHaveBeenCalledWith('test-image');
                expect(mockImageStore.getObjectStream).toHaveBeenCalledWith('test-image');
                expect(result.stream).toBe(mockStream);
                expect(result.contentType).toBe('image/png');
                expect(result.cacheControl).toBe('public, max-age=31536000, immutable');
            });

            it('should use default content type when metadata is missing', async () => {
                const mockStream = { read: vi.fn() } as unknown as NodeJS.ReadableStream;
                const mockHeadObject = { metaData: {} };

                mockImageStore.getHeadObject.mockResolvedValue(mockHeadObject);
                mockImageStore.getObjectStream.mockResolvedValue(mockStream);

                const result = await imageService.getImage('test-image');

                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When image does not exist in store', () => {
            it('should generate new image and store it', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.getHeadObject.mockRejectedValue(new Error('Not found'));
                mockImageGenerator.generateImage.mockResolvedValue({
                    buffer: mockBuffer,
                    contentType: 'image/webp'
                });
                mockImageStore.putObject.mockResolvedValue(undefined);

                const result = await imageService.getImage('shopping-cart');

                expect(mockImageGenerator.generateImage).toHaveBeenCalledWith(
                    'Minimalistic flat icon of a shopping-cart drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text, no background.'
                );
                expect(mockImageStore.putObject).toHaveBeenCalledWith(
                    'shopping-cart',
                    mockBuffer,
                    { contentType: 'image/webp' }
                );
                expect(result.contentType).toBe('image/webp');
                expect(result.cacheControl).toBe('public, max-age=31536000, immutable');
            });

            it('should handle store upload failure gracefully', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.getHeadObject.mockRejectedValue(new Error('Not found'));
                mockImageGenerator.generateImage.mockResolvedValue({
                    buffer: mockBuffer,
                    contentType: 'image/webp'
                });
                mockImageStore.putObject.mockRejectedValue(new Error('Upload failed'));

                const result = await imageService.getImage('test-item');

                expect(mockLogger.error).toHaveBeenCalledWith(
                    'Failed to store generated image',
                    { name: 'test-item', error: new Error('Upload failed') }
                );
                expect(result.contentType).toBe('image/webp');
            });

            it('should work without logger', async () => {
                const serviceWithoutLogger = new ImageService(mockImageStore, mockImageGenerator);
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.getHeadObject.mockRejectedValue(new Error('Not found'));
                mockImageGenerator.generateImage.mockResolvedValue({
                    buffer: mockBuffer,
                    contentType: 'image/webp'
                });
                mockImageStore.putObject.mockRejectedValue(new Error('Upload failed'));

                const result = await serviceWithoutLogger.getImage('test-item');

                expect(result.contentType).toBe('image/webp');
            });
        });

        describe('When image name is invalid', () => {
            it('should throw error for empty name', async () => {
                await expect(imageService.getImage(''))
                    .rejects.toThrow('Image name is required');
            });

            it('should throw error for null name', async () => {
                await expect(imageService.getImage(null as any))
                    .rejects.toThrow('Image name is required');
            });

            it('should throw error for undefined name', async () => {
                await expect(imageService.getImage(undefined as any))
                    .rejects.toThrow('Image name is required');
            });
        });

        describe('When generating prompt', () => {
            it('should normalize name to lowercase and trim whitespace', async () => {
                const mockBuffer = Buffer.from('generated-image-data');

                mockImageStore.getHeadObject.mockRejectedValue(new Error('Not found'));
                mockImageGenerator.generateImage.mockResolvedValue({
                    buffer: mockBuffer,
                    contentType: 'image/webp'
                });

                await imageService.getImage('  SHOPPING CART  ');

                expect(mockImageGenerator.generateImage).toHaveBeenCalledWith(
                    'Minimalistic flat icon of a shopping cart drawn in a simple, clean style, this is going to be a icon for my shopping list item. Bright solid colors, soft rounded edges, modern vector look, no text, no background.'
                );
            });
        });
    });
});
