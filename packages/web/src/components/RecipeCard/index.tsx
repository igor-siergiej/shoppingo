import type { Recipe } from '@shoppingo/types';
import { CalendarDays, ImageOff, ListChecks, Users } from 'lucide-react';
import { useAuthedImage } from '../../hooks/useAuthedImage';
import { AvatarStack } from '../ui/avatar-stack';
import { Skeleton } from '../ui/skeleton';

interface RecipeCardProps {
    recipe: Recipe;
    currentUserId: string;
    onClick: () => void;
}

const NEW_RECIPE_THRESHOLD_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const relativeDate = (dateAdded: Date): string => {
    const daysAgo = Math.floor((Date.now() - new Date(dateAdded).getTime()) / MS_PER_DAY);
    if (daysAgo <= 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo}d ago`;
    if (daysAgo < 30) return `${Math.round(daysAgo / 7)}w ago`;
    return `${Math.round(daysAgo / 30)}mo ago`;
};

const isRecentlyAdded = (dateAdded: Date): boolean =>
    Date.now() - new Date(dateAdded).getTime() < NEW_RECIPE_THRESHOLD_DAYS * MS_PER_DAY;

const RecipeCardImage = ({ recipe }: { recipe: Recipe }) => {
    const { imageUrl, hasError: hasImageError } = useAuthedImage(recipe.coverImageKey);

    return (
        <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            {imageUrl && !hasImageError && (
                <img src={imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
            )}
            {!imageUrl && !hasImageError && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
            {hasImageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <ImageOff className="h-6 w-6" />
                </div>
            )}
        </div>
    );
};

export const RecipeCard = ({ recipe, currentUserId, onClick }: RecipeCardProps) => {
    const ingredientCount = recipe.ingredients?.length ?? 0;
    const ingredientLabel = ingredientCount === 1 ? 'ingredient' : 'ingredients';
    const otherUsers = recipe.users.filter((user) => user.id !== currentUserId);

    return (
        <div
            role="button"
            onClick={onClick}
            className="group relative flex cursor-pointer gap-3 rounded-2xl border border-border bg-card p-3 transition-colors active:bg-muted/50 hover:border-primary/40"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {isRecentlyAdded(recipe.dateAdded) && (
                <span className="absolute -top-2 -left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                    New
                </span>
            )}

            <RecipeCardImage recipe={recipe} />

            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                    {recipe.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5" />
                        {ingredientCount} {ingredientLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {recipe.users.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {relativeDate(recipe.dateAdded)}
                    </span>
                </div>
                <AvatarStack users={otherUsers} />
            </div>
        </div>
    );
};
