import type { Ingredient, Recipe, User } from '@shoppingo/types';
import type { RecipeRepository } from '../RecipeRepository';
import type { IdGenerator } from '@imapps/api-utils';

export class RecipeService {
  constructor(
    private recipeRepository: RecipeRepository,
    private idGenerator: IdGenerator,
  ) {}

  async createRecipe(
    name: string,
    ingredients: Ingredient[],
    ownerId: string,
    owner: User,
  ): Promise<Recipe> {
    const recipe: Recipe = {
      id: this.idGenerator.generate(),
      name,
      ingredients: ingredients.map(ing => ({
        ...ing,
        id: this.idGenerator.generate(),
      })),
      ownerId,
      users: [owner],
      dateAdded: new Date(),
    };
    return this.recipeRepository.insert(recipe);
  }

  async getRecipe(recipeId: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.getById(recipeId);
    if (!recipe) {
      const error = new Error('Recipe not found');
      Object.assign(error, { status: 404 });
      throw error;
    }
    return recipe;
  }

  async getRecipesByUserId(userId: string): Promise<Recipe[]> {
    return this.recipeRepository.findByUserId(userId);
  }

  async updateRecipe(
    recipeId: string,
    name: string,
    ingredients: Ingredient[],
    ownerId: string,
  ): Promise<Recipe> {
    const recipe = await this.getRecipe(recipeId);
    if (recipe.ownerId !== ownerId) {
      const error = new Error('Only recipe owner can update');
      Object.assign(error, { status: 403 });
      throw error;
    }
    recipe.name = name;
    recipe.ingredients = ingredients.map(ing => ({
      ...ing,
      id: ing.id || this.idGenerator.generate(),
    }));
    return this.recipeRepository.update(recipeId, recipe);
  }

  async deleteRecipe(recipeId: string, userId: string): Promise<void> {
    const recipe = await this.getRecipe(recipeId);
    if (recipe.ownerId !== userId) {
      const error = new Error('Only recipe owner can delete');
      Object.assign(error, { status: 403 });
      throw error;
    }
    await this.recipeRepository.deleteById(recipeId);
  }

  async addUserToRecipe(recipeId: string, user: User, ownerId: string): Promise<Recipe> {
    const recipe = await this.getRecipe(recipeId);
    if (recipe.ownerId !== ownerId) {
      const error = new Error('Only recipe owner can add users');
      Object.assign(error, { status: 403 });
      throw error;
    }
    if (recipe.users.some(u => u.id === user.id)) {
      return recipe; // Already a member
    }
    return this.recipeRepository.addUser(recipeId, user);
  }

  async removeUserFromRecipe(recipeId: string, userId: string, ownerId: string): Promise<Recipe> {
    const recipe = await this.getRecipe(recipeId);
    if (recipe.ownerId !== ownerId) {
      const error = new Error('Only recipe owner can remove users');
      Object.assign(error, { status: 403 });
      throw error;
    }
    if (userId === recipe.ownerId) {
      const error = new Error('Cannot remove recipe owner');
      Object.assign(error, { status: 400 });
      throw error;
    }
    if (recipe.users.length === 1) {
      const error = new Error('Cannot remove last user');
      Object.assign(error, { status: 400 });
      throw error;
    }
    return this.recipeRepository.removeUser(recipeId, userId);
  }

  async setCoverImageKey(recipeId: string, coverImageKey: string, userId: string): Promise<Recipe> {
    const recipe = await this.getRecipe(recipeId);
    if (recipe.ownerId !== userId) {
      const error = new Error('Only recipe owner can update image');
      Object.assign(error, { status: 403 });
      throw error;
    }
    recipe.coverImageKey = coverImageKey;
    return this.recipeRepository.update(recipeId, recipe);
  }
}
