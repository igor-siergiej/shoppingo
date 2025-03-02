import { IDatabase } from "../../database/types";

export type ConstructorOfType<T> = new (...args: Array<unknown>) => T

export enum DependencyToken {
    Database = 'Database',
    Logger = 'Logger'
}

export interface IInstances {
    [DependencyToken.Database]?: IDatabase;
    [DependencyToken.Logger]?: ILogger
}

export type IDependencies = {
    [key in keyof IInstances]?: ConstructorOfType<IInstances[key]>
}

export interface ILogger {
    debug: () => void
}

export { }
