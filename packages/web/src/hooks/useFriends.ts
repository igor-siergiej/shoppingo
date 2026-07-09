import type { User } from '@shoppingo/types';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { generateFriendCode, getFriendsQuery, redeemFriendCode, unfriend } from '../api';

export const useFriends = () => {
    const { data, isLoading } = useQuery<User[]>(getFriendsQuery());
    return { friends: data ?? [], isLoading };
};

export const useGenerateFriendCode = () => useMutation(generateFriendCode);

export const useRedeemFriendCode = () => {
    const queryClient = useQueryClient();
    return useMutation(redeemFriendCode, {
        onSuccess: () => {
            void queryClient.invalidateQueries(['friends']);
        },
    });
};

export const useUnfriend = () => {
    const queryClient = useQueryClient();
    return useMutation(unfriend, {
        onSuccess: () => {
            void queryClient.invalidateQueries(['friends']);
            // Hard-revoke strips the ex-friend from lists, recipes and todos server-side.
            void queryClient.invalidateQueries(['lists']);
            void queryClient.invalidateQueries(['recipes']);
            void queryClient.invalidateQueries(['todos']);
        },
    });
};
