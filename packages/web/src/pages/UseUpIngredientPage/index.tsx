import { useUser } from '@imapps/web-utils';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getRecipesQuery } from '../../api';
import { PinnedSearchField } from '../../components/PinnedSearchField';
import ToolBar from '../../components/ToolBar';
import { useIngredientWasteSearch } from '../../hooks/useIngredientWasteSearch';
import { WasteMatchResults } from './WasteMatchResults';

// Full page rather than a bottom drawer (which capped results at 60vh and put the field under
// the on-screen keyboard): same fuzzy ingredient search, but with the recipes page's
// bottom-pinned keyboard-safe field and results building upward toward it.
const UseUpIngredientPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const { data: allRecipes = [] } = useQuery(
        user?.id ? getRecipesQuery(user.id) : { queryKey: [], queryFn: async () => [] }
    );
    const matches = useIngredientWasteSearch(allRecipes, query);

    return (
        <>
            <div className="flex flex-col min-h-full justify-between">
                <div>
                    <h2 className="text-lg font-semibold mb-3 text-foreground">Use Up an Ingredient</h2>
                    <WasteMatchResults
                        query={query}
                        matches={matches}
                        onSelect={(recipeId) => navigate(`/recipes/${recipeId}`)}
                    />
                </div>
                <PinnedSearchField
                    value={query}
                    onChange={setQuery}
                    placeholder="e.g. spinach"
                    name="waste-warrior-search"
                    autoFocus
                />
            </div>

            <ToolBar />
        </>
    );
};

export default UseUpIngredientPage;
