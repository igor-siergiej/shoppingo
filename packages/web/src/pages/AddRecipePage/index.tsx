import { useUser } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { generateRecipeAiImage, getRecipesQuery, importRecipe, uploadRecipeImage } from '../../api';
import { FriendPicker } from '../../components/FriendPicker';
import { StepsList } from '../../components/StepsList';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useRecipeMutations } from '../../hooks/useRecipeMutations';
import { logger } from '../../utils/logger';
import { splitIntoSteps } from '../../utils/splitIntoSteps';
import { AddRecipeHeader } from './AddRecipeHeader';
import { applyImportedDraft, type ImportMeta } from './applyImportedDraft';
import { ChoiceScreen } from './ChoiceScreen';
import { ImageUploadField } from './ImageUploadField';
import { ImportScreen } from './ImportScreen';
import { type Ingredient, IngredientsField } from './IngredientsField';
import { LinkImportField } from './LinkImportField';

type Mode = 'choice' | 'import' | 'form';

const notifyImportResult = (foundCount: number): void => {
    if (foundCount === 0) {
        toast('Couldn’t find recipe details — fill them in manually', {
            style: { backgroundColor: '#f59e0b', color: '#ffffff' },
        });
    } else {
        toast.success('Recipe imported — review and edit before saving');
    }
};

