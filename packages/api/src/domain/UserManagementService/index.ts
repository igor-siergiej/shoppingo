import type { Logger } from '@imapps/api-utils';

import type { List } from '@shoppingo/types';
import { AuthorizationService } from '../AuthorizationService';
import type { ListRepository } from '../ListRepository';
import type { AuthClient } from '../ListService/types';

export class UserManagementService {
    private authorizationService: AuthorizationService;

    constructor(
        private readonly repo: ListRepository,
        private readonly auth?: AuthClient,
        private readonly logger?: Logger
    ) {
        this.authorizationService = new AuthorizationService();
    }

    async addUserToList(title: string, username: string, requestingUserId: string): Promise<List> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        if (!this.authorizationService.canManageUsers(list, requestingUserId)) {
            throw Object.assign(new Error('Only the list owner can manage users'), { status: 403 });
        }

        if (!this.auth) {
            throw Object.assign(new Error('Auth service not configured'), { status: 502 });
        }

        const fetchedUsers = await this.auth.getUsersByUsernames([username]);

        if (!fetchedUsers || fetchedUsers.length === 0) {
            throw Object.assign(new Error(`User not found: ${username}`), { status: 400 });
        }

        const userToAdd = fetchedUsers[0];

        if (list.users.some((u) => u.id === userToAdd.id)) {
            throw Object.assign(new Error('User is already in this list'), { status: 400 });
        }

        list.users.push(userToAdd);
        await this.repo.replaceByTitle(title, list);

        this.logger?.info('User added to list', {
            listTitle: title,
            addedUser: username,
            addedBy: requestingUserId,
        });

        return list;
    }

    async removeUserFromList(title: string, userIdToRemove: string, requestingUserId: string): Promise<List> {
        const list = await this.repo.getByTitle(title);

        if (!list) {
            throw Object.assign(new Error('List not found'), { status: 404 });
        }

        if (!this.authorizationService.canManageUsers(list, requestingUserId)) {
            throw Object.assign(new Error('Only the list owner can manage users'), { status: 403 });
        }

        const effectiveOwnerId = this.authorizationService.getEffectiveOwnerId(list);
        if (userIdToRemove === effectiveOwnerId) {
            throw Object.assign(new Error('Cannot remove the list owner'), { status: 400 });
        }

        if (list.users.length <= 1) {
            throw Object.assign(new Error('Cannot remove the last user from the list'), { status: 400 });
        }

        const userExists = list.users.some((u) => u.id === userIdToRemove);
        if (!userExists) {
            throw Object.assign(new Error('User is not in this list'), { status: 400 });
        }

        list.users = list.users.filter((u) => u.id !== userIdToRemove);
        await this.repo.replaceByTitle(title, list);

        this.logger?.info('User removed from list', {
            listTitle: title,
            removedUserId: userIdToRemove,
            removedBy: requestingUserId,
        });

        return list;
    }
}
