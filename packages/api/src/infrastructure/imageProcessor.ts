import sharp from 'sharp';

// Default sharp library for production
const sharpLib = sharp;

/**
 * Process image buffer with Sharp transformations
 * Can optionally inject a mock sharp library for testing
 */
export async function processImage(inputBuffer: Buffer, sharpFactory?: typeof sharp): Promise<Buffer> {
    const sharpToUse = sharpFactory || sharpLib;
    return await sharpToUse(inputBuffer)
        .resize(256, 256, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: true,
        })
        .webp({
            quality: 85,
            effort: 4,
            lossless: false,
            smartSubsample: true,
        })
        .withMetadata({})
        .toBuffer();
}
