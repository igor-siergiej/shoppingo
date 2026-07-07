import { describe, expect, it } from 'bun:test';
import { canonicalPair } from './index';

describe('canonicalPair', () => {
    it('sorts the two ids lexicographically regardless of argument order', () => {
        expect(canonicalPair('zeb', 'amy')).toEqual(['amy', 'zeb']);
        expect(canonicalPair('amy', 'zeb')).toEqual(['amy', 'zeb']);
    });
});
