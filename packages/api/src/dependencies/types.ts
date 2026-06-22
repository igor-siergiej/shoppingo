import type { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import type { Label, List, PushSubscription, Recipe, Todo } from '@shoppingo/types';

import type { AuthorizationService } from '../domain/AuthorizationService';
import type { IdGenerator } from '../domain/IdGenerator';
import type { ImageService } from '../domain/ImageService';
import type { ImageGenerator, ImageStore } from '../domain/ImageService/types';
import type { LabelRepository } from '../domain/LabelRepository';
import type { LabelService } from '../domain/LabelService';
import type { ListRepository } from '../domain/ListRepository';
import type { ListService } from '../domain/ListService';
import type { AuthClient } from '../domain/ListService/types';
import type { RecipeImageService } from '../domain/RecipeImageService';
import type { RecipeRepository } from '../domain/RecipeRepository';
import type { RecipeService } from '../domain/RecipeService';
import type { TodoRepository } from '../domain/TodoRepository';
import type { TodoService } from '../domain/TodoService';
import type { NotificationService } from '../domain/NotificationService';
import type { PushSubscriptionRepository } from '../domain/PushSubscriptionRepository';
import type { RecipeHandlers } from '../interfaces/RecipeHandlers';
import type { WebPushSender } from '../infrastructure/WebPushSender';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
    [CollectionNames.Recipe]: Recipe;
    [CollectionNames.Todo]: Todo;
    [CollectionNames.Label]: Label;
    [CollectionNames.PushSubscription]: PushSubscription;
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
    TodoRepository = 'TodoRepository',
    TodoService = 'TodoService',
    LabelRepository = 'LabelRepository',
    LabelService = 'LabelService',
    PushSubscriptionRepository = 'PushSubscriptionRepository',
    WebPushSender = 'WebPushSender',
    NotificationService = 'NotificationService',
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
    [DependencyToken.TodoRepository]: TodoRepository;
    [DependencyToken.TodoService]: TodoService;
    [DependencyToken.LabelRepository]: LabelRepository;
    [DependencyToken.LabelService]: LabelService;
    [DependencyToken.PushSubscriptionRepository]: PushSubscriptionRepository;
    [DependencyToken.WebPushSender]: WebPushSender;
    [DependencyToken.NotificationService]: NotificationService;
};

export enum CollectionNames {
    List = 'list',
    Recipe = 'recipe',
    Todo = 'todo',
    Label = 'label',
    PushSubscription = 'pushSubscription',
}
