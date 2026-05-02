import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PullToRefreshProvider } from '../../contexts/PullToRefreshContext';
import { Layout } from './index';

const renderWithProvider = (ui: React.ReactElement) => render(<PullToRefreshProvider>{ui}</PullToRefreshProvider>);

describe('Layout', () => {
    it('renders children', () => {
        renderWithProvider(
            <Layout>
                <p>Test content</p>
            </Layout>
        );

        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies fixed positioning styles', () => {
        const { container } = renderWithProvider(
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const layoutDiv = container.firstChild;
        expect(layoutDiv).toHaveClass('fixed', 'top-16', 'bottom-24', 'left-0', 'right-0');
    });

    it('applies padding and max-width', () => {
        const { container } = renderWithProvider(
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const layoutDiv = container.firstChild;
        expect(layoutDiv).toHaveClass('px-4', 'py-2', 'max-w-[500px]', 'mx-auto');
    });

    it('renders children in reverse flex column', () => {
        const { container } = renderWithProvider(
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const outerDiv = container.firstChild as HTMLElement;
        // The scroll container is the last child (after PullToRefreshIndicator)
        const scrollDiv = outerDiv.lastElementChild as HTMLElement;
        expect(scrollDiv).toHaveClass('flex-col-reverse', 'overflow-y-auto', 'h-full', 'overscroll-y-contain');
    });
});
