// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';

import { config } from '../config';
import { AuthorizationService } from '../domain/AuthorizationService';
import { ImageService } from '../domain/ImageService';
import { ListService } from '../domain/ListService';
import { RecipeImageService } from '../domain/RecipeImageService';
import { RecipeService } from '../domain/RecipeService';
import { HttpAuthClient } from '../infrastructure/AuthClient';
import { BucketStore } from '../infrastructure/BucketStore';
import { MongoListRepository } from '../infrastructure/MongoListRepository';
import { MongoRecipeRepository } from '../infrastructure/MongoRecipeRepository';
import { OpenAIImageGenerator } from '../infrastructure/OpenAIImageGenerator';
import { UuidGenerator } from '../infrastructure/UuidGenerator';
import * as RecipeHandlers from '../interfaces/RecipeHandlers';
import { type Dependencies, DependencyToken } from './types';

export const dependencyContainer = DependencyContainer.getInstance<Dependencies>();

export const registerDepdendencies = () => {
    // Core infrastructure services
    dependencyContainer.registerSingleton(DependencyToken.Database, MongoDbConnection);
    dependencyContainer.registerSingleton(DependencyToken.Logger, Logger);
    dependencyContainer.registerSingleton(DependencyToken.Bucket, ObjectStoreConnection);
    dependencyContainer.registerSingleton(DependencyToken.AuthClient, HttpAuthClient);
    dependencyContainer.registerSingleton(DependencyToken.IdGenerator, UuidGenerator);
    dependencyContainer.registerSingleton(DependencyToken.AuthorizationService, AuthorizationService);

    // Domain services using factory classes
    dependencyContainer.registerSingleton(
        DependencyToken.ListRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoListRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.ListService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new ListService(
                    dependencyContainer.resolve(DependencyToken.ListRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.AuthClient),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.AuthorizationService)
                );
            }
        }
    );

    // Recipe services
    dependencyContainer.registerSingleton(
        DependencyToken.RecipeRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoRecipeRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new RecipeService(
                    dependencyContainer.resolve(DependencyToken.RecipeRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.AuthorizationService),
                    dependencyContainer.resolve(DependencyToken.RecipeImageService)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeHandlers,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return RecipeHandlers;
            }
        }
    );

    // Image services
    dependencyContainer.registerSingleton(
        DependencyToken.ImageStore,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new BucketStore(dependencyContainer.resolve(DependencyToken.Bucket));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.ImageGenerator,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                const model = config.get('openaiModel') || 'gpt-image-1-mini';
                return new OpenAIImageGenerator(config.get('openaiApiKey') || '', model);
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeImageGenerator,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                const model = config.get('openaiRecipeModel') || 'gpt-image-1';
                return new OpenAIImageGenerator(config.get('openaiApiKey') || '', model, 512);
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.ImageService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new ImageService(
                    dependencyContainer.resolve(DependencyToken.ImageStore),
                    dependencyContainer.resolve(DependencyToken.ImageGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeImageService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new RecipeImageService(
                    dependencyContainer.resolve(DependencyToken.ImageStore),
                    dependencyContainer.resolve(DependencyToken.RecipeImageGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );
};
