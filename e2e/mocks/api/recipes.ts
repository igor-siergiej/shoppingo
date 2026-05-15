import type { Route } from '@playwright/test';
import type { RecipeResponse } from '@shoppingo/types';
import { makeRecipe } from '../data/recipes';
import type { MockState } from './index';

const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json' as const,
    body: JSON.stringify(body),
});

export async function handleRecipeRoute(
    route: Route,
    path: string,
    method: string,
    state: MockState
): Promise<boolean> {
    // POST/DELETE /api/recipes/:id/users/:userId
    const recipeUserIdMatch = path.match(/^\/api\/recipes\/([^/]+)\/users\/([^/]+)$/);
    if (recipeUserIdMatch && method === 'DELETE') {
        const id = recipeUserIdMatch[1];
        const userId = recipeUserIdMatch[2];
        const recipe = state.recipes.find((r) => r.id === id);
        if (recipe) {
            const userToRemove = state.users.find((u) => u.id === userId);
            if (userToRemove) {
                recipe.users = recipe.users.filter((u) => u.username !== userToRemove.username);
            }
        }
        await route.fulfill(json(recipe ?? {}));
        return true;
    }

    // POST /api/recipes/:id/users — add user
    const recipeUsersMatch = path.match(/^\/api\/recipes\/([^/]+)\/users$/);
    if (recipeUsersMatch && method === 'POST') {
        const id = recipeUsersMatch[1];
        const body = JSON.parse(route.request().postData() ?? '{}');
        const recipe = state.recipes.find((r) => r.id === id);
        if (recipe && body.user?.username) {
            const exists = recipe.users.some((u) => u.username === body.user.username);
            if (!exists) recipe.users.push({ username: body.user.username });
        }
        await route.fulfill(json(recipe ?? {}));
        return true;
    }

    // POST /api/recipes/:id/image/generate
    const imageGenerateMatch = path.match(/^\/api\/recipes\/([^/]+)\/image\/generate$/);
    if (imageGenerateMatch && method === 'POST') {
        const id = imageGenerateMatch[1];
        const recipe = state.recipes.find((r) => r.id === id);
        await route.fulfill(json(recipe ?? {}));
        return true;
    }

    // POST /api/recipes/:id/image/upload
    const imageUploadMatch = path.match(/^\/api\/recipes\/([^/]+)\/image\/upload$/);
    if (imageUploadMatch && method === 'POST') {
        const id = imageUploadMatch[1];
        const recipe = state.recipes.find((r) => r.id === id);
        await route.fulfill(json({ imageKey: 'mock-image-key', recipe: recipe ?? {} }));
        return true;
    }

    // PUT /api/recipes/:id/image
    const imageKeyMatch = path.match(/^\/api\/recipes\/([^/]+)\/image$/);
    if (imageKeyMatch && method === 'PUT') {
        const id = imageKeyMatch[1];
        const body = JSON.parse(route.request().postData() ?? '{}');
        const recipe = state.recipes.find((r) => r.id === id);
        if (recipe) recipe.coverImageKey = body.imageKey;
        await route.fulfill(json(recipe ?? {}));
        return true;
    }

    // GET /api/recipes/:id
    const recipeByIdMatch = path.match(/^\/api\/recipes\/([^/]+)$/);
    if (recipeByIdMatch && method === 'GET') {
        const id = recipeByIdMatch[1];
        const recipe = state.recipes.find((r) => r.id === id);
        if (!recipe) {
            await route.fulfill(json({ error: 'Recipe not found' }, 404));
        } else {
            await route.fulfill(json(recipe));
        }
        return true;
    }

    // PUT /api/recipes/:id — update recipe
    if (recipeByIdMatch && method === 'PUT') {
        const id = recipeByIdMatch[1];
        const body = JSON.parse(route.request().postData() ?? '{}') as Partial<RecipeResponse>;
        const recipe = state.recipes.find((r) => r.id === id);
        if (recipe) {
            if (body.title !== undefined) recipe.title = body.title;
            if (body.ingredients !== undefined) recipe.ingredients = body.ingredients;
            if (body.link !== undefined) recipe.link = body.link;
            if (body.instructions !== undefined) recipe.instructions = body.instructions;
        }
        await route.fulfill(json(recipe ?? {}));
        return true;
    }

    // DELETE /api/recipes/:id
    if (recipeByIdMatch && method === 'DELETE') {
        const id = recipeByIdMatch[1];
        const idx = state.recipes.findIndex((r) => r.id === id);
        if (idx !== -1) state.recipes.splice(idx, 1);
        await route.fulfill({ status: 204, body: '' });
        return true;
    }

    // GET /api/recipes
    if (path === '/api/recipes' && method === 'GET') {
        await route.fulfill(json(state.recipes));
        return true;
    }

    // PUT /api/recipes — create
    if (path === '/api/recipes' && method === 'PUT') {
        const body = JSON.parse(route.request().postData() ?? '{}');
        const newRecipe = makeRecipe({
            title: body.title,
            ingredients: body.ingredients ?? [],
            link: body.link,
            instructions: body.instructions,
        });
        state.recipes.push(newRecipe);
        await route.fulfill(json(newRecipe));
        return true;
    }

    // GET /api/image/:name — return 404 (no real images in tests)
    if (/^\/api\/image\//.test(path) && method === 'GET') {
        await route.fulfill({ status: 404, body: '' });
        return true;
    }

    return false;
}
