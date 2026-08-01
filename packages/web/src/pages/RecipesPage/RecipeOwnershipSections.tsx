import type { Recipe } from '@shoppingo/types';
import { BookOpen, ChefHat } from 'lucide-react';
import { ListSection } from '../../components/ListSection';
import { RecipesList } from '../../components/RecipesList';

interface RecipeOwnershipSectionsProps {
    yourRecipes: Recipe[];
    sharedRecipes: Recipe[];
    onRecipeClick: (recipeId: string) => void;
}

export const RecipeOwnershipSections = ({
    yourRecipes,
    sharedRecipes,
    onRecipeClick,
}: RecipeOwnershipSectionsProps) => (
    <div className="flex flex-col space-y-6">
        <ListSection
            title="Your Recipes"
            hasItems={yourRecipes.length > 0}
            emptyIcon={<ChefHat />}
            emptyTitle="No recipes yet"
            emptyDescription="Create your first recipe to get started"
        >
            <RecipesList recipes={yourRecipes} onRecipeClick={onRecipeClick} />
        </ListSection>

        <ListSection
            title="Shared Recipes"
            hasItems={sharedRecipes.length > 0}
            emptyIcon={<BookOpen />}
            emptyTitle="No shared recipes"
            emptyDescription="Shared recipes will appear here when someone shares one with you"
        >
            <RecipesList recipes={sharedRecipes} onRecipeClick={onRecipeClick} />
        </ListSection>
    </div>
);
