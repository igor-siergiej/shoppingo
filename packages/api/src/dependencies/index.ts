// biome-ignore-all lint/correctness/noConstructorReturn: I need to figure out a better way to do this
import { Logger, MongoDbConnection, ObjectStoreConnection } from '@imapps/api-utils';
import { Client } from '@opensearch-project/opensearch';

import { config } from '../config';
import { AuthorizationService } from '../domain/AuthorizationService';
import { DailyReminderScheduler } from '../domain/DailyReminderScheduler';
import { DiscoveryCopyService } from '../domain/DiscoveryCopyService';
import { DiscoveryModerationService } from '../domain/DiscoveryModeration';
import { DiscoveryPublishService } from '../domain/DiscoveryPublish';
import { DiscoveryService } from '../domain/DiscoveryService';
import { FriendService } from '../domain/FriendService';
import { ImageService } from '../domain/ImageService';
import { LabelService } from '../domain/LabelService';
import { ListRealtimeHub } from '../domain/ListRealtimeHub';
import { ListService } from '../domain/ListService';
import { NotificationService } from '../domain/NotificationService';
import { RecipeImageService } from '../domain/RecipeImageService';
import { RecipeImportService } from '../domain/RecipeImportService';
import { RecipeService } from '../domain/RecipeService';
import { RuleIngredientStructurer } from '../domain/RuleIngredientStructurer';
import { TodoReminderService } from '../domain/TodoReminderService';
import { TodoService } from '../domain/TodoService';
import { WikibooksIngestService } from '../domain/WikibooksIngest';
import { WsTicketStore } from '../domain/WsTicketStore';
import { HttpAuthClient } from '../infrastructure/AuthClient';
import { BucketStore } from '../infrastructure/BucketStore';
import { FalImageGenerator } from '../infrastructure/FalImageGenerator';
import { FalIngredientSubstituter } from '../infrastructure/FalIngredientSubstituter';
import { FalLlmClient } from '../infrastructure/FalLlmClient';
import { FalRecipeEstimator } from '../infrastructure/FalRecipeEstimator';
import { FalRecipeExtractor } from '../infrastructure/FalRecipeExtractor';
import { FalRecipeParser } from '../infrastructure/FalRecipeParser';
import { FalRecipeTagger } from '../infrastructure/FalRecipeTagger';
import { HttpImageFetcher } from '../infrastructure/HttpImageFetcher';
import { HttpPageFetcher } from '../infrastructure/HttpPageFetcher';
import { MediaWikiCookbookSource } from '../infrastructure/MediaWikiCookbookSource';
import { MongoDiscoveryPublicationRepository } from '../infrastructure/MongoDiscoveryPublicationRepository';
import { MongoDiscoveryRecipeRepository } from '../infrastructure/MongoDiscoveryRecipeRepository';
import { MongoDiscoveryReportRepository } from '../infrastructure/MongoDiscoveryReportRepository';
import { MongoFriendRepository } from '../infrastructure/MongoFriendRepository';
import { MongoLabelRepository } from '../infrastructure/MongoLabelRepository';
import { MongoListRepository } from '../infrastructure/MongoListRepository';
import { MongoPushSubscriptionRepository } from '../infrastructure/MongoPushSubscriptionRepository';
import { MongoRecipeRepository } from '../infrastructure/MongoRecipeRepository';
import { MongoTodoRepository } from '../infrastructure/MongoTodoRepository';
import { type OpenSearchApi, OpenSearchDiscoveryIndex } from '../infrastructure/OpenSearchDiscoveryIndex';
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
    dependencyContainer.registerSingleton(DependencyToken.ListRealtimeHub, ListRealtimeHub);
    dependencyContainer.registerSingleton(DependencyToken.WsTicketStore, WsTicketStore);

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
                    dependencyContainer.resolve(DependencyToken.AuthClient),
                    dependencyContainer.resolve(DependencyToken.FriendService),
                    dependencyContainer.resolve(DependencyToken.RecipeTagger),
                    dependencyContainer.resolve(DependencyToken.IngredientSubstituter)
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
                    dependencyContainer.resolve(DependencyToken.FriendService),
                    dependencyContainer.resolve(DependencyToken.NotificationService)
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
                    dependencyContainer.resolve(DependencyToken.Logger),
                    dependencyContainer.resolve(DependencyToken.ListRepository),
                    dependencyContainer.resolve(DependencyToken.RecipeRepository),
                    dependencyContainer.resolve(DependencyToken.TodoRepository)
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
        DependencyToken.ImageFetcher,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new HttpImageFetcher();
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.FalLlmClient,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                // Reuses FAL_KEY unless a dedicated import key is set.
                return new FalLlmClient(
                    config.get('recipeImportLlmApiKey') || config.get('falKey') || '',
                    dependencyContainer.resolve(DependencyToken.Logger),
                    { model: config.get('recipeImportLlmModel') || undefined }
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeTextExtractor,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalRecipeExtractor(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeTagger,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalRecipeTagger(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.IngredientSubstituter,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalIngredientSubstituter(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeParser,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalRecipeParser(dependencyContainer.resolve(DependencyToken.FalLlmClient));
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
                // LLM-first is opt-in: injecting the parser makes it win over the three tiers.
                const llmParser = config.get('recipeImportLlmFirst')
                    ? dependencyContainer.resolve(DependencyToken.RecipeParser)
                    : undefined;
                return new RecipeImportService(
                    dependencyContainer.resolve(DependencyToken.PageFetcher),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    new RuleIngredientStructurer(),
                    dependencyContainer.resolve(DependencyToken.Logger),
                    llmExtractor,
                    llmParser,
                    dependencyContainer.resolve(DependencyToken.ImageFetcher)
                );
            }
        }
    );

    // Recipe discovery: Mongo is the library's system of record, OpenSearch a derived index over it.
    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryRecipeRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoDiscoveryRecipeRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryIndex,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                const url = config.get('opensearchUrl');
                // Fail fast rather than queue requests behind a dead engine: discovery is optional, the rest of the API is not.
                const client = url ? new Client({ node: url, requestTimeout: 5000, maxRetries: 1 }) : null;
                return new OpenSearchDiscoveryIndex(
                    client as unknown as OpenSearchApi | null,
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new DiscoveryService(
                    dependencyContainer.resolve(DependencyToken.DiscoveryRecipeRepository),
                    dependencyContainer.resolve(DependencyToken.DiscoveryIndex),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryCopyService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new DiscoveryCopyService(
                    dependencyContainer.resolve(DependencyToken.DiscoveryService),
                    dependencyContainer.resolve(DependencyToken.RecipeService),
                    dependencyContainer.resolve(DependencyToken.ImageStore),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    // User publishing and moderation of the library.
    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryPublicationRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoDiscoveryPublicationRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryReportRepository,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MongoDiscoveryReportRepository(dependencyContainer.resolve(DependencyToken.Database));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryPublishService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new DiscoveryPublishService(
                    dependencyContainer.resolve(DependencyToken.DiscoveryService),
                    dependencyContainer.resolve(DependencyToken.DiscoveryPublicationRepository),
                    dependencyContainer.resolve(DependencyToken.RecipeService),
                    dependencyContainer.resolve(DependencyToken.ImageStore),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.DiscoveryModerationService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                const admins = (config.get('discoveryAdminUserIds') ?? '')
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean);
                return new DiscoveryModerationService(
                    dependencyContainer.resolve(DependencyToken.DiscoveryService),
                    dependencyContainer.resolve(DependencyToken.DiscoveryReportRepository),
                    dependencyContainer.resolve(DependencyToken.DiscoveryPublicationRepository),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    new Set(admins),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );

    // Wikibooks Cookbook ingest: fills the library from the wiki and keeps it in step with it.
    dependencyContainer.registerSingleton(
        DependencyToken.WikibooksSource,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new MediaWikiCookbookSource(dependencyContainer.resolve(DependencyToken.Logger), {
                    userAgent: config.get('wikibooksUserAgent') || undefined,
                });
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.RecipeEstimator,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new FalRecipeEstimator(dependencyContainer.resolve(DependencyToken.FalLlmClient));
            }
        }
    );

    dependencyContainer.registerSingleton(
        DependencyToken.WikibooksIngestService,
        // @ts-expect-error - Dependency injection requires constructor return override
        class {
            constructor() {
                return new WikibooksIngestService(
                    dependencyContainer.resolve(DependencyToken.WikibooksSource),
                    dependencyContainer.resolve(DependencyToken.DiscoveryService),
                    new RuleIngredientStructurer(),
                    dependencyContainer.resolve(DependencyToken.RecipeTagger),
                    dependencyContainer.resolve(DependencyToken.RecipeEstimator),
                    dependencyContainer.resolve(DependencyToken.IdGenerator),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        }
    );
};
