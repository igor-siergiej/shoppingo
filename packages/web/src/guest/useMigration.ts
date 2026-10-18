import { extractUserFromToken } from '@imapps/web-utils';
import type { User } from '@shoppingo/types';
import { useCallback } from 'react';
import { logger } from '../utils/logger';
import { useGuest } from './GuestContext';
import { migrateGuestToAccount } from './migrateGuestToAccount';

// Runs right after a successful login or registration. Uploads whatever the
// guest store holds (a no-op when it is empty) and drops the guest flag.
//
// It runs whether or not the guest flag is on: data only survives in the
// store when an earlier migration had list failures, and the next sign-in is
// the retry. The flag is dropped with `keepData` because the migration owns
// clearing the store; on a partial failure the data must stay for that retry.
// Never throws, so a failed migration can't block sign-in.

export const useMigration = () => {
    const { isGuest, exitGuestMode } = useGuest();

    const migrateAfterAuth = useCallback(
        async (accessToken: string): Promise<void> => {
            try {
                const userInfo = extractUserFromToken(accessToken);
                if (!userInfo) {
                    logger.warn('Cannot migrate guest data: access token did not contain a user');
                    return;
                }

                const user: User = { id: userInfo.id, username: userInfo.username };
                const result = await migrateGuestToAccount(user);
                if (result.listsUploaded > 0 || result.listFailures > 0) {
                    logger.info('Guest migration finished', { ...result, userId: user.id });
                }
            } catch (migrationError) {
                logger.error('Guest migration failed', { error: String(migrationError) });
            } finally {
                if (isGuest) exitGuestMode({ keepData: true });
            }
        },
        [isGuest, exitGuestMode]
    );

    return { migrateAfterAuth };
};
