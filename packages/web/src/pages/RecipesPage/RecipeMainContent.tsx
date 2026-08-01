import type { Recipe } from '@shoppingo/types';
import { RecipeOwnershipSections } from './RecipeOwnershipSections';
import { RecipeSearchResults } from './RecipeSearchResults';

interface RecipeMainContentProps {
    isSearching: boolean;
    searchResults: Recipe[];
    yourRecipes: Recipe[];
    sharedRecipes: Recipe[];
    onRecipeClick: (recipeId: string) => void;
}

export const RecipeMainContent = ({
    isSearching,
    searchResults,
    yourRecipes,
    sharedRecipes,
    onRecipeClick,
}: RecipeMainContentProps) => (
    <div className="flex flex-col mb-auto">
        {isSearching ? (
            <RecipeSearchResults results={searchResults} onRecipeClick={onRecipeClick} />
        ) : (
            <RecipeOwnershipSections
                yourRecipes={yourRecipes}
                sharedRecipes={sharedRecipes}
                onRecipeClick={onRecipeClick}
            />
        )}
    </div>
);
