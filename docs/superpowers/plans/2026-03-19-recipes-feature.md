# Recipes Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack recipe creation, sharing, and shopping list integration feature.

**Architecture:** Recipes are a new top-level feature (like Lists) with owner/user sharing model. Backend: clean architecture with RecipeService, RecipeRepository, RecipeHandlers. Frontend: RecipesPage (list), RecipeDetailPage (view/edit), AddRecipeDrawer (create), image handling via upload or AI generation.

**Tech Stack:** Backend: Node.js/Koa, MongoDB, MinIO. Frontend: React 19, React Query, shadcn/ui, Framer Motion. Shared types in packages/types.

---

## File Structure

**Backend:**
- `packages/types/src/index.ts` — Add Recipe, Ingredient types
- `packages/api/src/domain/RecipeRepository/index.ts` — Interface (new)
- `packages/api/src/infrastructure/MongoRecipeRepository/index.ts` — Implementation (new)
- `packages/api/src/domain/RecipeService/index.ts` — Service (new)
- `packages/api/src/interfaces/RecipeHandlers/index.ts` — Handlers (new)
- `packages/api/src/routes/index.ts` — Register new routes (modify)
- `packages/api/src/dependencies/index.ts` — DI wiring (modify)
- `packages/api/src/dependencies/types.ts` — DI types (modify)
- `packages/api/src/infrastructure/imageUploadHandler.ts` — Image upload (new)

**Frontend:**
- `packages/web/src/pages/RecipesPage/index.tsx` — List page (new)
- `packages/web/src/pages/RecipeDetailPage/index.tsx` — Detail page (new)
- `packages/web/src/components/RecipesList/index.tsx` — Recipe card grid (new)
- `packages/web/src/components/RecipeCard/index.tsx` — Single recipe card (new)
- `packages/web/src/components/AddRecipeDrawer/index.tsx` — Create/edit form (new)
- `packages/web/src/components/AddRecipeToListDialog/index.tsx` — Select ingredients + list (new)
- `packages/web/src/api/index.ts` — API client functions (modify)
- `packages/web/src/hooks/useRecipePageMutations.ts` — Mutation hooks (new)
- `packages/web/src/index.tsx` — Router registration (modify)

---

## Task Breakdown

### Task 1: Shared Types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add Ingredient and Recipe types**

Edit `packages/types/src/index.ts` to add:

```typescript
export interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  coverImageKey?: string;
  ownerId: string;
  users: User[];
  dateAdded: Date;
}

export interface RecipeResponse {
  id: string;
  name: string;
  ingredients: Ingredient[];
  coverImageKey?: string;
  ownerId: string;
  users: Array<{ id: string; username: string }>;
  dateAdded: Date;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "types: add Recipe and Ingredient types"
```

---

### Task 2: RecipeRepository (Backend)

**Files:**
- Create: `packages/api/src/domain/RecipeRepository/index.ts`
- Create: `packages/api/src/infrastructure/MongoRecipeRepository/index.ts`

- [ ] **Step 1: Write RecipeRepository interface**

Create `packages/api/src/domain/RecipeRepository/index.ts`:

```typescript
import type { Recipe, User } from '@shoppingo/types';

export interface RecipeRepository {
  getById(recipeId: string): Promise<Recipe | null>;
  findByUserId(userId: string): Promise<Recipe[]>;
  insert(recipe: Recipe): Promise<Recipe>;
  update(recipeId: string, recipe: Recipe): Promise<Recipe>;
  deleteById(recipeId: string): Promise<void>;
  addUser(recipeId: string, user: User): Promise<Recipe>;
  removeUser(recipeId: string, userId: string): Promise<Recipe>;
}
```

- [ ] **Step 2: Implement MongoRecipeRepository**

Create `packages/api/src/infrastructure/MongoRecipeRepository/index.ts`:

