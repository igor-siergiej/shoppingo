import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { QueryClientProvider, QueryClient } from 'react-query';

jest.mock('../src/api', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getItemsResponse = require('../mocks/getItems/response.json');

    return {
        getItems: jest.fn().mockResolvedValue(getItemsResponse),
    };
});

describe('Given the main page', () => {
    it('Should display the item names', async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <App />
            </QueryClientProvider>
        );
        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('ham')).toBeInTheDocument();
        });
    });
});
