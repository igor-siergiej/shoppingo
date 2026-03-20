import type { Ingredient, Recipe } from '@shoppingo/types';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import IngredientItem from '../../components/IngredientItem';
import { QuantityUnitField } from '../../components/QuantityUnitField';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface IngredientsSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onUpdateIngredients: (ingredients: Ingredient[]) => Promise<void>;
}

export const IngredientsSection = ({ recipe, isOwner = false, onUpdateIngredients }: IngredientsSectionProps) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>(recipe.ingredients);
    const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '' });
    const ingredientNameId = useId();
    const quantityId = useId();
    const unitId = useId();

    const handleAddIngredient = async () => {
        if (!newIngredient.name.trim()) return;

        const ingredient: Ingredient = {
            id: `temp-${Date.now()}`,
            name: newIngredient.name.trim(),
            ...(newIngredient.quantity && { quantity: parseFloat(newIngredient.quantity) }),
            ...(newIngredient.unit && { unit: newIngredient.unit.trim() }),
        };

        const updated = [...ingredients, ingredient];
        setIngredients(updated);
        await onUpdateIngredients(updated);
        setNewIngredient({ name: '', quantity: '', unit: '' });
    };

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

            {isOwner && (
                <div className="space-y-3 p-4 border rounded-md bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground">Add Ingredient</p>
                    <div>
                        <Label htmlFor={ingredientNameId}>Name</Label>
                        <Input
                            id={ingredientNameId}
                            placeholder="Ingredient name"
                            value={newIngredient.name}
                            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                            className="mt-2"
                        />
                    </div>
                    <QuantityUnitField
                        quantity={newIngredient.quantity}
                        unit={newIngredient.unit}
                        onQuantityChange={(value) => setNewIngredient({ ...newIngredient, quantity: value })}
                        onUnitChange={(value) => setNewIngredient({ ...newIngredient, unit: value })}
                        quantityId={quantityId}
                        unitId={unitId}
                    />
                    <Button
                        size="sm"
                        onClick={handleAddIngredient}
                        disabled={!newIngredient.name.trim()}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Ingredient
                    </Button>
                </div>
            )}
        </div>
    );
};
