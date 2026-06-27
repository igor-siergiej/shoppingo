import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOutboxCount } from '../../hooks/useOutboxCount';

export const SyncStatusBadge = () => {
    const pending = useOutboxCount();
    const online = useOnlineStatus();

    if (!online) {
        return (
            <span
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                title="You are offline"
                aria-live="polite"
            >
                {pending > 0 ? `Offline · ${pending} pending` : 'Offline'}
            </span>
        );
    }

    if (pending === 0) return null;

    return (
        <span
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            title="Changes waiting to sync"
            aria-live="polite"
        >
            {pending} pending
        </span>
    );
};
