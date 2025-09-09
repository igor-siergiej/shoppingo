import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@igor-siergiej/api-utils';

import { config } from '../config';
import { ImageService } from '../domain/ImageService';
import { ListService } from '../domain/ListService';
import { HttpAuthClient } from '../infrastructure/AuthClient';
import { BucketStore } from '../infrastructure/BucketStore';
import { GeminiImageGenerator } from '../infrastructure/GeminiImageGenerator';
import { MongoListRepository } from '../infrastructure/MongoListRepository';
import { Dependencies, DependencyToken } from './types';

export const dependencyContainer = DependencyContainer.getInstance<Dependencies>();

export const registerDepdendencies = () => {
    // Core infrastructure services
    dependencyContainer.registerSingleton(DependencyToken.Database, MongoDbConnection);
    dependencyContainer.registerSingleton(DependencyToken.Logger, Logger);
    dependencyContainer.registerSingleton(DependencyToken.Bucket, ObjectStoreConnection);
    dependencyContainer.registerSingleton(DependencyToken.AuthClient, HttpAuthClient);

    // Domain services using factory classes
    dependencyContainer.registerSingleton(DependencyToken.ListRepository, class {
        constructor() {
            return new MongoListRepository(dependencyContainer.resolve(DependencyToken.Database));
        }
    } as any);

    dependencyContainer.registerSingleton(DependencyToken.ListService, class {
        constructor() {
            return new ListService(
                dependencyContainer.resolve(DependencyToken.ListRepository),
                dependencyContainer.resolve(DependencyToken.AuthClient)
            );
        }
    } as any);

    // Image services
    dependencyContainer.registerSingleton(DependencyToken.ImageStore, class {
        constructor() {
            return new BucketStore(dependencyContainer.resolve(DependencyToken.Bucket));
        }
    } as any);

    dependencyContainer.registerSingleton(DependencyToken.ImageGenerator, class {
        constructor() {
            return new GeminiImageGenerator(config.get('geminiApiKey'));
        }
    } as any);

    dependencyContainer.registerSingleton(DependencyToken.ImageService, class {
        constructor() {
            return new ImageService(
                dependencyContainer.resolve(DependencyToken.ImageStore),
                dependencyContainer.resolve(DependencyToken.ImageGenerator),
                dependencyContainer.resolve(DependencyToken.Logger)
            );
        }
    } as any);
};
