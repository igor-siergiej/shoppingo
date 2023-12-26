import { fireEvent, render, screen } from '@testing-library/react';
import AcceptButton from '.';

describe('Given AcceptButton', () => {
    it('Should have the button role and render with icon', () => {
        const mockHandleClick = () => {};
        render(<AcceptButton handleClick={mockHandleClick} />);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
    });

    it('Should call the mock handle click when pressed', () => {
        const mockHandleClick = vi.fn();
        render(<AcceptButton handleClick={mockHandleClick} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(mockHandleClick).toBeCalled();
    });
});
