import type { Recipe, User } from '@shoppingo/types';

export interface RecipeRepository {
    getById(recipeId: string): Promise<Recipe | null>;
    findByUserId(userId: string): Promise<Recipe[]>;
    insert(recipe: Recipe): Promise<Recipe>;
    update(recipeId: string, recipe: Recipe): Promise<Recipe>;
    deleteById(recipeId: string): Promise<void>;
    addUser(recipeId: string, user: User): Promise<Recipe>;
    removeUser(recipeId: string, userId: string): Promise<Recipe>;
    setCoverImageKey(recipeId: string, key: string): Promise<void>;
}
