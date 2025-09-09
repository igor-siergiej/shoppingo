import { Context } from 'koa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as imageHandlers from './index';

const mockDependencyContainer = vi.hoisted(() => ({
    resolve: vi.fn()
}));

vi.mock('../../dependencies', () => ({
    dependencyContainer: mockDependencyContainer
}));

const mockImageService = {
    getImage: vi.fn()
} as {
    getImage: ReturnType<typeof vi.fn>;
};

const createMockContext = (overrides: Partial<Context> = {}): Context => ({
    params: {},
    set: vi.fn() as any,
    status: 200,
    body: {},
    res: {
        write: vi.fn(),
        end: vi.fn()
    } as any,
    ...overrides
} as Context);

describe('ImageHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockReturnValue(mockImageService);
    });

    describe('getImage', () => {
        it('should return image successfully', async () => {
            const mockStream = {
                pipe: vi.fn(),
                on: vi.fn()
            } as {
                pipe: ReturnType<typeof vi.fn>;
                on: ReturnType<typeof vi.fn>;
            };

            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockResolvedValue({
                stream: mockStream,
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable'
            });

            mockStream.on.mockImplementation((event: string, callback: (...args: Array<any>) => void) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
            });

            await imageHandlers.getImage(ctx);

            expect(mockImageService.getImage).toHaveBeenCalledWith('test-image');
            expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'image/webp');
            expect(ctx.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
            expect(ctx.status).toBe(200);
        });

        it('should handle stream piping correctly', async () => {
            const mockStream = {
                pipe: vi.fn(),
                on: vi.fn()
            } as {
                pipe: ReturnType<typeof vi.fn>;
                on: ReturnType<typeof vi.fn>;
            };

            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockResolvedValue({
                stream: mockStream,
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000, immutable'
            });

            mockStream.on.mockImplementation((event: string, callback: (...args: Array<any>) => void) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
            });

            await imageHandlers.getImage(ctx);

            expect(mockStream.pipe).toHaveBeenCalledWith(ctx.res, { end: true });
            expect(mockStream.on).toHaveBeenCalledWith('end', expect.any(Function));
            expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should handle service errors with status code', async () => {
            const ctx = createMockContext({ params: { name: 'invalid-image' } });

            mockImageService.getImage.mockRejectedValue(
                Object.assign(new Error('Image not found'), { status: 404 })
            );

            await imageHandlers.getImage(ctx);

            expect(ctx.status).toBe(404);
            expect(ctx.body).toEqual({ error: 'Image not found' });
        });

        it('should handle service errors without status code', async () => {
            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockRejectedValue(new Error('Internal error'));

            await imageHandlers.getImage(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Internal error' });
        });

        it('should handle service errors without message', async () => {
            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockRejectedValue({ status: 400 });

            await imageHandlers.getImage(ctx);

            expect(ctx.status).toBe(400);
            expect(ctx.body).toEqual({ error: 'Internal Server Error' });
        });

        it('should handle stream errors', async () => {
            const mockStream = {
                pipe: vi.fn(),
                on: vi.fn()
            } as {
                pipe: ReturnType<typeof vi.fn>;
                on: ReturnType<typeof vi.fn>;
            };

            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockResolvedValue({
                stream: mockStream,
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable'
            });

            const streamError = new Error('Stream error');

            mockStream.on.mockImplementation((event: string, callback: (...args: Array<any>) => void) => {
                if (event === 'error') {
                    setTimeout(() => callback(streamError), 0);
                }
            });

            await imageHandlers.getImage(ctx);

            expect(ctx.status).toBe(500);
            expect(ctx.body).toEqual({ error: 'Stream error' });
        });

        it('should handle stream end event', async () => {
            const mockStream = {
                pipe: vi.fn(),
                on: vi.fn()
            } as {
                pipe: ReturnType<typeof vi.fn>;
                on: ReturnType<typeof vi.fn>;
            };

            const ctx = createMockContext({ params: { name: 'test-image' } });

            mockImageService.getImage.mockResolvedValue({
                stream: mockStream,
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000, immutable'
            });

            mockStream.on.mockImplementation((event: string, callback: (...args: Array<any>) => void) => {
                if (event === 'end') {
                    setTimeout(() => callback(), 0);
                }
            });

            await imageHandlers.getImage(ctx);

            expect(ctx.status).toBe(200);
        });
    });
});
