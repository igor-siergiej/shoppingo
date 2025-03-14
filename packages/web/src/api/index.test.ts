// import getItemsResponse from '../../mocks/getItems/response.json';
// import { describe, expect, it } from 'vitest';
// import { getItems } from '.';

// describe('Given getItems', () => {
//     it('Should return the mock data', async () => {
//         fetchMock.mockResponseOnce(JSON.stringify(getItemsResponse));

//         const items = await getItems();

//         expect(items).toEqual(getItemsResponse);
//     });

//     it('Should return return a error message if the fetch fails', () => {
//         fetchMock.mockRejectOnce(new Error('tough luck bozo'));

//         expect(getItems()).rejects.toThrow(
//             new Error('Error while trying to get items: tough luck bozo')
//         );
//     });

//     it('Should return a message if the response was not ok', async () => {
//         fetchMock.mockResolvedValueOnce({
//             ok: false,
//             status: 404,
//             statusText: 'Not Found',
//         } as Response);

//         await expect(getItems()).rejects.toThrow(
//             new Error(
//                 'Error while trying to get items: Response was not ok 404: Not Found'
//             )
//         );
//     });
// });
