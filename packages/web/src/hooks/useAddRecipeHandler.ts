import type { Recipe, User } from '@shoppingo/types';
import type { MutableRefObject } from 'react';
import type { QueryClient } from 'react-query';
import { generateRecipeAiImage, getRecipesQuery, uploadRecipeImage } from '../api';
import { logger } from '../utils/logger';

type CreateRecipe = (
    title: string,
    selectedUsers: string[],
    ingredients?: Array<{ name: string; quantity?: number; unit?: string }>,
    link?: string,
    instructions?: string[]
) => Promise<string>;

interface UseAddRecipeHandlerArgs {
    user: User | undefined;
    createRecipe: CreateRecipe;
    refetch: () => Promise<unknown>;
    queryClient: QueryClient;
    generatingRef: MutableRefObject<Set<string>>;
}

const formatErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

const attachRecipeImage = async (
    recipeId: string,
    imageFile: File | undefined,
    userId: string,
    queryClient: QueryClient,
    generatingRef: MutableRefObject<Set<string>>
): Promise<void> => {
    if (imageFile) {
        await uploadRecipeImage(recipeId, imageFile);
        return;
    }

    generatingRef.current.add(recipeId);
    void generateRecipeAiImage(recipeId).then(() => queryClient.invalidateQueries(getRecipesQuery(userId).queryKey));
};

export const useAddRecipeHandler = ({
    user,
    createRecipe,
    refetch,
    queryClient,
    generatingRef,
}: UseAddRecipeHandlerArgs) => {
    // fallow-ignore-next-line complexity
    return async (
        title: string,
        ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
        _imageKey?: string,
        selectedUsers?: string[],
        link?: string,
        instructions?: string[],
        imageFile?: File
    ): Promise<Recipe | undefined> => {
        if (!user) {
            logger.warn('Attempted to add recipe without user');
            return undefined;
        }

        try {
            const recipeId = await createRecipe(title, selectedUsers || [], ingredients, link, instructions);
            logger.info('Recipe created successfully', { title, recipeId });

            await attachRecipeImage(recipeId, imageFile, user.id, queryClient, generatingRef);
            await refetch();

            const recipes = queryClient.getQueryData<Recipe[]>(['recipes', user.id]) ?? [];
            return recipes.find((r) => r.id === recipeId);
        } catch (error) {
            logger.error('Failed to create recipe', { title, error: formatErrorMessage(error) });
            throw error;
        }
    };
};
