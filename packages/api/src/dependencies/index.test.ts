import { describe, expect, it } from 'bun:test';

import '../test-setup';
import { dependencyContainer, registerDepdendencies } from './index';
import { DependencyToken } from './types';

// The container builds every dependency with `new ctor()`, so a factory that is not constructible only fails when it
// is first resolved: at startup in production. Resolving everything here makes that a test failure instead.
describe('dependency registration', () => {
    registerDepdendencies();
    // Some repositories touch their collection while being constructed; give the shared connection one that accepts anything.
    Object.assign(dependencyContainer.resolve(DependencyToken.Database), {
        getCollection: () => ({ createIndex: async () => 'index' }),
    });

    it.each(Object.values(DependencyToken))('resolves %s to an object without connecting to anything', (token) => {
        const resolved = dependencyContainer.resolve(token as never);

        expect(resolved).toBeDefined();
        expect(resolved).not.toBeNull();
    });

    it('wires services to the same shared instances', () => {
        expect(dependencyContainer.resolve(DependencyToken.ListService)).toBe(
            dependencyContainer.resolve(DependencyToken.ListService)
        );
    });
});
