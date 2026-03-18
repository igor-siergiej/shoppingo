import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processImage } from './imageProcessor';

const mockSharpInstance = {
    resize: vi.fn(),
    webp: vi.fn(),
    withMetadata: vi.fn(),
    toBuffer: vi.fn(),
};

// Each method returns `this` so the chain works
mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
mockSharpInstance.withMetadata.mockReturnValue(mockSharpInstance);

vi.mock('sharp', () => ({
    default: vi.fn().mockImplementation(() => mockSharpInstance),
}));

describe('imageProcessor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
        mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
        mockSharpInstance.withMetadata.mockReturnValue(mockSharpInstance);
        mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed-output'));
    });

    describe('processImage', () => {
        it('returns a Buffer', async () => {
            const result = await processImage(Buffer.from('input'));
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('returns the value from toBuffer', async () => {
            const expected = Buffer.from('expected-output');
            mockSharpInstance.toBuffer.mockResolvedValue(expected);

            const result = await processImage(Buffer.from('input'));
            expect(result).toEqual(expected);
        });

        it('calls resize with 256x256 and correct options', async () => {
            await processImage(Buffer.from('input'));

            expect(mockSharpInstance.resize).toHaveBeenCalledWith(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                withoutEnlargement: true,
            });
        });

        it('calls webp with quality 85', async () => {
            await processImage(Buffer.from('input'));

            expect(mockSharpInstance.webp).toHaveBeenCalledWith(expect.objectContaining({ quality: 85 }));
        });

        it('calls webp with smartSubsample enabled', async () => {
            await processImage(Buffer.from('input'));

            expect(mockSharpInstance.webp).toHaveBeenCalledWith(expect.objectContaining({ smartSubsample: true }));
        });

        it('calls withMetadata', async () => {
            await processImage(Buffer.from('input'));
            expect(mockSharpInstance.withMetadata).toHaveBeenCalled();
        });

        it('calls toBuffer to finalise output', async () => {
            await processImage(Buffer.from('input'));
            expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
        });

        it('processes multiple buffers independently', async () => {
            const buf1 = Buffer.from('image1');
            const buf2 = Buffer.from('image2');

            const out1 = await processImage(buf1);
            const out2 = await processImage(buf2);

            expect(Buffer.isBuffer(out1)).toBe(true);
            expect(Buffer.isBuffer(out2)).toBe(true);
        });
    });
});
