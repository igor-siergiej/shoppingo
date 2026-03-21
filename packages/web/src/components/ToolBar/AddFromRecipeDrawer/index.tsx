'use client';

import { useUser } from '@imapps/web-utils';
import type { Item, Recipe } from '@shoppingo/types';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { toast } from 'sonner';
import { addItemsBulk, getRecipesQuery } from '../../../api';
import { Button } from '../../../components/ui/button';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer';
import { RippleButton } from '../../../components/ui/ripple';

interface AddFromRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    listItems: Item[];
}

export const AddFromRecipeDrawer = ({ open, onOpenChange, listTitle, listItems }: AddFromRecipeDrawerProps) => {
    const { user } = useUser();
    const [step, setStep] = useState<'recipes' | 'ingredients'>('recipes');
    const [chosenRecipe, setChosenRecipe] = useState<Recipe | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    const { data: recipes = [] } = useQuery(
        user?.id ? getRecipesQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );

    const existingItemNames = new Set(listItems.map((item) => item.name.toLowerCase()));

    const handleSelectRecipe = (recipe: Recipe) => {
        setChosenRecipe(recipe);
        const availableIds = new Set(
            recipe.ingredients.filter((ing) => !existingItemNames.has(ing.name.toLowerCase())).map((ing) => ing.id)
        );
        setSelectedIds(availableIds);
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
                <BookOpen className="size-5" />
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
                                            const isSelected = selectedIds.has(ingredient.id);
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
                                                <button
                                                    key={ingredient.id}
                                                    onClick={() => handleToggleIngredient(ingredient.id)}
                                                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                        isSelected
                                                            ? 'bg-blue-100 border-blue-300 text-foreground'
                                                            : 'bg-muted/30 border-muted-foreground/20 text-foreground'
                                                    }`}
                                                    type="button"
                                                >
                                                    <div className="font-medium">{ingredient.name}</div>
                                                    {(ingredient.quantity !== undefined || ingredient.unit) && (
                                                        <div className="text-sm mt-1 text-muted-foreground">
                                                            {ingredient.quantity} {ingredient.unit}
                                                        </div>
                                                    )}
                                                </button>
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
