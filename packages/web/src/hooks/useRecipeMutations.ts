import type { Ingredient, Recipe, User } from '@shoppingo/types';
import { useQueryClient } from 'react-query';
import { drainOutbox } from '../offline/drainer';
import { applyRecipeIntent } from '../offline/intents';
import { type OutboxIntent, outboxStore } from '../offline/outboxStore';

export const useRecipeMutations = (user: User | undefined) => {
    const queryClient = useQueryClient();
    const userId = user?.id ?? '';

    const enqueueRecipe = async (op: OutboxIntent['op'], targetId: string, payload: Record<string, unknown>) => {
        const intent: Omit<OutboxIntent, 'seq'> = {
            id: crypto.randomUUID(),
            entityType: 'recipe',
            op,
            targetId,
            scope: userId,
            payload,
            createdAt: Date.now(),
        };
        queryClient.setQueryData<Recipe[]>(['recipes', userId], (old) =>
            applyRecipeIntent(old ?? [], intent as OutboxIntent)
        );
        if (op === 'recipe.update') {
            queryClient.setQueryData<Recipe | undefined>(['recipe', targetId], (old) =>
                old ? (applyRecipeIntent([old], intent as OutboxIntent)[0] ?? old) : old
            );
        }
        await outboxStore.enqueue(intent);
        void drainOutbox();
    };

    return {
        createRecipe: async (
            title: string,
            selectedUsers: string[],
            ingredients?: Array<{ name: string; quantity?: number; unit?: string }>,
            link?: string,
            instructions?: string[]
        ): Promise<string> => {
            const id = crypto.randomUUID();
            await enqueueRecipe('recipe.create', id, {
                title,
                selectedUsers,
                ingredients,
                link,
                instructions,
                user,
                users: user ? [user] : [],
                ownerId: userId,
            });
            return id;
        },

        updateRecipe: async (
            recipeId: string,
            title: string,
            ingredients: Ingredient[],
            coverImageKey?: string,
            link?: string,
            instructions?: string[]
        ): Promise<void> => {
            await enqueueRecipe('recipe.update', recipeId, {
                title,
                ingredients,
                ...(coverImageKey !== undefined && { coverImageKey }),
                ...(link !== undefined && { link }),
                ...(instructions !== undefined && { instructions }),
            });
        },

        deleteRecipe: async (recipeId: string): Promise<void> => {
            await enqueueRecipe('recipe.delete', recipeId, {});
        },
    };
};
