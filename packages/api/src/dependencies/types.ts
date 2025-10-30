import type { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import type { List } from '@shoppingo/types';

import type { IdGenerator } from '../domain/IdGenerator';
import type { ImageService } from '../domain/ImageService';
import type { ImageGenerator, ImageStore } from '../domain/ImageService/types';
import type { ListRepository } from '../domain/ListRepository';
import type { ListService } from '../domain/ListService';
import type { AuthClient } from '../domain/ListService/types';

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
    ImageService = 'ImageService',
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
    List = 'list',
}
