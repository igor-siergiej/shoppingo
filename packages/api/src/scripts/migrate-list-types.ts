import { ListType } from '@shoppingo/types';
import { MongoClient } from 'mongodb';

async function migrateListTypes() {
    const connectionUri = process.env.CONNECTION_URI || 'mongodb://localhost:27017/?directConnection=true';
    const dbName = process.env.DATABASE_NAME || 'shoppingo';
    const client = new MongoClient(connectionUri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const listsCollection = db.collection('list');

        // Count lists without listType field
        const countWithoutType = await listsCollection.countDocuments({ listType: { $exists: false } });
        console.log(`Found ${countWithoutType} lists without listType field`);

        if (countWithoutType === 0) {
            console.log('All lists already have listType field. No migration needed.');
            return;
        }

        // Update all lists without listType to SHOPPING (default)
        const result = await listsCollection.updateMany(
            { listType: { $exists: false } },
            { $set: { listType: ListType.SHOPPING } }
        );

        console.log(`✓ Successfully updated ${result.modifiedCount} lists to SHOPPING type`);
        console.log(`  - Matched: ${result.matchedCount}`);
        console.log(`  - Modified: ${result.modifiedCount}`);

        // Verify the migration
        const totalLists = await listsCollection.countDocuments({});
        const listsWithType = await listsCollection.countDocuments({ listType: { $exists: true } });

        console.log(`\nVerification:`);
        console.log(`  - Total lists: ${totalLists}`);
        console.log(`  - Lists with listType: ${listsWithType}`);

        if (totalLists === listsWithType) {
            console.log('\n✓ Migration completed successfully!');
        } else {
            console.warn('\n✗ Migration incomplete: some lists still missing listType field');
        }
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run the migration
migrateListTypes().catch(console.error);
