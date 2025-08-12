import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ListsSkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                <Card
                    key={value}
                    className="mb-2 transition-all duration-200 bg-background py-0"
                >
                    <CardContent className="flex items-center justify-between p-2">
                        <div className="flex-1">
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                        <div className="flex items-center">
                            <Skeleton className="h-12 w-12 rounded" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </>
    );
};

export const ItemsSkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                <Card
                    key={value}
                    className="mb-2 transition-all duration-200 bg-background py-0"
                >
                    <CardContent className="flex items-center justify-between p-1 gap-4">
                        <div className="flex items-center gap-8 flex-1">
                            <Skeleton className="h-5 w-5 rounded shrink-0" />
                            <Skeleton className="h-6 flex-1" />
                        </div>
                        <div className="flex items-center">
                            <Skeleton className="h-6 w-6 rounded" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </>
    );
};
