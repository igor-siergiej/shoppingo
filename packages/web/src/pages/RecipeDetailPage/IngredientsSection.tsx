import type { Ingredient, Recipe } from '@shoppingo/types';
import { useState } from 'react';
import IngredientItem from '../../components/IngredientItem';

interface IngredientsSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onUpdateIngredients: (ingredients: Ingredient[]) => Promise<void>;
}

export const IngredientsSection = ({ recipe, isOwner = false, onUpdateIngredients }: IngredientsSectionProps) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>(recipe.ingredients);

    const handleDeleteIngredient = async (id: string) => {
        const updated = ingredients.filter((ing) => ing.id !== id);
        setIngredients(updated);
        await onUpdateIngredients(updated);
    };

    const handleEditIngredient = async (id: string, updated: Ingredient) => {
        const newIngredients = ingredients.map((ing) => (ing.id === id ? updated : ing));
        setIngredients(newIngredients);
        await onUpdateIngredients(newIngredients);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ingredients ({ingredients.length})</h3>

            {ingredients.length === 0 ? (
                <p className="text-muted-foreground text-sm py-3">No ingredients added yet</p>
            ) : (
                <div className="space-y-2">
                    {ingredients.map((ingredient) => (
                        <IngredientItem
                            key={ingredient.id}
                            ingredient={ingredient}
                            onDelete={handleDeleteIngredient}
                            onEdit={handleEditIngredient}
                            isOwner={isOwner}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
