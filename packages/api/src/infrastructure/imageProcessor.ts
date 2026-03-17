import sharp from 'sharp';

export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
    return await sharp(inputBuffer)
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
