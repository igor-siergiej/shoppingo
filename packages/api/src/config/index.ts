import { ConfigService, parsers } from '@imapps/api-utils';

// AUTH_URL is where we POST the bearer token to /users and /verify. Bearer headers must never cross plaintext,
// so refuse anything that is not https://. Selfhost docker-network users can keep using `http://kivo:3008`
// because the token never leaves the host bridge.
const httpsUrl = (value: string) => {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`AUTH_URL is not a valid URL: '${value}'`);
    }
    if (url.protocol !== 'https:') {
        throw new Error(`AUTH_URL must use https://, got '${url.protocol}'`);
    }
    return url.toString().replace(/\/$/, '');
};

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    authUrl: { parser: httpsUrl, from: 'AUTH_URL', optional: true },
    // Shared secret with kivo (X-Service-Token). Required once kivo's LOOKUP_AUTH_ENABLED is on.
    serviceToken: { parser: parsers.string, from: 'SERVICE_TOKEN', optional: true },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    falKey: { parser: parsers.string, from: 'FAL_KEY', optional: true },
    falModel: { parser: parsers.string, from: 'FAL_MODEL', optional: true },
    falRecipeModel: { parser: parsers.string, from: 'FAL_RECIPE_MODEL', optional: true },
    recipeImportLlmEnabled: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_ENABLED', optional: true },
    recipeImportLlmFirst: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_FIRST', optional: true },
    recipeImportLlmApiKey: { parser: parsers.string, from: 'RECIPE_IMPORT_LLM_API_KEY', optional: true },
    recipeImportLlmModel: { parser: parsers.string, from: 'RECIPE_IMPORT_LLM_MODEL', optional: true },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
    vapidPublicKey: { parser: parsers.string, from: 'VAPID_PUBLIC_KEY', optional: true },
    vapidPrivateKey: { parser: parsers.string, from: 'VAPID_PRIVATE_KEY', optional: true },
    vapidSubject: { parser: parsers.string, from: 'VAPID_SUBJECT', optional: true },
    wikibooksUserAgent: { parser: parsers.string, from: 'WIKIBOOKS_USER_AGENT', optional: true },
    discoveryAdminUserIds: { parser: parsers.string, from: 'DISCOVERY_ADMIN_USER_IDS', optional: true },
    opensearchUrl: { parser: parsers.string, from: 'OPENSEARCH_URL', optional: true },
} as const;

export const config = new ConfigService(schema);
