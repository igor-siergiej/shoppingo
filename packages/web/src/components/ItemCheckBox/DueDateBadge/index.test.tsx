import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DueDateBadge } from './index';

describe('DueDateBadge', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-19T12:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('renders null when dueDate is undefined', () => {
        const { container } = render(<DueDateBadge dueDate={undefined} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders null when dueDate is null', () => {
        const { container } = render(<DueDateBadge dueDate={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders with alert styling when less than 24 hours until due', () => {
        const tomorrow = new Date('2026-03-20T00:00:00');
        const { container } = render(<DueDateBadge dueDate={tomorrow} />);

        const badge = container.firstChild as HTMLElement;
        expect(badge).toHaveClass('bg-red-100');
        expect(badge).toHaveClass('text-red-800');
        expect(badge).toHaveClass('border-red-300');
    });

    it('renders with warning styling when 24-72 hours until due', () => {
        const in48Hours = new Date('2026-03-21T12:00:00');
        const { container } = render(<DueDateBadge dueDate={in48Hours} />);

        const badge = container.firstChild as HTMLElement;
        expect(badge).toHaveClass('bg-yellow-100');
        expect(badge).toHaveClass('text-yellow-800');
        expect(badge).toHaveClass('border-yellow-300');
    });

    it('renders without alert styling when more than 72 hours until due', () => {
        const in96Hours = new Date('2026-03-23T12:00:00');
        const { container } = render(<DueDateBadge dueDate={in96Hours} />);

        const badge = container.firstChild as HTMLElement;
        expect(badge).not.toHaveClass('bg-red-100');
        expect(badge).not.toHaveClass('bg-yellow-100');
    });

    it('handles string date input', () => {
        const dateString = '2026-04-01T00:00:00Z';
        const { getByText } = render(<DueDateBadge dueDate={dateString} />);
        expect(getByText(/01\/04\/2026/)).toBeInTheDocument();
    });

    it('handles Date object input', () => {
        const date = new Date('2026-04-01');
        const { getByText } = render(<DueDateBadge dueDate={date} />);
        expect(getByText(/01\/04\/2026/)).toBeInTheDocument();
    });
});