```typescript
import type { Recipe, User } from '@shoppingo/types';
import type { MongoDbConnection } from '@imapps/api-utils';
import type { RecipeRepository } from '../../domain/RecipeRepository';

export class MongoRecipeRepository implements RecipeRepository {
  constructor(private db: MongoDbConnection<{ recipe: Recipe }>) {}

  async getById(recipeId: string): Promise<Recipe | null> {
    return this.db.getCollection('recipe').findOne({ id: recipeId });
  }

  async findByUserId(userId: string): Promise<Recipe[]> {
    return this.db.getCollection('recipe').find({ 'users.id': userId }).toArray();
  }

  async insert(recipe: Recipe): Promise<Recipe> {
    await this.db.getCollection('recipe').insertOne(recipe);
    return recipe;
  }

  async update(recipeId: string, recipe: Recipe): Promise<Recipe> {
    const result = await this.db.getCollection('recipe').findOneAndReplace(
      { id: recipeId },
      recipe,
      { returnDocument: 'after' }
    );
    return result.value as Recipe;
  }

  async deleteById(recipeId: string): Promise<void> {
    await this.db.getCollection('recipe').deleteOne({ id: recipeId });
  }

  async addUser(recipeId: string, user: User): Promise<Recipe> {
    const result = await this.db.getCollection('recipe').findOneAndUpdate(
      { id: recipeId },
      { $push: { users: user } },
      { returnDocument: 'after' }
    );
    return result.value as Recipe;
  }

  async removeUser(recipeId: string, userId: string): Promise<Recipe> {
    const result = await this.db.getCollection('recipe').findOneAndUpdate(
      { id: recipeId },
      { $pull: { users: { id: userId } } },
      { returnDocument: 'after' }
    );
    return result.value as Recipe;
  }
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/domain/RecipeRepository/index.ts packages/api/src/infrastructure/MongoRecipeRepository/index.ts
git commit -m "feat: add RecipeRepository interface and MongoRecipeRepository implementation"
```

---

### Task 3: RecipeService (Backend)

**Files:**
- Create: `packages/api/src/domain/RecipeService/index.ts`

- [ ] **Step 1: Write RecipeService class**

Create `packages/api/src/domain/RecipeService/index.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/domain/RecipeService/index.ts
git commit -m "feat: add RecipeService with CRUD and user management"
```

---

### Task 4: RecipeHandlers (Backend)

**Files:**
- Create: `packages/api/src/interfaces/RecipeHandlers/index.ts`

- [ ] **Step 1: Write RecipeHandlers**

Create `packages/api/src/interfaces/RecipeHandlers/index.ts`:

```typescript
import type { Context } from 'koa';
import type { RecipeService } from '../../domain/RecipeService';
import type { Ingredient, Recipe } from '@shoppingo/types';

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
    const { name, ingredients } = ctx.request.body as {
      name: string;
      ingredients: Ingredient[];
    };
    if (!name || !ingredients) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }
    const recipe = await this.recipeService.createRecipe(name, ingredients, userId, user);
    ctx.status = 201;
    ctx.body = recipe;
  }

  async updateRecipe(ctx: Context): Promise<void> {
    const userId = ctx.state.user?.id;
    const { recipeId } = ctx.params;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized' };
      return;
    }
    const { name, ingredients } = ctx.request.body as {
      name: string;
      ingredients: Ingredient[];
    };
    try {
      const recipe = await this.recipeService.updateRecipe(recipeId, name, ingredients, userId);
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/interfaces/RecipeHandlers/index.ts
git commit -m "feat: add RecipeHandlers with all route handlers"
```

---

### Task 5: DI Container Setup (Backend)

**Files:**
- Modify: `packages/api/src/dependencies/types.ts`
- Modify: `packages/api/src/dependencies/index.ts`

- [ ] **Step 1: Add DI tokens and types**

Edit `packages/api/src/dependencies/types.ts` to add:

```typescript
export enum DependencyToken {
  // ... existing tokens ...
  RecipeRepository = 'RecipeRepository',
  RecipeService = 'RecipeService',
  RecipeHandlers = 'RecipeHandlers',
}

export interface Dependencies {
  // ... existing ...
  [DependencyToken.RecipeRepository]: RecipeRepository;
  [DependencyToken.RecipeService]: RecipeService;
  [DependencyToken.RecipeHandlers]: RecipeHandlers;
}
```

- [ ] **Step 2: Wire DI container in dependencies/index.ts**

Edit `packages/api/src/dependencies/index.ts` to add in `registerDependencies()`:

