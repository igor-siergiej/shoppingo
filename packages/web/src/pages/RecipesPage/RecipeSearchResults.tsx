import type { Recipe } from '@shoppingo/types';
import { Search } from 'lucide-react';
import { RecipesList } from '../../components/RecipesList';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty';

interface RecipeSearchResultsProps {
    results: Recipe[];
    onRecipeClick: (recipeId: string) => void;
}

export const RecipeSearchResults = ({ results, onRecipeClick }: RecipeSearchResultsProps) => (
    <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">Results ({results.length})</h2>
        {results.length > 0 ? (
            <RecipesList recipes={results} onRecipeClick={onRecipeClick} />
        ) : (
            <Empty className="flex-none justify-start p-4">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Search />
                    </EmptyMedia>
                    <EmptyTitle>No recipes found</EmptyTitle>
                    <EmptyDescription>Try a different search term</EmptyDescription>
                </EmptyHeader>
            </Empty>
        )}
    </div>
);
