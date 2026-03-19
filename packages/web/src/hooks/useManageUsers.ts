import { useMemo, useCallback } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'sonner';
import { addUserToList, removeUserFromList } from '@/api';
import { useSearch } from './useSearch';

interface ManageUsersHookProps {
    listTitle: string;
    currentUsers: Array<{ id: string; username: string }>;
    ownerId: string;
}

export const useManageUsers = ({ listTitle, currentUsers, ownerId }: ManageUsersHookProps) => {
    const {
        query: searchInput,
        setQuery: setSearchInput,
        results: searchResults,
        isLoading: isSearching,
    } = useSearch();

    const availableUsers = useMemo(() => {
        if (!searchResults || !searchResults.usernames || searchResults.usernames.length === 0) return [];
        return searchResults.usernames
            .map((item) => {
                const username = typeof item === 'string' ? item : item.username || '';
                return { id: username, username };
            })
            .filter((user) => !currentUsers.some((u) => u.username === user.username));
    }, [searchResults, currentUsers]);

    const addUserMutation = useMutation({
        mutationFn: (username: string) => addUserToList(listTitle, username),
        onSuccess: () => {
            toast.success('User added successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            setSearchInput('');
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
        mutationFn: (userId: string) => removeUserFromList(listTitle, userId),
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

    const handleAddUser = useCallback(
        (username: string) => {
            addUserMutation.mutate(username);
        },
        [addUserMutation]
    );

    const handleRemoveUser = useCallback(
        (userId: string) => {
            if (userId === ownerId) {
                toast.error('Cannot remove the list owner', {
                    style: {
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                    },
                });
                return;
            }

            removeUserMutation.mutate(userId);
        },
        [ownerId, removeUserMutation]
    );

    return {
        searchInput,
        setSearchInput,
        availableUsers,
        isSearching,
        addUserMutation,
        removeUserMutation,
        handleAddUser,
        handleRemoveUser,
    };
};
