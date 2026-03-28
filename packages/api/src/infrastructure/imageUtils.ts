import sharp from 'sharp';

export async function processImageBuffer(
    inputBuffer: Buffer,
    sharpFactory?: typeof sharp,
    size = 256
): Promise<Buffer> {
    const sharpToUse = sharpFactory || sharp;
    return await sharpToUse(inputBuffer)
        .resize(size, size, {
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
