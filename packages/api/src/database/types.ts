import { Collection } from 'mongodb/mongodb';
import { List } from 'types';

export enum CollectionName {
    Lists = 'lists'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection: (collection: CollectionName) => Collection<List>;
}
