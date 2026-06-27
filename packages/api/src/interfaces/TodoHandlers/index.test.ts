import { beforeEach, describe, expect, it, vi } from 'bun:test';
import * as todoHandlers from './index';

const mockDependencyContainer = {
    resolve: vi.fn(),
};

vi.mock('../../dependencies/container', () => ({
    dependencyContainer: mockDependencyContainer,
}));

const mockReminderService = {
    sendDailyReminders: vi.fn(),
};

type HonoVars = { Variables: { user: { id: string; username: string } } };

const createMockContext = (overrides: { user?: { id: string; username: string } | null } = {}) => {
    const vars: Record<string, unknown> = {
        user: 'user' in overrides ? overrides.user : { id: 'u1', username: 'owner' },
    };

    return {
        req: { json: vi.fn().mockResolvedValue({}) },
        json: vi.fn().mockImplementation((payload: unknown, status: number): Response => {
            return new Response(JSON.stringify(payload), {
                status,
                headers: { 'Content-Type': 'application/json' },
            });
        }),
        get: (key: string) => vars[key],
    } as unknown as import('hono').Context<HonoVars>;
};

describe('runDailyReminder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDependencyContainer.resolve.mockImplementation((token: string) => {
            if (token === 'TodoReminderService') return mockReminderService;
            return null;
        });
    });

    it('triggers the daily reminder fan-out for an authenticated user', async () => {
        mockReminderService.sendDailyReminders.mockResolvedValue(undefined);
        const ctx = createMockContext();
        const response = await todoHandlers.runDailyReminder(ctx);
        expect(mockReminderService.sendDailyReminders).toHaveBeenCalledTimes(1);
        expect(mockReminderService.sendDailyReminders.mock.calls[0][0]).toBeInstanceOf(Date);
        const body = await response.json();
        expect(body.triggered).toBe(true);
    });

    it('rejects an unauthenticated caller', async () => {
        const ctx = createMockContext({ user: null });
        const response = await todoHandlers.runDailyReminder(ctx);
        expect(mockReminderService.sendDailyReminders).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
    });
});
