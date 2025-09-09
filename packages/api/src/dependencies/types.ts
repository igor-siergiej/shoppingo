import { Logger, MongoDbConnection, ObjectStoreConnection } from '@igor-siergiej/api-utils';
import { List } from '@shoppingo/types';

import { ImageService } from '../domain/ImageService';
import { ImageGenerator, ImageStore } from '../domain/ImageService/types';
import { AuthClient, ListService } from '../domain/ListService';
import { ListRepository } from '../domain/ListService/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
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
