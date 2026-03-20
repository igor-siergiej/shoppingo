'use client';

import { useUser } from '@imapps/web-utils';
import type { Ingredient } from '@shoppingo/types';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { deleteRecipe, getRecipeQuery, updateRecipe } from '../../api';
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
import { Skeleton } from '../../components/ui/skeleton';
import { useConfirmation } from '../../hooks/useConfirmation';
import { logger } from '../../utils/logger';
import { CoverImageSection } from './CoverImageSection';
import { ErrorState } from './ErrorState';
import { IngredientsSection } from './IngredientsSection';
import { RecipeDetailHeader } from './RecipeDetailHeader';
import { UserManagementSection } from './UserManagementSection';

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

    const handleBackClick = () => {
        navigate('/recipes');
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

    const handleImageUpdate = async (imageKey: string) => {
        if (!recipe) return;

        try {
            await updateRecipe(recipeId, recipe.title, recipe.ingredients, imageKey);
            await refetch();
            logger.info('Recipe cover image updated', { recipeId, imageKey });
        } catch (error) {
            const err = error as { message?: string };
            throw err;
        }
    };

    const handleImageDelete = async () => {
        if (!recipe) return;

        try {
            await updateRecipe(recipeId, recipe.title, recipe.ingredients, undefined);
            await refetch();
            logger.info('Recipe cover image deleted', { recipeId });
        } catch (error) {
            const err = error as { message?: string };
            throw err;
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
                    <div className="flex items-center gap-3 p-4 border-b flex-shrink-0">
                        <button
                            onClick={handleBackClick}
                            className="p-1 hover:bg-muted rounded-md transition-colors"
                            aria-label="Go back"
                            type="button"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-xl font-semibold truncate">{recipe.title}</h1>
                        {isOwner && (
                            <button
                                onClick={handleDeleteRecipe}
                                className="ml-auto p-1 hover:bg-destructive hover:bg-opacity-10 rounded-md transition-colors text-destructive"
                                aria-label="Delete recipe"
                                type="button"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-6">
                            <RecipeDetailHeader
                                recipe={recipe}
                                isOwner={isOwner}
                                isEditingTitle={isEditingTitle}
                                editedTitle={editedTitle}
                                onEditingTitleChange={setIsEditingTitle}
                                onEditedTitleChange={setEditedTitle}
                                onSaveTitle={handleSaveTitle}
                            />

                            <CoverImageSection
                                recipe={recipe}
                                isOwner={isOwner}
                                onImageUpdate={handleImageUpdate}
                                onImageDelete={handleImageDelete}
                            />

                            <IngredientsSection
                                recipe={recipe}
                                isOwner={isOwner}
                                onUpdateIngredients={handleUpdateIngredients}
                            />

                            {recipe.users.length > 0 && (
                                <UserManagementSection
                                    recipe={recipe}
                                    isOwner={isOwner}
                                    onUserAdded={() => void refetch()}
                                    onUserRemoved={() => void refetch()}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

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
