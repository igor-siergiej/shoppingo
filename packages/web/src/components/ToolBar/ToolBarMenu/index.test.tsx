import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ToolBarMenu } from './index';

describe('ToolBarMenu', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders closed menu with no content visible', () => {
        const { container } = render(
            <ToolBarMenu isOpen={false} contentHeight={0}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const menu = container.querySelector('[class*="overflow-hidden"]');
        expect(menu).toBeInTheDocument();
    });

    it('renders divider when menu is open', () => {
        const { container } = render(
            <ToolBarMenu isOpen={true} contentHeight={200}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const divider = container.querySelector('[class*="bg-gradient-to-r"]');
        expect(divider).toBeInTheDocument();
    });

    it('does not render divider when menu is closed', () => {
        const { container } = render(
            <ToolBarMenu isOpen={false} contentHeight={0}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const divider = container.querySelector('[class*="bg-gradient-to-r"]');
        expect(divider).not.toBeInTheDocument();
    });

    it('renders children content', () => {
        const { getByText } = render(
            <ToolBarMenu isOpen={true} contentHeight={200}>
                <div>Test Content</div>
            </ToolBarMenu>
        );

        expect(getByText('Test Content')).toBeInTheDocument();
    });
});
