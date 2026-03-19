import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingSpinner } from './index';

describe('LoadingSpinner', () => {
	it('renders with default message', () => {
		render(<LoadingSpinner />);
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('renders with custom message', () => {
		render(<LoadingSpinner message="Loading items..." />);
		expect(screen.getByText('Loading items...')).toBeInTheDocument();
	});

	it('renders spinner element', () => {
		const { container } = render(<LoadingSpinner />);
		const spinner = container.querySelector('div[class*="animate-spin"]');
		expect(spinner).toBeInTheDocument();
	});

	it('renders with small size', () => {
		const { container } = render(<LoadingSpinner size="sm" />);
		const spinner = container.querySelector('.h-4.w-4');
		expect(spinner).toBeInTheDocument();
	});

	it('renders with medium size', () => {
		const { container } = render(<LoadingSpinner size="md" />);
		const spinner = container.querySelector('.h-8.w-8');
		expect(spinner).toBeInTheDocument();
	});

	it('renders with large size', () => {
		const { container } = render(<LoadingSpinner size="lg" />);
		const spinner = container.querySelector('.h-12.w-12');
		expect(spinner).toBeInTheDocument();
	});

	it('has proper styling classes', () => {
		const { container } = render(<LoadingSpinner />);
		const outerDiv = container.querySelector('div[class*="flex flex-col"]');
		expect(outerDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
	});
});
