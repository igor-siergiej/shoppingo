import { ChefHat, Image as ImageIcon, Plus, Sparkles, X } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { setCoverImageKey, uploadRecipeImage } from '../../../api';
import { SearchResults } from '../../../components/SearchResults';
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

import type { Recipe } from '@shoppingo/types';

export interface AddRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (
        title: string,
        ingredients: Ingredient[],
        imageKey?: string,
        selectedUsers?: string[]
    ) => Promise<Recipe | undefined>;
    placeholder?: string;
}

export const AddRecipeDrawer = ({ open, onOpenChange, onAdd }: AddRecipeDrawerProps) => {
    const recipeNameId = useId();
    const userSearchId = useId();
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { query, setQuery, results, isLoading: isSearchLoading, clearResults } = useSearch();

    const [title, setTitle] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [wantsAiImage, setWantsAiImage] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Recipe title is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Create recipe without imageKey initially (need recipeId for upload)
            const recipe = await onAdd(title, [], undefined, selectedUsers);
            if (!recipe) {
                throw new Error('Failed to create recipe');
            }

            // Handle image upload or AI generation AFTER recipe creation
            if (selectedFile) {
                // User uploaded a file
                await uploadRecipeImage(recipe.id, selectedFile);
                toast.success('Recipe image uploaded', { style: { backgroundColor: '#10b981', color: '#ffffff' } });
            } else if (wantsAiImage) {
                // User wants AI-generated image
                try {
                    await fetch(`/api/image/${encodeURIComponent(title)}`, {
                        method: 'GET',
                    });
                    // Set the imageKey to the normalized title
                    await setCoverImageKey(recipe.id, title.trim().toLowerCase());
                    toast.success('Recipe image generated', {
                        style: { backgroundColor: '#10b981', color: '#ffffff' },
                    });
                } catch (_err) {
                    // Image generation failed, recipe still created successfully
                }
            }

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
        setSelectedUsers([]);
        setShowUserSearch(false);
        setImageUrl(null);
        setSelectedFile(null);
        setWantsAiImage(false);
        setError('');
        setQuery('');
        clearResults();
        if (fileInputRef.current) fileInputRef.current.value = '';
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                    aria-label="Add recipe"
                >
                    <Plus className="size-5" />
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
                                className="h-10 border border-foreground/30"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="relative w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                {imageUrl ? (
                                    <>
                                        <img
                                            src={imageUrl}
                                            alt="Recipe preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageUrl(null);
                                                setSelectedFile(null);
                                                setWantsAiImage(false);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
                                            aria-label="Clear image"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                                    </div>
                                )}
                            </button>

                            <div className="flex gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    disabled={isLoading}
                                    className="hidden"
                                    id={fileInputId}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="flex-1"
                                    size="sm"
                                >
                                    <ImageIcon className="h-4 w-4 mr-1" />
                                    Upload
                                </Button>
                                <Button
                                    type="button"
                                    variant={wantsAiImage ? 'default' : 'outline'}
                                    disabled={isLoading || !title.trim()}
                                    className="flex-1"
                                    size="sm"
                                    onClick={() => {
                                        setWantsAiImage(!wantsAiImage);
                                        if (!wantsAiImage) {
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }
                                    }}
                                >
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    AI Generate
                                </Button>
                            </div>
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
                                                ×
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

                                {showUserSearch && (
                                    <SearchResults
                                        results={results}
                                        isLoading={isSearchLoading}
                                        error={null}
                                        query={query}
                                        onSelect={(username) => {
                                            handleAddUser(username);
                                            setShowUserSearch(false);
                                        }}
                                        onClose={() => setShowUserSearch(false)}
                                    />
                                )}
                            </div>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                </div>

                <DrawerFooter>
                    <Button onClick={() => void handleSubmit()} disabled={isLoading || !title.trim()}>
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
