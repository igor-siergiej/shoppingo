import type { Logger } from '@imapps/api-utils';
import type { Item, List, User } from '@shoppingo/types';
import type { WebPushSender } from '../../infrastructure/WebPushSender';
import type { PushSubscriptionRepository } from '../PushSubscriptionRepository';

interface NotificationPayload {
    title: string;
    body: string;
    data: { url: string };
}

interface AddBuffer {
    names: string[];
    actor: User;
    list: List;
    timer: ReturnType<typeof setTimeout>;
}

/** Max item names listed before the rest collapse into "and N more". */
export const MAX_NAMES_SHOWN = 3;

export const formatAddedBody = (username: string, names: string[]): string => {
    const shown = names.slice(0, MAX_NAMES_SHOWN).join(', ');
    const extra = names.length - MAX_NAMES_SHOWN;
    return extra > 0 ? `${username} added ${shown} and ${extra} more` : `${username} added ${shown}`;
};

export class NotificationService {
    /** Pending adds keyed by `${list.id}:${actor.id}`, flushed as one notification after the debounce. */
    private readonly buffers = new Map<string, AddBuffer>();

    constructor(
        private readonly repo: PushSubscriptionRepository,
        private readonly sender: WebPushSender,
        private readonly logger?: Logger,
        private readonly debounceMs = 8000
    ) {}

    async notifyItemAdded(list: List, item: Item, actor: User): Promise<void> {
        this.buffer(list, actor, [item.name]);
    }

    async notifyItemsAdded(list: List, names: string[], actor: User): Promise<void> {
        this.buffer(list, actor, names);
    }

    private buffer(list: List, actor: User, names: string[]): void {
        if (!this.sender.isConfigured() || names.length === 0) {
            return;
        }

        const key = `${list.id}:${actor.id}`;
        const existing = this.buffers.get(key);

        if (existing) {
            existing.names.push(...names);
            existing.list = list;
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => void this.flush(key), this.debounceMs);
            return;
        }

        this.buffers.set(key, {
            names: [...names],
            actor,
            list,
            timer: setTimeout(() => void this.flush(key), this.debounceMs),
        });
    }

    private async flush(key: string): Promise<void> {
        const entry = this.buffers.get(key);
        if (!entry) {
            return;
        }
        this.buffers.delete(key);

        await this.fanOut(entry.list, entry.actor, {
            title: entry.list.title,
            body: formatAddedBody(entry.actor.username, entry.names),
            data: { url: `/list/${entry.list.title}` },
        });
    }

    private async fanOut(list: List, actor: User, payload: NotificationPayload): Promise<void> {
        try {
            const recipientIds = list.users.map((u) => u.id).filter((id) => id !== actor.id);
            if (recipientIds.length === 0) {
                return;
            }

            const subs = await this.repo.findByUserIds(recipientIds);
            if (subs.length === 0) {
                return;
            }

            const body = JSON.stringify(payload);
            const results = await Promise.all(subs.map((sub) => this.sender.send(sub, body)));

            const dead = subs.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint);
            if (dead.length > 0) {
                await this.repo.deleteByEndpoints(dead);
            }
        } catch (error) {
            this.logger?.error('Notification fan-out failed', {
                listTitle: list.title,
                error: (error as Error).message,
            });
        }
    }
}
