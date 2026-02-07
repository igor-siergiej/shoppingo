'use client';

import { AlertCircle, Crown, Loader2, Users, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { addUserToList, removeUserFromList } from '@/api';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useSearch } from '@/hooks/useSearch';
import './styles.css';

interface ManageUsersDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    currentUsers: Array<{ id: string; username: string }>;
    ownerId: string;
    currentUserId: string;
    onUserAdded: () => void;
    onUserRemoved: () => void;
}

export const ManageUsersDrawer = ({
    open,
    onOpenChange,
    listTitle,
    currentUsers,
    ownerId,
    currentUserId,
    onUserAdded,
    onUserRemoved,
}: ManageUsersDrawerProps) => {
    const [removing, setRemoving] = useState<string | null>(null);
    const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { query: searchInput, setQuery: setSearchInput, results: searchResults, isLoading: isSearching } = useSearch();

    // Filter out users already in the list and convert usernames to user objects
    const availableUsers = useMemo(() => {
        if (!searchResults || !searchResults.usernames || searchResults.usernames.length === 0) return [];
        // searchResults.usernames is an array of username strings or objects with username property
        return searchResults.usernames
            .map((item) => {
                const username = typeof item === 'string' ? item : item.username || '';
                return { id: username, username }; // Use username as both id and username for search results
            })
            .filter((user) => !currentUsers.some((u) => u.username === user.username));
    }, [searchResults, currentUsers]);

    const addUserMutation = useMutation({
        mutationFn: (username: string) => addUserToList(listTitle, username),
        onSuccess: () => {
            setToastMessage({ type: 'success', message: 'User added successfully' });
            setSearchInput('');
            setTimeout(() => setToastMessage(null), 3000);
            onUserAdded();
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            setToastMessage({
                type: 'error',
                message: err.message || 'Failed to add user',
            });
            setTimeout(() => setToastMessage(null), 3000);
        },
    });

    const removeUserMutation = useMutation({
        mutationFn: (userId: string) => removeUserFromList(listTitle, userId),
        onSuccess: () => {
            setToastMessage({ type: 'success', message: 'User removed successfully' });
            setConfirmRemoveUserId(null);
            setTimeout(() => setToastMessage(null), 3000);
            onUserRemoved();
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            setToastMessage({
                type: 'error',
                message: err.message || 'Failed to remove user',
            });
            setConfirmRemoveUserId(null);
            setTimeout(() => setToastMessage(null), 3000);
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
                setToastMessage({
                    type: 'error',
                    message: 'Cannot remove the list owner',
                });
                setTimeout(() => setToastMessage(null), 3000);
                return;
            }

            setRemoving(userId);
            removeUserMutation.mutate(userId);
        },
        [ownerId, removeUserMutation]
    );

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px] manage-users-drawer-content">
                    <div className="manage-users-drawer-container">
                    <DrawerHeader className="manage-users-drawer-header">
                        <DrawerTitle className="manage-users-drawer-title">Manage Users</DrawerTitle>
                        <DrawerDescription className="manage-users-drawer-description">{listTitle}</DrawerDescription>
                    </DrawerHeader>

                    <div className="manage-users-drawer-body">
                        {/* Current Users Section */}
                        <div className="manage-users-section">
                            <div className="manage-users-section-header">
                                <Users className="manage-users-section-icon" />
                                <h3 className="manage-users-section-title">Members</h3>
                                <span className="manage-users-user-count">{currentUsers.length}</span>
                            </div>

                            <div className="manage-users-list">
                                {currentUsers.map((user) => (
                                    <div key={user.id} className="manage-users-user-item">
                                        <div className="manage-users-user-info">
                                            <span className="manage-users-username">{user.username}</span>
                                            {user.id === ownerId && (
                                                <div className="manage-users-owner-badge">
                                                    <Crown className="manage-users-crown-icon" />
                                                    <span>Owner</span>
                                                </div>
                                            )}
                                        </div>

                                        {user.id !== ownerId && user.id !== currentUserId && (
                                            <div className="manage-users-remove-confirm">
                                                {confirmRemoveUserId === user.id ? (
                                                    <div className="manage-users-confirm-buttons">
                                                        <button
                                                            type="button"
                                                            className="manage-users-confirm-btn manage-users-confirm-cancel"
                                                            onClick={() => setConfirmRemoveUserId(null)}
                                                            disabled={removeUserMutation.isLoading}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="manage-users-confirm-btn manage-users-confirm-remove"
                                                            onClick={() => handleRemoveUser(user.id)}
                                                            disabled={removeUserMutation.isLoading}
                                                        >
                                                            {removeUserMutation.isLoading && removing === user.id ? (
                                                                <>
                                                                    <Loader2 className="manage-users-spinner" />
                                                                    Removing...
                                                                </>
                                                            ) : (
                                                                'Remove'
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="manage-users-remove-btn"
                                                        onClick={() => setConfirmRemoveUserId(user.id)}
                                                        title="Remove user from list"
                                                    >
                                                        <X className="manage-users-remove-icon" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Users Section */}
                        <div className="manage-users-section manage-users-add-section">
                            <h3 className="manage-users-section-title">Add Members</h3>

                            <div className="manage-users-search-container">
                                <Input
                                    placeholder="Search for users..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="manage-users-search-input"
                                    disabled={isSearching}
                                />
                                {isSearching && <Loader2 className="manage-users-search-spinner" />}
                            </div>

                            {searchInput && (
                                <div className="manage-users-results">
                                    {availableUsers.length > 0 ? (
                                        <div className="manage-users-results-list">
                                            {availableUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    className="manage-users-result-item"
                                                    onClick={() => handleAddUser(user.username)}
                                                    disabled={addUserMutation.isLoading}
                                                >
                                                    <span>{user.username}</span>
                                                    {addUserMutation.isLoading ? (
                                                        <Loader2 className="manage-users-spinner" />
                                                    ) : (
                                                        <span className="manage-users-add-symbol">+</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="manage-users-no-results">
                                            {isSearching ? <p>Searching...</p> : <p>No users found or already added</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="manage-users-drawer-footer">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full"
                        >
                            Close
                        </Button>
                    </div>

                    {/* Toast Notification */}
                    {toastMessage && (
                        <div className={`manage-users-toast manage-users-toast-${toastMessage.type}`}>
                            <div className="manage-users-toast-content">
                                {toastMessage.type === 'error' && <AlertCircle className="manage-users-toast-icon" />}
                                <span>{toastMessage.message}</span>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
