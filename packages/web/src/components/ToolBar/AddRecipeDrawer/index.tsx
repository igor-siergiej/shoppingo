import { ChefHat, ImagePlus, Plus, Trash2, X, Zap } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSearch } from '../../../hooks/useSearch';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../ui/drawer';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { RippleButton } from '../../ui/ripple';

export interface Ingredient {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
}

export interface AddRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (title: string, ingredients: Ingredient[], imageKey?: string, selectedUsers?: string[]) => Promise<void>;
    placeholder?: string;
}

export const AddRecipeDrawer = ({ open, onOpenChange, onAdd }: AddRecipeDrawerProps) => {
    const recipeNameId = useId();
    const ingredientNameId = useId();
    const userSearchId = useId();

    const { query, setQuery, results, isLoading: isSearchLoading, clearResults } = useSearch();

    const [title, setTitle] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [imageMode, setImageMode] = useState<'upload' | 'generate'>('generate');
    const [imagePreview, setImagePreview] = useState<string>('');
    const [imageKey, setImageKey] = useState<string>('');
    const [imageDescription, setImageDescription] = useState('');
    const [newIngredientName, setNewIngredientName] = useState('');
    const [newIngredientQuantity, setNewIngredientQuantity] = useState('');
    const [newIngredientUnit, setNewIngredientUnit] = useState('');
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddIngredient = useCallback(() => {
        const name = newIngredientName.trim();
        if (!name) {
            setError('Ingredient name is required');
            return;
        }

        const quantity = newIngredientQuantity.trim() ? parseFloat(newIngredientQuantity) : undefined;
        const unit = newIngredientUnit.trim() || undefined;

        setIngredients((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name,
                quantity,
                unit,
            },
        ]);

        setNewIngredientName('');
        setNewIngredientQuantity('');
        setNewIngredientUnit('');
        setError('');
    }, [newIngredientName, newIngredientQuantity, newIngredientUnit]);

    const handleRemoveIngredient = useCallback((id: string) => {
        setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    }, []);

    const handleAddUser = useCallback(
        (username: string) => {
            if (!selectedUsers.includes(username)) {
                setSelectedUsers((prev) => [...prev, username]);
            }
            setQuery('');
            clearResults();
        },
        [selectedUsers, setQuery, clearResults]
    );

    const handleRemoveUser = useCallback((username: string) => {
        setSelectedUsers((prev) => prev.filter((u) => u !== username));
    }, []);

    const canSubmit = useMemo(() => {
        return title.trim().length > 0 && ingredients.length > 0;
    }, [title, ingredients]);

    const handleSubmit = async () => {
        if (!canSubmit) {
            setError('Recipe title and at least one ingredient are required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const trimmedIngredients = ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit,
            }));

            await onAdd(title, trimmedIngredients, imageKey || imageDescription || undefined, selectedUsers);

            toast.success('Recipe created successfully!');
            handleCancel();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create recipe';
            toast.error(message, { style: { backgroundColor: '#ef4444', color: '#ffffff' } });
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setTitle('');
        setIngredients([]);
        setSelectedUsers([]);
        setImageMode('generate');
        setImagePreview('');
        setImageKey('');
        setImageDescription('');
        setNewIngredientName('');
        setNewIngredientQuantity('');
        setNewIngredientUnit('');
        setShowUserSearch(false);
        setError('');
        setQuery('');
        clearResults();
        onOpenChange(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target?.result as string;
                setImagePreview(src);
                setImageKey(file.name);
            };
            reader.readAsDataURL(file);
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
                <DrawerHeader>
                    <DrawerTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Create Recipe
                    </DrawerTitle>
                </DrawerHeader>

                <div className="h-[500px] overflow-y-auto px-4">
                    <div className="space-y-4 pb-4">
                        <div className="space-y-2">
                            <Label htmlFor={recipeNameId}>Recipe Title</Label>
                            <Input
                                id={recipeNameId}
                                placeholder="Enter recipe title..."
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setError('');
                                }}
                                disabled={isLoading}
                                autoFocus
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm font-semibold">Ingredients</Label>

                            <div className="space-y-2">
                                {ingredients.map((ing) => (
                                    <div
                                        key={ing.id}
                                        className="flex items-center justify-between bg-slate-50 p-2 rounded-md"
                                    >
                                        <div className="text-sm flex-1">
                                            <span className="font-medium">{ing.name}</span>
                                            {ing.quantity && (
                                                <span className="text-slate-500 ml-2">
                                                    {ing.quantity}
                                                    {ing.unit ? ` ${ing.unit}` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveIngredient(ing.id)}
                                            disabled={isLoading}
                                            className="ml-2 p-1 hover:bg-slate-200 rounded"
                                        >
                                            <Trash2 className="h-4 w-4 text-slate-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 bg-slate-50 p-3 rounded-md">
                                <Input
                                    id={ingredientNameId}
                                    placeholder="Ingredient name"
                                    value={newIngredientName}
                                    onChange={(e) => setNewIngredientName(e.target.value)}
                                    disabled={isLoading}
                                    className="h-9 text-sm"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        placeholder="Quantity"
                                        type="number"
                                        value={newIngredientQuantity}
                                        onChange={(e) => setNewIngredientQuantity(e.target.value)}
                                        disabled={isLoading}
                                        className="h-9 text-sm"
                                    />
                                    <Input
                                        placeholder="Unit"
                                        value={newIngredientUnit}
                                        onChange={(e) => setNewIngredientUnit(e.target.value)}
                                        disabled={isLoading}
                                        className="h-9 text-sm"
                                    />
                                    <Button
                                        onClick={handleAddIngredient}
                                        disabled={isLoading || !newIngredientName.trim()}
                                        size="sm"
                                        className="h-9"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <Label className="text-sm font-semibold">Image</Label>
                            <div className="flex gap-2 mb-3">
                                <Button
                                    variant={imageMode === 'upload' ? 'default' : 'outline'}
                                    onClick={() => setImageMode('upload')}
                                    size="sm"
                                    className="flex-1 gap-2"
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    Upload
                                </Button>
                                <Button
                                    variant={imageMode === 'generate' ? 'default' : 'outline'}
                                    onClick={() => setImageMode('generate')}
                                    size="sm"
                                    className="flex-1 gap-2"
                                >
                                    <Zap className="h-4 w-4" />
                                    Generate
                                </Button>
                            </div>

                            {imageMode === 'upload' ? (
                                <div className="space-y-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isLoading}
                                        className="h-9"
                                    />
                                    {imagePreview && (
                                        <img
                                            src={imagePreview}
                                            alt="preview"
                                            className="w-full h-32 object-cover rounded-md"
                                        />
                                    )}
                                </div>
                            ) : (
                                <Input
                                    placeholder="Describe the image you want to generate..."
                                    value={imageDescription}
                                    onChange={(e) => setImageDescription(e.target.value)}
                                    disabled={isLoading}
                                    className="h-9"
                                />
                            )}
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm font-semibold">Share With Users</Label>

                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map((username) => (
                                        <Badge key={username} variant="secondary" className="gap-1 px-2 py-1">
                                            {username}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveUser(username)}
                                                disabled={isLoading}
                                                className="hover:text-slate-700"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <Input
                                    id={userSearchId}
                                    placeholder="Search users..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    disabled={isLoading || isSearchLoading}
                                    onFocus={() => setShowUserSearch(true)}
                                    className="h-9"
                                />

                                {showUserSearch && (query.length > 1 || results.usernames.length > 0) && (
                                    <div className="absolute top-full left-0 right-0 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto z-10 mt-1">
                                        {isSearchLoading ? (
                                            <div className="p-2 text-sm text-slate-500">Searching...</div>
                                        ) : results.usernames.length > 0 ? (
                                            results.usernames.map((username) => (
                                                <button
                                                    key={username}
                                                    type="button"
                                                    onClick={() => {
                                                        handleAddUser(username);
                                                        setShowUserSearch(false);
                                                    }}
                                                    disabled={isLoading || selectedUsers.includes(username)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                >
                                                    {username}
                                                </button>
                                            ))
                                        ) : query.length > 1 ? (
                                            <div className="p-2 text-sm text-slate-500">No users found</div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                </div>

                <DrawerFooter>
                    <Button onClick={() => void handleSubmit()} disabled={isLoading || !canSubmit}>
                        {isLoading ? 'Creating...' : 'Create Recipe'}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};
