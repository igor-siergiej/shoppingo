import type { Recipe, User } from '@shoppingo/types';
import { type MutableRefObject, useEffect } from 'react';
import type { QueryClient } from 'react-query';
import { generateRecipeAiImage, getRecipesQuery } from '../api';
import { usePullToRefreshContext } from '../contexts/PullToRefreshContext';
import { logger } from '../utils/logger';

// Reserves room in the scroll area so the floating search bar never covers the last recipe card.
const LAYOUT_BOTTOM_INSET = '2.5rem';

const useRegisterRecipesRefresh = (refetch: () => Promise<unknown>) => {
    const { registerRefresh } = usePullToRefreshContext();

    useEffect(() => {
        return registerRefresh(async () => {
            await refetch();
        });
    }, [registerRefresh, refetch]);
};

const useReserveSearchBarInset = () => {
    useEffect(() => {
        document.documentElement.style.setProperty('--layout-bottom-inset', LAYOUT_BOTTOM_INSET);
        return () => {
            document.documentElement.style.removeProperty('--layout-bottom-inset');
        };
    }, []);
};

// fallow-ignore-next-line complexity
const useLogRecipesPageLoaded = (user: User | undefined, data: Recipe[] | undefined) => {
    const userId = user?.id;
    const username = user?.username;
    const recipeCount = data?.length ?? 0;

    useEffect(() => {
        if (!userId) return;
        logger.info('Recipes page loaded', { userId, username, recipeCount });
    }, [userId, username, recipeCount]);
};

const useLogRecipesPageError = (isError: boolean, userId: string | undefined) => {
    useEffect(() => {
        if (!isError) return;
        logger.error('Failed to load recipes', { userId });
    }, [isError, userId]);
};

const findRecipesMissingCover = (data: Recipe[] | undefined, userId: string | undefined): Recipe[] => {
    if (!data || !userId) return [];
    return data.filter((r) => !r.coverImageKey && r.ownerId === userId);
};

const useGenerateMissingCovers = (
    data: Recipe[] | undefined,
    userId: string | undefined,
    generatingRef: MutableRefObject<Set<string>>,
    queryClient: QueryClient
) => {
    useEffect(() => {
        for (const recipe of findRecipesMissingCover(data, userId)) {
            if (generatingRef.current.has(recipe.id)) continue;
            generatingRef.current.add(recipe.id);
            void generateRecipeAiImage(recipe.id).then(() =>
                queryClient.invalidateQueries(getRecipesQuery(userId as string).queryKey)
            );
        }
    }, [data, userId, queryClient, generatingRef]);
};

const useImportSharedUrlFromParams = (
    searchParams: URLSearchParams,
    setSearchParams: (params: URLSearchParams, navigateOpts?: { replace: boolean }) => void,
    onSharedUrlDetected: (url: string) => void
) => {
    useEffect(() => {
        const url = searchParams.get('sharedUrl');
        if (!url) return;

        onSharedUrlDetected(url);
        const next = new URLSearchParams(searchParams);
        next.delete('sharedUrl');
        next.delete('sharedTitle');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams, onSharedUrlDetected]);
};

interface UseRecipesPageEffectsArgs {
    user: User | undefined;
    data: Recipe[] | undefined;
    isError: boolean;
    refetch: () => Promise<unknown>;
    queryClient: QueryClient;
    generatingRef: MutableRefObject<Set<string>>;
    searchParams: URLSearchParams;
    setSearchParams: (params: URLSearchParams, navigateOpts?: { replace: boolean }) => void;
    onSharedUrlDetected: (url: string) => void;
}

export const useRecipesPageEffects = ({
    user,
    data,
    isError,
    refetch,
    queryClient,
    generatingRef,
    searchParams,
    setSearchParams,
    onSharedUrlDetected,
}: UseRecipesPageEffectsArgs) => {
    useRegisterRecipesRefresh(refetch);
    useReserveSearchBarInset();
    useLogRecipesPageLoaded(user, data);
    useLogRecipesPageError(isError, user?.id);
    useGenerateMissingCovers(data, user?.id, generatingRef, queryClient);
    useImportSharedUrlFromParams(searchParams, setSearchParams, onSharedUrlDetected);
};
