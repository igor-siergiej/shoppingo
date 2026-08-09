import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
    it('renders an inset focus ring so it cannot be clipped by ancestor overflow', () => {
        render(<Input placeholder="Search recipes..." />);

        const input = screen.getByPlaceholderText('Search recipes...');
        expect(input).toHaveClass('focus-visible:ring-inset');
    });

    it('still merges custom className with the base classes', () => {
        render(<Input placeholder="Search recipes..." className="pl-9 pr-9" />);

        const input = screen.getByPlaceholderText('Search recipes...');
        expect(input).toHaveClass('pl-9', 'pr-9', 'focus-visible:ring-inset');
    });
});
