import { Users } from 'lucide-react';
import { Label } from '../../../components/ui/label';
import { UserListItem } from '../UserListItem';

interface ManageUsersMembersListProps {
    currentUsers: Array<{ id: string; username: string }>;
    ownerId: string;
    currentUserId: string;
    isRemoving: boolean;
    confirmRemoveUserId: string | null;
    onRemoveClick: (userId: string) => void;
    onRemoveConfirm: (userId: string) => void;
    onRemoveCancel: () => void;
}

export const ManageUsersMembersList = ({
    currentUsers,
    ownerId,
    currentUserId,
    isRemoving,
    confirmRemoveUserId,
    onRemoveClick,
    onRemoveConfirm,
    onRemoveCancel,
}: ManageUsersMembersListProps) => {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Members ({currentUsers.length})</Label>
            </div>

            <div className="space-y-2">
                {currentUsers.map((user) => (
                    <UserListItem
                        key={user.id}
                        user={user}
                        isOwner={user.id === ownerId}
                        currentUserId={currentUserId}
                        isRemoving={isRemoving}
                        isConfirming={confirmRemoveUserId === user.id}
                        onRemoveClick={() => onRemoveClick(user.id)}
                        onRemoveConfirm={() => onRemoveConfirm(user.id)}
                        onRemoveCancel={onRemoveCancel}
                    />
                ))}
            </div>
        </div>
    );
};
