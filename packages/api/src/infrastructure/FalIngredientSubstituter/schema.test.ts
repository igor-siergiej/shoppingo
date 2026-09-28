import { describe, expect, it } from 'bun:test';

import { substitutesSchema } from './schema';

const parse = (input: unknown) => substitutesSchema.parse(input);

describe('substitutesSchema', () => {
    it('keeps a valid substitutes array as-is', () => {
        expect(parse({ substitutes: ['margarine', 'coconut oil'] })).toEqual({
            substitutes: ['margarine', 'coconut oil'],
        });
    });

    it('coerces missing or wrong-typed substitutes to an empty array', () => {
        expect(parse({ substitutes: 'not-an-array' })).toEqual({ substitutes: [] });
        expect(parse({})).toEqual({ substitutes: [] });
    });

    it('drops non-string entries from the array', () => {
        expect(parse({ substitutes: ['margarine', 2, 'coconut oil'] })).toEqual({
            substitutes: ['margarine', 'coconut oil'],
        });
    });
});
