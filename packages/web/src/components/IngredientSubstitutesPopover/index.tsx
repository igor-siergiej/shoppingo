import { Replace } from 'lucide-react';
import { useState } from 'react';
import { suggestIngredientSubstitutes } from '../../api';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface IngredientSubstitutesPopoverProps {
    ingredientName: string;
    recipeTitle?: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// Small per-ingredient "suggest a substitute" affordance: clicking reveals an inline popover
// (no dedicated page/drawer) that lazily fetches AI-generated substitutes on first open, then
// caches the result for the component's lifetime so re-opening doesn't re-trigger the LLM call.
// fallow-ignore-next-line complexity
export const IngredientSubstitutesPopover = ({ ingredientName, recipeTitle }: IngredientSubstitutesPopoverProps) => {
    const [status, setStatus] = useState<Status>('idle');
    const [substitutes, setSubstitutes] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState('');

    // fallow-ignore-next-line complexity
    const handleOpenChange = async (open: boolean) => {
        if (!open || status !== 'idle') return;
        setStatus('loading');
        try {
            const result = await suggestIngredientSubstitutes(ingredientName, recipeTitle);
            setSubstitutes(result.substitutes);
            setStatus('success');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load substitutes');
            setStatus('error');
        }
    };

    return (
        <Popover onOpenChange={(open) => void handleOpenChange(open)}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={`Suggest substitutes for ${ingredientName}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Replace className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Substitutes</p>
                {status === 'loading' && <p className="text-sm text-muted-foreground">Thinking…</p>}
                {status === 'error' && <p className="text-sm text-destructive">{errorMessage}</p>}
                {status === 'success' &&
                    (substitutes.length > 0 ? (
                        <ul className="text-sm space-y-1">
                            {substitutes.map((substitute) => (
                                <li key={substitute}>{substitute}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No substitutes found.</p>
                    ))}
            </PopoverContent>
        </Popover>
    );
};
