'use client';

import { useUser } from '@imapps/web-utils';
import type { Item, Recipe } from '@shoppingo/types';
import { ArrowLeft, BookOpen, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import { addItemsBulk, getRecipesQuery } from '../../../api';
import { Button } from '../../../components/ui/button';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { RippleButton } from '../../../components/ui/ripple';
import { useRecipeSearch } from '../../../hooks/useRecipeSearch';
import { IngredientSelectRow } from '../../IngredientSelectRow';

interface AddFromRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    listItems: Item[];
}

export const AddFromRecipeDrawer = ({ open, onOpenChange, listTitle, listItems }: AddFromRecipeDrawerProps) => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<'recipes' | 'ingredients'>('recipes');
    const [chosenRecipe, setChosenRecipe] = useState<Recipe | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [recipeSearch, setRecipeSearch] = useState('');

    const { data: allRecipes = [] } = useQuery(
        user?.id ? getRecipesQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );
    const recipes = useRecipeSearch(allRecipes, recipeSearch);

    const existingItemNames = new Set(listItems.map((item) => item.name.toLowerCase()));

    const handleSelectRecipe = (recipe: Recipe) => {
        setChosenRecipe(recipe);
        setSelectedIds(new Set());
        setStep('ingredients');
    };

    const handleToggleIngredient = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleConfirm = async () => {
        if (!chosenRecipe || selectedIds.size === 0) return;

        try {
            setIsLoading(true);
            const selectedIngredients = chosenRecipe.ingredients.filter((ing) => selectedIds.has(ing.id));

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
            handleClose();
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to add ingredients', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep('recipes');
        setChosenRecipe(null);
        setSelectedIds(new Set());
        setRecipeSearch('');
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <RippleButton
                size="icon"
                variant="ghost"
                className="h-12 w-12 rounded-full"
                onClick={() => onOpenChange(true)}
            >
                <div className="relative w-5 h-5 flex items-center justify-center">
                    <BookOpen className="size-5" />
                    <Plus className="size-3 absolute bottom-0 right-0 bg-white rounded-full text-primary" />
                </div>
            </RippleButton>

            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader className="flex items-center gap-3">
                        {step === 'ingredients' && (
                            <button
                                onClick={() => setStep('recipes')}
                                className="p-1 hover:bg-muted rounded-md transition-colors"
                                type="button"
                                aria-label="Back to recipes"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <DrawerTitle>
                            {step === 'recipes' ? 'Choose Recipe' : `Select from ${chosenRecipe?.title}`}
                        </DrawerTitle>
                    </DrawerHeader>

                    <div className="p-4 pb-0 max-h-[60vh] overflow-y-auto">
                        {step === 'recipes' ? (
                            <div className="space-y-2">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        value={recipeSearch}
                                        onChange={(e) => setRecipeSearch(e.target.value)}
                                        placeholder="Search recipes..."
                                        className="pl-9 pr-9"
                                    />
                                    {recipeSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setRecipeSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {recipes.length === 0 ? (
                                    <p className="text-muted-foreground text-sm py-3">No recipes found</p>
                                ) : (
                                    recipes.map((recipe) => (
                                        <button
                                            key={recipe.id}
                                            onClick={() => handleSelectRecipe(recipe)}
                                            className="w-full p-3 rounded-lg border border-muted-foreground/20 hover:bg-muted/50 transition-colors text-left"
                                            type="button"
                                        >
                                            <div className="flex items-start gap-3">
                                                {recipe.coverImageKey && (
                                                    <img
                                                        src={`/api/image/${encodeURIComponent(recipe.coverImageKey)}`}
                                                        alt={recipe.title}
                                                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium truncate">{recipe.title}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {recipe.ingredients.length} ingredients
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        ) : (
                            chosenRecipe && (
                                <div className="space-y-2">
                                    {chosenRecipe.ingredients.length === 0 ? (
                                        <p className="text-muted-foreground text-sm py-3">No ingredients</p>
                                    ) : (
                                        chosenRecipe.ingredients.map((ingredient) => {
                                            const isAlreadyInList = existingItemNames.has(
                                                ingredient.name.toLowerCase()
                                            );

                                            if (isAlreadyInList) {
                                                return (
                                                    <div
                                                        key={ingredient.id}
                                                        className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/20 opacity-50"
                                                    >
                                                        <div className="font-medium line-through text-muted-foreground">
                                                            {ingredient.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Already in list
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <IngredientSelectRow
                                                    key={ingredient.id}
                                                    ingredient={ingredient}
                                                    isSelected={selectedIds.has(ingredient.id)}
                                                    onToggle={handleToggleIngredient}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {step === 'ingredients' && (
                        <DrawerFooter className="pt-4">
                            <Button onClick={handleClose} variant="outline" disabled={isLoading} type="button">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={selectedIds.size === 0 || isLoading}
                                type="button"
                            >
                                Add {selectedIds.size} items
                            </Button>
                        </DrawerFooter>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
};
