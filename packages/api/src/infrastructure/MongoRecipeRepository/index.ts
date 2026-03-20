import type { MongoDbConnection } from '@imapps/api-utils';
import type { Recipe, User } from '@shoppingo/types';

import { CollectionNames } from '../../dependencies/types';
import type { RecipeRepository } from '../../domain/RecipeRepository';

export class MongoRecipeRepository implements RecipeRepository {
    constructor(private readonly db: MongoDbConnection<{ [CollectionNames.Recipe]: Recipe }>) {}

    private collection() {
        return this.db.getCollection(CollectionNames.Recipe);
    }

    async getById(recipeId: string): Promise<Recipe | null> {
        return this.collection().findOne({ id: recipeId });
    }

    async findByUserId(userId: string): Promise<Recipe[]> {
        return this.collection().find({ 'users.id': userId }).toArray();
    }

    async insert(recipe: Recipe): Promise<Recipe> {
        await this.collection().insertOne(recipe);
        return recipe;
    }

    async update(recipeId: string, recipe: Recipe): Promise<Recipe> {
        const result = await this.collection().findOneAndReplace({ id: recipeId }, recipe, { returnDocument: 'after' });
        return result.value as Recipe;
    }

    async deleteById(recipeId: string): Promise<void> {
        await this.collection().deleteOne({ id: recipeId });
    }

    async addUser(recipeId: string, user: User): Promise<Recipe> {
        const result = await this.collection().findOneAndUpdate(
            { id: recipeId },
            { $push: { users: user } },
            { returnDocument: 'after' }
        );
        return result.value as Recipe;
    }

    async removeUser(recipeId: string, userId: string): Promise<Recipe> {
        const result = await this.collection().findOneAndUpdate(
            { id: recipeId },
            { $pull: { users: { id: userId } } },
            { returnDocument: 'after' }
        );
        return result.value as Recipe;
    }
}
