'use client';

import { useUser } from '@imapps/web-utils';
import type { Ingredient } from '@shoppingo/types';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteRecipe, getRecipeQuery, updateRecipe } from '../../api';
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
import { IngredientsSection } from './IngredientsSection';

const RecipeDetailPage = () => {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const { confirm, isOpen, config: confirmConfig, handleConfirm, handleCancel } = useConfirmation();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');

    const {
        data: recipe,
        isLoading,
        isError,
        refetch,
    } = useQuery(recipeId ? getRecipeQuery(recipeId) : { queryKey: [], queryFn: async () => null });

    const isOwner = recipe && user && recipe.ownerId === user.id;

    useEffect(() => {
        if (recipe) {
            setEditedTitle(recipe.title);
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
            toast.success('Ingredient added', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
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

    return (
        <div className="flex flex-col h-full pb-28">
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
                            <CoverImageSection recipe={recipe} />

                            <IngredientsSection
                                recipe={recipe}
                                isOwner={isOwner}
                                onUpdateIngredients={handleUpdateIngredients}
                            />
                        </div>
                    </div>
                </div>
            )}

            <ToolBar onAddIngredient={isOwner ? handleAddIngredient : undefined} handleGoBack={handleGoBack} />

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
