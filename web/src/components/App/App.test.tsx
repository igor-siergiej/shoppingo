import App from './App';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from 'react-query';
import getItemsResponse from '../../../mocks/getItems/response.json';

vi.doMock('../src/api', async () => {
    return {
        getItems: vi.fn().mockResolvedValue(getItemsResponse),
    };
});

describe.skip('Given the main page', () => {
    it('Should display the item names', async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <App />
            </QueryClientProvider>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('ham')).toBeInTheDocument();
        });
    });
});
