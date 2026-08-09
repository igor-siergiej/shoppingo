import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PullToRefreshProvider } from '../../contexts/PullToRefreshContext';
import { Layout } from './index';

const renderAtPath = (path: string, ui: React.ReactElement) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <PullToRefreshProvider>{ui}</PullToRefreshProvider>
        </MemoryRouter>
    );

describe('Layout', () => {
    it('renders children', () => {
        renderAtPath(
            '/',
            <Layout>
                <p>Test content</p>
            </Layout>
        );

        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies fixed positioning styles', () => {
        const { container } = renderAtPath(
            '/',
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const layoutDiv = container.firstChild;
        expect(layoutDiv).toHaveClass('fixed', 'top-14', 'bottom-24', 'left-0', 'right-0');
    });

    it('applies padding and max-width', () => {
        const { container } = renderAtPath(
            '/',
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const layoutDiv = container.firstChild;
        expect(layoutDiv).toHaveClass('px-4', 'py-2', 'max-w-[500px]', 'mx-auto');
    });

    it('renders children in reverse flex column on bottom-anchored routes', () => {
        const { container } = renderAtPath(
            '/',
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const outerDiv = container.firstChild as HTMLElement;
        // The scroll container is the last child (after PullToRefreshIndicator)
        const scrollDiv = outerDiv.lastElementChild as HTMLElement;
        expect(scrollDiv).toHaveClass('flex-col-reverse', 'overflow-y-auto', 'h-full', 'overscroll-y-contain');
    });

    it('renders children in normal (non-reversed) flex column on the recipes route', () => {
        const { container } = renderAtPath(
            '/recipes',
            <Layout>
                <p>Content</p>
            </Layout>
        );

        const outerDiv = container.firstChild as HTMLElement;
        const scrollDiv = outerDiv.lastElementChild as HTMLElement;
        expect(scrollDiv).toHaveClass('flex-col', 'overflow-y-auto', 'h-full', 'overscroll-y-contain');
        expect(scrollDiv).not.toHaveClass('flex-col-reverse');
    });
});
