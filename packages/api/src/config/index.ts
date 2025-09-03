import { ConfigService, parsers } from '@igor-siergiej/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    authUrl: { parser: parsers.string, from: 'AUTH_URL', optional: true },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    geminiApiKey: { parser: parsers.string, from: 'GEMINI_API_KEY' }
} as const;

export const config = new ConfigService(schema);
