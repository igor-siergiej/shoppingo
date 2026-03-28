import type { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import type { List, Recipe } from '@shoppingo/types';

import type { AuthorizationService } from '../domain/AuthorizationService';
import type { IdGenerator } from '../domain/IdGenerator';
import type { ImageService } from '../domain/ImageService';
import type { ImageGenerator, ImageStore } from '../domain/ImageService/types';
import type { ListRepository } from '../domain/ListRepository';
import type { ListService } from '../domain/ListService';
import type { AuthClient } from '../domain/ListService/types';
import type { RecipeImageService } from '../domain/RecipeImageService';
import type { RecipeRepository } from '../domain/RecipeRepository';
import type { RecipeService } from '../domain/RecipeService';
import type { RecipeHandlers } from '../interfaces/RecipeHandlers';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
    [CollectionNames.Recipe]: Recipe;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket',
    IdGenerator = 'IdGenerator',
    ListRepository = 'ListRepository',
    ListService = 'ListService',
    RecipeService = 'RecipeService',
    AuthClient = 'AuthClient',
    AuthorizationService = 'AuthorizationService',
    ImageStore = 'ImageStore',
    ImageGenerator = 'ImageGenerator',
    ImageService = 'ImageService',
    RecipeRepository = 'RecipeRepository',
    RecipeHandlers = 'RecipeHandlers',
    RecipeImageGenerator = 'RecipeImageGenerator',
    RecipeImageService = 'RecipeImageService',
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: ObjectStoreConnection;
    [DependencyToken.IdGenerator]: IdGenerator;
    [DependencyToken.ListRepository]: ListRepository;
    [DependencyToken.ListService]: ListService;
    [DependencyToken.RecipeService]: RecipeService;
    [DependencyToken.AuthClient]: AuthClient;
    [DependencyToken.AuthorizationService]: AuthorizationService;
    [DependencyToken.ImageStore]: ImageStore;
    [DependencyToken.ImageGenerator]: ImageGenerator;
    [DependencyToken.ImageService]: ImageService;
    [DependencyToken.RecipeRepository]: RecipeRepository;
    [DependencyToken.RecipeHandlers]: RecipeHandlers;
    [DependencyToken.RecipeImageGenerator]: ImageGenerator;
    [DependencyToken.RecipeImageService]: RecipeImageService;
};

export enum CollectionNames {
    List = 'list',
    Recipe = 'recipe',
}
