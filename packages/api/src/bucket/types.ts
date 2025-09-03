import { Readable } from 'stream';

export interface IBucket {
    getObjectStream: (id: string) => Promise<Readable>;
    getHeadObject: (id: string) => Promise<{ metaData?: Record<string, string> }>;
    putObject: (
        id: string,
        data: Buffer | Readable,
        meta?: { contentType?: string; metaData?: Record<string, string> }
    ) => Promise<void>;
}
