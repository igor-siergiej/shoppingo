import type { Ingredient, Label, Recipe, Todo } from '@shoppingo/types';
import type { OutboxIntent } from './outboxStore';

export interface ItemView {
    id: string;
    name: string;
    isSelected: boolean;
    quantity?: number;
    unit?: string;
    dateAdded?: string | Date;
}

export const applyItemIntent = (items: ItemView[], intent: OutboxIntent): ItemView[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'item.add': {
            if (items.some((i) => i.id === intent.targetId)) return items;
            return [
                ...items,
                {
                    id: intent.targetId,
                    name: String(p.name ?? ''),
                    isSelected: false,
                    ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                    ...(p.unit !== undefined && { unit: String(p.unit) }),
                },
            ];
        }
        case 'item.delete':
            return items.filter((i) => i.id !== intent.targetId);
        case 'item.toggle':
            return items.map((i) => (i.id === intent.targetId ? { ...i, isSelected: Boolean(p.isSelected) } : i));
        case 'item.rename':
            return items.map((i) => (i.id === intent.targetId ? { ...i, name: String(p.newItemName) } : i));
        case 'item.quantity':
            return items.map((i) =>
                i.id === intent.targetId
                    ? {
                          ...i,
                          ...(p.quantity !== undefined && { quantity: Number(p.quantity) }),
                          ...(p.unit !== undefined && { unit: String(p.unit) }),
                      }
                    : i
            );
        default:
            return items;
    }
};

export interface ListView {
    id: string;
    title: string;
    items: unknown[];
    users: Array<{ id: string; username: string }>;
    listType: string;
    ownerId?: string;
    dateAdded?: string | Date;
}

export const applyListIntent = (lists: ListView[], intent: OutboxIntent): ListView[] => {
    const p = intent.payload;
    if (intent.op === 'list.create') {
        if (lists.some((l) => l.id === intent.targetId)) return lists;
        return [
            ...lists,
            {
                id: intent.targetId,
                title: String(p.title ?? ''),
                items: [],
                users: (p.users as ListView['users']) ?? [],
                listType: String(p.listType ?? 'shopping'),
                ...(p.ownerId !== undefined && { ownerId: String(p.ownerId) }),
                dateAdded: new Date(),
            },
        ];
    }
    return lists;
};

export const applyTodoIntent = (todos: Todo[], intent: OutboxIntent): Todo[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'todo.create': {
            if (todos.some((t) => t.id === intent.targetId)) return todos;
            return [
                ...todos,
                {
                    id: intent.targetId,
                    ownerId: String(p.ownerId ?? ''),
                    title: String(p.title ?? ''),
                    done: false,
                    dateAdded: new Date(),
                    ...(p.dueDate !== undefined && { dueDate: p.dueDate as Todo['dueDate'] }),
                    ...(p.time !== undefined && { time: String(p.time) }),
                    ...(p.labelId !== undefined && { labelId: String(p.labelId) }),
                    ...(p.recurrence !== undefined && {
                        recurrence: p.recurrence as Todo['recurrence'],
                        completedDates: [],
                    }),
                } as Todo,
            ];
        }
        case 'todo.update':
            return todos.map((t) => (t.id === intent.targetId ? { ...t, ...(p as Partial<Todo>) } : t));
        case 'todo.delete':
            return todos.filter((t) => t.id !== intent.targetId);
        case 'todo.complete':
            return todos.map((t) => {
                if (t.id !== intent.targetId) return t;
                const date = p.date as string | undefined;
                if (t.recurrence && date) {
                    const current = t.completedDates ?? [];
                    const completedDates = current.includes(date)
                        ? current.filter((d) => d !== date)
                        : [...current, date];
                    return { ...t, completedDates };
                }
                return { ...t, done: !t.done };
            });
        default:
            return todos;
    }
};

export const applyLabelIntent = (labels: Label[], intent: OutboxIntent): Label[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'label.create': {
            if (labels.some((l) => l.id === intent.targetId)) return labels;
            return [
                ...labels,
                {
                    id: intent.targetId,
                    ownerId: String(p.ownerId ?? ''),
                    name: String(p.name ?? ''),
                    color: String(p.color ?? ''),
                },
            ];
        }
        case 'label.update':
            return labels.map((l) =>
                l.id === intent.targetId
                    ? {
                          ...l,
                          ...(p.name !== undefined && { name: String(p.name) }),
                          ...(p.color !== undefined && { color: String(p.color) }),
                      }
                    : l
            );
        case 'label.delete':
            return labels.filter((l) => l.id !== intent.targetId);
        default:
            return labels;
    }
};

export const applyRecipeIntent = (recipes: Recipe[], intent: OutboxIntent): Recipe[] => {
    const p = intent.payload;
    switch (intent.op) {
        case 'recipe.create': {
            if (recipes.some((r) => r.id === intent.targetId)) return recipes;
            const rawIngredients = (p.ingredients as Array<Omit<Ingredient, 'id'>> | undefined) ?? [];
            return [
                ...recipes,
                {
                    id: intent.targetId,
                    title: String(p.title ?? ''),
                    ingredients: rawIngredients.map((ing) => ({ ...ing, id: crypto.randomUUID() })) as Ingredient[],
                    ownerId: String(p.ownerId ?? ''),
                    users: (p.users as Recipe['users']) ?? [],
                    dateAdded: new Date(),
                    ...(p.link !== undefined && { link: String(p.link) }),
                    ...(p.instructions !== undefined && { instructions: p.instructions as string[] }),
                } as Recipe,
            ];
        }
        case 'recipe.update':
            return recipes.map((r) =>
                r.id === intent.targetId
                    ? {
                          ...r,
                          ...(p.title !== undefined && { title: String(p.title) }),
                          ...(p.ingredients !== undefined && { ingredients: p.ingredients as Ingredient[] }),
                          ...(p.link !== undefined && { link: String(p.link) }),
                          ...(p.instructions !== undefined && { instructions: p.instructions as string[] }),
                      }
                    : r
            );
        case 'recipe.delete':
            return recipes.filter((r) => r.id !== intent.targetId);
        default:
            return recipes;
    }
};
