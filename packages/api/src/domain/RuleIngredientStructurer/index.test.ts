import { describe, expect, it } from 'bun:test';

import { RuleIngredientStructurer } from './index';

describe('RuleIngredientStructurer', () => {
    const structurer = new RuleIngredientStructurer();

    it('reports the rule strategy', () => {
        expect(structurer.strategy).toBe('rule');
    });

    it('strips unit conversions and clarifiers from real JSON-LD ingredient lines', async () => {
        const result = await structurer.structure([
            '350 g spaghetti (- 12 oz)',
            '200 g guanciale (Italian cured pork cheek) (- 7 oz)',
            '4  whole eggs',
            '100 g finely grated Pecorino Romano DOP (- about 1 cup)',
            'freshly ground black pepper (- to taste)',
        ]);

        expect(result).toEqual([
            { name: 'spaghetti', quantity: 350, unit: 'g' },
            { name: 'guanciale', quantity: 200, unit: 'g' },
            { name: 'whole eggs', quantity: 4, unit: 'pcs' },
            { name: 'finely grated Pecorino Romano DOP', quantity: 100, unit: 'g' },
            { name: 'freshly ground black pepper' },
        ]);
    });

    it('parses the quantity before stripping a leading parenthetical', async () => {
        const result = await structurer.structure(['1 (14 oz) can diced tomatoes']);

        expect(result).toEqual([{ name: 'can diced tomatoes', quantity: 1, unit: 'pcs' }]);
    });

    it('strips a trailing qualifier that has no parentheses', async () => {
        const result = await structurer.structure(['salt to taste', '2 onions, divided']);

        expect(result).toEqual([{ name: 'salt' }, { name: 'onions', quantity: 2, unit: 'pcs' }]);
    });

    it('falls back to the raw line when cleaning would leave an empty name', async () => {
        const result = await structurer.structure(['(optional)']);

        expect(result).toEqual([{ name: '(optional)' }]);
    });

    it('cleans nested parentheses and removes stray closing parens', async () => {
        const result = await structurer.structure(['guanciale (Italian (cured) pork cheek)']);

        expect(result).toEqual([{ name: 'guanciale pork cheek' }]);
    });

    it('removes unmatched opening parens left by parse-ingredient', async () => {
        const result = await structurer.structure(['spaghetti (12 oz']);

        expect(result).toEqual([{ name: 'spaghetti', quantity: 12, unit: 'oz' }]);
    });

    it('returns one entry per input line, in order', async () => {
        const result = await structurer.structure(['1/2 cup salt', '2 cloves garlic', '3 eggs']);

        expect(result).toEqual([
            { name: 'salt', quantity: 0.5, unit: 'cup' },
            { name: 'garlic', quantity: 2, unit: 'cloves' },
            { name: 'eggs', quantity: 3, unit: 'pcs' },
        ]);
    });

    it('returns an empty array for no lines', async () => {
        expect(await structurer.structure([])).toEqual([]);
    });
});
