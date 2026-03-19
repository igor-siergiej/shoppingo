import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DueDateBadge } from './index';

describe('DueDateBadge', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-19T12:00:00'));
    });

    it('renders nothing when no dueDate prop', () => {
        const { container } = render(<DueDateBadge />);
        expect(container.firstChild).toBeNull();
    });

    it('renders neutral styling when dueDate is >72h away', () => {
        const futureDateString = '2026-03-26T12:00:00';
        const { container } = render(<DueDateBadge dueDate={futureDateString} />);

        const badge = container.querySelector('div');
        expect(badge).not.toHaveClass('bg-red-100');
        expect(badge).not.toHaveClass('bg-yellow-100');
        expect(screen.getByText('26/03/2026')).toBeInTheDocument();
    });

    it('renders yellow AlertTriangle when dueDate is 48h away', () => {
        const warningDateString = '2026-03-21T12:00:00';
        const { container } = render(<DueDateBadge dueDate={warningDateString} />);

        const badge = container.querySelector('div');
        expect(badge).toHaveClass('bg-yellow-100');
        expect(badge).toHaveClass('text-yellow-800');
        expect(screen.getByText('21/03/2026')).toBeInTheDocument();
    });

    it('renders red AlertCircle when dueDate is <24h away', () => {
        const urgentDateString = '2026-03-19T20:00:00';
        const { container } = render(<DueDateBadge dueDate={urgentDateString} />);

        const badge = container.querySelector('div');
        expect(badge).toHaveClass('bg-red-100');
        expect(badge).toHaveClass('text-red-800');
        expect(screen.getByText('19/03/2026')).toBeInTheDocument();
    });

    it('accepts dueDate as Date object', () => {
        const futureDate = new Date('2026-03-26T12:00:00');
        render(<DueDateBadge dueDate={futureDate} />);

        expect(screen.getByText('26/03/2026')).toBeInTheDocument();
    });

    it('displays formatted date in dd/MM/yyyy format', () => {
        const testDateString = '2026-03-15T12:00:00';
        render(<DueDateBadge dueDate={testDateString} />);

        expect(screen.getByText('15/03/2026')).toBeInTheDocument();
    });
});
