import { useUser } from '@imapps/web-utils';
import { AlertTriangle, ChefHat, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateRecipeAiImage, getRecipesQuery } from '../../api';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import { RecipesList } from '../../components/RecipesList';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Input } from '../../components/ui/input';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshContext';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { logger } from '../../utils/logger';

// Several independent effects (logging, error logging, background AI-image backfill, shared-url
// redirect) plus search/tag-filter state; each effect is already a single, separately-testable concern.
// fallow-ignore-next-line complexity
const RecipesPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const generatingRef = useRef<Set<string>>(new Set());
    const { data, isLoading, isError, refetch } = useQuery({
        ...getRecipesQuery(user?.id || ''),
        enabled: !!user?.id,
    });
    const { registerRefresh } = usePullToRefreshContext();

    useEffect(() => {
        return registerRefresh(async () => {
            await refetch();
        });
    }, [registerRefresh, refetch]);

    // fallow-ignore-next-line complexity
    useEffect(() => {
        if (user?.id) {
            logger.info('Recipes page loaded', {
                userId: user.id,
                username: user.username,
                recipeCount: data?.length || 0,
            });
        }
    }, [user?.id, user?.username, data?.length]);

    useEffect(() => {
        if (isError) {
            logger.error('Failed to load recipes', { userId: user?.id });
        }
    }, [isError, user?.id]);

    // fallow-ignore-next-line complexity
    useEffect(() => {
        if (!data || !user?.id) return;
        const missing = data.filter((r) => !r.coverImageKey && r.ownerId === user.id);
        for (const recipe of missing) {
            if (generatingRef.current.has(recipe.id)) continue;
            generatingRef.current.add(recipe.id);
            void generateRecipeAiImage(recipe.id).then(() =>
                queryClient.invalidateQueries(getRecipesQuery(user.id).queryKey)
            );
        }
    }, [data, user?.id, queryClient]);

    useEffect(() => {
        const url = searchParams.get('sharedUrl');
        if (url) {
            navigate(`/recipes/new?sharedUrl=${encodeURIComponent(url)}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const recipes = data || [];
    const textFiltered = useRecipeSearch(recipes, searchQuery);
    const allTags = useMemo(() => {
        const set = new Set<string>();
        for (const recipe of recipes) {
            for (const tag of recipe.tags ?? []) set.add(tag);
        }
        return Array.from(set).sort();
    }, [recipes]);
    const searchResults =
        selectedTags.length === 0
            ? textFiltered
            : textFiltered.filter((recipe) => selectedTags.every((tag) => recipe.tags?.includes(tag)));
    const toggleTag = (tag: string) =>
        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

    if (!user?.id) {
        logger.warn('Recipes page accessed without user');
        return <div>User not available</div>;
    }

    const handleRecipeClick = (recipeId: string) => {
        navigate(`/recipes/${recipeId}`);
    };

    const searchBar = (
        <div className="relative mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                name="recipe-search"
                autoComplete="off"
                inputMode="search"
            />
            {searchQuery && (
                <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );

    const tagFilterRow = allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs ${
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
    );

    const pageContent = (
        <div className="flex flex-col">
            {searchQuery.trim() ? (
                <div>
                    <h2 className="text-lg font-semibold mb-3 text-foreground">Results ({searchResults.length})</h2>
                    {searchResults.length > 0 ? (
                        <RecipesList
                            recipes={searchResults}
                            currentUserId={user.id}
                            onRecipeClick={handleRecipeClick}
                        />
                    ) : (
                        <Empty className="flex-none justify-start p-4">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Search />
                                </EmptyMedia>
                                <EmptyTitle>No recipes found</EmptyTitle>
                                <EmptyDescription>Try a different search term</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
            ) : (
                <div className="flex flex-col space-y-6">
                    {searchResults.length > 0 ? (
                        <RecipesList
                            recipes={searchResults}
                            currentUserId={user.id}
                            onRecipeClick={handleRecipeClick}
                        />
                    ) : recipes.length === 0 ? (
                        <Empty className="flex-none justify-start p-4">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ChefHat />
                                </EmptyMedia>
                                <EmptyTitle>No recipes yet</EmptyTitle>
                                <EmptyDescription>
                                    Create your first recipe, or ask a friend to share one with you
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <Empty className="flex-none justify-start p-4">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ChefHat />
                                </EmptyMedia>
                                <EmptyTitle>No recipes match these tags</EmptyTitle>
                                <EmptyDescription>Clear a tag filter to see more recipes</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                </div>
            )}
            {searchBar}
            {tagFilterRow}
        </div>
    );

    const errorPageContent = (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center gap-3 text-destructive mb-3">
                <AlertTriangle className="h-6 w-6" />
                <span className="font-semibold">Unable to load your recipes</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">Please check your connection and try again.</p>
            <Button
                variant="default"
                onClick={() => {
                    void refetch();
                }}
            >
                Retry
            </Button>
        </div>
    );

    return (
        <>
            {isError && errorPageContent}
            {isLoading && <ListsSkeleton />}
            {!isLoading && !isError && pageContent}

            <ToolBar placeholder="Enter recipe name..." />
        </>
    );
};

export default RecipesPage;
