import { describe, it, expect } from 'bun:test';

describe('useManageUsers', () => {
    it('exports a hook function', async () => {
        const { useManageUsers } = await import('./useManageUsers');
        expect(typeof useManageUsers).toBe('function');
    });
});
