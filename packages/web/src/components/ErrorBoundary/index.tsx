import { Component, ErrorInfo, ReactNode } from 'react';

import ErrorPage from '../ErrorPage';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    hasAppContext?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorPage
                    error={this.state.error}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
