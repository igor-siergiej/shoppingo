import { useCallback, useEffect, useState } from 'react';

import { SearchResult } from '@/components/SearchResults';

import { getAuthUrl } from '../utils/config';

export const useSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult>({
        success: 'false',
        usernames: [],
        count: 0,
        query: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchUsers = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults({
                success: 'false',
                usernames: [],
                count: 0,
                query: '',
            });

            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${getAuthUrl()}/search?q=${encodeURIComponent(searchQuery)}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();

            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults({
                success: 'false',
                usernames: [],
                count: 0,
                query: '',
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            searchUsers(query);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [query, searchUsers]);

    return {
        query,
        setQuery,
        results,
        isLoading,
        error,
        clearResults: () => setResults({
            success: 'false',
            usernames: [],
            count: 0,
            query: '',
        }),
    };
};
