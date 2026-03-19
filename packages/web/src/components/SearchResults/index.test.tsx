import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type SearchResult, SearchResults } from './index';

vi.mock('../../hooks/useClickOutside', () => ({ default: vi.fn() }));

beforeEach(() => {
    if (!window.ResizeObserver) {
        window.ResizeObserver = vi.fn(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    }
});

describe('SearchResults', () => {
    const mockOnSelect = vi.fn();
    const mockOnClose = vi.fn();

    const mockResults: SearchResult = {
        success: 'true',
        usernames: ['alice', 'bob'],
        count: 2,
        query: 'al',
    };

    beforeEach(() => {
        mockOnSelect.mockClear();
        mockOnClose.mockClear();
    });

    it('shows spinner and "Searching..." text when isLoading=true', () => {
        render(
            <SearchResults
                results={mockResults}
                isLoading={true}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="test"
            />
        );

        expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('shows error text when error prop is set', () => {
        render(
            <SearchResults
                results={mockResults}
                isLoading={false}
                error="Network error"
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="test"
            />
        );

        expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows "at least 2 characters" message when query length is 1', () => {
        render(
            <SearchResults
                results={mockResults}
                isLoading={false}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="a"
            />
        );

        expect(screen.getByText('Please enter at least 2 characters to search')).toBeInTheDocument();
    });

    it('renders null when results.usernames is empty with valid query', () => {
        const { container } = render(
            <SearchResults
                results={{ ...mockResults, usernames: [] }}
                isLoading={false}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="test"
            />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders usernames when results.usernames has items', () => {
        render(
            <SearchResults
                results={mockResults}
                isLoading={false}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="al"
            />
        );

        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('calls onSelect with username when clicking a result', async () => {
        const user = userEvent.setup();
        render(
            <SearchResults
                results={mockResults}
                isLoading={false}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="al"
            />
        );

        const aliceButton = screen.getByRole('button', { name: /alice/i });
        await user.click(aliceButton);

        expect(mockOnSelect).toHaveBeenCalledWith('alice');
    });

    it('calls onSelect with correct username for each result', async () => {
        const user = userEvent.setup();
        render(
            <SearchResults
                results={mockResults}
                isLoading={false}
                error={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                query="al"
            />
        );

        const bobButton = screen.getByRole('button', { name: /bob/i });
        await user.click(bobButton);

        expect(mockOnSelect).toHaveBeenCalledWith('bob');
    });
});
