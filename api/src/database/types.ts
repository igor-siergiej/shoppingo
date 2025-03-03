import { Collection, Document } from "mongodb/mongodb";

export enum CollectionName {
    Lists = 'lists'
}

export interface IDatabase {
    connect: () => Promise<void>;
    getCollection: (collection: CollectionName) => Collection<Document>
}
