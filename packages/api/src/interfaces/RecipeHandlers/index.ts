import type { Context } from 'koa';
import type { RecipeService } from '../../domain/RecipeService';
import type { Ingredient } from '@shoppingo/types';

export class RecipeHandlers {
  constructor(private recipeService: RecipeService) {}

  async getRecipes(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const recipes = await this.recipeService.getRecipesByUserId(userId);
    ctx.body = recipes;
  }

  async getRecipe(ctx: Context): Promise<void> {
    const { recipeId } = ctx.params;
    try {
      const recipe = await this.recipeService.getRecipe(recipeId);
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async createRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const user = ctx.state.user;
    if (!userId || !user) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const { title, ingredients } = ctx.request.body as {
      title: string;
      ingredients: Ingredient[];
    };
    if (!title || !ingredients) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    try {
      const recipe = await this.recipeService.createRecipe(title, ingredients, userId, user);
      ctx.status = 201;
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async updateRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const { title, ingredients } = ctx.request.body as {
      title: string;
      ingredients: Ingredient[];
    };
    try {
      const recipe = await this.recipeService.updateRecipe(recipeId, title, ingredients, userId);
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async deleteRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    try {
      await this.recipeService.deleteRecipe(recipeId, userId);
      ctx.status = 204;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async addUserToRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const { user } = ctx.request.body as { user: { id: string; username: string } };
    if (!user) {
      ctx.status = 400;
      ctx.body = { error: 'Missing user' };
      return;
    }
    try {
      const recipe = await this.recipeService.addUserToRecipe(recipeId, user, userId);
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async removeUserFromRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId, targetUserId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    try {
      const recipe = await this.recipeService.removeUserFromRecipe(recipeId, targetUserId, userId);
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }

  async setCoverImageKey(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const { coverImageKey } = ctx.request.body as { coverImageKey: string };
    if (!coverImageKey) {
      ctx.status = 400;
      ctx.body = { error: 'Missing coverImageKey' };
      return;
    }
    try {
      const recipe = await this.recipeService.setCoverImageKey(recipeId, coverImageKey, userId);
      ctx.body = recipe;
    } catch (error: any) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message };
    }
  }
}
