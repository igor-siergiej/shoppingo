import type { Logger } from '@imapps/api-utils';
import type { PushSubscription, Todo } from '@shoppingo/types';
import { isoDay, occursOn } from '@shoppingo/types';
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

const groupByOwner = (todos: Todo[]): Map<string, Todo[]> => {
    const byOwner = new Map<string, Todo[]>();
    for (const todo of todos) {
        const list = byOwner.get(todo.ownerId) ?? [];
        list.push(todo);
        byOwner.set(todo.ownerId, list);
    }
    return byOwner;
};

const emptySummary = (configured: boolean): ReminderSummary => ({
    configured,
    due: 0,
    owners: 0,
    subscriptions: 0,
    sent: 0,
});

/** Outcome of a reminder run — surfaced to the manual trigger for debugging. */
export interface ReminderSummary {
    /** Web push has VAPID keys; false means nothing can ever be sent. */
    configured: boolean;
    /** Incomplete todos occurring today. */
    due: number;
    /** Distinct owners with at least one due todo. */
    owners: number;
    /** Push subscriptions targeted across those owners. */
    subscriptions: number;
    /** Pushes the browser push service accepted. */
    sent: number;
}

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

    async sendDailyReminders(now: Date): Promise<ReminderSummary> {
        const configured = this.sender.isConfigured();
        if (!configured) {
            return emptySummary(configured);
        }

        const candidates = await this.todoRepo.findDueCandidates(isoDay(now));
        const due = candidates.filter((todo) => occursOn(todo, now));
        if (due.length === 0) {
            return emptySummary(configured);
        }

        const byOwner = groupByOwner(due);

        const perOwner = await Promise.all(
            [...byOwner.entries()].map(([ownerId, todos]) => this.notifyOwner(ownerId, todos))
        );

        return {
            configured,
            due: due.length,
            owners: byOwner.size,
            subscriptions: perOwner.reduce((n, r) => n + r.subscriptions, 0),
            sent: perOwner.reduce((n, r) => n + r.sent, 0),
        };
    }

    private async notifyOwner(ownerId: string, todos: Todo[]): Promise<{ subscriptions: number; sent: number }> {
        try {
            const subs = await this.pushRepo.findByUserIds([ownerId]);
            if (subs.length === 0) {
                return { subscriptions: 0, sent: 0 };
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

            return { subscriptions: subs.length, sent: results.filter((r) => r === 'ok').length };
        } catch (error) {
            this.logger?.error('Todo reminder fan-out failed', {
                ownerId,
                error: (error as Error).message,
            });
            return { subscriptions: 0, sent: 0 };
        }
    }
}
