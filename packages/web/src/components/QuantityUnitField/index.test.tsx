import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuantityUnitField } from './index';

describe('QuantityUnitField', () => {
    const mockOnQuantityChange = vi.fn();
    const mockOnUnitChange = vi.fn();

    beforeEach(() => {
        mockOnQuantityChange.mockClear();
        mockOnUnitChange.mockClear();
    });

    it('renders quantity and unit inputs', () => {
        render(
            <QuantityUnitField
                quantity="5"
                unit="pcs"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        const quantityInput = screen.getByDisplayValue('5');
        const unitSelect = screen.getByDisplayValue('pcs');

        expect(quantityInput).toBeInTheDocument();
        expect(unitSelect).toBeInTheDocument();
    });

    it('displays quantity label', () => {
        render(
            <QuantityUnitField
                quantity=""
                unit=""
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        expect(screen.getByText('Quantity')).toBeInTheDocument();
        expect(screen.getByText('Unit')).toBeInTheDocument();
    });

    it('calls onQuantityChange when quantity input changes', async () => {
        const user = userEvent.setup();
        render(
            <QuantityUnitField
                quantity=""
                unit="pcs"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        const quantityInput = screen.getByRole('spinbutton') as HTMLInputElement;
        await user.clear(quantityInput);
        await user.type(quantityInput, '10');

        expect(mockOnQuantityChange).toHaveBeenCalled();
    });

    it('calls onUnitChange when unit select changes', async () => {
        const user = userEvent.setup();
        render(
            <QuantityUnitField
                quantity="5"
                unit="pcs"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        const unitSelect = screen.getByDisplayValue('pcs');
        await user.click(unitSelect);

        const kgOption = screen.getByText('kg');
        await user.click(kgOption);

        expect(mockOnUnitChange).toHaveBeenCalledWith('kg');
    });

    it('supports decimal quantities with step 0.01', () => {
        const { container } = render(
            <QuantityUnitField
                quantity="2.5"
                unit="kg"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        const input = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input?.step).toBe('0.01');
        expect(input?.value).toBe('2.5');
    });

    it('has all unit options available', async () => {
        render(
            <QuantityUnitField
                quantity=""
                unit="pcs"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
            />
        );

        const unitSelect = screen.getByDisplayValue('pcs');
        await userEvent.setup().click(unitSelect);

        expect(screen.getByText('pcs')).toBeInTheDocument();
        expect(screen.getByText('g')).toBeInTheDocument();
        expect(screen.getByText('kg')).toBeInTheDocument();
        expect(screen.getByText('ml')).toBeInTheDocument();
        expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('uses custom IDs when provided', () => {
        const { container } = render(
            <QuantityUnitField
                quantity="3"
                unit="ml"
                onQuantityChange={mockOnQuantityChange}
                onUnitChange={mockOnUnitChange}
                quantityId="custom-qty"
                unitId="custom-unit"
            />
        );

        const quantityInput = container.querySelector('#custom-qty');
        const unitSelect = container.querySelector('#custom-unit');

        expect(quantityInput).toBeInTheDocument();
        expect(unitSelect).toBeInTheDocument();
    });
});
