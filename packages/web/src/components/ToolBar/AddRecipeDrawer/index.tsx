import { ChefHat, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
import { Textarea } from '../../ui/textarea';

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
        selectedUsers?: string[],
        link?: string,
        instructions?: string[]
    ) => Promise<Recipe | undefined>;
    onRefetch?: () => Promise<void>;
    onImageGenerating?: (recipeId: string) => void;
    onImageReady?: (recipeId: string) => void;
    placeholder?: string;
    initialLink?: string;
}

const splitIntoSteps = (text: string): string[] =>
    text
        .split('\n')
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);

export const AddRecipeDrawer = ({
    open,
    onOpenChange,
    onAdd,
    onRefetch,
    onImageGenerating,
    onImageReady,
    initialLink,
}: AddRecipeDrawerProps) => {
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
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [link, setLink] = useState(initialLink ?? '');
    const [instructionsPasteText, setInstructionsPasteText] = useState('');
    const [steps, setSteps] = useState<string[]>([]);
    const [showPasteArea, setShowPasteArea] = useState(true);

    useEffect(() => {
        setLink(initialLink ?? '');
    }, [initialLink]);

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
            const recipe = await onAdd(
                title,
                [],
                undefined,
                selectedUsers,
                link.trim() || undefined,
                steps.length > 0 ? steps : undefined
            );
            if (!recipe) {
                throw new Error('Failed to create recipe');
            }

            const capturedTitle = title;
            const capturedFile = selectedFile;

            handleCancel();

            if (capturedFile) {
                onImageGenerating?.(recipe.id);
                void (async () => {
                    try {
                        await uploadRecipeImage(recipe.id, capturedFile);
                        toast.success('Recipe image uploaded', { style: { backgroundColor: '#10b981', color: '#ffffff' } });
                    } catch {
                        // silent — recipe still usable
                    } finally {
                        onImageReady?.(recipe.id);
                        if (onRefetch) await onRefetch();
                    }
                })();
            } else {
                onImageGenerating?.(recipe.id);
                void (async () => {
                    try {
                        const response = await fetch(`/api/image/${encodeURIComponent(capturedTitle)}`, {
                            method: 'GET',
                        });
                        if (response.ok) {
                            await setCoverImageKey(recipe.id, capturedTitle.trim().toLowerCase());
                            toast.success('Recipe image generated', {
                                style: { backgroundColor: '#10b981', color: '#ffffff' },
                            });
                        }
                    } catch {
                        // silent — recipe still usable
                    } finally {
                        onImageReady?.(recipe.id);
                        if (onRefetch) await onRefetch();
                    }
                })();
            }
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
        setError('');
        setQuery('');
        clearResults();
        setLink('');
        setInstructionsPasteText('');
        setSteps([]);
        setShowPasteArea(true);
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

                <div className="max-h-[70vh] overflow-y-auto px-4">
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

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                disabled={isLoading}
                                className="hidden"
                                id={fileInputId}
                            />
                        </div>

                        {/* Recipe Link */}
                        <div className="space-y-2">
                            <Label>Recipe Link</Label>
                            <Input
                                type="url"
                                placeholder="https://..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                disabled={isLoading}
                                className="h-10 border border-foreground/30"
                            />
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Instructions</Label>
                                {steps.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPasteArea(true)}
                                        className="text-xs text-muted-foreground underline"
                                    >
                                        edit text ↩
                                    </button>
                                )}
                            </div>

                            {showPasteArea || steps.length === 0 ? (
                                <Textarea
                                    placeholder="Paste instructions here — each line becomes a step automatically..."
                                    value={instructionsPasteText}
                                    onChange={(e) => setInstructionsPasteText(e.target.value)}
                                    onBlur={() => {
                                        const parsed = splitIntoSteps(instructionsPasteText);
                                        if (parsed.length > 0) {
                                            setSteps(parsed);
                                            setShowPasteArea(false);
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="min-h-[80px] resize-none border border-foreground/30"
                                />
                            ) : (
                                <div className="space-y-1">
                                    {steps.map((step, i) => (
                                        <div
                                            key={`${i}-${step.slice(0, 20)}`}
                                            className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"
                                        >
                                            <span className="font-semibold text-muted-foreground min-w-[1.25rem]">
                                                {i + 1}.
                                            </span>
                                            <span className="flex-1 text-foreground">{step}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
                                                disabled={isLoading}
                                                className="text-destructive hover:opacity-70"
                                                aria-label={`Remove step ${i + 1}`}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setSteps([...steps, ''])}
                                        disabled={isLoading}
                                        className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
                                    >
                                        + Add step
                                    </button>
                                </div>
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
