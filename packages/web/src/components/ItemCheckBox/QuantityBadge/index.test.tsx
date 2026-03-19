import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuantityBadge } from './index';

describe('QuantityBadge', () => {
    it('renders quantity and unit', () => {
        const { getByText } = render(<QuantityBadge quantity={5} unit="kg" />);
        expect(getByText('5 kg')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
        const { container } = render(<QuantityBadge quantity={10} unit="l" />);
        const badge = container.querySelector('[class*="bg-primary"]');
        expect(badge).toBeTruthy();
    });

    it('handles decimal quantities', () => {
        const { getByText } = render(<QuantityBadge quantity={2.5} unit="kg" />);
        expect(getByText('2.5 kg')).toBeInTheDocument();
    });

    it('renders null when quantity is undefined', () => {
        const { container } = render(<QuantityBadge quantity={undefined} unit="kg" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders null when unit is undefined', () => {
        const { container } = render(<QuantityBadge quantity={5} unit={undefined} />);
        expect(container.firstChild).toBeNull();
    });

    it('handles long unit names', () => {
        const { getByText } = render(<QuantityBadge quantity={1} unit="tablespoon" />);
        expect(getByText('1 tablespoon')).toBeInTheDocument();
    });
});
