import type { List } from '@shoppingo/types';

/**
 * Service for managing authorization and permissions in lists
 * Handles owner verification and user management permissions
 */
export class AuthorizationService {
    /**
     * Check if user is the owner of the list
     * For backward compatibility: if no ownerId, check if user is first in users array
     */
    isListOwner(list: List, userId: string): boolean {
        if (list.ownerId) {
            return list.ownerId === userId;
        }
        // Backward compatibility: assume first user is owner
        return list.users[0]?.id === userId;
    }

    /**
     * Check if user can manage (add/remove) users
     * Currently same as isListOwner, but separate for future role-based permissions
     */
    canManageUsers(list: List, userId: string): boolean {
        return this.isListOwner(list, userId);
    }

    /**
     * Get the effective owner ID for a list
     * Returns ownerId if set, otherwise first user's ID
     */
    getEffectiveOwnerId(list: List): string | null {
        if (list.ownerId) {
            return list.ownerId;
        }
        return list.users[0]?.id || null;
    }
}
