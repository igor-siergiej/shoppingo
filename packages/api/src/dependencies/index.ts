// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { DependencyContainer, Logger, MongoDbConnection, ObjectStoreConnection } from '@igor-siergiej/api-utils';

import { config } from '../config';
import { AuthorizationService } from '../domain/AuthorizationService';
import { ImageService } from '../domain/ImageService';
import { ListService } from '../domain/ListService';
import { HttpAuthClient } from '../infrastructure/AuthClient';
import { BucketStore } from '../infrastructure/BucketStore';
import { GeminiImageGenerator } from '../infrastructure/GeminiImageGenerator';
import { MongoListRepository } from '../infrastructure/MongoListRepository';
import { OpenAIImageGenerator } from '../infrastructure/OpenAIImageGenerator';
import { UuidGenerator } from '../infrastructure/UuidGenerator';
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
                const provider = config.get('imageProvider') || 'gemini';

                if (provider === 'openai') {
                    const model = config.get('openaiModel') || 'gpt-image-1-mini';
                    return new OpenAIImageGenerator(config.get('openaiApiKey') || '', model);
                } else {
                    const model = config.get('geminiModel') || 'imagen-3.0-fast-001';
                    return new GeminiImageGenerator(config.get('geminiApiKey') || '', model);
                }
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
};
