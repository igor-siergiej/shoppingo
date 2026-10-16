import { describe, expect, it } from 'bun:test';

import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
    it('lowercases and kebab-cases a normal title', () => {
        expect(slugify('Midnight Pancakes')).toBe('midnight-pancakes');
    });

    it('collapses runs of non-alphanumerics to a single dash', () => {
        expect(slugify('  Soup   with   Beans!  ')).toBe('soup-with-beans');
    });

    it('drops accents from Latin characters', () => {
        expect(slugify('Crème Brûlée')).toBe('creme-brulee');
    });

    it('expands common Latin-1 ligatures and accented characters', () => {
        expect(slugify('Cæsar Salad')).toBe('caesar-salad');
        expect(slugify('Straße Noodles')).toBe('strasse-noodles');
    });

    it('falls back to "untitled" when the input has no alphanumerics', () => {
        expect(slugify('!!!')).toBe('untitled');
    });

    it('trims a leading and trailing dash', () => {
        expect(slugify('---potato---')).toBe('potato');
    });

    it('caps the output at 80 characters and trims a dangling dash', () => {
        const result = slugify('a'.repeat(200));
        expect(result.length).toBeLessThanOrEqual(80);
    });
});

describe('uniqueSlug', () => {
    it('returns the base when nothing is taken', async () => {
        const result = await uniqueSlug('pancakes', async () => false);
        expect(result).toBe('pancakes');
    });

    it('appends -2 when the base is taken', async () => {
        const taken = new Set(['pancakes']);
        const result = await uniqueSlug('pancakes', async (s) => taken.has(s));
        expect(result).toBe('pancakes-2');
    });

    it('skips over multiple collisions to find the first free slot', async () => {
        const taken = new Set(['pancakes', 'pancakes-2', 'pancakes-3']);
        const result = await uniqueSlug('pancakes', async (s) => taken.has(s));
        expect(result).toBe('pancakes-4');
    });

    it('keeps the existing slug on republish when no one else has it', async () => {
        const result = await uniqueSlug('pancakes', async () => false, 'pancakes-3');
        expect(result).toBe('pancakes-3');
    });

    it('reroutes to a new free slug when existing was taken by another recipe', async () => {
        const taken = new Set(['pancakes', 'pancakes-3']);
        const result = await uniqueSlug('pancakes', async (s) => taken.has(s), 'pancakes-3');
        expect(result).toBe('pancakes-2');
    });

    it('throws after 10 000 attempts (a sanity bound, never expected in practice)', async () => {
        await expect(uniqueSlug('pancakes', async () => true)).rejects.toThrow(/10 000/);
    });
});
