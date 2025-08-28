import { Logger, MongoDbConnection } from '@igor-siergiej/api-utils';
import { List } from '@shoppingo/types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Collections = {
    [CollectionNames.List]: List;
};

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger'
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Dependencies = {
    [DependencyToken.Database]: MongoDbConnection<Collections>;
    [DependencyToken.Logger]: Logger;
};

export enum CollectionNames {
    List = 'list'
}
