import type { Recipe } from '@shoppingo/types';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { ManageUsersDrawer } from '../../components/ManageUsersDrawer';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

interface UserManagementSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onUserAdded: () => void;
    onUserRemoved: () => void;
}

export const UserManagementSection = ({ recipe, isOwner, onUserAdded, onUserRemoved }: UserManagementSectionProps) => {
    const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Shared With ({recipe.users.length})
                    </h3>
                    {isOwner && (
                        <Button size="sm" variant="outline" onClick={() => setIsManageUsersOpen(true)}>
                            Manage Users
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    {recipe.users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-muted/20 rounded">
                            <span className="font-medium">{user.username}</span>
                            {recipe.ownerId === user.id && (
                                <Badge variant="secondary" className="text-xs">
                                    Owner
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isOwner && (
                <ManageUsersDrawer
                    open={isManageUsersOpen}
                    onOpenChange={setIsManageUsersOpen}
                    listTitle={`recipe:${recipe.id}`}
                    currentUsers={recipe.users}
                    ownerId={recipe.ownerId || recipe.users[0]?.id || ''}
                    currentUserId={recipe.users[0]?.id || ''}
                    onUserAdded={onUserAdded}
                    onUserRemoved={onUserRemoved}
                />
            )}
        </>
    );
};
