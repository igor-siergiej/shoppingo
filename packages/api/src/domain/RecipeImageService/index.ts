import type { Logger } from '@imapps/api-utils';
import type { Ingredient } from '@shoppingo/types';

import type { ImageGenerator, ImageStore } from '../ImageService/types';

export class RecipeImageService {
    constructor(
        private readonly store: ImageStore,
        private readonly generator: ImageGenerator,
        private readonly logger?: Logger
    ) {}

    async generateRecipeImage(recipeId: string, title: string, ingredients: Ingredient[]): Promise<string> {
        const key = `recipe-images/${recipeId}`;

        try {
            await this.store.getHeadObject(key);
            this.logger?.info('Recipe image already exists in store', { recipeId });
            return key;
        } catch {
            this.logger?.info('Recipe image not found in store, generating', { recipeId });
        }

        const prompt = this.generatePrompt(title, ingredients);
        const { buffer, contentType } = await this.generator.generateImage(prompt);

        this.logger?.info('Recipe image generated', { recipeId, contentType });

        await this.store.putObject(key, buffer, { contentType });

        return key;
    }

    private generatePrompt(title: string, ingredients: Ingredient[]): string {
        const top = ingredients
            .slice(0, 5)
            .map((i) => i.name)
            .join(', ');
        const clause = top ? `, featuring ${top}` : '';
        return `Appetising food photography of ${title}${clause}, soft natural lighting, shallow depth of field, served on a wooden table, no text, no watermark.`;
    }
}
