import type { Recipe } from '@shoppingo/types';
import { useMemo } from 'react';
import { Button } from '../../components/ui/button';

interface RecipeDetailHeaderProps {
    recipe: Recipe;
    isOwner?: boolean;
    isEditingTitle: boolean;
    editedTitle: string;
    onEditingTitleChange: (isEditing: boolean) => void;
    onEditedTitleChange: (title: string) => void;
    onSaveTitle: () => void;
}

export const RecipeDetailHeader = ({
    recipe,
    isOwner,
    isEditingTitle,
    editedTitle,
    onEditingTitleChange,
    onEditedTitleChange,
    onSaveTitle,
}: RecipeDetailHeaderProps) => {
    const titleInputId = useMemo(() => `recipe-title-${recipe.id}`, [recipe.id]);

    const handleTitleClick = () => {
        if (isOwner) {
            onEditingTitleChange(true);
        }
    };

    const handleCancel = () => {
        onEditedTitleChange(recipe.title);
        onEditingTitleChange(false);
    };

    if (isEditingTitle) {
        return (
            <div className="space-y-3">
                <label htmlFor={titleInputId} className="text-sm font-medium text-muted-foreground">
                    Recipe Title
                </label>
                <input
                    id={titleInputId}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => onEditedTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                    <Button size="sm" onClick={onSaveTitle}>
                        Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={handleTitleClick}
                className={`text-lg font-semibold text-left ${isOwner ? 'cursor-pointer hover:text-muted-foreground transition-colors' : ''}`}
                type="button"
                aria-label={isOwner ? 'Click to edit recipe title' : 'Recipe title'}
            >
                {recipe.title}
            </button>
            {isOwner && <p className="text-xs text-muted-foreground mt-1">Click to edit</p>}
        </div>
    );
};
