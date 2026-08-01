import { useUser } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRecipesQuery } from '../../api';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import { RetryErrorState } from '../../components/RetryErrorState';
import ToolBar from '../../components/ToolBar';
import { useAddRecipeHandler } from '../../hooks/useAddRecipeHandler';
import { useRecipeMutations } from '../../hooks/useRecipeMutations';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { useRecipesPageEffects } from '../../hooks/useRecipesPageEffects';
import { logger } from '../../utils/logger';
import { RecipeMainContent } from './RecipeMainContent';
import { RecipeSearchBar } from './RecipeSearchBar';

const partitionByOwner = (recipes: Recipe[], userId: string): { yourRecipes: Recipe[]; sharedRecipes: Recipe[] } => ({
    yourRecipes: recipes.filter((recipe) => recipe.ownerId === userId),
    sharedRecipes: recipes.filter((recipe) => recipe.ownerId !== userId),
});

// fallow-ignore-next-line complexity
const RecipesPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { createRecipe } = useRecipeMutations(user ?? undefined);
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sharedUrl, setSharedUrl] = useState('');
    const [autoImport, setAutoImport] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const generatingRef = useRef<Set<string>>(new Set());
    const userId = user?.id;
    const { data, isLoading, isError, refetch } = useQuery({
        ...getRecipesQuery(userId || ''),
        enabled: Boolean(userId),
    });

    const handleAddRecipe = useAddRecipeHandler({ user, createRecipe, refetch, queryClient, generatingRef });

    const handleSharedUrlDetected = (url: string) => {
        setSharedUrl(url);
        setAutoImport(true);
        setDrawerOpen(true);
    };

    useRecipesPageEffects({
        user,
        data,
        isError,
        refetch,
        queryClient,
        generatingRef,
        searchParams,
        setSearchParams,
        onSharedUrlDetected: handleSharedUrlDetected,
    });

    const recipes = data || [];
    const searchResults = useRecipeSearch(recipes, searchQuery);

    if (!userId) {
        logger.warn('Recipes page accessed without user');
        return <div>User not available</div>;
    }

    const handleRecipeClick = (recipeId: string) => {
        navigate(`/recipes/${recipeId}`);
    };

    const handleAddRecipeDrawerOpenChange = (open: boolean) => {
        setDrawerOpen(open);
        if (open) return;
        setSharedUrl('');
        setAutoImport(false);
    };

    const { yourRecipes, sharedRecipes } = partitionByOwner(recipes, user.id);
    const isSearching = Boolean(searchQuery.trim());
    const showContent = !isLoading && !isError;
    const showToolBar = !isSearchFocused && !isSearching;

    return (
        <>
            {isError && <RetryErrorState message="Unable to load your recipes" onRetry={() => void refetch()} />}
            {isLoading && <ListsSkeleton />}

            {showContent && (
                <>
                    <RecipeMainContent
                        isSearching={isSearching}
                        searchResults={searchResults}
                        yourRecipes={yourRecipes}
                        sharedRecipes={sharedRecipes}
                        onRecipeClick={handleRecipeClick}
                    />
                    <RecipeSearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </>
            )}

            {showToolBar && (
                <ToolBar
                    onAddRecipe={handleAddRecipe}
                    placeholder="Enter recipe name..."
                    addRecipeDrawerOpen={drawerOpen}
                    onAddRecipeDrawerOpenChange={handleAddRecipeDrawerOpenChange}
                    addRecipeInitialLink={sharedUrl}
                    addRecipeAutoImport={autoImport}
                />
            )}
        </>
    );
};

export default RecipesPage;