// Extensive per-field state (title/image/link/ingredients/instructions/import status) backs a
// single 3-mode (choice/import/form) flow; JSX sections and the import/create/submit logic are
// already split into sibling components and helpers — the remaining hook count reflects the
// form's genuine field count, not unsplit logic.
// fallow-ignore-next-line complexity
const AddRecipePage = () => {
    const recipeNameId = useId();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { createRecipe } = useRecipeMutations(user ?? undefined);
    const { refetch } = useQuery({
        ...getRecipesQuery(user?.id || ''),
        enabled: false,
    });

    const initialLink = searchParams.get('sharedUrl') ?? '';
    const autoImport = !!initialLink;

    const [mode, setMode] = useState<Mode>(autoImport ? 'form' : 'choice');
    const modeRef = useRef<Mode>(mode);
    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    const [title, setTitle] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [link, setLink] = useState(initialLink);
    const [instructionsPasteText, setInstructionsPasteText] = useState('');
    const [steps, setSteps] = useState<string[]>([]);
    const [showPasteArea, setShowPasteArea] = useState(true);
    const [ingredientsPasteText, setIngredientsPasteText] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [showIngredientsPaste, setShowIngredientsPaste] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importMeta, setImportMeta] = useState<ImportMeta>({});
    const autoImportedRef = useRef(false);
    const importAbortRef = useRef<AbortController | null>(null);

    // Validate → abort-controller setup → try/catch/finally around the fetch; the soft-fail abort
    // check and the mode-transition guard are both load-bearing and already factored out from the
    // draft-application logic (see applyImportedDraft.ts) and the toast copy (notifyImportResult).
    // fallow-ignore-next-line complexity
    const handleImport = useCallback(async (importUrl: string) => {
        const target = importUrl.trim();
        if (!target) {
            toast.error('Enter a recipe link to import');
            return;
        }

        const controller = new AbortController();
        importAbortRef.current = controller;
        setIsImporting(true);
        setError('');
        setImportError('');
        try {
            const draft = await importRecipe(target, controller.signal);

            await applyImportedDraft(draft, {
                setTitle,
                setLink,
                setIngredients,
                setShowIngredientsPaste,
                setSteps,
                setShowPasteArea,
                setSelectedFile,
                setImageUrl,
                setImportMeta,
            });

            notifyImportResult(draft.ingredients.length + draft.instructions.length);

            if (modeRef.current === 'import') {
                setMode('form');
            }
        } catch (err) {
            if (controller.signal.aborted) {
                return;
            }
            const message = err instanceof Error ? err.message : 'Failed to import recipe';
            setImportError(message);
            toast.error(message, { style: { backgroundColor: '#ef4444', color: '#ffffff' } });
        } finally {
            importAbortRef.current = null;
            setIsImporting(false);
        }
    }, []);

    const handleCancelImport = () => {
        importAbortRef.current?.abort();
    };

    // Share-target flow: run the import automatically once when landing here with a shared link.
    useEffect(() => {
        if (autoImport && initialLink && !autoImportedRef.current) {
            autoImportedRef.current = true;
            void handleImport(initialLink);
        }
    }, [autoImport, initialLink, handleImport]);

    // Sequential create/upload/refetch/AI-image steps; each step depends on the previous one's
    // result, so splitting further would obscure the flow, not clarify it.
    // fallow-ignore-next-line complexity
    const handleAddRecipe = async (
        recipeTitle: string,
        recipeIngredients: Ingredient[],
        selUsers?: string[],
        recipeLink?: string,
        instructions?: string[],
        imageFile?: File
    ): Promise<Recipe | undefined> => {
        if (!user) {
            logger.warn('Attempted to add recipe without user');
            return undefined;
        }

        try {
            const recipeId = await createRecipe(
                recipeTitle,
                selUsers || [],
                recipeIngredients,
                recipeLink,
                instructions
            );
            logger.info('Recipe created successfully', { title: recipeTitle, recipeId });

            if (imageFile) {
                await uploadRecipeImage(recipeId, imageFile);
            }

            await refetch();

            if (!imageFile) {
                void generateRecipeAiImage(recipeId).then(() =>
                    queryClient.invalidateQueries(getRecipesQuery(user.id).queryKey)
                );
            }

            const recipes = queryClient.getQueryData<Recipe[]>(['recipes', user.id]) ?? [];
            return recipes.find((r) => r.id === recipeId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error('Failed to create recipe', { title: recipeTitle, error: message });
            throw err;
        }
    };

    const handleCancel = () => {
        navigate('/recipes');
    };

    if (mode === 'choice') {
        return (
            <ChoiceScreen
                onSelectImport={() => setMode('import')}
                onSelectManual={() => setMode('form')}
                onCancel={handleCancel}
            />
        );
    }

    if (mode === 'import') {
        return (
            <ImportScreen
                link={link}
                setLink={setLink}
                isImporting={isImporting}
                importError={importError}
                onImport={() => void handleImport(link)}
                onCancelImport={handleCancelImport}
                onSwitchToManual={() => {
                    handleCancelImport();
                    setImportError('');
                    setMode('form');
                }}
                onCancel={handleCancel}
            />
        );
    }

    // Sequential validate/create/toast/navigate steps for the submit flow; extracting further
    // would scatter one linear user action across several files.
    // fallow-ignore-next-line complexity
    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('Recipe title is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const recipe = await handleAddRecipe(
                title,
                ingredients
                    .filter((ingredient) => ingredient.name.trim())
                    .map((ingredient) => ({ ...ingredient, name: ingredient.name.trim() })),
                selectedUsers,
                link.trim() || undefined,
                steps.length > 0 ? steps : undefined,
                selectedFile || undefined
            );
            if (!recipe) {
                throw new Error('Failed to create recipe');
            }

            navigate('/recipes');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create recipe';
            toast.error(message, { style: { backgroundColor: '#ef4444', color: '#ffffff' } });
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AddRecipeHeader onCancel={handleCancel} disabled={isLoading} />

            <div className="flex-1 overflow-y-auto px-4">
                <div className="space-y-4 py-4 max-w-lg mx-auto w-full">
                    <div className="space-y-2">
                        <Label htmlFor={recipeNameId}>Recipe Title</Label>
                        <Input
                            id={recipeNameId}
                            name="recipe-title"
                            placeholder="Enter recipe title..."
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setError('');
                            }}
                            disabled={isLoading}
                            autoFocus
                            autoComplete="off"
                            className="h-10 border border-foreground/30"
                        />
                    </div>

                    <ImageUploadField
                        imageUrl={imageUrl}
                        disabled={isLoading}
                        onFileSelected={setSelectedFile}
                        onPreviewReady={setImageUrl}
                        onClear={() => {
                            setImageUrl(null);
                            setSelectedFile(null);
                        }}
                    />

                    <LinkImportField
                        link={link}
                        setLink={setLink}
                        isImporting={isImporting}
                        importError={importError}
                        importMeta={importMeta}
                        disabled={isLoading}
                        onImport={() => void handleImport(link)}
                        onCancelImport={handleCancelImport}
                    />

                    <IngredientsField
                        ingredients={ingredients}
                        ingredientsPasteText={ingredientsPasteText}
                        setIngredientsPasteText={setIngredientsPasteText}
                        showIngredientsPaste={showIngredientsPaste}
                        setShowIngredientsPaste={setShowIngredientsPaste}
                        onChange={setIngredients}
                        disabled={isLoading}
                        isImporting={isImporting}
                    />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Instructions</Label>
                            {steps.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowPasteArea(true)}
                                    className="text-xs text-muted-foreground underline"
                                >
                                    edit text ↩
                                </button>
                            )}
                        </div>
                        {showPasteArea || steps.length === 0 ? (
                            <Textarea
                                placeholder="Paste instructions here — each line becomes a step automatically..."
                                value={instructionsPasteText}
                                onChange={(e) => setInstructionsPasteText(e.target.value)}
                                onBlur={() => {
                                    const parsed = splitIntoSteps(instructionsPasteText);
                                    if (parsed.length > 0) {
                                        setSteps(parsed);
                                        setShowPasteArea(false);
                                    }
                                }}
                                disabled={isLoading || isImporting}
                                className="min-h-[80px] resize-none border border-foreground/30"
                            />
                        ) : (
                            <StepsList steps={steps} onChange={setSteps} disabled={isLoading} />
                        )}
                    </div>

                    <div className="space-y-3 border-t pt-4">
                        <Label className="text-sm font-semibold">Share With Users</Label>
                        <FriendPicker value={selectedUsers} onChange={setSelectedUsers} seedAllByDefault />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
            </div>

            <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex flex-col gap-2 max-w-lg mx-auto w-full">
                <Button onClick={() => void handleSubmit()} disabled={isLoading || !title.trim()}>
                    {isLoading ? 'Creating...' : 'Create Recipe'}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};

export default AddRecipePage;
