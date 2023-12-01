import { getItems } from '.';
import getItemsResponse from '../../mocks/getItems/response.json';

jest.mock('.', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getItemsResponse = require('../../mocks/getItems/response.json');

    return {
        getItems: jest.fn().mockResolvedValue(getItemsResponse)
    };
});

describe('When getItems function is called', () => {
    it('Should return the mock data', async () => {
        const items = await getItems();

        expect(items).toEqual(getItemsResponse);
    });
});
