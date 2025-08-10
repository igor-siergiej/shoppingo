import { List } from '@shoppingo/types';
import { Collection } from 'mongodb/mongodb';

export enum CollectionName {
    Lists = 'lists'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection: (collection: CollectionName) => Collection<List>;
}
