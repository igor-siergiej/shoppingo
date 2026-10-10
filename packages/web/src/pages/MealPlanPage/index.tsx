import { useUser } from '@imapps/web-utils';
import type { MealPlanEntry, Recipe } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import {
    addItemsBulk,
    createMealPlanEntry,
    deleteMealPlanEntry,
    getListsQuery,
    getMealPlanQuery,
    getRecipesQuery,
    updateMealPlanEntry,
} from '../../api';
import ToolBar from '../../components/ToolBar';
import { Button } from '../../components/ui/button';
import { buildShoppingRows, dayKey, type ShoppingRow, weekDays, weekStart } from '../../utils/mealPlan';
import { notifyError, notifySuccess } from '../../utils/toast';
import { PlannedRecipeRow } from './PlannedRecipeRow';
import { RecipePickerDrawer } from './RecipePickerDrawer';
import { ShoppingPreviewDrawer } from './ShoppingPreviewDrawer';

// Page-level wiring of queries, mutations and drawers in one component.
// fallow-ignore-next-line complexity
const MealPlanPage = () => {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [start, setStart] = useState(() => weekStart(new Date()));
    const [pickerDay, setPickerDay] = useState<Date | null>(null);
    const [isShopOpen, setIsShopOpen] = useState(false);

    const days = weekDays(start);
    const from = dayKey(days[0]);
    const to = dayKey(days[6]);
    const planKey = getMealPlanQuery(from, to).queryKey;
    const rangeLabel = `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM')}`;

    const { data: entries = [] } = useQuery(getMealPlanQuery(from, to));
    const { data: recipes = [] } = useQuery(
        user?.id ? getRecipesQuery(user.id) : { queryKey: [], queryFn: async () => [] as Recipe[] }
    );
    const { data: lists = [] } = useQuery(
        user?.id ? getListsQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );

    const refresh = () => queryClient.invalidateQueries({ queryKey: planKey });
    const onError = (error: unknown) => notifyError(error instanceof Error ? error.message : 'Something went wrong');

    const addMutation = useMutation({ mutationFn: createMealPlanEntry, onSuccess: refresh, onError });
    const servingsMutation = useMutation({
        mutationFn: ({ id, servings }: { id: string; servings: number }) => updateMealPlanEntry(id, { servings }),
        onSuccess: refresh,
        onError,
    });
    const removeMutation = useMutation({ mutationFn: deleteMealPlanEntry, onSuccess: refresh, onError });

    const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const entriesOn = (day: Date): Array<MealPlanEntry> => entries.filter((entry) => entry.date === dayKey(day));
    const shoppingRows = buildShoppingRows(entries, recipes);

    const handlePick = (recipe: Recipe) => {
        if (!pickerDay) return;
        addMutation.mutate({ date: dayKey(pickerDay), recipeId: recipe.id, servings: recipe.servings ?? 2 });
        setPickerDay(null);
    };

    const handleShop = async (listTitle: string, rows: Array<ShoppingRow>) => {
        const result = await addItemsBulk(
            listTitle,
            rows.map((row) => ({ itemName: row.name, quantity: row.quantity, unit: row.unit }))
        );
        await queryClient.invalidateQueries({ queryKey: [listTitle] });
        notifySuccess(`${result.added} items added, ${result.skipped} merged`);
    };

    return (
        <>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Previous week"
                        onClick={() => setStart(addDays(start, -7))}
                    >
                        <ChevronLeft className="size-5" />
                    </Button>
                    <h2 className="text-lg font-semibold text-foreground">{rangeLabel}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Next week"
                        onClick={() => setStart(addDays(start, 7))}
                    >
                        <ChevronRight className="size-5" />
                    </Button>
                </div>

                {days.map((day) => (
                    <section
                        key={dayKey(day)}
                        aria-label={format(day, 'EEEE d MMMM')}
                        className="rounded-lg border p-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">{format(day, 'EEEE d MMM')}</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Plan a recipe for ${format(day, 'EEEE')}`}
                                onClick={() => setPickerDay(day)}
                            >
                                <Plus className="size-4" />
                            </Button>
                        </div>
                        {entriesOn(day).map((entry) => (
                            <PlannedRecipeRow
                                key={entry.id}
                                entry={entry}
                                title={recipeById.get(entry.recipeId)?.title}
                                canRemove={entry.ownerId === user?.id}
                                onServingsChange={(servings) => servingsMutation.mutate({ id: entry.id, servings })}
                                onRemove={() => removeMutation.mutate(entry.id)}
                            />
                        ))}
                    </section>
                ))}

                <Button onClick={() => setIsShopOpen(true)} disabled={shoppingRows.length === 0}>
                    Shop for this week
                </Button>
            </div>

            <RecipePickerDrawer
                open={pickerDay !== null}
                dayLabel={pickerDay ? format(pickerDay, 'EEEE') : ''}
                recipes={recipes}
                onPick={handlePick}
                onOpenChange={(open) => !open && setPickerDay(null)}
            />
            <ShoppingPreviewDrawer
                open={isShopOpen}
                rangeLabel={rangeLabel}
                rows={shoppingRows}
                lists={lists}
                onConfirm={handleShop}
                onOpenChange={setIsShopOpen}
            />
            <ToolBar handleGoBack={() => window.history.back()} />
        </>
    );
};

export default MealPlanPage;
