// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';

import { config } from '../config';
import { AuthorizationService } from '../domain/AuthorizationService';
import { DailyReminderScheduler } from '../domain/DailyReminderScheduler';
import { FriendService } from '../domain/FriendService';
import { ImageService } from '../domain/ImageService';
import { LabelService } from '../domain/LabelService';
import { ListService } from '../domain/ListService';
import { NotificationService } from '../domain/NotificationService';
import { RecipeImageService } from '../domain/RecipeImageService';
import { RecipeImportService } from '../domain/RecipeImportService';
import { RecipeService } from '../domain/RecipeService';
import { TodoReminderService } from '../domain/TodoReminderService';
import { TodoService } from '../domain/TodoService';
import { HttpAuthClient } from '../infrastructure/AuthClient';
import { BucketStore } from '../infrastructure/BucketStore';
import { FalImageGenerator } from '../infrastructure/FalImageGenerator';
import { FalRecipeExtractor } from '../infrastructure/FalRecipeExtractor';
import { HttpPageFetcher } from '../infrastructure/HttpPageFetcher';
import { MongoFriendRepository } from '../infrastructure/MongoFriendRepository';
import { MongoLabelRepository } from '../infrastructure/MongoLabelRepository';
import { MongoListRepository } from '../infrastructure/MongoListRepository';
import { MongoPushSubscriptionRepository } from '../infrastructure/MongoPushSubscriptionRepository';
import { MongoRecipeRepository } from '../infrastructure/MongoRecipeRepository';
import { MongoTodoRepository } from '../infrastructure/MongoTodoRepository';
import { UuidGenerator } from '../infrastructure/UuidGenerator';
import { WebPushSender } from '../infrastructure/WebPushSender';
import * as RecipeHandlers from '../interfaces/RecipeHandlers';
import { dependencyContainer } from './container';
import { DependencyToken } from './types';

export { dependencyContainer };

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
        DependencyToken.PushSubscriptionRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoPushSubscriptionRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.WebPushSender,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new WebPushSender(
                    config.get('vapidPublicKey'),
                    config.get('vapidPrivateKey'),
                    config.get('vapidSubject'),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.NotificationService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new NotificationService(
                    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository),
                    dependencyContainer.resolve(DependencyToken.WebPushSender),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
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
                    dependencyContainer.resolve(DependencyToken.AuthorizationService),
                    dependencyContainer.resolve(DependencyToken.NotificationService),
                    dependencyContainer.resolve(DependencyToken.FriendService)
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
                    dependencyContainer.resolve(DependencyToken.RecipeImageService),
                    dependencyContainer.resolve(DependencyToken.AuthClient)
                );
            }
        }
    );

    // Todo services
    dependencyContainer.registerSingleton(
        DependencyToken.TodoRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoTodoRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.TodoService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new TodoService(
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.FriendService)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.TodoReminderService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new TodoReminderService(
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.PushSubscriptionRepository),
                    dependencyContainer.resolve(DependencyToken.WebPushSender),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DailyReminderScheduler,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new DailyReminderScheduler(dependencyContainer.resolve(DependencyToken.TodoReminderService), {
                    logger: dependencyContainer.resolve(DependencyToken.Logger),
                });
            }
        }
    );

    // Friend services
    dependencyContainer.registerSingleton(
        DependencyToken.FriendRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoFriendRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.FriendService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FriendService(
                    dependencyContainer.resolve(DependencyToken.FriendRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    // Label services
    dependencyContainer.registerSingleton(
        DependencyToken.LabelRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoLabelRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.LabelService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new LabelService(
                    dependencyContainer.resolve(DependencyToken.LabelRepository),
                    dependencyContainer.resolve(DependencyToken.TodoRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
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
                return new FalImageGenerator(config.get('falKey') || '', {
                    model: config.get('falModel') || 'fal-ai/flux/schnell',
                    imageSize: 'square',
                    outputFormat: 'png',
                    outputSize: 256,
                });
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeImageGenerator,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalImageGenerator(config.get('falKey') || '', {
                    model: config.get('falRecipeModel') || 'fal-ai/flux/schnell',
                    imageSize: 'square_hd',
                    outputFormat: 'jpeg',
                    outputSize: 512,
                });
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

    // Recipe import (scrape a recipe URL into an editable draft)
    dependencyContainer.registerSingleton(
        DependencyToken.PageFetcher,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new HttpPageFetcher();
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeTextExtractor,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Reuses FAL_KEY unless a dedicated import key is set.
                return new FalRecipeExtractor(config.get('recipeImportLlmApiKey') || config.get('falKey') || '', {
                    ...(config.get('recipeImportLlmModel') && { model: config.get('recipeImportLlmModel') }),
                });
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeImportService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Tier 3 is opt-in: only inject the LLM extractor when explicitly enabled.
                const llmExtractor = config.get('recipeImportLlmEnabled')
                    ? dependencyContainer.resolve(DependencyToken.RecipeTextExtractor)
                    : undefined;
                return new RecipeImportService(
                    dependencyContainer.resolve(DependencyToken.PageFetcher),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    llmExtractor
                );
            }
        }
    );
};
