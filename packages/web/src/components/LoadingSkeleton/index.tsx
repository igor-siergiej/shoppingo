import { Skeleton } from '@mui/material';

export const LoadingSkeleton = () => {
    return (
        <>
            {[1, 2, 3, 4, 5].map((value) => {
                return (
                    <Skeleton
                        key={value}
                        animation="wave"
                        sx={{ height: '48px' }}
                    />
                );
            })}
        </>
    );
};
