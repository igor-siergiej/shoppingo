import { ConfigService, parsers } from '@igor-siergiej/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    authUrl: { parser: parsers.string, from: 'AUTH_URL', optional: true },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    imageProvider: { parser: parsers.string, from: 'IMAGE_PROVIDER', optional: true },
    geminiApiKey: { parser: parsers.string, from: 'GEMINI_API_KEY', optional: true },
    geminiModel: { parser: parsers.string, from: 'GEMINI_MODEL', optional: true },
    openaiApiKey: { parser: parsers.string, from: 'OPENAI_API_KEY', optional: true },
    openaiModel: { parser: parsers.string, from: 'OPENAI_MODEL', optional: true },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
} as const;

export const config = new ConfigService(schema);
