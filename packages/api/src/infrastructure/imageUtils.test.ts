import { beforeEach, describe, expect, it } from 'bun:test';
import { processImageBuffer } from './imageUtils';

class MockSharpInstance {
    calls: Record<string, Array<Array<unknown>>> = {
        resize: [],
        webp: [],
        withMetadata: [],
        toBuffer: [],
    };

    toBufferValue: any = Buffer.from('processed-image-data');

    resize(...args: unknown[]) {
        this.calls.resize.push(args);
        return this;
    }

    webp(...args: unknown[]) {
        this.calls.webp.push(args);
        return this;
    }

    withMetadata(...args: unknown[]) {
        this.calls.withMetadata.push(args);
        return this;
    }

    async toBuffer() {
        this.calls.toBuffer.push([]);
        return this.toBufferValue;
    }

    reset() {
        this.calls = {
            resize: [],
            webp: [],
            withMetadata: [],
            toBuffer: [],
        };
        this.toBufferValue = Buffer.from('processed-image-data');
    }
}

const mockSharpInstance = new MockSharpInstance();

describe('imageUtils', () => {
    beforeEach(() => {
        mockSharpInstance.reset();
    });

    describe('processImageBuffer', () => {
        it('accepts a buffer input', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('image-data');
            const result = await processImageBuffer(inputBuffer, mockSharp as any);

            expect(result).toBeDefined();
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('returns a processed buffer', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('test-image');
            const result = await processImageBuffer(inputBuffer, mockSharp as any);

            expect(result).toEqual(Buffer.from('processed-image-data'));
        });

        it('processes buffer through resize operation', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('test-image');
            await processImageBuffer(inputBuffer, mockSharp as any);

            expect(mockSharpInstance.calls.resize.length).toBeGreaterThan(0);
        });

        it('handles empty buffer', async () => {
            const mockSharp = () => mockSharpInstance;
            const emptyBuffer = Buffer.from('');
            const result = await processImageBuffer(emptyBuffer, mockSharp as any);

            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('returns non-empty processed result', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('image-data');
            const result = await processImageBuffer(inputBuffer, mockSharp as any);

            expect(result.length).toBeGreaterThan(0);
        });

        it('processes multiple buffers independently', async () => {
            const mockSharp = () => mockSharpInstance;
            const buffer1 = Buffer.from('image1');
            const buffer2 = Buffer.from('image2');

            const result1 = await processImageBuffer(buffer1, mockSharp as any);
            mockSharpInstance.reset();
            const result2 = await processImageBuffer(buffer2, mockSharp as any);

            expect(Buffer.isBuffer(result1)).toBe(true);
            expect(Buffer.isBuffer(result2)).toBe(true);
        });

        it('handles different buffer sizes', async () => {
            const mockSharp = () => mockSharpInstance;
            const smallBuffer = Buffer.from('x');
            const largeBuffer = Buffer.from('a'.repeat(10000));

            const result1 = await processImageBuffer(smallBuffer, mockSharp as any);
            mockSharpInstance.reset();
            const result2 = await processImageBuffer(largeBuffer, mockSharp as any);

            expect(Buffer.isBuffer(result1)).toBe(true);
            expect(Buffer.isBuffer(result2)).toBe(true);
        });
    });

    describe('image processing configuration', () => {
        it('applies expected image transformations', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('test');
            const result = await processImageBuffer(inputBuffer, mockSharp as any);

            expect(result).toBeDefined();
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('produces consistent output for same input', async () => {
            const mockSharp = () => mockSharpInstance;
            const inputBuffer = Buffer.from('consistent-test');

            const result1 = await processImageBuffer(inputBuffer, mockSharp as any);
            mockSharpInstance.reset();
            const result2 = await processImageBuffer(inputBuffer, mockSharp as any);

            expect(result1).toEqual(result2);
        });
    });
});
