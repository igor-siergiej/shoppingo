import { DependencyToken, IDependencies, IInstances } from "./types";

export class DependencyContainer {
    private static instance: DependencyContainer;

    private singletons: IDependencies = {};

    private instances: IInstances = {};

    public static getInstance() {
        if (!this.instance) {
            this.instance = new DependencyContainer()
        }

        return this.instance;
    }

    public registerSingleton<T extends DependencyToken>(token: T, dependency: IDependencies[T]) {
        if (this.isTokenRegistered(token)) {
            throw new Error('Dependency is already registered');
        }

        this.singletons[token] = dependency
    }

    public resolve<T extends DependencyToken>(token: T, ...args: Array<unknown>): IInstances[T] {
        if (token in this.instances) {
            return this.instances[token]
        }

        if (token in this.singletons) {
            this.instances[token] = new this.singletons[token](...args)

            return this.instances[token]
        }

        throw new Error(`Dependency '${token}' not registered`);
    }

    private isTokenRegistered(token: DependencyToken) {
        return token in this.instances || token in this.singletons
    }
}

