import type { Recipe, User } from '@shoppingo/types';

export interface RecipeRepository {
    getById(recipeId: string): Promise<Recipe | null>;
    findByUserId(userId: string): Promise<Recipe[]>;
    insert(recipe: Recipe): Promise<void>;
    update(recipeId: string, recipe: Recipe): Promise<void>;
    deleteById(recipeId: string): Promise<void>;
    addUser(recipeId: string, user: User): Promise<void>;
    removeUser(recipeId: string, userId: string): Promise<void>;
}
