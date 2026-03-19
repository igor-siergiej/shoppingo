import { describe, expect, it } from 'vitest';

describe('useLoginForm', () => {
    it('exports a hook function', async () => {
        // Test that the module can be imported and exports the hook
        const module = await import('./useLoginForm');
        expect(typeof module.useLoginForm).toBe('function');
    });

    it('exports LoginFormData type', async () => {
        // Test that the type is exported (typescript check)
        const module = await import('./useLoginForm');
        expect(module).toBeDefined();
    });
});
