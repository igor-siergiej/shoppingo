import { describe, expect, it, vi } from 'bun:test';

import { resolveFriendMembers } from './index';

const bob = { id: 'u2', username: 'bob' };
const cat = { id: 'u3', username: 'cat' };
const friends = { listFriends: vi.fn().mockResolvedValue([bob, cat]) };

describe('resolveFriendMembers', () => {
    it('shares with nobody when there is no friend service', async () => {
        expect(await resolveFriendMembers(undefined, 'u1')).toEqual([]);
    });

    it('defaults to every current friend', async () => {
        expect(await resolveFriendMembers(friends, 'u1')).toEqual([bob, cat]);
        expect(friends.listFriends).toHaveBeenCalledWith('u1');
    });

    it('shares with just the chosen friends, in the friends order', async () => {
        expect(await resolveFriendMembers(friends, 'u1', ['u3'])).toEqual([cat]);
        expect(await resolveFriendMembers(friends, 'u1', [])).toEqual([]);
    });

    it('refuses anyone who is not a friend', async () => {
        await expect(resolveFriendMembers(friends, 'u1', ['u2', 'stranger'])).rejects.toMatchObject({
            message: 'Can only share with friends',
            status: 403,
        });
    });
});
