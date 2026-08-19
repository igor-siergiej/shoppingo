import { useUser } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { ChefHat, Download, Image as ImageIcon, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { generateRecipeAiImage, getRecipesQuery, importRecipe, importRecipeImage, uploadRecipeImage } from '../../api';
import { FriendPicker } from '../../components/FriendPicker';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useRecipeMutations } from '../../hooks/useRecipeMutations';
import { logger } from '../../utils/logger';
import { ChoiceScreen } from './ChoiceScreen';
import { ImportScreen } from './ImportScreen';

type Mode = 'choice' | 'import' | 'form';

interface Ingredient {
    name: string;
    quantity?: number;
    unit?: string;
}

const splitIntoSteps = (text: string): string[] =>
    text
        .split('\n')
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);

const formatIngredientLine = (ingredient: Ingredient): string =>
    [ingredient.quantity, ingredient.unit, ingredient.name]
        .filter((part) => part !== undefined && part !== '')
        .join(' ');

const AddRecipePage = () => {
    const recipeNameId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    const [importMeta, setImportMeta] = useState<{ prepTime?: string; cookTime?: string; recipeYield?: string }>({});
    const autoImportedRef = useRef(false);
    const importAbortRef = useRef<AbortController | null>(null);

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

            if (draft.title) setTitle(draft.title);
            if (draft.link) setLink(draft.link);
            if (draft.ingredients.length > 0) {
                setIngredients(draft.ingredients.map(({ name, quantity, unit }) => ({ name, quantity, unit })));
                setShowIngredientsPaste(false);
            }
            if (draft.instructions.length > 0) {
                setSteps(draft.instructions);
                setShowPasteArea(false);
            }

            if (draft.image) {
                try {
                    const file = await importRecipeImage(draft.image);
                    setSelectedFile(file);
                    setImageUrl(URL.createObjectURL(file));
                } catch (imageErr) {
                    // Soft-fail: the scraped page's image couldn't be proxied (dead link, blocked host, etc).
                    // The rest of the import already succeeded — leave manual upload available instead of
                    // surfacing this as an import failure.
                    logger.warn('Failed to auto-attach scraped recipe image', {
                        error: imageErr instanceof Error ? imageErr.message : 'Unknown error',
                    });
                }
            }

            setImportMeta({
                ...(draft.prepTime && { prepTime: draft.prepTime }),
                ...(draft.cookTime && { cookTime: draft.cookTime }),
                ...(draft.recipeYield && { recipeYield: draft.recipeYield }),
            });

            const foundCount = draft.ingredients.length + draft.instructions.length;
            if (foundCount === 0) {
                toast('Couldn’t find recipe details — fill them in manually', {
                    style: { backgroundColor: '#f59e0b', color: '#ffffff' },
                });
            } else {
                toast.success('Recipe imported — review and edit before saving');
            }

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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
                onSwitchToManual={() => setMode('form')}
                onCancel={handleCancel}
            />
        );
    }

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
        <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-10">
                <h1 className="flex items-center gap-2 text-lg font-semibold">
                    <ChefHat className="h-5 w-5" />
                    Create Recipe
                </h1>
                <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isLoading} aria-label="Cancel">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
                <div className="space-y-4 py-4 max-w-lg mx-auto w-full">
                    <div className="space-y-2">
                        <Label htmlFor={recipeNameId}>Recipe Title</Label>
                        <Input
                            id={recipeNameId}
                            placeholder="Enter recipe title..."
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setError('');
                            }}
                            disabled={isLoading}
                            autoFocus
                            className="h-10 border border-foreground/30"
                        />
                    </div>

                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="relative w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/30 overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Recipe preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setImageUrl(null);
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
                                        aria-label="Clear image"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                                </div>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            disabled={isLoading}
                            className="hidden"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Recipe Link</Label>
                        <div className="flex gap-2">
                            <Input
                                type="url"
                                placeholder="https://..."
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                disabled={isLoading || isImporting}
                                className="h-10 border border-foreground/30"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => (isImporting ? handleCancelImport() : void handleImport(link))}
                                disabled={isLoading || (!isImporting && !link.trim())}
                                aria-label={isImporting ? 'Cancel import' : 'Import recipe from link'}
                                className="h-10 shrink-0 gap-1.5"
                            >
                                {isImporting ? (
                                    <>
                                        <X className="h-4 w-4" />
                                        Cancel
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Import
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Paste a recipe URL and tap Import to auto-fill the fields below.
                        </p>
                        {importError && (
                            <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <span>{importError}</span>
                                <button
                                    type="button"
                                    onClick={() => void handleImport(link)}
                                    disabled={isImporting || !link.trim()}
                                    className="shrink-0 font-medium underline disabled:opacity-50"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                        {(importMeta.prepTime || importMeta.cookTime || importMeta.recipeYield) && (
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {importMeta.prepTime && (
                                    <span className="rounded-full border border-border px-2 py-0.5">
                                        Prep: {importMeta.prepTime}
                                    </span>
                                )}
                                {importMeta.cookTime && (
                                    <span className="rounded-full border border-border px-2 py-0.5">
                                        Cook: {importMeta.cookTime}
                                    </span>
                                )}
                                {importMeta.recipeYield && (
                                    <span className="rounded-full border border-border px-2 py-0.5">
                                        Yield: {importMeta.recipeYield}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Ingredients</Label>
                            {ingredients.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowIngredientsPaste(true)}
                                    className="text-xs text-muted-foreground underline"
                                >
                                    edit text ↩
                                </button>
                            )}
                        </div>
                        {showIngredientsPaste || ingredients.length === 0 ? (
                            <Textarea
                                placeholder="Paste ingredients here — each line becomes an item automatically..."
                                value={ingredientsPasteText}
                                onChange={(e) => setIngredientsPasteText(e.target.value)}
                                onBlur={() => {
                                    const parsed = splitIntoSteps(ingredientsPasteText);
                                    if (parsed.length > 0) {
                                        setIngredients(parsed.map((name) => ({ name })));
                                        setShowIngredientsPaste(false);
                                    }
                                }}
                                disabled={isLoading || isImporting}
                                className="min-h-[80px] resize-none border border-foreground/30"
                            />
                        ) : (
                            <div className="space-y-1">
                                {ingredients.map((ingredient, i) => (
                                    <div
                                        key={`${i}-${ingredient.name.slice(0, 20)}`}
                                        className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"
                                    >
                                        <span className="flex-1 text-foreground">
                                            {formatIngredientLine(ingredient)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}
                                            disabled={isLoading}
                                            className="text-destructive hover:opacity-70"
                                            aria-label={`Remove ingredient ${i + 1}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setIngredients([...ingredients, { name: '' }])}
                                    disabled={isLoading}
                                    className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
                                >
                                    + Add ingredient
                                </button>
                            </div>
                        )}
                    </div>

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
                            <div className="space-y-1">
                                {steps.map((step, i) => (
                                    <div
                                        key={`${i}-${step.slice(0, 20)}`}
                                        className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted border border-border text-sm"
                                    >
                                        <span className="font-semibold text-muted-foreground min-w-[1.25rem]">
                                            {i + 1}.
                                        </span>
                                        <span className="flex-1 text-foreground">{step}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
                                            disabled={isLoading}
                                            className="text-destructive hover:opacity-70"
                                            aria-label={`Remove step ${i + 1}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setSteps([...steps, ''])}
                                    disabled={isLoading}
                                    className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:bg-muted/50 transition-colors"
                                >
                                    + Add step
                                </button>
                            </div>
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
