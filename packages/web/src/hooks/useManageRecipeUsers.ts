import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import { addUserToRecipe, removeUserFromRecipe } from '../api';

interface ManageRecipeUsersHookProps {
    recipeId: string;
    userId: string;
}

export const useManageRecipeUsers = ({ recipeId, userId }: ManageRecipeUsersHookProps) => {
    const queryClient = useQueryClient();

    const invalidateRecipesList = () => {
        if (userId) void queryClient.invalidateQueries(['recipes', userId]);
    };

    const addUserMutation = useMutation({
        mutationFn: (friendId: string) => addUserToRecipe(recipeId, friendId),
        onSuccess: () => {
            invalidateRecipesList();
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
            invalidateRecipesList();
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
