import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import Appbar from '../Appbar';
import { Button } from '../ui/button';

interface ErrorDisplayProps {
    error?: Error | null;
}

const ErrorPage: React.FC<ErrorDisplayProps> = ({
    error,
}) => {
    const ErrorContent = () => (
        <div className="max-w-md w-full bg-card rounded-lg border p-6 text-center">
            <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>

            <h1 className="text-xl font-semibold text-foreground mb-2">
                Something went wrong
            </h1>

            <p className="text-muted-foreground mb-6">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            {error && (
                <details className="mb-4 p-3 bg-muted rounded text-left">
                    <summary className="cursor-pointer text-sm font-medium">
                        Error Details
                    </summary>
                    <pre className="mt-2 text-xs overflow-hidden">
                        {error.toString()}
                    </pre>
                </details>
            )}

            <div className="flex gap-2 justify-center">
                <Button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Page
                </Button>

                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                >
                    Go Home
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Appbar />
            <div className="flex items-center justify-center p-4 flex-1">
                <ErrorContent />
            </div>
        </div>
    );
};

export default ErrorPage;