```typescript
import { RecipeRepository } from '../domain/RecipeRepository';
import { MongoRecipeRepository } from '../infrastructure/MongoRecipeRepository';
import { RecipeService } from '../domain/RecipeService';
import { RecipeHandlers } from '../interfaces/RecipeHandlers';

// In registerDependencies():
container.registerSingleton(
  DependencyToken.RecipeRepository,
  class {
    constructor() {
      return new MongoRecipeRepository(container.resolve(DependencyToken.Database));
    }
  } as any
);

container.registerSingleton(
  DependencyToken.RecipeService,
  class {
    constructor() {
      return new RecipeService(
        container.resolve(DependencyToken.RecipeRepository),
        container.resolve(DependencyToken.IdGenerator)
      );
    }
  } as any
);

container.registerSingleton(
  DependencyToken.RecipeHandlers,
  class {
    constructor() {
      return new RecipeHandlers(container.resolve(DependencyToken.RecipeService));
    }
  } as any
);
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/dependencies/types.ts packages/api/src/dependencies/index.ts
git commit -m "feat: wire RecipeService and handlers in DI container"
```

---

### Task 6: API Routes (Backend)

**Files:**
- Modify: `packages/api/src/routes/index.ts`

- [ ] **Step 1: Register recipe routes**

Edit `packages/api/src/routes/index.ts` and add after other routes:

```typescript
const recipeHandlers = container.resolve(DependencyToken.RecipeHandlers);

// Recipes
router.get('/api/recipes', authenticate, (ctx) => recipeHandlers.getRecipes(ctx));
router.post('/api/recipes', authenticate, (ctx) => recipeHandlers.createRecipe(ctx));
router.get('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.getRecipe(ctx));
router.put('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.updateRecipe(ctx));
router.delete('/api/recipes/:recipeId', authenticate, (ctx) => recipeHandlers.deleteRecipe(ctx));
router.post('/api/recipes/:recipeId/users', authenticate, (ctx) => recipeHandlers.addUserToRecipe(ctx));
router.delete('/api/recipes/:recipeId/users/:targetUserId', authenticate, (ctx) => recipeHandlers.removeUserFromRecipe(ctx));
router.put('/api/recipes/:recipeId/image', authenticate, (ctx) => recipeHandlers.setCoverImageKey(ctx));
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routes/index.ts
git commit -m "feat: add recipe API routes"
```

---

### Task 7: Frontend API Client

**Files:**
- Modify: `packages/web/src/api/index.ts`

- [ ] **Step 1: Add recipe API functions**

Edit `packages/web/src/api/index.ts` and add:

```typescript
// Recipe queries
export const getRecipesQuery = (userId: string) => ({
  queryKey: ['recipes', userId],
  queryFn: () => makeRequest({ pathname: '/api/recipes', method: MethodType.GET }),
});

export const getRecipeQuery = (recipeId: string) => ({
  queryKey: ['recipe', recipeId],
  queryFn: () => makeRequest({ pathname: `/api/recipes/${recipeId}`, method: MethodType.GET }),
});

// Recipe mutations
export const addRecipe = (name: string, ingredients: Ingredient[]) =>
  makeRequest({
    pathname: '/api/recipes',
    method: MethodType.POST,
    body: { name, ingredients },
  });

export const updateRecipe = (recipeId: string, name: string, ingredients: Ingredient[]) =>
  makeRequest({
    pathname: `/api/recipes/${recipeId}`,
    method: MethodType.PUT,
    body: { name, ingredients },
  });

export const deleteRecipe = (recipeId: string) =>
  makeRequest({
    pathname: `/api/recipes/${recipeId}`,
    method: MethodType.DELETE,
  });

export const addUserToRecipe = (recipeId: string, user: { id: string; username: string }) =>
  makeRequest({
    pathname: `/api/recipes/${recipeId}/users`,
    method: MethodType.POST,
    body: { user },
  });

export const removeUserFromRecipe = (recipeId: string, userId: string) =>
  makeRequest({
    pathname: `/api/recipes/${recipeId}/users/${userId}`,
    method: MethodType.DELETE,
  });

export const setCoverImageKey = (recipeId: string, coverImageKey: string) =>
  makeRequest({
    pathname: `/api/recipes/${recipeId}/image`,
    method: MethodType.PUT,
    body: { coverImageKey },
  });
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/api/index.ts
git commit -m "feat: add recipe API client functions"
```

