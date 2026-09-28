import type { RecipeDifficulty } from '@shoppingo/types';
import { Pencil } from 'lucide-react';
import { useId, useState } from 'react';
import { RecipeTimingFields } from '../../components/RecipeTimingFields';
import { Button } from '../../components/ui/button';
import { toOptionalNumber } from '../../utils/parseRecipeMeta';

interface RecipeDetails {
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: RecipeDifficulty;
}

interface RecipeDetailsSectionProps extends RecipeDetails {
    isOwner?: boolean | null;
    onSave: (details: RecipeDetails) => Promise<void>;
}

const DIFFICULTY_LABEL: Record<RecipeDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// fallow-ignore-next-line complexity
const RecipeDetailsChips = ({ prepTime, cookTime, servings, difficulty }: RecipeDetails) => (
    <div className="flex flex-wrap gap-2 text-sm">
        {prepTime !== undefined && (
            <span className="rounded-full border border-border px-2.5 py-0.5">Prep: {prepTime} min</span>
        )}
        {cookTime !== undefined && (
            <span className="rounded-full border border-border px-2.5 py-0.5">Cook: {cookTime} min</span>
        )}
        {servings !== undefined && (
            <span className="rounded-full border border-border px-2.5 py-0.5">Servings: {servings}</span>
        )}
        {difficulty && (
            <span className="rounded-full border border-border px-2.5 py-0.5">
                Difficulty: {DIFFICULTY_LABEL[difficulty]}
            </span>
        )}
    </div>
);

// View/edit toggle for prep/cook time, servings and difficulty, mirroring InstructionsSection's
// self-contained edit-state pattern. Viewers with nothing to show see nothing; owners always get
// an affordance to add details, even before any are set.
// fallow-ignore-next-line complexity
export const RecipeDetailsSection = ({
    prepTime,
    cookTime,
    servings,
    difficulty,
    isOwner,
    onSave,
}: RecipeDetailsSectionProps) => {
    const prepTimeId = useId();
    const cookTimeId = useId();
    const servingsId = useId();
    const difficultyId = useId();
    const [isEditing, setIsEditing] = useState(false);
    const [editedPrepTime, setEditedPrepTime] = useState(prepTime?.toString() ?? '');
    const [editedCookTime, setEditedCookTime] = useState(cookTime?.toString() ?? '');
    const [editedServings, setEditedServings] = useState(servings?.toString() ?? '');
    const [editedDifficulty, setEditedDifficulty] = useState<'' | RecipeDifficulty>(difficulty ?? '');
    const [isSaving, setIsSaving] = useState(false);

    const hasAnyDetail = prepTime !== undefined || cookTime !== undefined || servings !== undefined || !!difficulty;

    // fallow-ignore-next-line complexity
    const handleEditStart = () => {
        setEditedPrepTime(prepTime?.toString() ?? '');
        setEditedCookTime(cookTime?.toString() ?? '');
        setEditedServings(servings?.toString() ?? '');
        setEditedDifficulty(difficulty ?? '');
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                prepTime: toOptionalNumber(editedPrepTime),
                cookTime: toOptionalNumber(editedCookTime),
                servings: toOptionalNumber(editedServings),
                difficulty: editedDifficulty || undefined,
            });
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isEditing) {
        if (!hasAnyDetail && !isOwner) return null;

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Details</p>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={handleEditStart}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                            aria-label="Edit recipe details"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {hasAnyDetail ? (
                    <RecipeDetailsChips
                        prepTime={prepTime}
                        cookTime={cookTime}
                        servings={servings}
                        difficulty={difficulty}
                    />
                ) : (
                    <p className="text-sm text-muted-foreground">No details added yet.</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Details</p>
            <RecipeTimingFields
                prepTimeId={prepTimeId}
                cookTimeId={cookTimeId}
                servingsId={servingsId}
                difficultyId={difficultyId}
                prepTime={editedPrepTime}
                cookTime={editedCookTime}
                servings={editedServings}
                difficulty={editedDifficulty}
                onPrepTimeChange={setEditedPrepTime}
                onCookTimeChange={setEditedCookTime}
                onServingsChange={setEditedServings}
                onDifficultyChange={setEditedDifficulty}
                disabled={isSaving}
            />
            <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
                    Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
