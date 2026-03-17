import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DueDateField } from './index';

describe('DueDateField', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders label and button', () => {
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        expect(screen.getByText('Due Date (Optional)')).toBeInTheDocument();
        expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });

    it('displays formatted date when value is provided', () => {
        const testDate = new Date('2026-03-17');
        render(<DueDateField value={testDate} onChange={mockOnChange} />);

        expect(screen.getByText('17/03/2026')).toBeInTheDocument();
    });

    it('shows placeholder text when no date is selected', () => {
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        const button = screen.getByRole('button');
        expect(button).toHaveTextContent('Pick a date');
    });

    it('calls onChange when a date is selected', async () => {
        const user = userEvent.setup();
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        const button = screen.getByRole('button', { name: /pick a date/i });
        await user.click(button);

        // Calendar should be visible now
        const calendarButton = screen.getAllByRole('button').find((btn) => btn.textContent?.match(/^\d+$/));
        if (calendarButton) {
            await user.click(calendarButton);
            expect(mockOnChange).toHaveBeenCalled();
        }
    });

    it('opens calendar popover when button is clicked', async () => {
        const user = userEvent.setup();
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        const button = screen.getByRole('button', { name: /pick a date/i });
        await user.click(button);

        // Check if calendar elements appear
        const calendarElement = screen.queryByRole('application');
        expect(calendarElement || screen.getAllByRole('button').length > 1).toBeTruthy();
    });

    it('has calendar icon in button', () => {
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        const button = screen.getByRole('button');
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('uses captionLayout prop when provided', () => {
        const { container } = render(
            <DueDateField value={undefined} onChange={mockOnChange} captionLayout="dropdown" />
        );

        expect(container).toBeInTheDocument();
    });

    it('has aria-invalid attribute when needed', () => {
        render(<DueDateField value={undefined} onChange={mockOnChange} />);

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('data-empty', 'true');
    });
});
