import { Logger, MongoDbConnection } from '@igor-siergiej/api-utils';
import { List } from '@shoppingo/types';

import { IBucket } from '../bucket/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger',
    Bucket = 'Bucket'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
    [DependencyToken.Bucket]: IBucket;
};

export enum CollectionNames {
    List = 'list'
}
