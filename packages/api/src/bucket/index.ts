import { Client } from 'minio';
import { Readable } from 'stream';

import { dependencyContainer } from '../dependencies';
import { DependencyToken } from '../dependencies/types';
import { IBucket } from './types';

export class Bucket implements IBucket {
    private client: Client;
    private bucketName: string;

    constructor() {
        const logger = dependencyContainer.resolve(DependencyToken.Logger);

        const bucketName = process.env.BUCKET_NAME;
        const accessKey = process.env.BUCKET_ACCESS_KEY;
        const secretKey = process.env.BUCKET_SECRET_KEY;
        const endPoint = process.env.BUCKET_ENDPOINT;

        if (!accessKey || !secretKey || !endPoint || !bucketName) {
            logger?.error('Missing required environment variables for bucket configuration');
            throw new Error('Missing required environment variables for bucket configuration');
        }

        this.bucketName = bucketName;

        const [hostname, portStr] = endPoint.split(':');
        const port = portStr ? parseInt(portStr) : 7000;

        this.client = new Client({
            useSSL: false,
            endPoint: hostname,
            port,
            accessKey,
            secretKey
        });
    }

    public getObjectStream = async (id: string): Promise<Readable> => {
        return this.client.getObject(this.bucketName, id);
    };

    public getHeadObject = async (id: string) => {
        return this.client.statObject(this.bucketName, id);
    };

    public putObject = async (
        id: string,
        data: Buffer | Readable,
        meta?: { contentType?: string; metaData?: Record<string, string> }
    ): Promise<void> => {
        const size = Buffer.isBuffer(data) ? data.length : undefined;
        const metaHeaders: Record<string, string> = {};

        if (meta?.contentType) {
            metaHeaders['Content-Type'] = meta.contentType;
        }

        if (meta?.metaData) {
            for (const [key, value] of Object.entries(meta.metaData)) {
                metaHeaders[key] = value;
            }
        }

        if (Buffer.isBuffer(data)) {
            await this.client.putObject(this.bucketName, id, data, size, metaHeaders);
        } else {
            await this.client.putObject(this.bucketName, id, data, undefined, metaHeaders);
        }
    };
}
