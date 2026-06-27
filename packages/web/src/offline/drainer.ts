import { logger } from '../utils/logger';
import { replayIntent } from './intents';
import { outboxStore } from './outboxStore';

const DISCARD_STATUSES = new Set([404, 409]);
let draining = false;

const statusOf = (err: unknown): number | undefined =>
    typeof err === 'object' && err !== null && 'status' in err ? (err as { status?: number }).status : undefined;

export const drainOutbox = async (): Promise<void> => {
    if (draining) return;
    draining = true;
    try {
        for (const intent of outboxStore.peekAll()) {
            try {
                await replayIntent(intent);
                await outboxStore.remove(intent.seq);
            } catch (err) {
                const status = statusOf(err);
                if (status !== undefined && DISCARD_STATUSES.has(status)) {
                    logger.warn('Discarding conflicting offline intent', { op: intent.op, status });
                    await outboxStore.remove(intent.seq);
                    continue;
                }
                if (status !== undefined && status >= 400 && status < 500) {
                    logger.error('Poison offline intent, stopping drain', { op: intent.op, status });
                    return;
                }
                logger.info('Drain paused (retryable error)', { op: intent.op, status });
                return;
            }
        }
    } finally {
        draining = false;
    }
};

let backoff = 0;
export const startDrainer = (): (() => void) => {
    const trigger = () => {
        if (!navigator.onLine) return;
        const before = outboxStore.count();
        void drainOutbox().then(() => {
            if (outboxStore.count() > 0 && outboxStore.count() === before) {
                backoff = Math.min(backoff ? backoff * 2 : 1000, 30000);
                setTimeout(trigger, backoff);
            } else {
                backoff = 0;
            }
        });
    };
    const onVisible = () => {
        if (document.visibilityState === 'visible') trigger();
    };
    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', onVisible);
    trigger();
    return () => {
        window.removeEventListener('online', trigger);
        document.removeEventListener('visibilitychange', onVisible);
    };
};