---

### Task 8: Frontend Mutation Hooks

**Files:**
- Create: `packages/web/src/hooks/useRecipePageMutations.ts`

- [ ] **Step 1: Write mutation hook**

Create `packages/web/src/hooks/useRecipePageMutations.ts`:

```typescript
import { useMutation, useQueryClient } from 'react-query';
import { addRecipe, deleteRecipe, updateRecipe, addUserToRecipe, removeUserFromRecipe } from '../api';
import type { Ingredient, User } from '@shoppingo/types';

export const useRecipePageMutations = (recipeId?: string) => {
  const queryClient = useQueryClient();

  const addRecipeMutation = useMutation(
    ({ name, ingredients }: { name: string; ingredients: Ingredient[] }) =>
      addRecipe(name, ingredients),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recipes'] });
      },
    }
  );

  const updateRecipeMutation = useMutation(
    ({ name, ingredients }: { name: string; ingredients: Ingredient[] }) =>
      updateRecipe(recipeId!, name, ingredients),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
        queryClient.invalidateQueries({ queryKey: ['recipes'] });
      },
    }
  );

  const deleteRecipeMutation = useMutation(() => deleteRecipe(recipeId!), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const addUserMutation = useMutation(
    (user: User) => addUserToRecipe(recipeId!, user),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      },
    }
  );

  const removeUserMutation = useMutation(
    (userId: string) => removeUserFromRecipe(recipeId!, userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      },
    }
  );

  return {
    addRecipeMutation,
    updateRecipeMutation,
    deleteRecipeMutation,
    addUserMutation,
    removeUserMutation,
  };
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useRecipePageMutations.ts
git commit -m "feat: add useRecipePageMutations hook"
```

---

### Task 9: Frontend Components (RecipeCard, RecipesList)

**Files:**
- Create: `packages/web/src/components/RecipeCard/index.tsx`
- Create: `packages/web/src/components/RecipesList/index.tsx`

- [ ] **Step 1: Write RecipeCard component**

Create `packages/web/src/components/RecipeCard/index.tsx`:

```typescript
import { motion } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import type { RecipeResponse } from '@shoppingo/types';
import { useItemImage } from '../../hooks/useItemImage';

interface RecipeCardProps {
  recipe: RecipeResponse;
  onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
  const { imageBlobUrl, hasLoadedImage } = useItemImage(recipe.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="h-32 w-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden">
          {imageBlobUrl && hasLoadedImage ? (
            <img src={imageBlobUrl} alt={recipe.name} className="h-full w-full object-cover" />
          ) : (
            <div className="text-4xl">🍳</div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm truncate">{recipe.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{recipe.ingredients.length} ingredients</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
```

- [ ] **Step 2: Write RecipesList component**

Create `packages/web/src/components/RecipesList/index.tsx`:

```typescript
import { RecipeCard } from '../RecipeCard';
import type { RecipeResponse } from '@shoppingo/types';

interface RecipesListProps {
  recipes: RecipeResponse[];
  onRecipeClick: (recipeId: string) => void;
}

export const RecipesList = ({ recipes, onRecipeClick }: RecipesListProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={() => onRecipeClick(recipe.id)}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/RecipeCard/index.tsx packages/web/src/components/RecipesList/index.tsx
git commit -m "feat: add RecipeCard and RecipesList components"
```

---

### Task 10: Frontend RecipesPage

**Files:**
- Create: `packages/web/src/pages/RecipesPage/index.tsx`

- [ ] **Step 1: Write RecipesPage**

Create `packages/web/src/pages/RecipesPage/index.tsx`:

