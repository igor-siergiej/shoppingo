'use client';

import { useUser } from '@imapps/web-utils';
import { Plus, Trash2, X } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { addRecipe } from '../../../api';
import { Button } from '../../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { RippleButton } from '../../../components/ui/ripple';
import { useSearch } from '../../../hooks/useSearch';

interface Ingredient {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
}

const UNIT_OPTIONS = ['cups', 'ml', 'l', 'grams', 'kg', 'pieces', 'tbsp', 'tsp', 'oz', 'lb'];

export interface AddRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string) => Promise<void>;
    placeholder?: string;
}

export const AddRecipeDrawer = ({ open, onOpenChange, onAdd, placeholder }: AddRecipeDrawerProps) => {
    const { user } = useUser();
    const recipeNameId = useId();

    // Form state
    const [title, setTitle] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Ingredient form state
    const [ingredientName, setIngredientName] = useState('');
    const [ingredientQuantity, setIngredientQuantity] = useState('');
    const [ingredientUnit, setIngredientUnit] = useState('');

    // User search state
    const {
        query: searchInput,
        setQuery: setSearchInput,
        results: searchResults,
        isLoading: isSearching,
    } = useSearch();

    const availableUsers = useMemo(() => {
        if (!searchResults?.usernames || searchResults.usernames.length === 0) return [];
        return searchResults.usernames
            .map((item) => {
                const username = typeof item === 'string' ? item : item.username || '';
                return { id: username, username };
            })
            .filter((u) => !selectedUsers.includes(u.username) && u.username !== user?.username);
    }, [searchResults, selectedUsers, user?.username]);

    const handleAddIngredient = useCallback(() => {
        const trimmedName = ingredientName.trim();
        if (!trimmedName) {
            toast.error('Ingredient name is required', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                },
            });
            return;
        }

        const newIngredient: Ingredient = {
            id: crypto.randomUUID(),
            name: trimmedName,
            ...(ingredientQuantity.trim() && { quantity: parseFloat(ingredientQuantity) }),
            ...(ingredientUnit.trim() && { unit: ingredientUnit.trim() }),
        };

        setIngredients([...ingredients, newIngredient]);
        setIngredientName('');
        setIngredientQuantity('');
        setIngredientUnit('');
    }, [ingredientName, ingredientQuantity, ingredientUnit, ingredients]);

    const handleRemoveIngredient = useCallback((id: string) => {
        setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    }, []);

    const handleAddUser = useCallback(
        (username: string) => {
            setSelectedUsers([...selectedUsers, username]);
            setSearchInput('');
        },
        [selectedUsers, setSearchInput]
    );

    const handleRemoveUser = useCallback((username: string) => {
        setSelectedUsers((prev) => prev.filter((u) => u !== username));
    }, []);

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setError('Recipe name is required');
            return;
        }

        if (ingredients.length === 0) {
            setError('At least one ingredient is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (!user) {
                throw new Error('User not available');
            }

            const ingredientsForApi = ingredients.map(({ id, ...rest }) => rest);

            await addRecipe(trimmedTitle, user, selectedUsers, ingredientsForApi);

            await onAdd(trimmedTitle);

            // Reset form
            setTitle('');
            setIngredients([]);
            setSelectedUsers([]);
            setIngredientName('');
            setIngredientQuantity('');
            setIngredientUnit('');
            setSearchInput('');
            onOpenChange(false);

            toast.success('Recipe created successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                },
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create recipe';
            setError(errorMessage);
            toast.error(errorMessage, {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setTitle('');
        setIngredients([]);
        setSelectedUsers([]);
        setIngredientName('');
        setIngredientQuantity('');
        setIngredientUnit('');
        setSearchInput('');
        setError('');
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault();
            void handleSubmit();
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full shadow-lg"
                    aria-label="Add recipe"
                >
                    <Plus className="h-6 w-6" />
                </RippleButton>
            </DrawerTrigger>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Create Recipe</DrawerTitle>
                    </DrawerHeader>

                    <div className="flex flex-col h-[500px] max-h-[500px]">
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-4 pb-0 space-y-4">
                            {/* Recipe Name */}
                            <div className="space-y-2">
                                <Label htmlFor={recipeNameId}>Recipe Name</Label>
                                <Input
                                    id={recipeNameId}
                                    placeholder={placeholder || 'Recipe name...'}
                                    value={title}
                                    onChange={(e) => {
                                        setError('');
                                        setTitle(e.target.value);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    autoFocus
                                    className="h-10 text-base"
                                />
                            </div>

                            {/* Ingredients Section */}
                            <div className="space-y-2">
                                <Label>Ingredients</Label>

                                {/* Ingredients List */}
                                {ingredients.length > 0 ? (
                                    <div className="space-y-2">
                                        {ingredients.map((ingredient) => (
                                            <div
                                                key={ingredient.id}
                                                className="flex items-center gap-2 bg-slate-50 rounded p-2"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{ingredient.name}</p>
                                                    {(ingredient.quantity || ingredient.unit) && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {ingredient.quantity} {ingredient.unit}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveIngredient(ingredient.id)}
                                                    className="flex-shrink-0 text-destructive hover:bg-destructive/10 rounded p-1"
                                                    aria-label="Delete ingredient"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No ingredients yet</p>
                                )}

                                {/* Add Ingredient Form */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Input
                                        placeholder="Ingredient name..."
                                        value={ingredientName}
                                        onChange={(e) => setIngredientName(e.target.value)}
                                        disabled={isLoading}
                                        className="h-9 text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Qty"
                                            type="number"
                                            value={ingredientQuantity}
                                            onChange={(e) => setIngredientQuantity(e.target.value)}
                                            disabled={isLoading}
                                            className="h-9 text-sm flex-1"
                                        />
                                        <select
                                            value={ingredientUnit}
                                            onChange={(e) => setIngredientUnit(e.target.value)}
                                            disabled={isLoading}
                                            className="h-9 text-sm px-2 rounded border border-input bg-background"
                                        >
                                            <option value="">Unit</option>
                                            {UNIT_OPTIONS.map((unit) => (
                                                <option key={unit} value={unit}>
                                                    {unit}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddIngredient}
                                        disabled={isLoading || !ingredientName.trim()}
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-9"
                                    >
                                        Add Ingredient
                                    </Button>
                                </div>
                            </div>

                            {/* Share With Users Section */}
                            <div className="space-y-2">
                                <Label>Share With (Optional)</Label>

                                {/* Selected Users */}
                                {selectedUsers.length > 0 && (
                                    <div className="space-y-1">
                                        {selectedUsers.map((username) => (
                                            <div
                                                key={username}
                                                className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm"
                                            >
                                                <span>{username}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveUser(username)}
                                                    className="text-destructive hover:bg-destructive/10 rounded p-0.5"
                                                    aria-label={`Remove ${username}`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* User Search */}
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Search users..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        disabled={isLoading || isSearching}
                                        className="h-9 text-sm"
                                    />

                                    {/* Search Results */}
                                    {searchInput.trim() && availableUsers.length > 0 && (
                                        <div className="bg-slate-50 rounded border border-input max-h-32 overflow-y-auto">
                                            {availableUsers.map((u) => (
                                                <button
                                                    key={u.username}
                                                    type="button"
                                                    onClick={() => handleAddUser(u.username)}
                                                    disabled={isLoading}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
                                                >
                                                    {u.username}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>

                        {/* Footer */}
                        <DrawerFooter className="flex-shrink-0">
                            <Button
                                onClick={() => void handleSubmit()}
                                disabled={isLoading || !title.trim() || ingredients.length === 0}
                            >
                                {isLoading ? 'Creating...' : 'Create Recipe'}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                                    Cancel
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
