import type { MealPlanEntry } from '@shoppingo/types';
import { X } from 'lucide-react';
import { PortionsStepper } from '../../components/PortionsStepper';
import { Button } from '../../components/ui/button';

interface PlannedRecipeRowProps {
    entry: MealPlanEntry;
    title?: string;
    canRemove: boolean;
    onServingsChange: (servings: number) => void;
    onRemove: () => void;
}

export const PlannedRecipeRow = ({ entry, title, canRemove, onServingsChange, onRemove }: PlannedRecipeRowProps) => (
    <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2">
        <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{title ?? 'Unavailable recipe'}</span>
            {canRemove && (
                <Button variant="ghost" size="icon" aria-label={`Remove ${title ?? 'recipe'}`} onClick={onRemove}>
                    <X className="size-4" />
                </Button>
            )}
        </div>
        <PortionsStepper value={entry.servings} onChange={onServingsChange} />
    </div>
);
