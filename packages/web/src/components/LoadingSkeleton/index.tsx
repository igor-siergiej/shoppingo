export const LoadingSkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5].map((value) => {
                return (
                    <div
                        key={value}
                        className="h-12 bg-gray-200 animate-pulse rounded mb-2"
                    />
                );
            })}
        </>
    );
};
