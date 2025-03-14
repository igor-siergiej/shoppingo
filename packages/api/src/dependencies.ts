import { Database } from './database';
import { DependencyContainer } from './lib/dependencyContainer';
import { DependencyToken } from './lib/dependencyContainer/types';

export const registerDepdendencies = () => {
    const dependencyContainer = DependencyContainer.getInstance();

    dependencyContainer.registerSingleton(DependencyToken.Database, Database);
};
