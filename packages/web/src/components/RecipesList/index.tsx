import type { Recipe } from '@shoppingo/types';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { RecipeCard } from '../RecipeCard';

interface RecipesListProps {
    recipes: Recipe[];
    onRecipeClick: (recipeId: string) => void;
    isLoading?: boolean;
    generatingImageIds?: Set<string>;
}

export const RecipesList = ({ recipes, onRecipeClick, isLoading, generatingImageIds }: RecipesListProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                {[1, 2, 3, 4, 5, 6].map((value) => (
                    <Card key={value} className="overflow-hidden h-full">
                        <CardContent className="p-0 h-40 bg-muted flex items-center justify-center">
                            <Skeleton className="h-full w-full" />
                        </CardContent>
                        <CardContent className="p-3">
                            <Skeleton className="h-5 w-3/4 mb-3" />
                            <Skeleton className="h-6 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (recipes.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="text-4xl mb-3">📖</div>
                    <p className="text-muted-foreground">No recipes yet. Create one to get started!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 px-2">
            {recipes.map((recipe) => (
                <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => onRecipeClick(recipe.id)}
                    isGeneratingImage={generatingImageIds?.has(recipe.id) ?? false}
                />
            ))}
        </div>
    );
};
