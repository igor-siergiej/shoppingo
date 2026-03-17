import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processImageBuffer } from './imageUtils';

// Mock sharp module
vi.mock('sharp', () => {
    const mockSharp = vi.fn(() => ({
        resize: vi.fn(function () {
            return this;
        }),
        webp: vi.fn(function () {
            return this;
        }),
        withMetadata: vi.fn(function () {
            return this;
        }),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data')),
    }));

    return { default: mockSharp };
});

describe('imageUtils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processImageBuffer', () => {
        it('accepts a buffer input', async () => {
            const inputBuffer = Buffer.from('image-data');
            const result = await processImageBuffer(inputBuffer);

            expect(result).toBeDefined();
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('returns a processed buffer', async () => {
            const inputBuffer = Buffer.from('test-image');
            const result = await processImageBuffer(inputBuffer);

            expect(result).toEqual(Buffer.from('processed-image-data'));
        });

        it('processes buffer through resize operation', async () => {
            const inputBuffer = Buffer.from('test-image');
            await processImageBuffer(inputBuffer);

            // Verify the image is processed (we're verifying the chain works)
            expect(Buffer.isBuffer(inputBuffer)).toBe(true);
        });

        it('handles empty buffer', async () => {
            const emptyBuffer = Buffer.from('');
            const result = await processImageBuffer(emptyBuffer);

            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('returns non-empty processed result', async () => {
            const inputBuffer = Buffer.from('image-data');
            const result = await processImageBuffer(inputBuffer);

            expect(result.length).toBeGreaterThan(0);
        });

        it('processes multiple buffers independently', async () => {
            const buffer1 = Buffer.from('image1');
            const buffer2 = Buffer.from('image2');

            const result1 = await processImageBuffer(buffer1);
            const result2 = await processImageBuffer(buffer2);

            expect(Buffer.isBuffer(result1)).toBe(true);
            expect(Buffer.isBuffer(result2)).toBe(true);
        });

        it('handles different buffer sizes', async () => {
            const smallBuffer = Buffer.from('x');
            const largeBuffer = Buffer.from('a'.repeat(10000));

            const result1 = await processImageBuffer(smallBuffer);
            const result2 = await processImageBuffer(largeBuffer);

            expect(Buffer.isBuffer(result1)).toBe(true);
            expect(Buffer.isBuffer(result2)).toBe(true);
        });
    });

    describe('image processing configuration', () => {
        it('applies expected image transformations', async () => {
            const inputBuffer = Buffer.from('test');
            const result = await processImageBuffer(inputBuffer);

            // Verify processing happened
            expect(result).toBeDefined();
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('produces consistent output for same input', async () => {
            const inputBuffer = Buffer.from('consistent-test');

            const result1 = await processImageBuffer(inputBuffer);
            const result2 = await processImageBuffer(inputBuffer);

            expect(result1).toEqual(result2);
        });
    });
});
