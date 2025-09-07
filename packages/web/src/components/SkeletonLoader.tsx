import React from 'react';

interface SkeletonLoaderProps {
    type?: 'list' | 'item' | 'card' | 'text';
    count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    type = 'card',
    count = 1
}) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'list':
                return (
                    <div className="space-y-3">
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-3">
                                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'item':
                return (
                    <div className="space-y-2">
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="flex items-center space-x-3 p-2">
                                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
                            </div>
                        ))}
                    </div>
                );

            case 'card':
                return (
                    <div className="space-y-4">
                        {Array.from({ length: count }).map((_, i) => (
                            <div key={i} className="p-4 border rounded-lg">
                                <div className="space-y-3">
                                    <div className="h-5 bg-muted animate-pulse rounded w-2/3" />
                                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'text':
                return (
                    <div className="space-y-2">
                        {Array.from({ length: count }).map((_, i) => (
                            <div
                                key={i}
                                className="h-4 bg-muted animate-pulse rounded"
                                style={{
                                    width: `${Math.random() * 40 + 60}%`
                                }}
                            />
                        ))}
                    </div>
                );

            default:
                return (
                    <div className="h-4 bg-muted animate-pulse rounded w-full" />
                );
        }
    };

    return <>{renderSkeleton()}</>;
};

export default SkeletonLoader;
