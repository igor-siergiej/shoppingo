'use client';

import { useUser } from '@imapps/web-utils';
import type { Ingredient } from '@shoppingo/types';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { addItemsBulk, deleteRecipe, getListsQuery, getRecipeQuery, updateRecipe } from '../../api';
import ToolBar from '../../components/ToolBar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useConfirmation } from '../../hooks/useConfirmation';
import { logger } from '../../utils/logger';
import { CoverImageSection } from './CoverImageSection';
import { ErrorState } from './ErrorState';
import { IngredientSelectSection } from './IngredientSelectSection';
import { IngredientsSection } from './IngredientsSection';
import { InstructionsSection } from './InstructionsSection';

const RecipeDetailPage = () => {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { confirm, isOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirmation();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [editedLink, setEditedLink] = useState('');

    const {
        data: recipe,
        isLoading,
        isError,
        refetch,
    } = useQuery(recipeId ? getRecipeQuery(recipeId) : { queryKey: [], queryFn: async () => null });

    const { data: lists = [] } = useQuery(
        user?.id ? getListsQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );

    const isOwner = recipe && user && recipe.ownerId === user.id;

    useEffect(() => {
        if (recipe) {
            setEditedTitle(recipe.title);
            setEditedLink(recipe.link ?? '');
            logger.info('Recipe detail page loaded', {
                recipeId,
                title: recipe.title,
                isOwner,
                ingredientCount: recipe.ingredients.length,
            });
        }
    }, [recipe, recipeId, isOwner]);

    if (!recipeId) {
        return <div className="text-center py-8 text-muted-foreground">Invalid recipe ID</div>;
    }

    const handleGoBack = () => {
        navigate('/recipes');
    };

    const handleAddIngredient = async (name: string, quantity?: number, unit?: string) => {
        if (!recipe) return;

        const newIngredient: Ingredient = {
            id: `temp-${Date.now()}`,
            name,
            ...(quantity !== undefined && { quantity }),
            ...(unit !== undefined && { unit }),
        };

        const updated = [...recipe.ingredients, newIngredient];

        try {
            await updateRecipe(recipeId, recipe.title, updated);
            await refetch();
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to add ingredient', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        }
    };

    const handleSaveTitle = async () => {
        if (!recipe || editedTitle.trim() === recipe.title) {
            setIsEditingTitle(false);
            return;
        }

        try {
            await updateRecipe(recipeId, editedTitle, recipe.ingredients);
            await refetch();
            setIsEditingTitle(false);
            toast.success('Recipe title updated', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            logger.info('Recipe title updated', { recipeId, newTitle: editedTitle });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to update recipe title', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        }
    };

    const handleSaveLink = async () => {
        if (!recipe) return;
        try {
            await updateRecipe(
                recipeId,
                recipe.title,
                recipe.ingredients,
                undefined,
                editedLink.trim() || undefined,
                recipe.instructions
            );
            await refetch();
            setIsEditingLink(false);
            toast.success('Recipe link updated', {
                style: { backgroundColor: '#10b981', color: '#ffffff', border: 'none' },
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to update link', {
                style: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none' },
            });
        }
    };

    const handleSaveInstructions = async (instructions: string[]) => {
        if (!recipe) return;
        try {
            await updateRecipe(
                recipeId,
                recipe.title,
                recipe.ingredients,
                undefined,
                recipe.link,
                instructions.length > 0 ? instructions : undefined
            );
            await refetch();
            toast.success('Instructions updated', {
                style: { backgroundColor: '#10b981', color: '#ffffff', border: 'none' },
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to update instructions', {
                style: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none' },
            });
        }
    };

    const handleUpdateIngredients = async (ingredients: Ingredient[]) => {
        if (!recipe) return;

        try {
            await updateRecipe(recipeId, recipe.title, ingredients);
            await refetch();
            toast.success('Ingredients updated', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            logger.info('Recipe ingredients updated', { recipeId, ingredientCount: ingredients.length });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to update ingredients', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        }
    };

    const handleDeleteRecipe = () => {
        if (!recipe) return;

        confirm({
            title: 'Delete Recipe?',
            description: `Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`,
            actionLabel: 'Delete Recipe',
            onConfirm: async () => {
                try {
                    await deleteRecipe(recipeId);
                    logger.info('Recipe deleted', { recipeId, title: recipe.title });
                    toast.success('Recipe deleted successfully', {
                        style: {
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                        },
                    });
                    navigate('/recipes');
                } catch (error) {
                    const err = error as { message?: string };
                    toast.error(err.message || 'Failed to delete recipe', {
                        style: {
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                        },
                    });
                }
            },
        });
    };

    const handleConfirmAddToList = async (listTitle: string, ingredientIds: string[]) => {
        if (!recipe) return;

        try {
            const selectedIngredients = recipe.ingredients.filter((ing) => ingredientIds.includes(ing.id));

            const result = await addItemsBulk(
                listTitle,
                selectedIngredients.map((ing) => ({
                    itemName: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit,
                }))
            );

            toast.success(`${result.added} items added, ${result.skipped} skipped`, {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });

            await queryClient.invalidateQueries([listTitle]);
            setIsSelectMode(false);
            logger.info('Ingredients added to list', {
                recipeId,
                listTitle,
                added: result.added,
                skipped: result.skipped,
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to add ingredients to list', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        }
    };

    return (
        <div className="flex flex-col h-full">
            {isLoading && (
                <div className="flex-1 p-4">
                    <Skeleton className="h-8 w-32 mb-4" />
                    <Skeleton className="h-48 w-full mb-4" />
                    <Skeleton className="h-32 w-full" />
                </div>
            )}

            {isError && <ErrorState onRetry={() => void refetch()} />}

            {!isLoading && !isError && recipe && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
                            <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="flex-1"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleSaveTitle}>
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                            <h1 className="text-xl font-semibold truncate flex-1">{recipe.title}</h1>
                            {recipe.link && (
                                <a
                                    href={recipe.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                                    aria-label="Open original recipe"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Recipe
                                </a>
                            )}
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => setIsEditingTitle(true)}
                                        className="p-1 hover:bg-muted rounded-md transition-colors"
                                        aria-label="Edit recipe title"
                                        type="button"
                                    >
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={handleDeleteRecipe}
                                        className="p-1 hover:bg-destructive hover:bg-opacity-10 rounded-md transition-colors text-destructive"
                                        aria-label="Delete recipe"
                                        type="button"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-6">
                            {isSelectMode ? (
                                <IngredientSelectSection
                                    recipe={recipe}
                                    lists={lists}
                                    onCancel={() => setIsSelectMode(false)}
                                    onConfirm={handleConfirmAddToList}
                                />
                            ) : (
                                <>
                                    <CoverImageSection
                                        recipe={recipe}
                                        isOwner={isOwner}
                                        onImageChange={() => void refetch()}
                                    />

                                    {isOwner && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                                Recipe Link
                                            </p>
                                            {isEditingLink ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="url"
                                                        value={editedLink}
                                                        onChange={(e) => setEditedLink(e.target.value)}
                                                        placeholder="https://..."
                                                        className="flex-1"
                                                        autoFocus
                                                    />
                                                    <Button size="sm" onClick={handleSaveLink}>
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsEditingLink(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsEditingLink(true)}
                                                >
                                                    {recipe.link ? 'Edit Link' : 'Add Link'}
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    <IngredientsSection
                                        recipe={recipe}
                                        isOwner={isOwner}
                                        onUpdateIngredients={handleUpdateIngredients}
                                    />

                                    <InstructionsSection
                                        instructions={recipe.instructions ?? undefined}
                                        isOwner={isOwner}
                                        onSave={handleSaveInstructions}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ToolBar
                onAddIngredient={isOwner ? handleAddIngredient : undefined}
                handleGoBack={handleGoBack}
                onToggleSelectMode={() => setIsSelectMode((v) => !v)}
            />

            <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmConfig?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>
                            {confirmConfig?.cancelLabel || 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {confirmConfig?.actionLabel || 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default RecipeDetailPage;
