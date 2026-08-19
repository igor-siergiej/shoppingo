import { AddRowButton, RemoveRowButton } from '../../components/StepsList/ListRowButtons';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { splitIntoSteps } from '../../utils/splitIntoSteps';

export interface Ingredient {
    name: string;
    quantity?: number;
    unit?: string;
}

const formatIngredientLine = (ingredient: Ingredient): string =>
    [ingredient.quantity, ingredient.unit, ingredient.name]
        .filter((part) => part !== undefined && part !== '')
        .join(' ');

interface IngredientsFieldProps {
    ingredients: Ingredient[];
    ingredientsPasteText: string;
    setIngredientsPasteText: (text: string) => void;
    showIngredientsPaste: boolean;
    setShowIngredientsPaste: (show: boolean) => void;
    onChange: (ingredients: Ingredient[]) => void;
    disabled?: boolean;
    isImporting?: boolean;
}

// Paste-textarea/parsed-list toggle for ingredients, parallel to how StepsList/splitIntoSteps
// handle instructions but with quantity/unit formatting on top; already shares its row buttons
// with StepsList via ListRowButtons to avoid duplication.
// fallow-ignore-next-line complexity
export const IngredientsField = ({
    ingredients,
    ingredientsPasteText,
    setIngredientsPasteText,
    showIngredientsPaste,
    setShowIngredientsPaste,
    onChange,
    disabled,
    isImporting,
}: IngredientsFieldProps) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label>Ingredients</Label>
            {ingredients.length > 0 && (
                <button
                    type="button"
                    onClick={() => setShowIngredientsPaste(true)}
                    className="text-xs text-muted-foreground underline"
                >
                    edit text ↩
                </button>
            )}
        </div>
        {showIngredientsPaste || ingredients.length === 0 ? (
            <Textarea
                placeholder="Paste ingredients here — each line becomes an item automatically..."
                value={ingredientsPasteText}
                onChange={(e) => setIngredientsPasteText(e.target.value)}
                onBlur={() => {
                    const parsed = splitIntoSteps(ingredientsPasteText);
                    if (parsed.length > 0) {
                        onChange(parsed.map((name) => ({ name })));
                        setShowIngredientsPaste(false);
                    }
                }}
                disabled={disabled || isImporting}
                className="min-h-[80px] resize-none border border-foreground/30"
            />
        ) : (
            <div className="space-y-1">
                {ingredients.map((ingredient, i) => (
                    <div
                        key={`${i}-${ingredient.name.slice(0, 20)}`}
                        className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"
                    >
                        <span className="flex-1 text-foreground">{formatIngredientLine(ingredient)}</span>
                        <RemoveRowButton
                            onClick={() => onChange(ingredients.filter((_, idx) => idx !== i))}
                            disabled={disabled}
                            ariaLabel={`Remove ingredient ${i + 1}`}
                        />
                    </div>
                ))}
                <AddRowButton
                    onClick={() => onChange([...ingredients, { name: '' }])}
                    disabled={disabled}
                    label="+ Add ingredient"
                />
            </div>
        )}
    </div>
);
