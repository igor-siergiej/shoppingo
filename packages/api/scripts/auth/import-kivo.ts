/**
 * Copies kivo's password users into Shoppingo's built-in Better Auth store, keeping their ids
 * (so their lists, recipes and shares stay theirs) and their passwords. Dry run by default.
 *
 *   KIVO_CONNECTION_URI=... KIVO_DATABASE_NAME=... bun run auth:import-kivo [--apply]
 *
 * The target is the usual CONNECTION_URI / DATABASE_NAME / BETTER_AUTH_SECRET / BETTER_AUTH_URL.
 */
import { MongoClient, type ObjectId } from 'mongodb';

import { dependencyContainer, registerDepdendencies } from '../../src/dependencies';
import { DependencyToken } from '../../src/dependencies/types';
import { importKivoUsers } from './lib';

const apply = process.argv.includes('--apply');
const kivoUri = process.env.KIVO_CONNECTION_URI;
const kivoDbName = process.env.KIVO_DATABASE_NAME;
if (!kivoUri || !kivoDbName) {
    console.error('KIVO_CONNECTION_URI and KIVO_DATABASE_NAME are required');
    process.exit(1);
}

registerDepdendencies();
const auth = dependencyContainer.resolve(DependencyToken.Auth);

const kivo = new MongoClient(kivoUri);
try {
    const docs = await kivo
        .db(kivoDbName)
        .collection<{ _id: ObjectId; username: string; passwordHash: string; createdAt?: Date }>('users')
        .find({}, { projection: { username: 1, passwordHash: 1, createdAt: 1 } })
        .toArray();
    const users = docs.map((doc) => ({ ...doc, _id: doc._id.toHexString() }));

    const { created, skipped, rejected } = await importKivoUsers(auth, users, { apply });
    for (const { username, reason } of rejected) console.log(`  rejected ${username}: ${reason}`);
    console.log(
        `${users.length} kivo user(s): ${created} ${apply ? 'imported' : 'would be imported (pass --apply)'}, ` +
            `${skipped} already imported, ${rejected.length} rejected`
    );
} finally {
    await kivo.close();
}
process.exit(0);
