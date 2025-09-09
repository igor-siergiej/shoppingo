export interface ImageStore {
    getHeadObject(name: string): Promise<{ metaData?: { 'content-type'?: string } } | null>;
    getObjectStream(name: string): Promise<NodeJS.ReadableStream>;
    putObject(name: string, buffer: Buffer, options?: { contentType: string }): Promise<void>;
}

export interface ImageGenerator {
    generateImage(prompt: string): Promise<{ buffer: Buffer; contentType: string }>;
}
