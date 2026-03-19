import { render, screen } from '@testing-library/react';
import { describe, expect, it } from "vitest";
import Appbar from './index';

describe('Appbar', () => {
	it('renders header element', () => {
		const { container } = render(<Appbar />);

		const header = container.querySelector('header');
		expect(header).toBeInTheDocument();
	});

	it('displays app title "Shoppingo"', () => {
		render(<Appbar />);

		expect(screen.getByText('Shoppingo')).toBeInTheDocument();
	});

	it('has fixed positioning styling', () => {
		const { container } = render(<Appbar />);

		const header = container.querySelector('header');
		expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-50');
	});

	it('has primary background color', () => {
		const { container } = render(<Appbar />);

		const header = container.querySelector('header');
		expect(header).toHaveClass('bg-primary', 'shadow-md');
	});

	it('centers content with proper height', () => {
		const { container } = render(<Appbar />);

		const contentDiv = container.querySelector('div[class*="h-16"]');
		expect(contentDiv).toHaveClass('flex', 'items-center', 'justify-center', 'h-16');
	});

	it('renders title with white text color', () => {
		const { container } = render(<Appbar />);

		const title = screen.getByText('Shoppingo');
		expect(title).toHaveClass('text-white');
	});
});
