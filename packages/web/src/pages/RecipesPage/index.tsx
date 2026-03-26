import { useUser } from '@imapps/web-utils';
import { AlertTriangle, BookOpen, ChefHat, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addRecipe, getRecipesQuery } from '../../api';
import { ListsSkeleton } from '../../components/LoadingSkeleton';
import { RecipesList } from '../../components/RecipesList';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { Input } from '../../components/ui/input';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { logger } from '../../utils/logger';

const RecipesPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sharedUrl, setSharedUrl] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const { data, isLoading, isError, refetch } = useQuery({
        ...getRecipesQuery(user?.id || ''),
        enabled: !!user?.id,
    });

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

    useEffect(() => {
        const url = searchParams.get('sharedUrl');
        if (url) {
            setSharedUrl(url);
            setDrawerOpen(true);
            const next = new URLSearchParams(searchParams);
            next.delete('sharedUrl');
            next.delete('sharedTitle');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    if (!user?.id) {
        logger.warn('Recipes page accessed without user');
        return <div>User not available</div>;
    }

    const recipes = data || [];
    const searchResults = useRecipeSearch(recipes, searchQuery);

    const yourRecipes = recipes.filter((recipe) => recipe.ownerId === user.id);
    const sharedRecipes = recipes.filter((recipe) => recipe.ownerId !== user.id);

    const handleRecipeClick = (recipeId: string) => {
        navigate(`/recipes/${recipeId}`);
    };

    const handleAddRecipe = async (
        title: string,
        ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
        _imageKey?: string,
        selectedUsers?: string[],
        link?: string,
        instructions?: string[]
    ) => {
        if (!user) {
            logger.warn('Attempted to add recipe without user');
            return;
        }

        try {
            const recipe = await addRecipe(title, user, selectedUsers || [], ingredients, link, instructions);
            logger.info('Recipe created successfully', { title, recipeId: recipe.id });
            await refetch();
            return recipe;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to create recipe', { title, error: errorMessage });
            throw error;
        }
    };

    const searchBar = (
        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes..."
                className="pl-9 pr-9"
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

    const pageContent = (
        <div className="flex flex-col">
            {searchBar}
            {searchQuery.trim() ? (
                <div>
                    <h2 className="text-lg font-semibold mb-3 text-foreground">
                        Results ({searchResults.length})
                    </h2>
                    {searchResults.length > 0 ? (
                        <RecipesList recipes={searchResults} onRecipeClick={handleRecipeClick} />
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
                    {/* Your Recipes Section */}
                    <div>
                        <h2 className="text-lg font-semibold mb-3 text-foreground">Your Recipes</h2>
                        {yourRecipes.length > 0 ? (
                            <RecipesList recipes={yourRecipes} onRecipeClick={handleRecipeClick} />
                        ) : (
                            <Empty className="flex-none justify-start p-4">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <ChefHat />
                                    </EmptyMedia>
                                    <EmptyTitle>No recipes yet</EmptyTitle>
                                    <EmptyDescription>Create your first recipe to get started</EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </div>

                    {/* Shared Recipes Section */}
                    <div>
                        <h2 className="text-lg font-semibold mb-3 text-foreground">Shared Recipes</h2>
                        {sharedRecipes.length > 0 ? (
                            <RecipesList recipes={sharedRecipes} onRecipeClick={handleRecipeClick} />
                        ) : (
                            <Empty className="flex-none justify-start p-4">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <BookOpen />
                                    </EmptyMedia>
                                    <EmptyTitle>No shared recipes</EmptyTitle>
                                    <EmptyDescription>
                                        Shared recipes will appear here when someone shares one with you
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        )}
                    </div>
                </div>
            )}
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

            <ToolBar
                onAddRecipe={handleAddRecipe}
                onRefetchRecipes={refetch}
                placeholder="Enter recipe name..."
                addRecipeDrawerOpen={drawerOpen}
                onAddRecipeDrawerOpenChange={(open) => {
                    setDrawerOpen(open);
                    if (!open) setSharedUrl('');
                }}
                addRecipeInitialLink={sharedUrl}
            />
        </>
    );
};

export default RecipesPage;
