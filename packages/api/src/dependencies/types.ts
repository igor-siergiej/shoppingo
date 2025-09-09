import { Logger, MongoDbConnection, ObjectStoreConnection } from '@igor-siergiej/api-utils';
import { List } from '@shoppingo/types';

import { IdGenerator } from '../domain/IdGenerator';
import { ImageService } from '../domain/ImageService';
import { ImageGenerator, ImageStore } from '../domain/ImageService/types';
import { ListRepository } from '../domain/ListRepository';
import { AuthClient, ListService } from '../domain/ListService';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
    IdGenerator = 'IdGenerator',
    ListRepository = 'ListRepository',
    ListService = 'ListService',
    AuthClient = 'AuthClient',
    ImageStore = 'ImageStore',
    ImageGenerator = 'ImageGenerator',
    ImageService = 'ImageService'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ListRepository]: ListRepository;
    [DependencyToken.ListService]: ListService;
    [DependencyToken.AuthClient]: AuthClient;
    [DependencyToken.ImageStore]: ImageStore;
    [DependencyToken.ImageGenerator]: ImageGenerator;
    [DependencyToken.ImageService]: ImageService;
};

export enum CollectionNames {
    List = 'list'
}