```typescript
import { useUser } from '@imapps/web-utils';
import { AlertTriangle, ChefHat } from 'lucide-react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getRecipesQuery } from '../../api';
import { RecipesList } from '../../components/RecipesList';
import { Button } from '../../components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';
import { logger } from '../../utils/logger';
import ToolBar from '../../components/ToolBar';

const RecipesPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  const { data: recipes = [], isLoading, isError, refetch } = useQuery({
    ...getRecipesQuery(user?.id || ''),
    enabled: !!user?.id,
  });

  if (!user?.id) {
    logger.warn('Recipes page accessed without user');
    return <div>User not available</div>;
  }

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };

  const emptyContent = (
    <Empty className="flex-none justify-start p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChefHat />
        </EmptyMedia>
        <EmptyTitle>No recipes yet</EmptyTitle>
        <EmptyDescription>Create your first recipe to get started</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  const errorContent = (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex items-center gap-3 text-destructive mb-3">
        <AlertTriangle className="h-6 w-6" />
        <span className="font-semibold">Unable to load your recipes</span>
      </div>
      <p className="text-muted-foreground mb-4 max-w-sm">Please check your connection and try again.</p>
      <Button variant="default" onClick={() => void refetch()}>
        Retry
      </Button>
    </div>
  );

  return (
    <>
      {isError && errorContent}
      {isLoading && <div>Loading...</div>}
      {!isLoading && !isError && (
        <>
          {recipes.length > 0 ? (
            <RecipesList recipes={recipes} onRecipeClick={handleRecipeClick} />
          ) : (
            emptyContent
          )}
        </>
      )}

      <ToolBar placeholder="Recipe name..." />
    </>
  );
};

export default RecipesPage;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/RecipesPage/index.tsx
git commit -m "feat: add RecipesPage with recipe list"
```

---

### Task 11: Frontend AddRecipeDrawer

**Files:**
- Create: `packages/web/src/components/AddRecipeDrawer/index.tsx`

- [ ] **Step 1: Write AddRecipeDrawer**

Create `packages/web/src/components/AddRecipeDrawer/index.tsx`:

```typescript
import { Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { Ingredient } from '@shoppingo/types';

interface AddRecipeDrawerProps {
  onAdd: (name: string, ingredients: Ingredient[]) => Promise<void>;
  isEditing?: boolean;
  initialName?: string;
  initialIngredients?: Ingredient[];
}

export const AddRecipeDrawer = ({
  onAdd,
  isEditing = false,
  initialName = '',
  initialIngredients = [],
}: AddRecipeDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [isLoading, setIsLoading] = useState(false);
  const nameId = useId();

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { id: '', name: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await onAdd(name.trim(), ingredients.filter(ing => ing.name.trim()));
      setName('');
      setIngredients([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
          <Plus className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>{isEditing ? 'Edit Recipe' : 'Add New Recipe'}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 p-4 pb-0">
            {/* Cover Image Placeholder */}
            <div>
              <Label className="text-sm font-medium">Cover Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 mt-2 bg-accent/30 flex flex-col items-center justify-center gap-3 min-h-40">
                <div className="text-5xl">🖼️</div>
                <p className="text-xs text-muted-foreground text-center">Add a cover image for your recipe</p>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1">📱 Upload</Button>
                  <Button variant="outline" size="sm" className="flex-1">✨ Generate</Button>
                </div>
              </div>
            </div>

            {/* Recipe Name */}
            <div>
              <Label htmlFor={nameId} className="text-sm font-medium">
                Recipe Name
              </Label>
              <Input
                id={nameId}
                placeholder="e.g., Pasta Carbonara"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Ingredients */}
            <div>
              <Label className="text-sm font-medium">Ingredients</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Ingredient"
                      value={ingredient.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      className="flex-1"
                      size={12}
                    />
                    <Input
                      placeholder="Qty"
                      type="number"
                      value={ingredient.quantity || ''}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-20"
                      size={12}
                    />
                    <Input
                      placeholder="Unit"
                      value={ingredient.unit || ''}
                      onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                      className="w-20"
                      size={12}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIngredient(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={handleAddIngredient} className="w-full mt-2">
                + Add Ingredient
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>
              {isLoading ? 'Saving...' : 'Save Recipe'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/AddRecipeDrawer/index.tsx
git commit -m "feat: add AddRecipeDrawer component"
```

---

### Task 12: Frontend RecipeDetailPage (Part 1: View)

**Files:**
- Create: `packages/web/src/pages/RecipeDetailPage/index.tsx`

