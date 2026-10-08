import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { getPublishedRecipesQuery, unpublishRecipe } from '../../api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';

interface UnpublishButtonProps {
    libraryId: string;
    /** Runs after the recipe is gone from the library. */
    onUnpublished?: () => void;
}

// Takes the public copy down: it leaves search at once. The user's private recipe is never touched.
export const UnpublishButton = ({ libraryId, onUnpublished }: UnpublishButtonProps) => {
    const queryClient = useQueryClient();
    const [confirming, setConfirming] = useState(false);

    const unpublish = useMutation(() => unpublishRecipe(libraryId), {
        onSuccess: async () => {
            await queryClient.invalidateQueries(getPublishedRecipesQuery().queryKey);
            await queryClient.invalidateQueries('discover-search');
            setConfirming(false);
            onUnpublished?.();
        },
    });

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                Unpublish
            </Button>
            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unpublish this recipe?</AlertDialogTitle>
                        <AlertDialogDescription>
                            It will disappear from Discover for everyone. Your own recipe stays as it is, and copies
                            other people already added stay theirs.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {unpublish.isError && (
                        <p role="alert" className="text-xs text-destructive">
                            Could not unpublish. Please try again.
                        </p>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={unpublish.isLoading}
                            onClick={(event) => {
                                // Keep the dialog open until the request settles, so a failure can be shown and retried.
                                event.preventDefault();
                                unpublish.mutate();
                            }}
                        >
                            {unpublish.isLoading ? 'Unpublishing...' : 'Unpublish'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
