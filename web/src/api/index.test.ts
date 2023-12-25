import getItemsResponse from '../../mocks/getItems/response.json';
import { describe, expect, it, vi } from 'vitest';
import { getItems } from '.';

vi.mock('.', () => {
    return {
        fetch: vi.fn().mockResolvedValue(getItemsResponse),
    };
});

describe('Given getItems', () => {
    it('Should return the mock data', async () => {
        const items = await getItems();

        expect(items).toEqual(getItemsResponse);
    });

    it('Should return ');
});
