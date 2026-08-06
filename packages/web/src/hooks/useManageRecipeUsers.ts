import { useMutation } from 'react-query';
import { toast } from 'sonner';
import { addUserToRecipe, removeUserFromRecipe } from '../api';

interface ManageRecipeUsersHookProps {
    recipeId: string;
}

export const useManageRecipeUsers = ({ recipeId }: ManageRecipeUsersHookProps) => {
    const addUserMutation = useMutation({
        mutationFn: (friendId: string) => addUserToRecipe(recipeId, friendId),
        onSuccess: () => {
            toast.success('User added successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to add user', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        },
    });

    const removeUserMutation = useMutation({
        mutationFn: (userId: string) => removeUserFromRecipe(recipeId, userId),
        onSuccess: () => {
            toast.success('User removed successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to remove user', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        },
    });

    return {
        addUserMutation,
        removeUserMutation,
    };
};
