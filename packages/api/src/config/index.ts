import { ConfigService, parsers } from '@imapps/api-utils';

const schema = {
    port: { parser: parsers.number, from: 'PORT' },
    authUrl: { parser: parsers.string, from: 'AUTH_URL', optional: true },
    connectionUri: { parser: parsers.string, from: 'CONNECTION_URI' },
    databaseName: { parser: parsers.string, from: 'DATABASE_NAME' },
    falKey: { parser: parsers.string, from: 'FAL_KEY', optional: true },
    falModel: { parser: parsers.string, from: 'FAL_MODEL', optional: true },
    falRecipeModel: { parser: parsers.string, from: 'FAL_RECIPE_MODEL', optional: true },
    recipeImportLlmEnabled: { parser: parsers.boolean, from: 'RECIPE_IMPORT_LLM_ENABLED', optional: true },
    recipeImportLlmApiKey: { parser: parsers.string, from: 'RECIPE_IMPORT_LLM_API_KEY', optional: true },
    recipeImportLlmModel: { parser: parsers.string, from: 'RECIPE_IMPORT_LLM_MODEL', optional: true },
    bucketName: { parser: parsers.string, from: 'BUCKET_NAME' },
    bucketAccessKey: { parser: parsers.string, from: 'BUCKET_ACCESS_KEY' },
    bucketSecretKey: { parser: parsers.string, from: 'BUCKET_SECRET_KEY' },
    bucketEndpoint: { parser: parsers.string, from: 'BUCKET_ENDPOINT' },
    vapidPublicKey: { parser: parsers.string, from: 'VAPID_PUBLIC_KEY', optional: true },
    vapidPrivateKey: { parser: parsers.string, from: 'VAPID_PRIVATE_KEY', optional: true },
    vapidSubject: { parser: parsers.string, from: 'VAPID_SUBJECT', optional: true },
} as const;

export const config = new ConfigService(schema);
