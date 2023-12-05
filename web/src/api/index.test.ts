import getItemsResponse from '../../mocks/getItems/response.json';
import { describe, expect, it, vi } from 'vitest';
import { getItems } from '.';

vi.mock('.', () => {
    return {
        getItems: vi.fn().mockResolvedValue(getItemsResponse),
    };
});

describe('When getItems function is called', () => {
    it('Should return the mock data', async () => {
        const items = await getItems();

        expect(items).toEqual(getItemsResponse);
    });
});
