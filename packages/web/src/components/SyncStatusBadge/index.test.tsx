import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const count = { value: 0 };
vi.mock('../../hooks/useOutboxCount', () => ({ useOutboxCount: () => count.value }));

import { SyncStatusBadge } from './index';

describe('SyncStatusBadge', () => {
    it('renders nothing when no pending changes', () => {
        count.value = 0;
        const { container } = render(<SyncStatusBadge />);
        expect(container).toBeEmptyDOMElement();
    });
    it('shows the pending count', () => {
        count.value = 3;
        render(<SyncStatusBadge />);
        expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
    });
});