- [ ] **Step 1: Write RecipeDetailPage**

Create `packages/web/src/pages/RecipeDetailPage/index.tsx`:

```typescript
import { AlertTriangle } from 'lucide-react';
import { useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getRecipeQuery } from '../../api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useItemImage } from '../../hooks/useItemImage';
import { logger } from '../../utils/logger';
import { useUser } from '@imapps/web-utils';

const RecipeDetailPage = () => {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: recipe, isLoading, isError, refetch } = useQuery({
    ...getRecipeQuery(recipeId || ''),
    enabled: !!recipeId,
  });

  const { imageBlobUrl, hasLoadedImage } = useItemImage(recipe?.name || '');

  if (!recipeId) {
    return <div>Invalid recipe ID</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex items-center gap-3 text-destructive mb-3">
          <AlertTriangle className="h-6 w-6" />
          <span className="font-semibold">Unable to load recipe</span>
        </div>
        <Button onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  if (isLoading || !recipe) {
    return <div>Loading...</div>;
  }

  const isOwner = recipe.ownerId === user?.id;

  return (
    <div className="space-y-6">
      {/* Recipe Image */}
      <div className="h-60 w-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
        {imageBlobUrl && hasLoadedImage ? (
          <img src={imageBlobUrl} alt={recipe.name} className="h-full w-full object-cover" />
        ) : (
          <div className="text-6xl">🍳</div>
        )}
      </div>

      {/* Recipe Info */}
      <div>
        <h1 className="text-2xl font-bold">{recipe.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">By @{recipe.users[0]?.username}</p>
      </div>

      {/* Ingredients */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="text-sm">
                {ing.quantity && ing.unit ? `${ing.quantity} ${ing.unit} ` : ''}{ing.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" size="lg">Add to Shopping List</Button>
        {isOwner && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">Edit</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        )}
        {isOwner && <Button variant="outline" className="w-full">Manage Users</Button>}
      </div>
    </div>
  );
};

export default RecipeDetailPage;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/RecipeDetailPage/index.tsx
git commit -m "feat: add RecipeDetailPage with view and actions"
```

---

### Task 13: Frontend Router Registration

**Files:**
- Modify: `packages/web/src/index.tsx`

- [ ] **Step 1: Register recipes routes**

Edit `packages/web/src/index.tsx` to add routes under the protected `/` route:

```typescript
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';

// In the router configuration, under the protected route:
{
  path: 'recipes',
  element: <Suspense fallback={<div>Loading...</div>}><RecipesPage /></Suspense>,
},
{
  path: 'recipes/:recipeId',
  element: <Suspense fallback={<div>Loading...</div>}><RecipeDetailPage /></Suspense>,
},
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `bun run tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/index.tsx
git commit -m "feat: register recipes routes in router"
```

---

### Task 14: Integration & Testing

**Files:**
- All modified files

- [ ] **Step 1: Run linter and fix issues**

Run: `bun run lint:fix`
Expected: All linting issues resolved

- [ ] **Step 2: Type check**

Run: `bun run tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run API tests**

Run: `bun run --filter @shoppingo/api test`
Expected: All tests pass

- [ ] **Step 4: Build web package**

Run: `bun run --filter @shoppingo/web build`
Expected: Build succeeds

- [ ] **Step 5: Commit integration**

```bash
git add -A
git commit -m "feat: recipes feature complete - all tests passing"
```

---

## Summary

This plan implements the complete recipes feature in 14 tasks:

1. **Shared types** - Recipe, Ingredient interfaces
2. **Backend repository** - MongoRecipeRepository
3. **Backend service** - RecipeService with CRUD
4. **Backend handlers** - RecipeHandlers for routes
5. **DI wiring** - Container setup
6. **API routes** - Koa route definitions
7. **Frontend API client** - Query and mutation functions
8. **Frontend mutations** - React Query hooks
9. **Frontend components** - RecipeCard, RecipesList
10. **RecipesPage** - List view
11. **AddRecipeDrawer** - Create/edit form
12. **RecipeDetailPage** - Detail view
13. **Router registration** - Wire pages into routing
14. **Integration** - Linting, types, tests, builds

Each task produces working, testable code with frequent commits.
