import type { Recipe } from '@shoppingo/types';
import type { ReactNode } from 'react';

interface RecipeResultCardProps {
    recipe: Recipe;
    subtitle: ReactNode;
    onClick: () => void;
}

// Shared recipe-card row (cover image + title + a caller-supplied subtitle slot) used by every
// drawer that lists recipes as tappable search results — AddFromRecipeDrawer's ingredient count,
// WasteWarriorDrawer's matched-ingredient badge — so the row layout only lives in one place.
export const RecipeResultCard = ({ recipe, subtitle, onClick }: RecipeResultCardProps) => (
    <button
        onClick={onClick}
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
                {subtitle}
            </div>
        </div>
    </button>
);
