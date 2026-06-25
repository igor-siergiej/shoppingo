import type { Logger } from '@imapps/api-utils';
import type { PushSubscription, Todo } from '@shoppingo/types';
import { occursOn } from '@shoppingo/types';
import type { WebPushSender } from '../../infrastructure/WebPushSender';
import type { PushSubscriptionRepository } from '../PushSubscriptionRepository';
import type { TodoRepository } from '../TodoRepository';

/** Max todo titles listed before the rest collapse into "and N more". */
const MAX_TITLES_SHOWN = 3;

// fallow-ignore-next-line unused-export
export const formatDueBody = (titles: string[]): string => {
    const shown = titles.slice(0, MAX_TITLES_SHOWN).join(', ');
    const extra = titles.length - MAX_TITLES_SHOWN;
    return extra > 0 ? `${shown} and ${extra} more` : shown;
};

const endOfLocalDay = (now: Date): Date => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
};

/**
 * Sends one summary push per owner for todos due "today".
 *
 * Single-replica, like NotificationService: invoked by the in-process DailyReminderScheduler.
 */
export class TodoReminderService {
    constructor(
        private readonly todoRepo: TodoRepository,
        private readonly pushRepo: PushSubscriptionRepository,
        private readonly sender: WebPushSender,
        private readonly logger?: Logger
    ) {}

    async sendDailyReminders(now: Date): Promise<void> {
        if (!this.sender.isConfigured()) {
            return;
        }

        const candidates = await this.todoRepo.findDueCandidates(endOfLocalDay(now));
        const due = candidates.filter((todo) => occursOn(todo, now));
        if (due.length === 0) {
            return;
        }

        const byOwner = new Map<string, Todo[]>();
        for (const todo of due) {
            const list = byOwner.get(todo.ownerId) ?? [];
            list.push(todo);
            byOwner.set(todo.ownerId, list);
        }

        await Promise.all([...byOwner.entries()].map(([ownerId, todos]) => this.notifyOwner(ownerId, todos)));
    }

    private async notifyOwner(ownerId: string, todos: Todo[]): Promise<void> {
        try {
            const subs = await this.pushRepo.findByUserIds([ownerId]);
            if (subs.length === 0) {
                return;
            }

            const payload = JSON.stringify({
                title: 'Todos due today',
                body: formatDueBody(todos.map((t) => t.title)),
                data: { url: '/calendar' },
            });

            const results = await Promise.all(subs.map((sub: PushSubscription) => this.sender.send(sub, payload)));
            const dead = subs.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint);
            if (dead.length > 0) {
                await this.pushRepo.deleteByEndpoints(dead);
            }
        } catch (error) {
            this.logger?.error('Todo reminder fan-out failed', {
                ownerId,
                error: (error as Error).message,
            });
        }
    }
}
