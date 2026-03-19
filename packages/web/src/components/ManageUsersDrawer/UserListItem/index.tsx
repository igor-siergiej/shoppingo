import { Crown, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UserListItemProps {
    user: {
        id: string;
        username: string;
    };
    isOwner: boolean;
    currentUserId: string;
    isRemoving: boolean;
    isConfirming: boolean;
    onRemoveClick: () => void;
    onRemoveConfirm: () => void;
    onRemoveCancel: () => void;
}

export const UserListItem = ({
    user,
    isOwner,
    currentUserId,
    isRemoving,
    isConfirming,
    onRemoveClick,
    onRemoveConfirm,
    onRemoveCancel,
}: UserListItemProps) => {
    const isCurrentUser = user.id === currentUserId;
    const canRemove = !isOwner && !isCurrentUser;

    return (
        <div className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-xs font-medium truncate">{user.username}</span>
                {isOwner && (
                    <Badge variant="secondary" className="gap-0.5 flex-shrink-0 text-xs py-0 px-1.5 h-5">
                        <Crown className="h-2.5 w-2.5" />
                        Owner
                    </Badge>
                )}
            </div>

            {canRemove &&
                (isConfirming ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRemoveCancel}
                            disabled={isRemoving}
                            className="h-6 px-2 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={onRemoveConfirm}
                            disabled={isRemoving}
                            className="h-6 px-2 text-xs"
                        >
                            {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                        </Button>
                    </div>
                ) : (
                    <Button size="sm" variant="ghost" onClick={onRemoveClick} className="flex-shrink-0 h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                    </Button>
                ))}
        </div>
    );
};
