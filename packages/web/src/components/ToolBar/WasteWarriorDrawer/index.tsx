'use client';

import { useUser } from '@imapps/web-utils';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getRecipesQuery } from '../../../api';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { useIngredientWasteSearch } from '../../../hooks/useIngredientWasteSearch';

export interface WasteWarriorDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WasteWarriorDrawer = ({ open, onOpenChange }: WasteWarriorDrawerProps) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const { data: allRecipes = [] } = useQuery(
        user?.id ? getRecipesQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );
    const matches = useIngredientWasteSearch(allRecipes, query);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
        if (!next) setQuery('');
    };

    const handleSelectRecipe = (recipeId: string) => {
        handleOpenChange(false);
        navigate(`/recipes/${recipeId}`);
    };

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Use Up an Ingredient</DrawerTitle>
                        <DrawerDescription>
                            Type something you don't want to waste — we'll find recipes that use it.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 pb-6 max-h-[60vh] overflow-y-auto">
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. spinach"
                                className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                                name="waste-warrior-search"
                                autoComplete="off"
                                inputMode="search"
                                autoFocus
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {!query.trim() ? (
                            <p className="text-muted-foreground text-sm py-3">
                                Type an ingredient to see recipes that use it.
                            </p>
                        ) : matches.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-3">
                                No recipes use anything like &ldquo;{query.trim()}&rdquo; yet.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {matches.map(({ recipe, matchedIngredientName }) => (
                                    <button
                                        key={recipe.id}
                                        onClick={() => handleSelectRecipe(recipe.id)}
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
                                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    uses {matchedIngredientName}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
