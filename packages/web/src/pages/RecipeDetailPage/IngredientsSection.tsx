import type { Ingredient, Recipe } from '@shoppingo/types';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

interface IngredientsSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onUpdateIngredients: (ingredients: Ingredient[]) => Promise<void>;
}

export const IngredientsSection = ({ recipe, isOwner, onUpdateIngredients }: IngredientsSectionProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>(recipe.ingredients);
    const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleAddIngredient = () => {
        if (newIngredient.name.trim()) {
            const ingredient: Ingredient = {
                id: `temp-${Date.now()}`,
                name: newIngredient.name.trim(),
                ...(newIngredient.quantity && { quantity: parseFloat(newIngredient.quantity) || undefined }),
                ...(newIngredient.unit && { unit: newIngredient.unit.trim() || undefined }),
            };
            setEditedIngredients([...editedIngredients, ingredient]);
            setNewIngredient({ name: '', quantity: '', unit: '' });
        }
    };

    const handleRemoveIngredient = (id: string) => {
        setEditedIngredients(editedIngredients.filter((ing) => ing.id !== id));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdateIngredients(editedIngredients);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedIngredients(recipe.ingredients);
        setNewIngredient({ name: '', quantity: '', unit: '' });
        setIsEditing(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ingredients ({recipe.ingredients.length})</h3>
                {isOwner && !isEditing && (
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                    <div className="space-y-3">
                        {editedIngredients.map((ingredient) => (
                            <div
                                key={ingredient.id}
                                className="flex items-center gap-2 p-3 bg-background rounded border"
                            >
                                <div className="flex-1">
                                    <p className="font-medium">{ingredient.name}</p>
                                    {(ingredient.quantity || ingredient.unit) && (
                                        <p className="text-sm text-muted-foreground">
                                            {ingredient.quantity} {ingredient.unit}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemoveIngredient(ingredient.id)}
                                    className="p-1 hover:bg-destructive hover:bg-opacity-10 rounded transition-colors text-destructive"
                                    type="button"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground">Add New Ingredient</p>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Ingredient name"
                                value={newIngredient.name}
                                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    value={newIngredient.quantity}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    step="0.1"
                                />
                                <input
                                    type="text"
                                    placeholder="Unit"
                                    value={newIngredient.unit}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                    className="col-span-2 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAddIngredient}
                            className="w-full"
                            type="button"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Ingredient
                        </Button>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1">
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {editedIngredients.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-3">No ingredients added yet</p>
                    ) : (
                        editedIngredients.map((ingredient) => (
                            <div key={ingredient.id} className="flex items-center p-3 bg-muted/20 rounded">
                                <div className="flex-1">
                                    <p className="font-medium">{ingredient.name}</p>
                                    {(ingredient.quantity || ingredient.unit) && (
                                        <p className="text-sm text-muted-foreground">
                                            {ingredient.quantity} {ingredient.unit}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
