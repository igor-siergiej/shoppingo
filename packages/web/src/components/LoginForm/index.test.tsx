import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './index';

const mockUseLoginForm = vi.fn();

vi.mock('../../hooks/useLoginForm', () => ({
    useLoginForm: () => mockUseLoginForm(),
}));

vi.mock('./LoginFormFields', () => ({
    LoginFormFields: () => <div data-testid="form-fields">Form Fields</div>,
}));

describe('LoginForm', () => {
    beforeEach(() => {
        mockUseLoginForm.mockReturnValue({
            register: vi.fn(),
            handleSubmit: (fn: (data: unknown) => void) => (e: Event) => {
                e.preventDefault();
                fn({});
            },
            errors: {},
            isSubmitting: false,
            onSubmit: vi.fn(),
        });
    });

    it('renders card with header and description', () => {
        render(<LoginForm />);

        expect(screen.getByText('Login to your account')).toBeInTheDocument();
        expect(screen.getByText('Enter your username below to login to your account')).toBeInTheDocument();
    });

    it('renders LoginFormFields component', () => {
        render(<LoginForm />);

        expect(screen.getByTestId('form-fields')).toBeInTheDocument();
    });

    it('renders login button', () => {
        render(<LoginForm />);

        const submitButton = screen.getByRole('button', { name: /login/i });
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('shows loading state when submitting', () => {
        mockUseLoginForm.mockReturnValue({
            register: vi.fn(),
            handleSubmit: (fn: (data: unknown) => void) => (e: Event) => {
                e.preventDefault();
                fn({});
            },
            errors: {},
            isSubmitting: true,
            onSubmit: vi.fn(),
        });

        render(<LoginForm />);

        const submitButton = screen.getByRole('button');
        expect(submitButton).toBeDisabled();
    });

    it('displays root error when present', () => {
        mockUseLoginForm.mockReturnValue({
            register: vi.fn(),
            handleSubmit: (fn: (data: unknown) => void) => (e: Event) => {
                e.preventDefault();
                fn({});
            },
            errors: { root: { message: 'Login failed' } },
            isSubmitting: false,
            onSubmit: vi.fn(),
        });

        render(<LoginForm />);

        expect(screen.getByText('Login failed')).toBeInTheDocument();
    });

    it('renders sign up link', () => {
        render(<LoginForm />);

        const signUpLink = screen.getByRole('link', { name: /sign up/i });
        expect(signUpLink).toHaveAttribute('href', '/register');
    });
});
